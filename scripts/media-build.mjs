import {mkdir,writeFile,readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
export function imageDimensions(bytes,ext){
 if(ext==='png'&&bytes.length>=24)return {width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};
 if(ext==='gif'&&bytes.length>=10)return {width:bytes.readUInt16LE(6),height:bytes.readUInt16LE(8)};
 if(['jpg','jpeg'].includes(ext)){let offset=2;while(offset+9<bytes.length){if(bytes[offset]!==255)break;const marker=bytes[offset+1];if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker))return {height:bytes.readUInt16BE(offset+5),width:bytes.readUInt16BE(offset+7)};if(marker===0xd9||marker===0xda)break;const size=bytes.readUInt16BE(offset+2);if(size<2)break;offset+=size+2;}}
 if(ext==='webp'&&bytes.length>=30&&bytes.toString('ascii',12,16)==='VP8X')return {width:1+bytes.readUIntLE(24,3),height:1+bytes.readUIntLE(27,3)};
 if(ext==='svg'){const svg=bytes.toString();const view=svg.match(/viewBox=["']\s*[\d.-]+\s+[\d.-]+\s+([\d.]+)\s+([\d.]+)/);if(view)return {width:Number(view[1]),height:Number(view[2])};}
 return {};
}
export async function prepareMedia(content,outDir){
 const media={},unique=new Map();await mkdir(path.join(outDir,'assets/generated'),{recursive:true});
 async function visit(value){if(!value||typeof value!=='object')return;for(const [key,child]of Object.entries(value)){if(typeof child==='string'&&/^data:(?:image\/(?:png|jpeg|gif|webp)|application\/octet-stream);base64,/.test(child)){const bytes=Buffer.from(child.slice(child.indexOf(',')+1),'base64'),type=child.slice(5,child.indexOf(';'));let ext=type.split('/')[1];if(ext==='octet-stream'){const magic=bytes.subarray(0,4).toString();ext=magic==='wOF2'?'woff2':magic==='wOFF'?'woff':magic==='OTTO'?'otf':'ttf';}if(ext==='jpeg')ext='jpg';const hash=createHash('sha256').update(bytes).digest('hex').slice(0,24),url='./assets/generated/'+hash+'.'+ext;if(!unique.has(url)){await writeFile(path.join(outDir,url),bytes);unique.set(url,bytes.length);media[url]={bytes:bytes.length,type,...imageDimensions(bytes,ext)};}value[key]=url;}else if(child&&typeof child==='object')await visit(child);}}
 await visit(content);
 async function scan(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory()){await scan(file);continue;}const ext=path.extname(file).slice(1).toLowerCase();if(!['svg','jpg','jpeg','png','gif','webp','mp4','webm'].includes(ext))continue;const bytes=await readFile(file),url='./'+path.relative(outDir,file).split(path.sep).join('/');media[url]={bytes:bytes.length,...imageDimensions(bytes,ext)};}}
 await scan(path.join(outDir,'assets'));content.media=media;
 return {embeddedFiles:unique.size,embeddedBytes:[...unique.values()].reduce((a,b)=>a+b,0),media};
}
