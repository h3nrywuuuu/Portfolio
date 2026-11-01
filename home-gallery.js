import {imageAttrs} from './media.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function renderGallery(data,lang){
 const items=data.items.filter(i=>i.status==='published').sort((a,b)=>b.updated.localeCompare(a.updated));
 if(!items.length)return '';
 const t=value=>esc(value[lang]||value.zh);
 // Equal groups make the loop seamless; repeat small collections to fill wide screens.
 const count=Math.max(items.length,Math.ceil(6/items.length)*items.length);
 const group=duplicate=>`<div class="gallery-group" ${duplicate?'aria-hidden="true"':''}>${Array.from({length:count},(_,n)=>{const i=items[n%items.length],copy=duplicate||n>=items.length;return `<article class="gallery-card" tabindex="${copy?-1:0}" ${copy?'aria-hidden="true"':''} aria-label="${t(i.title)}"><div class="gallery-flipper"><div class="gallery-front"><img src="${esc(i.cover)}" alt="${t(i.title)}" ${imageAttrs(i.cover)}></div><div class="gallery-back" aria-hidden="true"><h2>${t(i.title)}</h2><p>${t(i.subtitle)}</p><a tabindex="-1" href="#/work/${encodeURIComponent(i.id)}">${lang==='zh'?'查看作品':'View work'} ↗</a></div></div></article>`}).join('')}</div>`;
 return `<section class="work-gallery" aria-label="${lang==='zh'?'作品画廊':'Work gallery'}"><div class="gallery-viewport"><div class="gallery-track">${group(false)}${group(true)}</div></div></section>`;
}

let galleryObserver,galleryAbort;
export function bindGallery(cleanup=false){galleryObserver?.disconnect();galleryAbort?.abort();if(cleanup)return;galleryAbort=new AbortController();galleryObserver=new IntersectionObserver(entries=>entries.forEach(e=>e.target.classList.toggle('gallery-offscreen',!e.isIntersecting)));const updateVisibility=()=>document.querySelectorAll('.work-gallery').forEach(g=>g.classList.toggle('gallery-hidden',document.hidden));document.addEventListener('visibilitychange',updateVisibility,{signal:galleryAbort.signal});
 for(const gallery of document.querySelectorAll('.work-gallery')){
  gallery.classList.add('gallery-offscreen');galleryObserver.observe(gallery);updateVisibility();const cards=[...gallery.querySelectorAll('.gallery-card')];
  const flip=(card,on)=>{card.classList.toggle('is-flipped',on);card.querySelector('.gallery-back').setAttribute('aria-hidden',String(!on));card.querySelector('a').tabIndex=on&&!card.hasAttribute('aria-hidden')?0:-1;gallery.classList.toggle('has-flipped',cards.some(c=>c.classList.contains('is-flipped')))};
  for(const card of cards){
   let touchFlip;
   card.addEventListener('pointerdown',e=>{touchFlip=e.pointerType==='touch'?!card.classList.contains('is-flipped'):undefined});
   card.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')flip(card,true)});
   card.addEventListener('pointerleave',e=>{if(e.pointerType!=='touch'&&!card.contains(document.activeElement))flip(card,false)});
   card.addEventListener('focusin',()=>flip(card,true));
   card.addEventListener('focusout',e=>{if(!card.contains(e.relatedTarget))flip(card,false)});
   card.addEventListener('click',e=>{if(e.target.closest('a'))return;const on=touchFlip??!card.classList.contains('is-flipped');touchFlip=undefined;cards.filter(c=>c!==card).forEach(c=>flip(c,false));flip(card,on)});
   card.addEventListener('keydown',e=>{if(e.key==='Escape'){flip(card,false);return}if(e.target===card&&['Enter',' '].includes(e.key)){e.preventDefault();flip(card,!card.classList.contains('is-flipped'))}});
  }
 }
}

let listening=false,navAbort;
export function bindNavigation(){
 const update=()=>document.body.classList.toggle('nav-scrolled',window.scrollY>24);
 if(!listening){window.addEventListener('scroll',update,{passive:true});listening=true}
 update();
 navAbort?.abort();navAbort=new AbortController();const options={signal:navAbort.signal},header=document.querySelector('.header'),wrap=document.querySelector('.works-dropdown'),button=document.querySelector('#works-toggle'),submenu=document.querySelector('#works-submenu');if(!wrap||!button||!submenu)return;
 let closeTimer,pinned=false,hoverOpened=false;const cancelClose=()=>clearTimeout(closeTimer);const open=value=>{cancelClose();submenu.hidden=!value;button.setAttribute('aria-expanded',String(value));header.classList.toggle('works-open',value);if(!value){pinned=false;hoverOpened=false}};const closeSoon=()=>{cancelClose();closeTimer=setTimeout(()=>{if(!pinned&&!submenu.contains(document.activeElement))open(false)},180)};
 wrap.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch'){cancelClose();if(submenu.hidden)hoverOpened=true;open(true)}},options);wrap.addEventListener('pointerleave',e=>{if(e.pointerType!=='touch')closeSoon()},options);submenu.addEventListener('pointerenter',cancelClose,options);submenu.addEventListener('pointerleave',e=>{if(e.pointerType!=='touch')closeSoon()},options);
 wrap.addEventListener('focusout',e=>{if(!wrap.contains(e.relatedTarget))open(false)},options);button.addEventListener('click',e=>{if(e.pointerType==='mouse'&&hoverOpened&&!pinned){pinned=true;hoverOpened=false;open(true)}else{const next=submenu.hidden;open(next);pinned=next}},options);
 wrap.addEventListener('keydown',e=>{if(e.key==='Escape'){open(false);button.focus()}if(e.target===button&&e.key==='ArrowDown'){e.preventDefault();open(true);submenu.querySelector('a').focus()}if(submenu.contains(e.target)&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const links=[...submenu.querySelectorAll('a')],index=links.indexOf(e.target);links[(index+(e.key==='ArrowRight'?1:-1)+links.length)%links.length].focus()}},options);document.addEventListener('pointerdown',e=>{if(!wrap.contains(e.target))open(false)},options);navAbort.signal.addEventListener('abort',cancelClose,{once:true});
}
