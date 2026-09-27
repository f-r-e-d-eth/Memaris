const q=s=>document.querySelector(s);
const entriesEl=q('#entries'),textEl=q('#entryText'),statusEl=q('#status'),dateEl=q('#dateDisplay'),saveButton=q('#saveButton'),newButton=q('#newButton'),opacitySlider=q('#opacitySlider'),fontSlider=q('#fontSlider'),colorPicker=q('#colorPicker'),backgroundButton=q('#backgroundButton'),backgroundEl=q('#background');
let entries=[],backgrounds=[],backgroundIndex=0,currentId=null,dateFormat=Number(localStorage.getItem('memarisDateFormat')||0);
const formats=[
 d=>d.toLocaleString('sv-SE',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}),
 d=>d.toLocaleString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}),
 d=>d.toLocaleString('en-GB',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}),
 d=>d.toLocaleString('en-US',{month:'long',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}),
 d=>d.toLocaleString('en-US',{weekday:'long',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}),
 d=>d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',hour12:false})
];
function esc(v){const d=document.createElement('div');d.textContent=v;return d.innerHTML}
function dt(value){return value?new Date(value):new Date()}
function showDate(value){dateEl.textContent=formats[dateFormat](dt(value))}
function currentBackground(){return backgrounds[backgroundIndex]||''}
function applyVisual(e={}){
 const glass=e.glass??Number(opacitySlider.value),size=e.font_size??Number(fontSlider.value),color=e.color||colorPicker.value||'#ffffff';
 opacitySlider.value=glass;fontSlider.value=size;colorPicker.value=color;
 document.documentElement.style.setProperty('--panel-alpha',glass/100);
 document.documentElement.style.setProperty('--entry-size',size+'px');
 textEl.style.color=color;
 if(e.background&&backgrounds.includes(e.background)){backgroundIndex=backgrounds.indexOf(e.background);backgroundEl.style.backgroundImage='url("'+e.background+'")'}
}
function render(){
 if(!entries.length){entriesEl.innerHTML='<div class="entry-preview">No entries yet.</div>';return}
 let day='';
 entriesEl.innerHTML=entries.map(e=>{const d=dt(e.created),iso=e.created.slice(0,10),heading=iso!==day?'<div class="day">'+esc(iso)+'</div>':'';day=iso;return heading+'<div class="entry '+(e.id===currentId?'active':'')+'" data-id="'+e.id+'"><div class="entry-time">'+d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',hour12:false})+'</div><div class="entry-preview" style="color:'+esc(e.color||'#ffffff')+'">'+esc(e.text)+'</div></div>'}).join('');
 document.querySelectorAll('.entry').forEach(el=>el.addEventListener('click',()=>openEntry(el.dataset.id)))
}
function openEntry(id){const e=entries.find(x=>x.id===id);if(!e)return;currentId=id;textEl.value=e.text;showDate(e.created);applyVisual(e);statusEl.textContent=e.modified!==e.created?'Edited '+formats[0](dt(e.modified)):'Existing entry';saveButton.textContent='Update';render()}
function newEntry(){currentId=null;textEl.value='';showDate();statusEl.textContent='New entry';saveButton.textContent='Save';render();textEl.focus()}
async function loadEntries(){const r=await fetch('/api/entries');entries=await r.json();render()}
async function save(){
 const text=textEl.value.trim();if(!text)return;
 const payload={text,color:colorPicker.value,background:currentBackground(),glass:Number(opacitySlider.value),font_size:Number(fontSlider.value)};
 saveButton.disabled=true;statusEl.textContent='Saving…';
 const url=currentId?'/api/entries/'+currentId:'/api/entries',method=currentId?'PUT':'POST';
 const r=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
 if(r.ok){const saved=await r.json();currentId=saved.id;statusEl.textContent='Saved.';saveButton.textContent='Update';await loadEntries();showDate(saved.created)}
 else{const d=await r.json();statusEl.textContent=d.error||'Could not save.'}
 saveButton.disabled=false
}
async function loadBackgrounds(){const r=await fetch('/api/backgrounds');backgrounds=await r.json();if(backgrounds.length){backgroundEl.style.backgroundImage='url("'+backgrounds[0]+'")'}}
newButton.addEventListener('click',newEntry);saveButton.addEventListener('click',save);
textEl.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter')save()});
opacitySlider.addEventListener('input',()=>document.documentElement.style.setProperty('--panel-alpha',opacitySlider.value/100));
fontSlider.addEventListener('input',()=>document.documentElement.style.setProperty('--entry-size',fontSlider.value+'px'));
colorPicker.addEventListener('input',()=>textEl.style.color=colorPicker.value);
backgroundButton.addEventListener('click',()=>{if(!backgrounds.length)return;backgroundIndex=(backgroundIndex+1)%backgrounds.length;backgroundEl.style.backgroundImage='url("'+backgrounds[backgroundIndex]+'")'});
dateEl.addEventListener('click',()=>{dateFormat=(dateFormat+1)%formats.length;localStorage.setItem('memarisDateFormat',dateFormat);const e=entries.find(x=>x.id===currentId);showDate(e?.created)});
(async()=>{await loadBackgrounds();await loadEntries();newEntry()})();
