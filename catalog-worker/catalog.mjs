import {collections} from './collections.mjs';
const picture=(path,size='w500')=>typeof path==='string'&&/^\/[\w.-]+$/.test(path)?'https://image.tmdb.org/t/p/'+size+path:'';
const idValue=value=>{const id=Number(value);if(!Number.isSafeInteger(id)||id<1)throw Object.assign(Error('Invalid title.'),{status:400});return id};
function item(data,type){return{id:data.id,type:type||data.media_type||'movie',title:String(data.title||data.name||''),year:String(data.release_date||data.first_air_date||'').slice(0,4),description:data.overview||'',poster:picture(data.poster_path,'w342'),backdrop:picture(data.backdrop_path,'w1280'),rating:data.vote_average||0,popularity:data.popularity||0}}
export async function catalog(request,env,headers){
 const url=new URL(request.url),params=url.searchParams,path=url.pathname;
 async function get(path,params={}){const target=new URL('https://api.themoviedb.org/3'+path);target.searchParams.set('api_key',env.TMDB_API_KEY);target.searchParams.set('language','en-US');for(const [k,v]of Object.entries(params))target.searchParams.set(k,String(v));const response=await fetch(target,{cf:{cacheTtl:300,cacheEverything:true},signal:AbortSignal.timeout(12000)});if(!response.ok)throw Object.assign(Error(response.status===404?'Title not found.':'Catalog unavailable. Please retry.'),{status:response.status===404?404:502});return response.json()}
 const json=data=>Response.json(data,{headers:{...headers,'Cache-Control':'public,max-age=300'}});
 try{
  if(!env.TMDB_API_KEY)return null;
  if(path==='/api/collection'){
   const key=params.get('key'),spec=collections[key];if(!spec)throw Object.assign(Error('Collection not found.'),{status:404});const results=[];for(let n=0;n<spec.ids.length;n+=5){const batch=await Promise.allSettled(spec.ids.slice(n,n+5).map(id=>get('/'+spec.type+'/'+id)));for(const r of batch)if(r.status==='fulfilled')results.push(item(r.value,spec.type))}return json({title:spec.title,items:results,total:spec.ids.length})
  }
  if(path==='/api/person'){
   const data=await get('/person/'+idValue(params.get('id')),{append_to_response:'combined_credits'}),seen=new Set(),credits=[...(data.combined_credits?.cast||[]),...(data.combined_credits?.crew||[]).filter(c=>c.job==='Director')].filter(c=>{const key=c.media_type+':'+c.id;if(seen.has(key)||c.adult||!c.poster_path)return false;seen.add(key);return true}).sort((a,b)=>(b.popularity||0)-(a.popularity||0));return json({id:data.id,name:data.name,biography:data.biography||'',birthday:data.birthday,deathday:data.deathday,birthplace:data.place_of_birth,department:data.known_for_department,photo:picture(data.profile_path,'h632'),credits:credits.map(c=>({...item(c),character:c.character||c.job||''}))})
  }
  if(path==='/api/title-details'||path==='/api/tv-details'){
   const type=path==='/api/tv-details'||params.get('type')==='tv'?'tv':'movie',data=await get('/'+type+'/'+idValue(params.get('id')),{append_to_response:'images,credits,recommendations,videos,'+(type==='tv'?'content_ratings':'release_dates'),include_image_language:'en,null'}),logos=data.images?.logos||[],logo=logos.find(l=>l.iso_639_1==='en')||logos.find(l=>!l.iso_639_1),releases=data.release_dates?.results?.find(c=>c.iso_3166_1==='US')?.release_dates||[],directors=(data.credits?.crew||[]).filter(c=>c.job==='Director');
   return json({...item(data,type),logo:picture(logo?.file_path),tagline:data.tagline||'',genres:data.genres||[],runtime:data.runtime||data.episode_run_time?.[0]||0,status:data.status||'',language:String(data.original_language||'').toUpperCase(),releaseDate:data.release_date||data.first_air_date||'',certification:type==='tv'?data.content_ratings?.results?.find(c=>c.iso_3166_1==='US')?.rating||'':releases.find(r=>r.certification)?.certification||'',budget:data.budget||0,revenue:data.revenue||0,companies:(data.production_companies||[]).filter(c=>c.logo_path).map(c=>({name:c.name,logo:picture(c.logo_path,'w185')})),creators:type==='tv'?(data.created_by||[]).map(c=>c.name).join(', '):directors.map(c=>c.name).join(', '),directorPeople:directors.map(c=>({id:c.id,name:c.name})),seasons:(data.seasons||[]).map(s=>({seasonNumber:s.season_number,name:s.name,episodeCount:s.episode_count,description:s.overview||'',poster:picture(s.poster_path,'w342')})),episodeCount:data.number_of_episodes||0,cast:(data.credits?.cast||[]).slice(0,15).map(c=>({id:c.id,name:c.name,character:c.character||'',photo:picture(c.profile_path,'w185')})),recommendations:(data.recommendations?.results||[]).filter(c=>!c.adult).slice(0,20).map(c=>item(c,type)),trailers:(data.videos?.results||[]).filter(t=>t.site==='YouTube'&&t.type==='Trailer'&&/^[\w-]{11}$/.test(t.key)).slice(0,3).map(t=>({name:t.name,key:t.key}))})
  }
  if(path==='/api/movie-discover'){
   const tab=params.get('tab')||'discover',page=Math.max(1,Math.min(500,Math.floor(Number(params.get('page'))||1))),q=(params.get('q')||'').trim().slice(0,100),type=tab==='tv'?'tv':'movie';let target,query={page,include_adult:false};
   if(tab==='search'){if(q.length<2)return json({items:[],people:[]});target='/search/multi';query.query=q}
   else if(tab==='discover')target='/trending/all/day';
   else if(tab==='trending-movies')target='/trending/movie/day';
   else if(tab==='trending-tv')target='/trending/tv/day';
   else if(tab==='match'){target='/search/'+(params.get('type')==='tv'?'tv':'movie');query.query=q}
   else if(['movies','tv'].includes(tab)){target='/discover/'+type;const sort=params.get('sort');query.sort_by=sort==='rating'?'vote_average.desc':sort==='recent'?(type==='tv'?'first_air_date.desc':'primary_release_date.desc'):'popularity.desc';query['vote_count.gte']=sort==='rating'?200:sort==='recent'?10:20;query[type==='tv'?'first_air_date.lte':'primary_release_date.lte']=new Date().toISOString().slice(0,10);if(/^\d{1,5}$/.test(params.get('genre')||''))query.with_genres=params.get('genre');if(/^\d{1,6}$/.test(params.get('provider')||'')){query.with_watch_providers=params.get('provider');query.watch_region='US';query.with_watch_monetization_types='flatrate'}if(/^(19|20)\d{2}$/.test(params.get('releaseYear')||''))query[type==='tv'?'first_air_date_year':'primary_release_year']=params.get('releaseYear')}
   else return null;
   const data=await get(target,query);return json({items:(data.results||[]).filter(c=>!c.adult&&['movie','tv'].includes(c.media_type||type)).map(c=>item(c,c.media_type||type)),people:(data.results||[]).filter(c=>!c.adult&&c.media_type==='person').map(c=>({id:c.id,name:c.name,photo:picture(c.profile_path,'w185'),department:c.known_for_department,knownFor:(c.known_for||[]).map(t=>item(t))})),page:data.page,totalPages:Math.min(500,data.total_pages||1),totalResults:data.total_results||0})
  }
  if(path==='/api/movie-providers'){
   const data=await get('/watch/providers/movie',{watch_region:'US'}),ids=[8,9,337,350,2,15,1899,2303,386,283,43,526,34,188,192,73,300];return json({items:ids.map(id=>(data.results||[]).find(p=>p.provider_id===id)).filter(Boolean).map(p=>({id:p.provider_id,name:p.provider_id===350?'Apple TV+':p.provider_id===2?'Apple TV':p.provider_name,logo:picture(p.logo_path,'w92')}))})
  }
  return null;
 }catch(e){return Response.json({error:e.message},{status:e.status||502,headers})}
}
