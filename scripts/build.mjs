import {staticGraph} from './performance-report.mjs';
import {versionAssets} from './version-assets.mjs';
import {publicCSS} from './public-css.mjs';
import {execFileSync} from 'node:child_process';
import {prepareMedia} from './media-build.mjs';
import {validate} from '../model.js';
import { mkdir, copyFile, cp, rm, readFile, writeFile } from 'node:fs/promises';
await rm('dist', {recursive:true, force:true});
await mkdir('dist');if(process.env.PORTFOLIO_PYTHON)execFileSync(process.env.PORTFOLIO_PYTHON,['scripts/subset-fonts.py'],{stdio:'inherit'});
for (const file of ['index.html','style.css','app.js','model.js','enhancements.js','studio-v3.js','studio-controls.js','design-system.js','editor-v4.js','studio-menu.js','image-tools.js','site-content.js','home-gallery.js','layout-model.js','site-studio.js','studio-editor.js','typography-editor.js','design-editor.js','studio-entry.js','media.js','icons.js','palette-model.js','image-view.js','image-import.js','studio-ui.js']) await copyFile(file, `dist/${file}`);
await cp('assets','dist/assets',{recursive:true});
const content=validate(JSON.parse(await readFile('content.json','utf8')));content.items=content.items.filter(i=>i.status==='published');const mediaReport=await prepareMedia(content,'dist');validate(content);await writeFile('dist/content.json',JSON.stringify(content));console.log('Externalized media:',mediaReport.embeddedFiles,'unique files');
if(process.env.PORTFOLIO_PYTHON)execFileSync(process.env.PORTFOLIO_PYTHON,['scripts/optimize-images.py','dist'],{stdio:'inherit'});console.log('Built static portfolio in dist/');


let publicApp=(await readFile('dist/app.js','utf8')).replace('const EDITOR_ENABLED = true;', 'const EDITOR_ENABLED = false;');const editorStart=publicApp.indexOf('function editor(){'),renderStart=publicApp.indexOf('function render(){');publicApp=publicApp.slice(0,editorStart)+publicApp.slice(renderStart);const bindingStart=publicApp.indexOf('function bindEditor(){'),routeStart=publicApp.indexOf("addEventListener('hashchange'");publicApp=publicApp.slice(0,bindingStart)+publicApp.slice(routeStart);await writeFile('dist/app.js',publicApp);

await writeFile('dist/style.css',publicCSS(await readFile('style.css','utf8')));
for(const file of ['editor-v4.js','studio-menu.js','image-tools.js','studio-controls.js','site-studio.js','studio-editor.js','typography-editor.js','design-editor.js','studio-entry.js','image-import.js','studio-ui.js'])await rm('dist/'+file);

const publishedContent=JSON.parse(await readFile('dist/content.json','utf8'));const graph=await staticGraph('dist');let html=await readFile('dist/index.html','utf8');
const preloads=[...graph.keys()].filter(file=>file!=='app.js').map(file=>'<link rel="modulepreload" href="./'+file.replaceAll('\\','/')+'">').join('');
const recent=[...content.items].sort((a,b)=>b.updated.localeCompare(a.updated));const first=content.showcase?.mode==='custom'?content.items.find(i=>i.id===content.showcase.ids[0]):recent[0];const covers={home:first?{src:first.cover,srcset:publishedContent.media?.[first.cover]?.srcset}:null,items:Object.fromEntries(content.items.map(i=>[i.id,{src:i.cover,srcset:publishedContent.media?.[i.cover]?.srcset}]))};const payload=JSON.stringify(covers).replaceAll('<','\\u003c');
const heroPreload='<script>(()=>{const covers='+payload+';const hash=location.hash;const image=hash.startsWith("#/work/")?covers.items[hash.split("/")[2]]:(!hash||hash==="#/"?covers.home:null);if(!image)return;const link=document.createElement("link");link.rel="preload";link.as="image";link.fetchPriority="high";if(image.srcset?.length){link.imageSrcset=image.srcset.map(v=>v.src+" "+v.width+"w").join(", ");link.imageSizes="100vw";}link.href=image.src;document.head.append(link)})();</script>';
html=html.replace('<script type="module"',preloads+heroPreload+'<script type="module"');await writeFile('dist/index.html',html);
console.log('Asset version:',await versionAssets('dist'));
