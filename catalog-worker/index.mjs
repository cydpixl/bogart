const routes=new Set(['/api/movie-discover','/api/title-details','/api/tv-details','/api/tv-season','/api/movie-providers']);
const parameters=new Set(['tab','type','id','q','page','genre','sort','provider','releaseYear','year','season']);
export default {async fetch(request,env){
 const url=new URL(request.url),origin=request.headers.get('Origin')||'';
 const allowed=['https://cydpixl.github.io','https://bogart.pages.dev','http://localhost:4322','http://127.0.0.1:4322'].includes(origin)||/^https:\/\/[a-z0-9-]+\.bogart\.pages\.dev$/.test(origin);
 const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':allowed?origin:'*','Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin','X-Content-Type-Options':'nosniff'};
 const error=(message,status)=>Response.json({error:message},{status,headers});
 if(origin&&!allowed)return error('Origin not allowed.',403);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(request.method!=='GET')return error('Method not allowed.',405);
 if(!routes.has(url.pathname))return error('Not found.',404);
 if(url.search.length>1500)return error('Query too long.',400);
 const target=new URL(url.pathname,'https://cnx-gh-media.pixlcyd.workers.dev');for(const [key,value]of url.searchParams)if(parameters.has(key))target.searchParams.set(key,value.slice(0,300));
 // The existing catalog belongs to the preserved Connections account, so a
 // cross-account public HTTP call is used instead of an unavailable service binding.
 try{const response=await fetch(new Request(target,{headers:{Origin:'https://cydpixl.github.io'},signal:AbortSignal.timeout(15000)}));return new Response(response.body,{status:response.status,headers:{...headers,'Cache-Control':response.ok?'public,max-age=300':'no-store'}})}catch{return error('Catalog is temporarily unavailable. Please retry.',502)}
}};
