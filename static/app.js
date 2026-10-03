const q=s=>document.querySelector(s);
const entriesEl=q('#entries'),textEl=q('#entryText'),statusEl=q('#status'),dateEl=q('#dateDisplay'),eventTimeEl=q('#eventTime'),editDateButton=q('#editDateButton'),recurrenceButton=q('#recurrenceButton'),saveButton=q('#saveButton'),newButton=q('#newButton'),opacitySlider=q('#opacitySlider'),fontSlider=q('#fontSlider'),colorPicker=q('#colorPicker'),backgroundButton=q('#backgroundButton'),backgroundEl=q('#background');
let entries=[],backgrounds=[],backgroundIndex=0,currentId=null,dateFormat=Number(localStorage.getItem('memarisDateFormat')||0),recurrence='none',cleanState='';
const recurrenceModes=['none','yearly','biweekly','weekly'];
const recurrenceLabels={none:'↻ Off',yearly:'↻ Yearly',biweekly:'↻ 2 Weeks',weekly:'↻ Weekly'};
const recurrenceWindows={yearly:30,biweekly:7,weekly:3};
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
function localInputValue(value){const d=dt(value),p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T'+p(d.getHours())+':'+p(d.getMinutes())}
function showDate(value){dateEl.textContent=formats[dateFormat](dt(value))}
function currentBackground(){return backgrounds[backgroundIndex]||''}
function eventValue(e){return e.event_time||e.created}
function todayISO(){return localInputValue().slice(0,10)}
function editorState(){return JSON.stringify({text:textEl.value,event_time:eventTimeEl.value,recurrence,color:colorPicker.value,background:currentBackground(),glass:Number(opacitySlider.value),font_size:Number(fontSlider.value)})}
function markClean(){cleanState=editorState();saveButton.disabled=true}
function isDirty(){return editorState()!==cleanState}
function updateDirty(){saveButton.disabled=!isDirty()}
async function saveIfNeeded(){
 if(!isDirty())return true;
 if(!textEl.value.trim()){return true}
 return await save()
}
function setRecurrence(value){recurrence=recurrenceModes.includes(value)?value:'none';recurrenceButton.textContent=recurrenceLabels[recurrence];recurrenceButton.title=recurrence==='none'?'Recurrence: Off':'Recurrence: '+recurrenceLabels[recurrence].replace('↻ ','')+' · upcoming window '+recurrenceWindows[recurrence]+' days'}
function addYearsSafe(d,years){const r=new Date(d);const month=r.getMonth();r.setFullYear(r.getFullYear()+years);if(r.getMonth()!==month){r.setDate(0)}return r}
function displayOccurrence(e){
 const anchor=dt(eventValue(e)),mode=e.recurrence||'none';if(mode==='none')return anchor;
 const now=new Date(),windowDays=recurrenceWindows[mode],msDay=86400000;
 let previous,next;
 if(mode==='yearly'){
   let candidate=addYearsSafe(anchor,now.getFullYear()-anchor.getFullYear());
   if(candidate>now){next=candidate;previous=addYearsSafe(candidate,-1)}else{previous=candidate;next=addYearsSafe(candidate,1)}
 }else{
   const days=mode==='biweekly'?14:7,step=days*msDay;
   if(now<anchor){next=anchor;previous=new Date(anchor.getTime()-step)}
   else{const n=Math.floor((now-anchor)/step);previous=new Date(anchor.getTime()+n*step);next=new Date(previous.getTime()+step)}
 }
 const until=(next-now)/msDay;
 return until>=0&&until<=windowDays?next:previous
}
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
 const shown=entries.map(e=>({e,d:displayOccurrence(e)})).sort((a,b)=>b.d-a.d);
 let day='',month='',year='',todayInserted=false,html='';
 for(const item of shown){
   const e=item.e,d=item.d,iso=localInputValue(d).slice(0,10),itemMonth=iso.slice(0,7),itemYear=iso.slice(0,4);
   if(!todayInserted&&iso<=todayISO()){html+='<div class="today-divider"><span>TODAY</span></div>';todayInserted=true;day=''}
   if(itemYear!==year){html+='<div class="year-divider"><span>'+esc(itemYear)+'</span></div>';year=itemYear;month='';day=''}
   if(itemMonth!==month){html+='<div class="month-divider"><span>'+esc(itemMonth)+'</span></div>';month=itemMonth;day=''}
   if(iso!==day){html+='<div class="day">'+esc(iso)+'</div>';day=iso}
   const recur=e.recurrence&&e.recurrence!=='none'?'<span class="recurrence-mark" title="'+esc(recurrenceLabels[e.recurrence].replace('↻ ',''))+'">↻</span> ':'';
   html+='<div class="entry '+(e.id===currentId?'active':'')+'" data-id="'+e.id+'"><div class="entry-time">'+recur+d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',hour12:false})+'</div><div class="entry-preview" style="color:'+esc(e.color||'#ffffff')+'">'+esc(e.text)+'</div></div>'
 }
 if(!todayInserted)html+='<div class="today-divider"><span>TODAY</span></div>';
 entriesEl.innerHTML=html;
 document.querySelectorAll('.entry').forEach(el=>el.addEventListener('click',async()=>{if(await saveIfNeeded())openEntry(el.dataset.id)}))
}
function openEntry(id){
 const e=entries.find(x=>x.id===id);if(!e)return;
 currentId=id;textEl.value=e.text;eventTimeEl.value=localInputValue(eventValue(e));showDate(eventValue(e));setRecurrence(e.recurrence||'none');applyVisual(e);
 statusEl.textContent=e.modified!==e.created?'Edited '+formats[0](dt(e.modified)):'Existing entry';saveButton.textContent='↶ Revert';markClean();render()
}
function newEntry(){
 currentId=null;textEl.value='';eventTimeEl.value=localInputValue();showDate(eventTimeEl.value);setRecurrence('none');statusEl.textContent='New entry';saveButton.textContent='↶ Revert';markClean();render();textEl.focus()
}
async function loadEntries(){const r=await fetch('/api/entries');entries=await r.json();render()}
async function save(){
 const text=textEl.value.trim();if(!text)return false;
 const payload={text,event_time:eventTimeEl.value,recurrence,color:colorPicker.value,background:currentBackground(),glass:Number(opacitySlider.value),font_size:Number(fontSlider.value)};
 statusEl.textContent='Saving…';
 const url=currentId?'/api/entries/'+currentId:'/api/entries',method=currentId?'PUT':'POST';
 const r=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
 if(r.ok){const saved=await r.json();currentId=saved.id;statusEl.textContent='Saved.';saveButton.textContent='↶ Revert';await loadEntries();eventTimeEl.value=localInputValue(eventValue(saved));showDate(eventValue(saved));setRecurrence(saved.recurrence||'none');applyVisual(saved);markClean();return true}
 else{const d=await r.json();statusEl.textContent=d.error||'Could not save.';updateDirty();return false}
}
async function loadBackgrounds(){const r=await fetch('/api/backgrounds');backgrounds=await r.json();if(backgrounds.length){backgroundEl.style.backgroundImage='url("'+backgrounds[0]+'")'}}
function revert(){
 if(!isDirty())return;
 if(!currentId){newEntry();return}
 const e=entries.find(x=>x.id===currentId);if(!e)return;
 textEl.value=e.text;eventTimeEl.value=localInputValue(eventValue(e));showDate(eventValue(e));setRecurrence(e.recurrence||'none');applyVisual(e);
 statusEl.textContent='Changes reverted.';markClean()
}
newButton.addEventListener('click',async()=>{if(await saveIfNeeded())newEntry()});saveButton.addEventListener('click',revert);
textEl.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter')save()});
textEl.addEventListener('input',updateDirty);
opacitySlider.addEventListener('input',()=>{document.documentElement.style.setProperty('--panel-alpha',opacitySlider.value/100);updateDirty()});
fontSlider.addEventListener('input',()=>{document.documentElement.style.setProperty('--entry-size',fontSlider.value+'px');updateDirty()});
colorPicker.addEventListener('input',()=>{textEl.style.color=colorPicker.value;updateDirty()});
backgroundButton.addEventListener('click',()=>{if(!backgrounds.length)return;backgroundIndex=(backgroundIndex+1)%backgrounds.length;backgroundEl.style.backgroundImage='url("'+backgrounds[backgroundIndex]+'")'});
dateEl.addEventListener('click',()=>{dateFormat=(dateFormat+1)%formats.length;localStorage.setItem('memarisDateFormat',dateFormat);showDate(eventTimeEl.value)});
editDateButton.addEventListener('click',()=>{eventTimeEl.showPicker?eventTimeEl.showPicker():eventTimeEl.focus()});
eventTimeEl.addEventListener('change',()=>{showDate(eventTimeEl.value);updateDirty()});
recurrenceButton.addEventListener('click',()=>{setRecurrence(recurrenceModes[(recurrenceModes.indexOf(recurrence)+1)%recurrenceModes.length]);updateDirty()});
(async()=>{await loadBackgrounds();await loadEntries();newEntry()})();
