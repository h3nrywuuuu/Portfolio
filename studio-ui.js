const views=new Map();
const sides=['left','right'];
const containerSelections=new Map();
export function selectedStudioContainer(item){const id=containerSelections.get(item.id);return item.layouts?.[id]?id:null;}
export function selectStudioContainer(item,id){if(id&&item.layouts?.[id])containerSelections.set(item.id,id);else containerSelections.delete(item.id);}
export function sidebarWidth(value,max=480){return Math.max(180,Math.min(max,Number(value)||240));}
export function captureStudioUI(){
 const shell=document.querySelector('.editor-shell');if(!shell)return;
 const state={};for(const side of sides){const el=shell.querySelector('.editor-'+side);if(el)state[side]={scroll:el.scrollTop,open:[...el.querySelectorAll('details')].map(d=>d.open)};}
 state.middle=shell.querySelector('.editor-middle')?.scrollTop||0;
 views.set(shell.dataset.view||'content',state);
}
export function restoreStudioUI(view){
 const shell=document.querySelector('.editor-shell');if(!shell)return;shell.dataset.view=view;
 let widths={};try{widths=JSON.parse(localStorage.getItem('portfolio-sidebar-widths'))||{}}catch{}
 const state=views.get(view);
 for(const side of sides){const el=shell.querySelector('.editor-'+side);if(!el)continue;
  const key='--studio-'+side+'-width',fallback=side==='left'?210:260;
  const setWidth=value=>{const other=shell.querySelector('.editor-'+(side==='left'?'right':'left'));const max=Math.max(180,Math.min(480,shell.clientWidth-(other?.getBoundingClientRect().width||240)-320));const width=sidebarWidth(value,max);shell.style.setProperty(key,width+'px');widths[side]=width;handle.setAttribute('aria-valuenow',width);try{localStorage.setItem('portfolio-sidebar-widths',JSON.stringify(widths))}catch{}};
  const handle=document.createElement('div');handle.className='studio-sidebar-resizer';handle.tabIndex=0;handle.role='separator';handle.setAttribute('aria-orientation','vertical');handle.setAttribute('aria-label',side==='left'?'Resize content sidebar':'Resize properties sidebar');handle.setAttribute('aria-valuemin','180');handle.setAttribute('aria-valuemax','480');handle.title='Drag to resize · Arrow keys adjust · Double-click to reset';handle.textContent='↔';el.prepend(handle);
  shell.style.setProperty(key,sidebarWidth(widths[side]||fallback)+'px');handle.setAttribute('aria-valuenow',widths[side]||fallback);
  let start;handle.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();start={x:e.clientX,width:el.getBoundingClientRect().width};handle.setPointerCapture(e.pointerId);};
  handle.onpointermove=e=>{if(start)setWidth(start.width+(e.clientX-start.x)*(side==='left'?1:-1));};handle.onpointerup=handle.onlostpointercapture=()=>start=null;
  handle.ondblclick=()=>setWidth(fallback);handle.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home'].includes(e.key))return;e.preventDefault();setWidth(e.key==='Home'?fallback:el.getBoundingClientRect().width+(e.key==='ArrowRight'?16:-16)*(side==='left'?1:-1));};
  const saved=state?.[side];if(saved){el.querySelectorAll('details').forEach((d,n)=>{if(n<saved.open.length)d.open=saved.open[n]});el.scrollTop=saved.scroll;}
 }
 if(state)shell.querySelector('.editor-middle').scrollTop=state.middle;
}
