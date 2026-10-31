import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
test('local sync writes durable content, excludes drafts, and rejects cross-origin writes',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'portfolio-api-'));const data=JSON.parse(await readFile(new URL('./fixtures/sample-content.json',import.meta.url)));data.items[0].status='draft';await writeFile(path.join(dir,'content.json'),JSON.stringify(data));const port=18473;const child=spawn(process.execPath,[fileURLToPath(new URL('../scripts/server-v3.mjs',import.meta.url))],{cwd:dir,env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
 try{await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Server startup timeout')),10000);child.stdout.once('data',()=>{clearTimeout(timer);resolve()});child.once('error',reject);child.once('exit',code=>{clearTimeout(timer);reject(Error('Server exited '+code))})});const url=`http://127.0.0.1:${port}`;const headers={'Content-Type':'application/json','X-Portfolio-Request':'studio',Origin:url};let r=await fetch(url+'/api/save',{method:'POST',headers,body:JSON.stringify(data)});assert.equal(r.status,200);const saved=JSON.parse(await readFile(path.join(dir,'content.json')));assert.ok(saved.items.every(i=>i.status==='published'));assert.equal(JSON.parse(await readFile(path.join(dir,'.portfolio-workspace.json'))).items.length,data.items.length);r=await fetch(url+'/api/save',{method:'POST',headers:{...headers,Origin:'https://untrusted.example'},body:JSON.stringify(data)});assert.equal(r.status,403);assert.equal((await fetch(url+'/.portfolio-workspace.json')).status,404);
 }finally{child.kill();await new Promise(resolve=>{if(child.exitCode!==null)resolve();else child.once('exit',resolve)});await rm(dir,{recursive:true,force:true});}
});

