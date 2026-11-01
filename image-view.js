import {imageAttrs} from './media.js';
export function cropStyle(block){const c=block.crop;if(!c||c.mode==='original')return '';return `aspect-ratio:${c.width} / ${c.height};object-fit:cover;object-position:${c.x}% ${c.y}%;`;}
export function imageMarkup(block,lang,escape){const caption=block.text[lang]||block.text.zh||'';return `<figure><img src="${escape(block.src)}" alt="${escape(caption)}" style="${cropStyle(block)}" ${imageAttrs(block.src)}>${block.showCaption===false?'':`<figcaption>${escape(caption)}</figcaption>`}</figure>`;}
