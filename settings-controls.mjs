import {playerIcon} from './player-icons.mjs?v=20261015-outlaw15';
let openChoice=null,sequence=0;
const closeChoice=()=>{if(!openChoice)return;openChoice.menu.hidden=true;openChoice.button.setAttribute('aria-expanded','false');openChoice=null};
document.addEventListener('pointerdown',event=>{if(openChoice&&!openChoice.root.contains(event.target))closeChoice()});
export function enhanceSettingsControls(host){
 closeChoice();
 for(const input of host.querySelectorAll('input[type="checkbox"][data-pref],#outlawAds'))input.setAttribute('role','switch');
 for(const select of host.querySelectorAll('select[data-pref]')){
  if(select.dataset.enhanced)continue;select.dataset.enhanced='true';
  const key=select.dataset.pref,label=select.getAttribute('aria-label')||select.closest('.setting-row')?.querySelector('span')?.textContent||key;
  const root=document.createElement('div');root.className='preference-choice';select.before(root);root.append(select);select.classList.add('choice-native');select.tabIndex=-1;select.setAttribute('aria-hidden','true');
  const segmented=['episodes','details','subFont'].includes(key),options=[...select.options];
  if(segmented){root.classList.add('preference-segments');root.setAttribute('role','group');root.setAttribute('aria-label',label);const buttons=options.map(option=>{const button=document.createElement('button');button.type='button';button.textContent=option.textContent.replace(' style','');button.dataset.value=option.value;button.onclick=event=>{event.preventDefault();select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}))};root.append(button);return button});const update=()=>buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.value===select.value)));select.addEventListener('change',update);update();continue}
  const button=document.createElement('button'),menu=document.createElement('div');button.type='button';button.className='preference-trigger';button.setAttribute('role','combobox');button.setAttribute('aria-label',label);button.setAttribute('aria-haspopup','listbox');button.setAttribute('aria-expanded','false');menu.id='preference-options-'+(++sequence);button.setAttribute('aria-controls',menu.id);menu.className='preference-options';menu.setAttribute('role','listbox');menu.setAttribute('aria-label',label);menu.hidden=true;
  let current=select.selectedIndex,typeAhead='',typeTimer;
  const choices=options.map((option,index)=>{const item=document.createElement('button');item.type='button';item.tabIndex=-1;item.setAttribute('role','option');item.dataset.value=option.value;item.append(document.createTextNode(option.textContent));const check=document.createElement('span');check.innerHTML=playerIcon('check');item.append(check);item.onclick=event=>{event.preventDefault();select.value=option.value;select.dispatchEvent(new Event('change',{bubbles:true}));closeChoice();button.focus()};menu.append(item);return item});
  const update=()=>{button.replaceChildren(document.createTextNode(select.selectedOptions[0]?.textContent||''));const arrow=document.createElement('span');arrow.innerHTML=playerIcon('chevron');button.append(arrow);choices.forEach(item=>item.setAttribute('aria-selected',String(item.dataset.value===select.value)))};select.addEventListener('change',update);update();
  const focus=index=>{current=(index+choices.length)%choices.length;choices[current].focus();choices[current].scrollIntoView({block:'nearest'})};
  const show=()=>{closeChoice();menu.hidden=false;button.setAttribute('aria-expanded','true');openChoice={root,menu,button};root.classList.toggle('choice-up',root.getBoundingClientRect().bottom+Math.min(320,choices.length*42)>innerHeight&&root.getBoundingClientRect().top>200);focus(select.selectedIndex)};
  button.onclick=event=>{event.preventDefault();openChoice?.root===root?closeChoice():show()};
  root.addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp','Home','End','Escape'].includes(event.key)){event.preventDefault();if(event.key==='Escape'){closeChoice();button.focus();return}if(menu.hidden){show();return}focus(event.key==='Home'?0:event.key==='End'?choices.length-1:current+(event.key==='ArrowDown'?1:-1))}else if(event.key==='Tab')closeChoice();else if(event.key.length===1&&!event.ctrlKey&&!event.metaKey&&event.key!==' '){clearTimeout(typeTimer);typeAhead+=event.key.toLowerCase();const index=options.findIndex(option=>option.textContent.toLowerCase().startsWith(typeAhead));if(menu.hidden)show();if(index>=0)focus(index);typeTimer=setTimeout(()=>typeAhead='',600)}});
  root.addEventListener('focusout',event=>{if(!root.contains(event.relatedTarget))closeChoice()});root.append(button,menu);
 }
 for(const input of host.querySelectorAll('input[type="range"][data-pref]')){
  const output=document.createElement('output');output.className='preference-range-value';input.before(output);const update=()=>{output.value=input.value+'%';input.style.setProperty('--range-progress',((Number(input.value)-Number(input.min))/(Number(input.max)-Number(input.min))*100)+'%')};input.addEventListener('input',()=>{update();input.dispatchEvent(new Event('change',{bubbles:true}))});update();
 }
}

export function installSourceReordering(host,{order,providers,onChange,notify}){
 let dragged=null;
 const move=(from,to,focus=true)=>{if(from===to||to<0||to>=order.length)return;const [id]=order.splice(from,1);order.splice(to,0,id);onChange([...order]);draw();if(focus)host.querySelector('[data-reorder="'+id+'"]')?.focus();notify('Source order saved')};
 function draw(){host.replaceChildren();for(const [index,id] of order.entries()){
  const provider=providers.find(p=>p.id===id),row=document.createElement('div');row.className='server-order-row';row.draggable=true;row.dataset.sourceOrder=id;
  const handle=document.createElement('button');handle.type='button';handle.className='source-drag-handle';handle.dataset.reorder=id;handle.innerHTML=playerIcon('grip');handle.setAttribute('aria-label','Reorder '+provider.name+' (drag, or Alt + arrow keys)');handle.onkeydown=event=>{if(event.altKey&&['ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();move(index,index+(event.key==='ArrowDown'?1:-1))}};
  const name=document.createElement('span');name.textContent=provider.name;row.append(handle,name);
  for(const [direction,label]of [[-1,'up'],[1,'down']]){const button=document.createElement('button');button.type='button';button.className='source-reorder-arrow';button.textContent=direction===1?'↓':'↑';button.setAttribute('aria-label','Move '+id+' '+label);button.disabled=index+direction<0||index+direction>=order.length;button.onclick=()=>move(index,index+direction);row.append(button)}
  row.ondragstart=event=>{dragged=id;row.classList.add('dragging');event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',id)};row.ondragover=event=>{if(dragged){event.preventDefault();event.dataTransfer.dropEffect='move';row.classList.add('drag-target')}};row.ondragleave=()=>row.classList.remove('drag-target');row.ondrop=event=>{event.preventDefault();row.classList.remove('drag-target');if(dragged)move(order.indexOf(dragged),index);dragged=null};row.ondragend=()=>{dragged=null;host.querySelectorAll('.dragging,.drag-target').forEach(e=>e.classList.remove('dragging','drag-target'))};host.append(row)
 }}draw();
}
