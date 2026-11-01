import {validate} from '../model.js';
import { mkdir, copyFile, cp, rm, readFile, writeFile } from 'node:fs/promises';
await rm('dist', {recursive:true, force:true});
await mkdir('dist');
for (const file of ['index.html','style.css','app.js','model.js','enhancements.js','studio-v3.js','studio-controls.js','design-system.js','editor-v4.js','studio-menu.js','image-tools.js','site-content.js','home-gallery.js']) await copyFile(file, `dist/${file}`);
await cp('assets','dist/assets',{recursive:true});
const content=validate(JSON.parse(await readFile('content.json','utf8')));content.items=content.items.filter(i=>i.status==='published');await writeFile('dist/content.json',JSON.stringify(content));
console.log('Built static portfolio in dist/');


const publicApp=(await readFile('dist/app.js','utf8')).replace('const EDITOR_ENABLED = true;', 'const EDITOR_ENABLED = false;');await writeFile('dist/app.js',publicApp);
