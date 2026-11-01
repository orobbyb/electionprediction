/* Independent renderer for the supplied ElectIt state geometry; legacy fallback retained. */
(function(root){
 const states=[['al','Alabama'],['ak','Alaska'],['az','Arizona'],['ar','Arkansas'],['ca','California'],['co','Colorado'],['ct','Connecticut'],['de','Delaware'],['fl','Florida'],['ga','Georgia'],['hi','Hawaii'],['id','Idaho'],['il','Illinois'],['in','Indiana'],['ia','Iowa'],['ks','Kansas'],['ky','Kentucky'],['la','Louisiana'],['me','Maine'],['md','Maryland'],['ma','Massachusetts'],['mi','Michigan'],['mn','Minnesota'],['ms','Mississippi'],['mo','Missouri'],['mt','Montana'],['ne','Nebraska'],['nv','Nevada'],['nh','New Hampshire'],['nj','New Jersey'],['nm','New Mexico'],['ny','New York'],['nc','North Carolina'],['nd','North Dakota'],['oh','Ohio'],['ok','Oklahoma'],['or','Oregon'],['pa','Pennsylvania'],['ri','Rhode Island'],['sc','South Carolina'],['sd','South Dakota'],['tn','Tennessee'],['tx','Texas'],['ut','Utah'],['vt','Vermont'],['va','Virginia'],['wa','Washington'],['wv','West Virginia'],['wi','Wisconsin'],['wy','Wyoming']];
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const partyColor=party=>party==='Democrat'?'#3157d5':party==='Republican'?'#bc414b':party==='Independent'?'#7853a7':'#637084';
 function probabilityColor(p,party){
  if(!Number.isFinite(p)||p<.5||p>1)return '#dce2ec';
  const start=[239,232,215],hex=partyColor(party).slice(1),end=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16));
  const t=Math.min(1,Math.max(0,(p-.5)*2));
  return '#'+start.map((v,i)=>Math.round(v+(end[i]-v)*t).toString(16).padStart(2,'0')).join('');
 }
 function markup(paths,entries,layer='model',selected=null){
  const geometry=root.ElectItMapData,box=geometry?.box.join(' ')||'0 0 960 600',step=geometry?28:6;
  return '<svg id="stateSvg" viewBox="'+box+'" data-geometry="'+(geometry?'electit':'legacy')+'" role="group" aria-label="United States '+(layer==='picks'?'personal predictions':'model estimates')+'; select a tracked state to focus its card"><defs><pattern id="noEstimate" width="'+step+'" height="'+step+'" patternUnits="userSpaceOnUse"><rect width="'+step+'" height="'+step+'" fill="#f4f1e8"/><path d="M0 '+step+'L'+step+' 0" stroke="#a7b2c4" stroke-width="'+(geometry?5:1)+'"/></pattern></defs>'+states.map(([abbr,name])=>{
   const entry=entries.find(e=>e.state===name),active=Boolean(entry);let fill='#e1e5eb',description='Not on this shortlist';
   if(entry&&layer==='picks'){fill=entry.pick?partyColor(entry.pick.party):'#ffffff';description=entry.pick?'Your call: '+entry.pick.winner:'No personal call';}
   else if(entry){
    const p=entry.model.probabilities;
    if(p){const i=p[0]>=.5?0:1;fill=probabilityColor(p[i],entry.candidates[i].party);description=entry.candidates[i].name+' '+Math.round(p[i]*100)+'% · '+entry.model.label;}
    else{fill='url(#noEstimate)';description='No supported model estimate';}
   }
   const shape=geometry?.states.find(s=>s.s.toLowerCase()===abbr)?.g||paths[abbr]||'';
   return '<path d="'+esc(shape)+'" class="map-state'+(active?' tracked':'')+(entry?.id===selected?' selected':'')+'" fill="'+fill+'" data-abbr="'+abbr+'"'+(active?' data-map-race="'+esc(entry.id)+'" role="button" tabindex="0"':'')+' aria-label="'+esc(name+': '+description)+'"><title>'+esc(name+': '+description)+'</title></path>';
  }).join('')+'<g id="stateLabels" aria-hidden="true"></g></svg>';
 }
 function annotate(svg){
  if(!svg?.querySelectorAll)return;
  const group=svg.querySelector('#stateLabels');if(!group)return;
  const tiny=new Set(['ct','de','md','ma','nh','nj','ri','vt']);
  for(const path of svg.querySelectorAll('.map-state')){
   if(!path.getBBox||tiny.has(path.dataset.abbr))continue;
   const box=path.getBBox();if(!box.width||!box.height)continue;
   let x=box.x+box.width/2,y=box.y+box.height/2;
   if(path.isPointInFill&&typeof DOMPoint!=='undefined'&&!path.isPointInFill(new DOMPoint(x,y))){
    const choices=[];for(let i=1;i<10;i++)for(let j=1;j<10;j++){const a=box.x+box.width*i/10,b=box.y+box.height*j/10;if(path.isPointInFill(new DOMPoint(a,b)))choices.push({x:a,y:b,d:(a-x)**2+(b-y)**2});}
    choices.sort((a,b)=>a.d-b.d);if(choices.length){x=choices[0].x;y=choices[0].y;}else continue;
   }
   const text=svg.ownerDocument.createElementNS('http://www.w3.org/2000/svg','text');text.setAttribute('x',x);text.setAttribute('y',y);text.setAttribute('class','map-state-label');text.textContent=path.dataset.abbr.toUpperCase();group.appendChild(text);
  }
 }
 root.StateMap={states,partyColor,probabilityColor,markup,annotate};
})(globalThis);
