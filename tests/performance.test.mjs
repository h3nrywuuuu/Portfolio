import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {staticGraph} from '../scripts/performance-report.mjs';
import {prepareMedia,imageDimensions} from '../scripts/media-build.mjs';
import {publicCSS} from '../scripts/public-css.mjs';
import {setMediaMetadata,imageAttrs} from '../media.js';
import {renderBlocks,setupV3} from '../studio-v3.js';
test('visitor static graph never imports the workbench',async()=>{const graph=await staticGraph(process.cwd());for(const file of graph.keys())assert.ok(!/editor|studio-entry|studio-menu|site-studio|studio-controls|image-tools/.test(file),file);assert.ok(graph.has('studio-v3.js'));});
test('embedded duplicate media becomes one cacheable asset without changing source data',async()=>{const dir=await mkdtemp(path.join(tmpdir(),'portfolio-media-'));try{const svg=Buffer.from('<svg viewBox="0 0 64 32"></svg>');assert.deepEqual(imageDimensions(svg,'svg'),{width:64,height:32});const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB';const original={one:image,two:image};const data=structuredClone(original);const result=await prepareMedia(data,dir);assert.equal(result.embeddedFiles,1);assert.equal(data.one,data.two);assert.equal(original.one,image);assert.equal(data.media[data.one].width,1);assert.ok((await readFile(path.join(dir,data.one))).length>0);}finally{await rm(dir,{recursive:true,force:true})}});
test('responsive images reserve space and ignore unsafe srcset entries',()=>{setMediaMetadata({'./assets/test.jpg':{width:800,height:1200,srcset:[{src:'javascript:bad',width:1},{src:'./assets/test-480.webp',width:480}]}});const lazy=imageAttrs('./assets/test.jpg');assert.match(lazy,/width="800" height="1200"/);assert.match(lazy,/loading="lazy"/);assert.match(lazy,/test-480.webp 480w/);assert.ok(!lazy.includes('javascript'));assert.match(imageAttrs('./assets/test.jpg',{hero:true}),/fetchpriority="high"/);setMediaMetadata({});});
test('public CSS drops studio selectors without removing responsive public styles',async()=>{const css=publicCSS(await readFile('style.css','utf8'));assert.ok(!css.includes('.editor-shell'));assert.ok(!css.includes('.site-page-preview'));for(const required of ['.works-submenu','.brand-mobile','.gallery-offscreen','.hero-copy','--nav-height:56px'])assert.ok(css.includes(required),required);assert.ok(!css.includes('fonts.googleapis.com'));});

test('portrait zoom requests enough pixels without changing hero sizing',()=>{setMediaMetadata({'./assets/portrait.webp':{srcset:[{src:'./assets/portrait-800.webp',width:800}]}});assert.match(imageAttrs('./assets/portrait.webp',{zoom:2}),/sizes="\(max-width: 650px\) 200vw, 100vw"/);assert.match(imageAttrs('./assets/portrait.webp',{hero:true,zoom:2}),/sizes="100vw"/);setMediaMetadata({});});
test('videos do not fetch media until requested',()=>{const item={blocks:[{type:'video',src:'./assets/test.mp4',text:{zh:'视频',en:'Video'},span:12,start:1,row:1,align:'left'}]};setupV3({items:[item]});const html=renderBlocks(item,false,'en',0);assert.match(html,/playsinline preload="none"/);assert.ok(!html.includes('autoplay'));});
