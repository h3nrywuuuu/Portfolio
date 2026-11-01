import {readFile,stat,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {gzipSync} from 'node:zlib';
export async function staticGraph(root,entry='app.js'){
 const visited=new Map();async function visit(file){if(visited.has(file))return;const source=await readFile(path.join(root,file),'utf8');visited.set(file,source);const imports=[...source.matchAll(/(?:import|export)\s+(?:[^;'"\n]+?\s+from\s*)?['"](\.\/?[^'"]+)['"]/g)].map(m=>m[1]);for(const specifier of imports)await visit(path.normalize(path.join(path.dirname(file),specifier)));}await visit(entry);return visited;
}
export async function performanceReport(root='dist'){
 const graph=await staticGraph(root),modules=[...graph].map(([file,source])=>({file,bytes:Buffer.byteLength(source),gzip:gzipSync(source).length}));
 const content=JSON.parse(await readFile(path.join(root,'content.json'),'utf8')),media=Object.entries(content.media||{}).map(([src,info])=>({src,...info}));
 const css=await readFile(path.join(root,'style.css'));const report={publicJS:{modules,bytes:modules.reduce((n,m)=>n+m.bytes,0),gzip:modules.reduce((n,m)=>n+m.gzip,0)},css:{bytes:css.length,gzip:gzipSync(css).length},content:{bytes:(await stat(path.join(root,'content.json'))).size},media,warnings:[]};
 if(report.publicJS.bytes>64*1024)report.warnings.push('Public JavaScript exceeds the 64 KiB budget');if(report.content.bytes>32*1024)report.warnings.push('Content JSON exceeds the 32 KiB budget');
 for(const m of media){if(/\.(mp4|webm)$/i.test(m.src)&&m.bytes>8*1024*1024)report.warnings.push('Review video encoding: '+m.src);if(/\.(png|jpe?g|gif|webp)$/i.test(m.src)&&m.bytes>500*1024)report.warnings.push('Review image size: '+m.src);}
 return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const report=await performanceReport(process.argv[2]||'dist');await mkdir('.performance',{recursive:true});await writeFile('.performance/current-build.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
