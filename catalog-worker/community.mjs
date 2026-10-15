const encoder=new TextEncoder();
const hex=buffer=>[...new Uint8Array(buffer)].map(b=>b.toString(16).padStart(2,'0')).join('');
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status})};
const hash=async text=>hex(await crypto.subtle.digest('SHA-256',encoder.encode(text)));
const random=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
async function derive(password,salt){const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:encoder.encode(salt),iterations:100000},key,256))}
function equal(a,b){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0}
async function body(request){if(!request.headers.get('Content-Type')?.startsWith('application/json'))fail('Send JSON.',415);const reader=request.body?.getReader();if(!reader)fail('Empty request.');let size=0,chunks=[];for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>262144){await reader.cancel();fail('Request is too large.',413)}chunks.push(value)}const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length}try{return JSON.parse(new TextDecoder().decode(bytes))}catch{fail('Invalid JSON.')}}
async function rate(db,request,scope,max,seconds=60){await db.prepare('DELETE FROM limits WHERE expires<?').bind(Date.now()).run();const key=await hash((request.headers.get('CF-Connecting-IP')||'local')+':'+scope+':'+Math.floor(Date.now()/1000/seconds));const row=await db.prepare('INSERT INTO limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key,Date.now()+seconds*2000).first();if(row.count>max)fail('Too many requests. Please wait a minute.',429)}
async function account(db,request){const token=request.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];if(!token)return null;return db.prepare('SELECT a.id,a.username,a.name FROM sessions s JOIN accounts a ON a.id=s.user_id WHERE s.hash=? AND s.expires>?').bind(await hash(token),Date.now()).first()}
async function session(db,user){const token=random();await db.prepare('INSERT INTO sessions(hash,user_id,expires) VALUES(?,?,?)').bind(await hash(token),user.id,Date.now()+30*86400000).run();return{token,user:{id:user.id,username:user.username,name:user.name}}}
const titleKey=value=>{if(typeof value!=='string'||! /^(movie|tv):[1-9]\d{0,10}$/.test(value))fail('Invalid title.');return value};
const commentBody=data=>{if(typeof data.body!=='string'||!data.body.trim()||data.body.trim().length>2000)fail('Write a comment between 1 and 2,000 characters.');return data.body.trim()};
export async function community(request,env,headers){
 const db=env.COMMUNITY,url=new URL(request.url),path=url.pathname.replace('/api/community',''),method=request.method;
 const json=(data,status=200)=>Response.json(data,{status,headers:{...headers,'Cache-Control':'no-store'}});
 try{
  if(!db)return json({error:'Community is temporarily unavailable.'},503);
  const user=await account(db,request);
  if(path==='/auth/me'&&method==='GET')return json({user});
  if(['/auth/register','/auth/login'].includes(path)&&method==='POST'){
   await rate(db,request,path,path.endsWith('register')?5:15);
   const data=await body(request),username=String(data.username||'').trim().toLowerCase(),password=data.password;
   if(!/^[a-z0-9_]{3,24}$/.test(username)||typeof password!=='string'||password.length<8||password.length>200)fail('Use a 3–24 character username and a password of at least 8 characters.');
   if(path.endsWith('register')){
    const name=String(data.name||username).trim().slice(0,48);if(!name)fail('Enter a name.');
    const salt=random(),id=crypto.randomUUID(),passwordHash=await derive(password,salt);
    try{await db.prepare('INSERT INTO accounts(id,username,name,password,salt,created) VALUES(?,?,?,?,?,?)').bind(id,username,name,passwordHash,salt,Date.now()).run()}catch(e){if(String(e).includes('UNIQUE'))fail('That username is already taken.',409);throw e}
    return json(await session(db,{id,username,name}),201);
   }
   const found=await db.prepare('SELECT * FROM accounts WHERE username=?').bind(username).first();
   const computed=await derive(password,found?.salt||'outlaw-invalid-account-salt');
   if(!found||!equal(computed,found.password))fail('Username or password is incorrect.',401);
   return json(await session(db,found));
  }
  if(path==='/auth/logout'&&method==='POST'){const token=request.headers.get('Authorization')?.slice(7);if(token)await db.prepare('DELETE FROM sessions WHERE hash=?').bind(await hash(token)).run();return json({ok:true})}
  if(path==='/auth/account'&&method==='PATCH'){
   if(!user)fail('Sign in first.',401);await rate(db,request,'account',10);const data=await body(request),name=String(data.name||'').trim();if(!name||name.length>48)fail('Use a name of 1–48 characters.');await db.prepare('UPDATE accounts SET name=? WHERE id=?').bind(name,user.id).run();return json({user:{...user,name}})
  }
  if(path==='/library'){
   if(!user)fail('Sign in first.',401);
   if(method==='GET'){const found=await db.prepare('SELECT data,updated FROM library WHERE user_id=?').bind(user.id).first();return json({data:found?JSON.parse(found.data):null,updated:found?.updated||null})}
   if(method==='PUT'){await rate(db,request,'library',60);const data=await body(request);if(!data||typeof data!=='object'||!Array.isArray(data.lists)||typeof data.progress!=='object')fail('Invalid library.');const serialized=JSON.stringify(data);if(serialized.length>240000)fail('Library is too large.',413);await db.prepare('INSERT INTO library(user_id,data,updated) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data,updated=excluded.updated').bind(user.id,serialized,Date.now()).run();return json({ok:true})}
  }
  if(path==='/comments'&&method==='GET'){
   const title=titleKey(url.searchParams.get('title')),offset=Math.min(10000,Math.max(0,Number(url.searchParams.get('offset'))||0)),sort=url.searchParams.get('sort')==='top'?'score DESC,c.created DESC':'c.created DESC',uid=user?.id||'';
   const selection=`SELECT c.id,c.parent,c.body,c.spoiler,c.created,c.updated,c.deleted,a.name,a.username,(c.user_id=?) AS mine,COALESCE((SELECT SUM(value) FROM comment_votes WHERE comment_id=c.id),0) AS score,COALESCE((SELECT value FROM comment_votes WHERE comment_id=c.id AND user_id=?),0) AS vote FROM comments c JOIN accounts a ON a.id=c.user_id`;
   const roots=(await db.prepare(selection+` WHERE c.title=? AND c.parent IS NULL AND (c.deleted=0 OR EXISTS(SELECT 1 FROM comments r WHERE r.parent=c.id AND r.deleted=0)) ORDER BY ${sort} LIMIT 20 OFFSET ?`).bind(uid,uid,title,offset).all()).results;
   for(const root of roots){root.replies=(await db.prepare(selection+' WHERE c.parent=? AND c.deleted=0 ORDER BY c.created ASC LIMIT 100').bind(uid,uid,root.id).all()).results}
   const count=await db.prepare('SELECT COUNT(*) AS total FROM comments WHERE title=? AND deleted=0').bind(title).first();return json({items:roots,total:count.total,offset,next:roots.length===20?offset+20:null})
  }
  if(path==='/comments'&&method==='POST'){
   if(!user)fail('Sign in to comment.',401);await rate(db,request,'comments',10);const data=await body(request),title=titleKey(data.title),text=commentBody(data),id=crypto.randomUUID();let parent=null;
   if(data.parent){const root=await db.prepare('SELECT id,parent,title FROM comments WHERE id=?').bind(String(data.parent)).first();if(!root||root.title!==title)fail('Reply target not found.',404);parent=root.parent||root.id}
   await db.prepare('INSERT INTO comments(id,title,user_id,parent,body,spoiler,created) VALUES(?,?,?,?,?,?,?)').bind(id,title,user.id,parent,text,data.spoiler?1:0,Date.now()).run();return json({id},201)
  }
  const match=path.match(/^\/comments\/([a-f0-9-]{36})(\/vote)?$/);
  if(match){
   if(!user)fail('Sign in first.',401);const id=match[1],found=await db.prepare('SELECT user_id,deleted FROM comments WHERE id=?').bind(id).first();if(!found)fail('Comment not found.',404);
   if(match[2]&&method==='POST'){
    await rate(db,request,'votes',60);const data=await body(request),value=Number(data.value);if(![-1,0,1].includes(value)||found.deleted)fail('Invalid vote.');if(value===0)await db.prepare('DELETE FROM comment_votes WHERE comment_id=? AND user_id=?').bind(id,user.id).run();else await db.prepare('INSERT INTO comment_votes(comment_id,user_id,value) VALUES(?,?,?) ON CONFLICT(comment_id,user_id) DO UPDATE SET value=excluded.value').bind(id,user.id,value).run();return json({ok:true})
   }
   if(found.user_id!==user.id)fail('You can change only your own comments.',403);
   if(method==='PATCH'){const data=await body(request);await db.prepare('UPDATE comments SET body=?,spoiler=?,updated=? WHERE id=? AND deleted=0').bind(commentBody(data),data.spoiler?1:0,Date.now(),id).run();return json({ok:true})}
   if(method==='DELETE'){await db.prepare('UPDATE comments SET deleted=1,body=? WHERE id=?').bind('',id).run();return json({ok:true})}
  }
  if(path==='/lists'&&method==='GET'){
   const q=(url.searchParams.get('q')||'').trim().slice(0,100).toLowerCase(),pattern='%'+q+'%';const lists=(await db.prepare('SELECT l.id,l.name,l.items,l.updated,a.name AS author,(l.owner=?) AS mine FROM public_lists l JOIN accounts a ON a.id=l.owner WHERE lower(l.name) LIKE ? OR lower(l.items) LIKE ? ORDER BY l.updated DESC LIMIT 20').bind(user?.id||'',pattern,pattern).all()).results;return json({items:lists.map(l=>({...l,items:JSON.parse(l.items)}))})
  }
  const listMatch=path.match(/^\/lists\/([a-f0-9-]{36})$/);
  if(listMatch&&method==='GET'){const list=await db.prepare('SELECT l.id,l.name,l.items,l.updated,a.name AS author,(l.owner=?) AS mine FROM public_lists l JOIN accounts a ON a.id=l.owner WHERE l.id=?').bind(user?.id||'',listMatch[1]).first();if(!list)fail('List not found.',404);return json({...list,items:JSON.parse(list.items)})}
  if(path==='/lists'&&method==='POST'){
   if(!user)fail('Sign in to publish a list.',401);await rate(db,request,'publish',15);const data=await body(request),name=String(data.name||'').trim().slice(0,80),localId=String(data.localId||'').slice(0,80);if(!name||!localId||!Array.isArray(data.items)||data.items.length>250)fail('Use a list name and at most 250 titles.');const items=data.items.filter(t=>typeof t.id==='string'&&/^(buddy|clown-panic|the-traitors|tmdb-(movie|tv)-\d+)$/.test(t.id)).map(t=>({id:t.id,title:String(t.title||'').slice(0,160),poster:typeof t.poster==='string'&&t.poster.startsWith('https://image.tmdb.org/')?t.poster:''})),existing=await db.prepare('SELECT id FROM public_lists WHERE owner=? AND local_id=?').bind(user.id,localId).first(),id=existing?.id||crypto.randomUUID();await db.prepare('INSERT INTO public_lists(id,owner,local_id,name,items,created,updated) VALUES(?,?,?,?,?,?,?) ON CONFLICT(owner,local_id) DO UPDATE SET name=excluded.name,items=excluded.items,updated=excluded.updated').bind(id,user.id,localId,name,JSON.stringify(items),Date.now(),Date.now()).run();return json({id},existing?200:201)
  }
  if(listMatch&&method==='DELETE'){if(!user)fail('Sign in first.',401);const found=await db.prepare('SELECT owner FROM public_lists WHERE id=?').bind(listMatch[1]).first();if(!found)fail('List not found.',404);if(found.owner!==user.id)fail('You can change only your own lists.',403);await db.prepare('DELETE FROM public_lists WHERE id=?').bind(listMatch[1]).run();return json({ok:true})}
  if(path==='/title-votes'){
   const title=titleKey(method==='GET'?url.searchParams.get('title'):(await body(request)).title);
   if(method==='POST'){if(!user)fail('Sign in to vote.',401);await rate(db,request,'votes',60);const value=Number(url.searchParams.get('value'));if(![-1,0,1].includes(value))fail('Invalid vote.');if(value===0)await db.prepare('DELETE FROM title_votes WHERE title=? AND user_id=?').bind(title,user.id).run();else await db.prepare('INSERT INTO title_votes(title,user_id,value) VALUES(?,?,?) ON CONFLICT(title,user_id) DO UPDATE SET value=excluded.value').bind(title,user.id,value).run()}
   const counts=await db.prepare('SELECT COALESCE(SUM(value=1),0) AS up,COALESCE(SUM(value=-1),0) AS down FROM title_votes WHERE title=?').bind(title).first(),mine=user?await db.prepare('SELECT value FROM title_votes WHERE title=? AND user_id=?').bind(title,user.id).first():null;return json({...counts,vote:mine?.value||0})
  }
  return json({error:'Not found.'},404);
 }catch(error){if(!error.status)console.error(JSON.stringify({event:'community_error',path,message:String(error).slice(0,200)}));return json({error:error.status?error.message:'Community is temporarily unavailable. Please retry.'},error.status||500)}
}
