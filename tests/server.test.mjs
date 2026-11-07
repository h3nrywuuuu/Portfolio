import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
test('local sync writes durable content, excludes drafts, and rejects cross-origin writes',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'portfolio-api-'));const data=JSON.parse(await readFile(new URL('./fixtures/sample-content.json',import.meta.url)));data.items[0].status='draft';await writeFile(path.join(dir,'content.json'),JSON.stringify(data));const port=18473;const child=spawn(process.execPath,[fileURLToPath(new URL('../scripts/server-v3.mjs',import.meta.url))],{cwd:dir,env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
 try{await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Server startup timeout')),10000);child.stdout.once('data',()=>{clearTimeout(timer);resolve()});child.once('error',reject);child.once('exit',code=>{clearTimeout(timer);reject(Error('Server exited '+code))})});const url=`http://127.0.0.1:${port}`;const status=await (await fetch(url+'/api/status')).json();assert.equal(status.app,'H3nRy_Studio');assert.equal(status.root,dir);assert.match(status.serverRevision,/^[a-f0-9]{64}$/);const headers={'Content-Type':'application/json','X-Portfolio-Request':'studio',Origin:url};let r=await fetch(url+'/api/save',{method:'POST',headers,body:JSON.stringify(data)});assert.equal(r.status,200);const saved=JSON.parse(await readFile(path.join(dir,'content.json')));assert.ok(saved.items.every(i=>i.status==='published'));assert.equal(JSON.parse(await readFile(path.join(dir,'.portfolio-workspace.json'))).items.length,data.items.length);r=await fetch(url+'/api/save',{method:'POST',headers:{...headers,Origin:'https://untrusted.example'},body:JSON.stringify(data)});assert.equal(r.status,403);assert.equal((await fetch(url+'/.portfolio-workspace.json')).status,404);
 // Matching workspace keeps draft entries. A Git update must win over the stale workspace.
 assert.equal((await (await fetch(url+'/content.json')).json()).items.length,data.items.length);
 const updated=structuredClone(saved);updated.items[0].title.zh='Git updated title';
 await writeFile(path.join(dir,'content.json'),JSON.stringify(updated));
 assert.deepEqual(await (await fetch(url+'/content.json')).json(),updated);
 assert.equal(JSON.parse(await readFile(path.join(dir,'.portfolio-workspace.json'))).items.length,data.items.length);
 const video=Buffer.from('000000186674797069736f6d0000020069736f6d6d703432','hex');const mediaHeaders={...headers,'Content-Type':'application/octet-stream'};r=await fetch(url+'/api/media?name=test.mp4',{method:'POST',headers:mediaHeaders,body:video});assert.equal(r.status,200);const media=await r.json();assert.match(media.src,/^\.\/assets\/uploads\/[a-f0-9]+\.mp4$/);assert.deepEqual(await readFile(path.join(dir,media.src)),video);r=await fetch(url+'/'+media.src.slice(2),{headers:{Range:'bytes=4-7'}});assert.equal(r.status,206);assert.equal(r.headers.get('content-type'),'video/mp4');assert.equal(await r.text(),'ftyp');r=await fetch(url+'/api/media',{method:'POST',headers:mediaHeaders,body:'not a video'});assert.equal(r.status,400);r=await fetch(url+'/api/media',{method:'POST',headers:{...mediaHeaders,Origin:'https://untrusted.example'},body:video});assert.equal(r.status,403);
 }finally{child.kill();await new Promise(resolve=>{if(child.exitCode!==null)resolve();else child.once('exit',resolve)});await rm(dir,{recursive:true,force:true});}
});

