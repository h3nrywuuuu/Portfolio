// Workbench-only raster import. Decode before updating data and optimize locally.
export function rasterType(bytes){
 if(bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)return 'image/jpeg';
 if(bytes[0]===0x89&&String.fromCharCode(...bytes.slice(1,4))==='PNG')return 'image/png';
 if(String.fromCharCode(...bytes.slice(0,6)).match(/^GIF8[79]a$/))return 'image/gif';
 if(String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP')return 'image/webp';
 return '';
}
export function fitImage(width,height,maxEdge=2000){if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw Error('decode');const scale=Math.min(1,maxEdge/Math.max(width,height));return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))};}
const readDataURL=blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('read'));reader.readAsDataURL(blob)});
export async function importPortrait(file){
 if(file.size>20*1024*1024)throw Error('size');
 const type=rasterType(new Uint8Array(await file.slice(0,16).arrayBuffer()));if(!type)throw Error('format');
 const url=URL.createObjectURL(file),image=new Image();
 try{image.src=url;try{await image.decode()}catch{throw Error('decode')}
  const width=image.naturalWidth,height=image.naturalHeight;if(!width||!height||width*height>50000000)throw Error('dimensions');
  if(type==='image/gif'){if(file.size>2*1024*1024)throw Error('gif-size');return {src:await readDataURL(new Blob([file],{type})),bytes:file.size,width,height,optimized:false};}
  if(file.size<=750*1024&&Math.max(width,height)<=2000)return {src:await readDataURL(new Blob([file],{type})),bytes:file.size,width,height,optimized:false};
  let size=fitImage(width,height),src='',bytes=0;
  for(let attempt=0;attempt<5;attempt++){const canvas=document.createElement('canvas');canvas.width=size.width;canvas.height=size.height;const ctx=canvas.getContext('2d');if(!ctx)throw Error('decode');ctx.imageSmoothingQuality='high';ctx.drawImage(image,0,0,size.width,size.height);src=canvas.toDataURL('image/webp',Math.max(.64,.86-attempt*.04));bytes=Math.floor((src.length-src.indexOf(',')-1)*.75);canvas.width=canvas.height=0;if(bytes<=900*1024)break;size=fitImage(size.width,size.height,Math.round(Math.max(size.width,size.height)*.8));}
  if(bytes>2*1024*1024)throw Error('size');return {src,bytes,width:size.width,height:size.height,optimized:true};
 }finally{URL.revokeObjectURL(url)}
}
