// Retain public selectors while excluding workbench-only CSS from Pages.
const studioSelector=/\.(?:studio(?:\b|-)|editor[\w-]*|canvas(?:\b|-)|edit-[\w-]+|entry\b|insert-dock|palette-[\w-]+|type-panel|layout-panel|layout-presets|simple-grid|block-number|tag-edit|appearance-settings|sync-controls|cell-editor|button-row|add-blocks|image-tools|inspector-[\w-]+|site-page-preview|site-font-control|portrait-position|bilingual-[\w-]+|translation-preview)|#studio-context-menu/;
export function publicCSS(source){
 source=source.replace(/\/\*[\s\S]*?\*\//g,'');
 let out='',offset=0;
 while(offset<source.length){const brace=source.indexOf('{',offset);if(brace<0){out+=source.slice(offset);break}const head=source.slice(offset,brace).trim();let depth=1,end=brace+1,quote='';for(;end<source.length&&depth;end++){const c=source[end];if(quote){if(c==='\\'){end++;continue}if(c===quote)quote='';continue}if(c==='"'||c==="'"){quote=c;continue}if(c==='{')depth++;if(c==='}')depth--;}
 const body=source.slice(brace+1,end-1);if(/^@(media|supports|layer|container)\b/.test(head)){const nested=publicCSS(body);if(nested.trim())out+=head+'{'+nested+'}';}else if(head.startsWith('@'))out+=head+'{'+body+'}';else{const selectors=head.split(',').filter(s=>!studioSelector.test(s));if(selectors.length)out+=selectors.join(',')+'{'+body+'}';}offset=end;
 }
 return out.replace(/\s+/g,' ').trim();
}
