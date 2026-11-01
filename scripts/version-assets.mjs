import {createHash} from 'node:crypto';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import path from 'node:path';

// Version the whole module graph together so cached parent modules cannot
// continue importing an older icon or stylesheet after a deployment.
export async function versionAssets(root){
 const files=(await readdir(root)).filter(f=>/\.(js|css|json)$/.test(f)).sort();
 const sources=await Promise.all(files.map(f=>readFile(path.join(root,f),'utf8')));
 const version=createHash('sha256').update(sources.join('\0')).digest('hex').slice(0,12);
 const stamp=s=>s.replace(/(\.\/[\w./-]+\.(?:js|css|json))(?=['"])/g,'$1?v='+version);
 for(let n=0;n<files.length;n++)if(files[n].endsWith('.js'))await writeFile(path.join(root,files[n]),stamp(sources[n]));
 const html=path.join(root,'index.html');await writeFile(html,stamp(await readFile(html,'utf8')));
 return version;
}
