/* UI only: source/model settings never write to prediction storage. */
(()=>{
 'use strict';
 const KEY='my-midterm-prediction-board-v1';
 const $=id=>document.getElementById(id);
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const partyClass=party=>party==='Democrat'?'dem':party==='Republican'?'rep':party==='Independent'?'ind':'other';
 const date=value=>value&&Number.isFinite(Date.parse(value))?new Date(value).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'}):'Not recorded';
 const safeLink=url=>/^https:\/\//.test(url||'')?url:'#';
 let data={predictions:[],history:[]},storageOK=true,snapshot={races:{}},pollData={polls:[]},tab='senate',loadErrors=[];
 let viewMode='cards',selectedRace=null;
 const initialScenario=window.location?.hash||'';
 try{const saved=localStorage.getItem(KEY);if(saved)data=BoardBackup.parse(saved);}catch(error){storageOK=false;$('status').textContent='Saved board could not be read: '+error.message+'. Export the original data before replacing it.';}
 const races=BoardData.races;
 function setStatus(text){$('status').textContent=text;}
 function currentPick(race){return data.predictions.find(p=>p.state.toLowerCase()===race.state.toLowerCase()&&p.type===race.office&&(race.office!=='Ballot'||p.district===race.district));}
 function selectedPoll(){return pollData.polls.find(p=>p.id===$('pollChoice').value);}
 function model(race,scenario={swing:Number($('swing').value),spread:Number($('spread').value)}){
  const mode=$('sourceMode').value,poll=selectedPoll();
  return Forecast.estimate(race,snapshot.races?.[race.id]?.sources||{},mode,Number($('weight').value)/100,mode==='single'&&poll?.raceId===race.id?{...poll,fetchedAt:poll.fetchedAt||pollData.fetchedAt}:mode==='single'?{}:null,Date.now(),scenario);
 }
 function focusRace(id,scroll=false){
  if(!races.some(r=>r.id===id&&r.tab===tab))return;
  selectedRace=id;render();
  if(scroll)document.querySelector?.('[data-race="'+id+'"]')?.scrollIntoView?.({behavior:'smooth',block:'center'});
 }
 function renderMap(visible){
  const allowed=tab==='senate'||tab==='governor';
  $('explorerControls').hidden=!allowed;$('mapPanel').hidden=!allowed||viewMode!=='map';
  $('mapLayerControl').hidden=!allowed||viewMode!=='map';
  $('cardsView').setAttribute('aria-pressed',String(viewMode==='cards'));$('mapView').setAttribute('aria-pressed',String(viewMode==='map'));
  if(!allowed||viewMode!=='map')return;
  const layer=$('mapLayer').value;
  const entries=visible.map(r=>({...r,model:model(r),pick:currentPick(r)}));
  $('mapTitle').textContent=(tab==='senate'?'Senate':'Governor')+' · '+(layer==='picks'?'my picks only':'model estimates');
  $('mapCanvas').innerHTML=StateMap.markup(statePaths,entries,layer,selectedRace);
  StateMap.annotate(document.querySelector?.('#stateSvg'));
  document.querySelectorAll('[data-map-race]').forEach(path=>{
   path.onclick=()=>focusRace(path.dataset.mapRace,true);
   path.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();focusRace(path.dataset.mapRace,true);}};
  });
  $('mapStateButtons').innerHTML=entries.slice().sort((a,b)=>a.state.localeCompare(b.state)).map(r=>'<button data-map-shortcut="'+esc(r.id)+'" aria-pressed="'+(r.id===selectedRace)+'">'+esc(r.state)+'</button>').join('');
  document.querySelectorAll('[data-map-shortcut]').forEach(b=>b.onclick=()=>focusRace(b.dataset.mapShortcut,true));
  const swatch=(fill,text)=>'<span><i style="background:'+fill+'"></i>'+text+'</span>';
  $('mapLegend').innerHTML=layer==='picks'?swatch('#3157d5','Your Democratic pick')+swatch('#bc414b','Your Republican pick')+swatch('#7853a7','Independent / other')+swatch('#fff','No call'):swatch(StateMap.probabilityColor(.95,'Democrat'),'D 95%')+swatch(StateMap.probabilityColor(.7,'Democrat'),'D 70%')+swatch(StateMap.probabilityColor(.5,'Democrat'),'Even 50%')+swatch(StateMap.probabilityColor(.7,'Republican'),'R 70%')+swatch(StateMap.probabilityColor(.95,'Republican'),'R 95%')+'<span><i style="background:repeating-linear-gradient(135deg,#f4f6fa 0 3px,#a7b2c4 3px 4px)"></i>No supported estimate</span>';
  $('mapLegend').innerHTML+=swatch('#e1e5eb','Outside this view / shortlist');
  const selected=entries.find(r=>r.id===selectedRace);
  $('mapSelection').textContent=selected?selected.state+' selected · '+(layer==='picks'?(selected.pick?'Your call: '+selected.pick.winner:'You have not made a call.'):'Source: '+$('sourceMode').selectedOptions?.[0]?.textContent+' · '+model(selected).label):'Select a state to highlight its card.';
 }
 function renderScenarios(visible){
  const allowed=tab==='senate'||tab==='governor';$('scenarioPanel').hidden=!allowed;
  if(!allowed)return;
  const race=visible.find(r=>r.id===selectedRace)||visible[0];
  if(!race){$('scenarioTitle').textContent='Race sensitivity';$('scenarioSubtitle').textContent='No race matches these filters.';$('scenarioComparison').innerHTML='';return;}
  $('scenarioTitle').textContent=race.state+' · race sensitivity';
  $('scenarioSubtitle').textContent='Same source, base weights and '+$('spread').value+'× uncertainty in each scenario. These are assumptions, not probabilities of a polling miss.';
  $('scenarioComparison').innerHTML=[['Baseline',0],['Democratic overperformance',2],['Republican overperformance',-2]].map(([label,swing])=>{
   const result=model(race,{swing,spread:Number($('spread').value)});
   return '<div class="scenario-result"><p>'+label+' ('+(swing>0?'+':'')+swing+' pp)</p>'+(result.probabilities?'<strong>'+Math.round(result.probabilities[0]*100)+'%</strong><p class="mini">'+esc(race.candidates[0].name)+' wins · '+esc(result.label)+'</p>':'<p class="mini">'+esc(result.reason)+'</p>')+'<button data-scenario="'+swing+'">Apply '+(swing===0?'baseline':(swing>0?'+':'')+swing+' pp')+'</button></div>';
  }).join('');
  document.querySelectorAll('[data-scenario]').forEach(b=>b.onclick=()=>{$('swing').value=b.dataset.scenario;render();});
 }
 function scenarioHash(){
  return new URLSearchParams({tab,source:$('sourceMode').value,state:$('stateFilter').value,poll:$('pollChoice').value,weight:$('weight').value,bias:$('swing').value,spread:$('spread').value,view:viewMode,layer:$('mapLayer').value,race:selectedRace||''}).toString();
 }
 function readScenario(hash=window.location?.hash||''){
  const p=new URLSearchParams(hash.slice(1));
  if(['senate','governor','mo','ma'].includes(p.get('tab')))tab=p.get('tab');
  if(['combined','market','polls','single'].includes(p.get('source')))$('sourceMode').value=p.get('source');
  const weight=Number(p.get('weight')),bias=Number(p.get('bias'));
  if(p.has('weight')&&Number.isFinite(weight)&&weight>=0&&weight<=100)$('weight').value=String(weight);
  if(p.has('bias')&&Number.isFinite(bias)&&bias>=-6&&bias<=6)$('swing').value=String(bias);
  if(['.75','0.75','1','1.5','2'].includes(p.get('spread')))$('spread').value=p.get('spread')==='.75'?'0.75':p.get('spread');
  if(['cards','map'].includes(p.get('view')))viewMode=p.get('view');
  if(['model','picks'].includes(p.get('layer')))$('mapLayer').value=p.get('layer');
  fillFilters();
  if(races.some(r=>r.tab===tab&&r.state===p.get('state')))$('stateFilter').value=p.get('state');
  if(pollData.polls.some(r=>r.id===p.get('poll')&&races.some(x=>x.id===r.raceId&&x.tab===tab)))$('pollChoice').value=p.get('poll');
  if(races.some(r=>r.id===p.get('race')&&r.tab===tab))selectedRace=p.get('race');
  document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.tab===tab)));
  $('racePanel').setAttribute('aria-labelledby','tab-'+tab);
 }
 function fillFilters(){
  const previous=$('stateFilter').value;
  const states=[...new Set(races.filter(r=>r.tab===tab).map(r=>r.state))].sort();
  $('stateFilter').innerHTML='<option value="all">All tracked states</option>'+states.map(state=>`<option value="${esc(state)}">${esc(state)}</option>`).join('');
  $('stateFilter').value=states.includes(previous)?previous:'all';
  const priorPoll=$('pollChoice').value;
  const polls=pollData.polls.filter(p=>races.some(r=>r.id===p.raceId&&r.tab===tab));
  $('pollChoice').innerHTML=polls.length?polls.map(p=>`<option value="${esc(p.id)}">${esc(p.raceId.split('|')[0])} · ${esc(p.pollster)} · through ${esc(p.publishedAt)}</option>`).join(''):'<option value="">No individual polls collected for this tab</option>';
  if(polls.some(p=>p.id===priorPoll))$('pollChoice').value=priorPoll;
 }
 function sourceDetail(name,record){
  if(!record)return `<section><h4>${name}</h4><p class="mini">No verified record.</p></section>`;
  const fresh=Forecast.eligible(record,Date.now(),name==='RCP');
  return `<section><h4>${name}</h4><p>${esc(record.value||'No numeric value')}</p><p class="provenance">${esc(record.status||'unknown')}${!fresh?' · excluded from model':''}<br>Fetched: ${esc(date(record.fetchedAt))}${record.publishedAt?'<br>Fieldwork / source date: '+esc(record.publishedAt):''}${record.lastAttemptedAt?'<br>Last attempted: '+esc(date(record.lastAttemptedAt)):''}</p>${record.error?'<p class="mini">'+esc(record.error)+'</p>':''}${record.note?'<p class="mini">'+esc(record.note)+'</p>':''}<a href="${esc(safeLink(record.url))}" target="_blank" rel="noopener">Open source</a></section>`;
 }
 function renderCard(race){
  const m=model(race),pick=currentPick(race),records=snapshot.races?.[race.id]?.sources||{},mode=$('sourceMode').value,poll=selectedPoll();
  const first=m.probabilities?Math.round(m.probabilities[0]*100):null;
  const metric=first===null?'Not scored':m.label;
  const raw=m.marketShares?.some(v=>v!==null)?m.marketShares.map(v=>v===null?'—':v+'%').join(' / '):'Not collected';
  const support=m.pollShares?.some(v=>v!==null)?m.pollShares.map(v=>v===null?'—':v+'%').join(' / '):'No numeric poll data';
  const names=race.candidates.map((c,i)=>`<div class="candidate-line"><span>${esc(c.name)}${race.office!=='Ballot'?'<br><span class="party">'+esc(c.party)+'</span>':''}</span>${first!==null?'<strong class="probability tabular-nums">'+(i===0?first:100-first)+'%</strong>':''}</div>`).join('');
  const numericInputs=(mode==='market'?`Kalshi quotes: ${raw}`:mode==='single'?`Selected poll support: ${support}`:mode==='polls'?`RCP support: ${support}`:`RCP support: ${support}<br>Kalshi quotes: ${raw}`);
  const weights=m.effectiveWeights?`Effective weights: polls ${Math.round(m.effectiveWeights.polls*100)}% / Kalshi ${Math.round(m.effectiveWeights.market*100)}%.`:'';
  const polls=pollData.polls.filter(p=>p.raceId===race.id);
  return `<article class="race-card ${selectedRace===race.id?'focused ':''}${race.office==='Ballot'?'issue':''}" data-race="${esc(race.id)}"><div class="kicker">${esc(race.state)} · ${esc(race.office)}</div><h3>${esc(race.title)}</h3><p class="subtitle">${esc(race.subtitle||'Tracked leading candidates')}</p><button class="focus-race" data-focus-race="${esc(race.id)}">Compare this race / highlight map</button><div class="estimate-label">${esc(metric)}</div>${names}${first!==null?'<div class="prob-bar" aria-label="'+first+'% versus '+(100-first)+'%"><span style="width:'+first+'%"></span><span style="width:'+(100-first)+'%"></span></div>':'<p class="unscored">'+esc(m.reason)+'</p>'}<p class="mini">${numericInputs}</p>${mode==='single'&&poll?'<p class="mini">'+esc(poll.pollster)+' · fieldwork ended '+esc(poll.publishedAt)+'</p>':''}${first!==null?'<p class="mini">'+esc(weights)+'<br>'+esc(m.reason)+'</p>':''}${pick?'<p class="mini">Your current call: <strong>'+esc(pick.winner)+'</strong></p>':''}<div class="picks">${race.candidates.map((c,i)=>`<button class="pick ${partyClass(c.party)}" data-pick="${esc(race.id)}" data-choice="${i}" aria-pressed="${pick?.winner===c.name}" ${!storageOK?'disabled':''}>${pick?.winner===c.name?'My call: ':'Pick: '}${esc(c.name)}</button>`).join('')}</div><details class="source-details"><summary>Sources &amp; assumptions</summary>${race.office==='Ballot'?'<p><strong>Yes:</strong> '+esc(race.yes)+'</p><p><strong>No:</strong> '+esc(race.no)+'</p><p class="mini">Short paraphrase; read the official ballot wording. Verified '+esc(date(race.verifiedAt))+'. No issue polling or market price has been collected.</p><a href="'+esc(race.url)+'" target="_blank" rel="noopener">Official ballot question</a>':''}${sourceDetail('Kalshi',records.kalshi)}${sourceDetail('RCP',records.rcp)}${sourceDetail('Sabato (context only)',records.sabato)}${sourceDetail('Cook (context only)',records.cook)}${polls.length?'<section><h4>Individual polls available</h4>'+polls.map(p=>'<p class="mini">'+esc(p.pollster)+' · '+esc(p.fieldStart)+'–'+esc(p.publishedAt)+'<br>'+esc(p.shares.map(s=>s.name+' '+s.value+'%').join('; '))+'<br>As listed by RCP; fetched '+esc(date(p.fetchedAt||pollData.fetchedAt))+' · <a href="'+esc(safeLink(p.sourceUrl))+'" target="_blank" rel="noopener">Source</a></p>').join('')+'</section>':''}${m.pollingInterval&&mode!=='market'?'<p class="mini">Assumed 90% polling-margin range: '+m.pollingInterval.map(v=>v.toFixed(1)).join(' to ')+' pp for '+esc(race.candidates[0].name)+' versus '+esc(race.candidates[1].name)+'. Not an empirically calibrated interval.</p>':''}<p class="mini">Model ${Forecast.VERSION}; avg margin SD 4pp, single-poll SD 6pp, increased with age. No historical calibration. Filtering never changes your call.</p></details></article>`;
 }
 function render(){
  const mode=$('sourceMode').value;
  const swing=Number($('swing').value);
  $('swingLabel').textContent=(swing>0?'+':'')+swing+' pp';
  $('pollControl').hidden=mode!=='single';$('weightControl').hidden=mode!=='combined';$('weightLabel').textContent=$('weight').value+'%';
  let visible=races.filter(r=>r.tab===tab&&($('stateFilter').value==='all'||r.state===$('stateFilter').value));
  if(mode==='single'&&selectedPoll())visible=visible.filter(r=>r.id===selectedPoll().raceId);
  visible.sort((a,b)=>{
   if($('sortOrder').value==='close'){
    const ap=model(a).probabilities,bp=model(b).probabilities;
    const diff=(ap?Math.abs(ap[0]-.5):2)-(bp?Math.abs(bp[0]-.5):2);if(diff)return diff;
   }
   return (a.state+a.title).localeCompare(b.state+b.title,undefined,{numeric:true});
  });
  if(!visible.some(r=>r.id===selectedRace))selectedRace=visible[0]?.id||null;
  $('coverage').textContent=`${visible.length} cards · ${tab==='mo'||tab==='ma'?'Certified statewide measures; no issue polling or markets collected yet.':'Existing tracked competitive-race shortlist; not all U.S. races.'} Source snapshot: ${date(snapshot.generatedAt)}. Individual polls: ${date(pollData.fetchedAt)}.`;
  $('cards').innerHTML=visible.length?visible.map(renderCard).join(''):'<div class="empty">No races match this state and source selection. Choose another state or source.</div>';
  document.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>makePick(b.dataset.pick,Number(b.dataset.choice)));
  document.querySelectorAll('[data-focus-race]').forEach(b=>b.onclick=()=>focusRace(b.dataset.focusRace));
  renderMap(visible);renderScenarios(visible);
  window.history?.replaceState?.(null,'','#'+scenarioHash());
  renderSaved();
 }
 function persist(next){
  if(!storageOK)throw Error('Import a valid backup before changing the unreadable board.');
  BoardBackup.validate(next);localStorage.setItem(KEY,JSON.stringify(next));data=next;render();
 }
 function makePick(id,index){
  const race=races.find(r=>r.id===id),candidate=race?.candidates[index];if(!candidate)return;
  const old=currentPick(race);if(old?.winner===candidate.name)return;
  const timestamp=new Date().toISOString();
  const p={...(old||{}),id:old?.id||crypto.randomUUID(),state:race.state,type:race.office,district:race.district||'',winner:candidate.name,party:candidate.party,date:timestamp.slice(0,10),updatedAt:timestamp,confidence:old?.confidence||'Medium',notes:old?.notes||''};
  try{persist({predictions:old?data.predictions.map(x=>x.id===old.id?p:x):[...data.predictions,p],history:[...data.history,{...p,historyId:crypto.randomUUID(),savedAt:timestamp}]});setStatus('Saved your call: '+race.state+' '+(race.district||race.office)+' — '+candidate.name);}catch(error){setStatus('Could not save: '+error.message);}
 }
 function sortedCalls(){return [...data.predictions].sort((a,b)=>(a.state+a.type+a.district).localeCompare(b.state+b.type+b.district,undefined,{numeric:true}));}
 function raceLabel(p){return p.state+' · '+p.type+(p.district?' · '+p.district:'');}
 function renderSaved(){
  $('savedCount').textContent=data.predictions.length+' calls';
  $('savedCalls').innerHTML=sortedCalls().map(p=>`<div class="saved-row"><span><strong>${esc(raceLabel(p))}</strong><br>${esc(p.winner)}</span><button data-clear="${esc(p.id)}">Clear call</button></div>`).join('')||'<p class="mini">No picks yet. Choose a winner on a card, or import your existing board.</p>';
  document.querySelectorAll('[data-clear]').forEach(b=>b.onclick=()=>{
   const p=data.predictions.find(x=>x.id===b.dataset.clear);if(!p||!confirm('Clear this call? The history will remain.'))return;
   try{persist({predictions:data.predictions.filter(x=>x.id!==p.id),history:[...data.history,{...p,historyId:crypto.randomUUID(),savedAt:new Date().toISOString(),action:'cleared'}]});setStatus('Call cleared; history retained.');}catch(error){setStatus(error.message);}
  });
  $('historySummary').textContent='My prediction history · '+data.history.length+' entries';
  $('historyList').innerHTML=[...data.history].sort((a,b)=>b.savedAt.localeCompare(a.savedAt)).map(h=>'<div class="history-entry"><strong>'+esc(raceLabel(h))+'</strong> — '+(h.action==='cleared'?'Cleared previous call: ':'')+esc(h.winner)+'<br><span class="mini">'+esc(date(h.savedAt))+'</span></div>').join('')||'<p>No history yet.</p>';
 }
 function download(text,name){const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 $('exportBtn').onclick=()=>{try{download(storageOK?BoardBackup.serialize(data):localStorage.getItem(KEY)||'{}',storageOK?'my-midterm-predictions.json':'unreadable-board-original.json');setStatus('Backup download requested. Keep this file private.');}catch(error){setStatus('Export failed: '+error.message);}};
 $('importFile').onchange=async event=>{
  const file=event.target.files[0];event.target.value='';if(!file)return;
  try{
   if(file.size>10*1024*1024)throw Error('Backup must be smaller than 10 MB.');
   const incoming=BoardBackup.parse(await file.text());
   if(!confirm('Replace this browser board with '+incoming.predictions.length+' predictions and '+incoming.history.length+' history entries? A pre-import backup will be retained.'))return;
   localStorage.setItem(KEY+'-pre-import',localStorage.getItem(KEY)||JSON.stringify(data));
   localStorage.setItem(KEY,JSON.stringify(incoming));data=incoming;storageOK=true;render();setStatus('Imported '+data.predictions.length+' calls and '+data.history.length+' history entries.');
  }catch(error){setStatus('Import failed; your board was not replaced: '+error.message);}
 };
 $('undoBtn').onclick=()=>{try{
  const previous=localStorage.getItem(KEY+'-pre-import');if(!previous){setStatus('No pre-import backup found in this browser.');return;}
  const restored=BoardBackup.parse(previous);if(!confirm('Restore the pre-import board? Export your current board first if you want to keep it.'))return;
  localStorage.setItem(KEY,JSON.stringify(restored));data=restored;storageOK=true;render();setStatus('Pre-import board restored.');
 }catch(error){setStatus('Restore failed: '+error.message);}};
 function reportText(){return ['My 2026 Election Decisions','Generated '+new Date().toLocaleString(),'',...sortedCalls().map(p=>raceLabel(p)+' — '+p.winner)].join('\n');}
 $('printBtn').onclick=()=>{
  const groups=new Map();for(const p of sortedCalls()){if(!groups.has(p.state))groups.set(p.state,[]);groups.get(p.state).push(p);}
  $('printReport').innerHTML='<h1>My 2026 Election Decisions</h1><p>Generated '+esc(new Date().toLocaleString())+'</p>'+[...groups].map(([state,picks])=>'<div class="report-item"><h2>'+esc(state)+'</h2>'+picks.map(p=>'<p class="'+partyClass(p.party)+'">'+esc(p.type+(p.district?' · '+p.district:''))+': <strong>'+esc(p.winner)+'</strong></p>').join('')+'</div>').join('');window.print();
 };
 $('shareBtn').onclick=async()=>{try{const text=reportText();if(navigator.share)await navigator.share({title:'My election decisions',text});else if(navigator.clipboard){await navigator.clipboard.writeText(text);setStatus('Your calls were copied to the clipboard.');}else{setStatus('Sharing is unavailable in this browser; use Print / Save PDF.');}}catch(error){if(error.name!=='AbortError')setStatus('Share failed: '+error.message);}};
 const tabs=[...document.querySelectorAll('[data-tab]')];
 tabs.forEach((button,index)=>{
  button.onclick=()=>{tab=button.dataset.tab;tabs.forEach(b=>b.setAttribute('aria-selected',String(b===button)));$('racePanel').setAttribute('aria-labelledby',button.id);fillFilters();render();};
  button.onkeydown=event=>{const next=event.key==='ArrowRight'?(index+1)%tabs.length:event.key==='ArrowLeft'?(index+tabs.length-1)%tabs.length:event.key==='Home'?0:event.key==='End'?tabs.length-1:null;if(next!==null){event.preventDefault();tabs[next].click();tabs[next].focus();}};
 });
 ['sourceMode','pollChoice','stateFilter','sortOrder','spread','mapLayer'].forEach(id=>$(id).onchange=render);$('weight').oninput=render;$('swing').oninput=render;
 $('cardsView').onclick=()=>{viewMode='cards';render();};$('mapView').onclick=()=>{viewMode='map';render();};
 $('resetAssumptions').onclick=()=>{$('weight').value='60';$('swing').value='0';$('spread').value='1';render();};
 $('scenarioLink').onclick=async()=>{try{
  const url=new URL(window.location.href);url.hash=scenarioHash();
  if(!navigator.clipboard)throw Error('Clipboard unavailable; copy the current address from your browser.');
  await navigator.clipboard.writeText(url.href);setStatus('Scenario link copied. It contains analysis settings, not personal picks.');
 }catch(error){setStatus(error.message);}};
 window.addEventListener?.('hashchange',()=>{readScenario();render();});
 async function load(path){const response=await fetch(new URL(path,document.baseURI),{cache:'no-store'});if(!response.ok)throw Error(path+' HTTP '+response.status);return response.json();}
 async function refresh(){
  loadErrors=[];
  const results=await Promise.allSettled([load('./data/source-data.json'),load('./data/individual-polls.json')]);
  if(results[0].status==='fulfilled'&&results[0].value?.schemaVersion===1&&results[0].value.races)snapshot=results[0].value;
  else loadErrors.push('Source snapshot unavailable; estimates withheld.');
  if(results[1].status==='fulfilled'&&results[1].value?.schemaVersion===1&&Array.isArray(results[1].value.polls))pollData=results[1].value;
  else loadErrors.push('Individual polls unavailable.');
  readScenario(initialScenario);render();
  if(storageOK)setStatus(loadErrors.length?loadErrors.join(' '):'Loaded source snapshots. Estimates are experimental; dates and exclusions are shown on each card. Your picks remain separate.');
 }
 readScenario(initialScenario);render();refresh();
})();
