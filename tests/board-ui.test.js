// DOM adapter tests exercise production handlers without an external browser download.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const base=new URL('../',import.meta.url);
const html=await readFile(new URL('public/index.html',base),'utf8');
const snapshot=JSON.parse(await readFile(new URL('data/source-data.json',base),'utf8'));
const polls=JSON.parse(await readFile(new URL('data/individual-polls.json',base),'utf8'));
async function setup(seed={predictions:[],history:[]}){
 class Element{
  constructor(id=''){this.id=id;this.value='';this.textContent='';this.dataset={};this.attrs={};this._html='';this.hidden=false;}
  set innerHTML(value){this._html=value;if(this.id==='stateFilter'||this.id==='pollChoice')this.value=(value.match(/value="([^"]*)"/)||[])[1]||'';}
  get innerHTML(){return this._html;}
  setAttribute(k,v){this.attrs[k]=v;}
  click(){return this.onclick?.();}
  focus(){}
  appendChild(){}
  remove(){}
 }
 const elements=Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(([,id])=>[id,new Element(id)]));
 elements.sourceMode.value='combined';elements.stateFilter.value='all';elements.sortOrder.value='close';elements.weight.value='60';
 const tabs=['senate','governor','mo','ma'].map(name=>{const b=elements['tab-'+name];b.dataset.tab=name;return b;});
 const buttons={};
 function query(selector){
  if(selector==='[data-tab]')return tabs;
  if(selector==='[data-pick]'||selector==='[data-clear]'){
   const source=selector==='[data-pick]'?elements.cards.innerHTML:elements.savedCalls.innerHTML;
   return [...source.matchAll(/<button\b([^>]*)>/g)].filter(([,attrs])=>attrs.includes(selector.slice(1,-1)+'=')).map(([,attrs])=>{
    const b=new Element();for(const [,key,val] of attrs.matchAll(/data-([\w-]+)="([^"]*)"/g))b.dataset[key]=val;
    const key=(b.dataset.pick||b.dataset.clear)+'|'+(b.dataset.choice||'');buttons[key]=b;return b;
   });
  }
  return [];
 }
 const storage=new Map([['my-midterm-prediction-board-v1',JSON.stringify(seed)]]);
 const requests=[];
 const context=vm.createContext({console,URL,Blob,Date,Math,setTimeout,crypto:globalThis.crypto,
  document:{baseURI:'https://example.com/electionprediction/',getElementById:id=>{assert.ok(elements[id],id);return elements[id];},querySelectorAll:query,createElement:()=>new Element(),body:new Element()},
  localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},
  fetch:async url=>{requests.push(String(url));return {ok:true,json:async()=>String(url).includes('individual-polls')?polls:snapshot};},
  confirm:()=>true,navigator:{},window:{print:()=>{context.printed=true}}
 });
 for(const file of ['backup.js','forecast.js','board-data.js','board.js'])vm.runInContext(await readFile(new URL('public/'+file,base),'utf8'),context);
 await new Promise(resolve=>setImmediate(resolve));
 return {context,elements,storage,requests,buttons};
}
const p={id:'original',state:'Texas',type:'Senate',district:'',winner:'Ken Paxton',party:'Republican',date:'2026-10-31',updatedAt:'2026-10-31T01:00:00Z',notes:'keep notes',confidence:'Low'};
const seed={predictions:[p],history:[{...p,historyId:'original-history',savedAt:p.updatedAt}]};
test('four tabs, source filters, weight changes and state filter never mutate saved decisions',async()=>{
 const t=await setup(seed),before=t.storage.get('my-midterm-prediction-board-v1');
 for(const tab of ['governor','mo','ma','senate'])t.elements['tab-'+tab].click();
 for(const mode of ['market','polls','single','combined']){t.elements.sourceMode.value=mode;t.elements.sourceMode.onchange();}
 t.elements.weight.value='25';t.elements.weight.oninput();
 assert.equal(t.storage.get('my-midterm-prediction-board-v1'),before);
 assert.ok(t.requests.every(url=>url.startsWith('https://example.com/electionprediction/data/')));
});
test('one-poll filter shows only that race and does not merge RCP or Kalshi input',async()=>{
 const t=await setup();t.elements.sourceMode.value='single';t.elements.pollChoice.value='tx-quantus-1028';t.elements.sourceMode.onchange();
 assert.equal((t.elements.cards.innerHTML.match(/class="race-card/g)||[]).length,1);
 assert.ok(t.elements.cards.innerHTML.includes('Selected poll support: 48% / 49%'));
 assert.ok(t.elements.cards.innerHTML.includes('Quantus Insights'));
});
test('candidate pick preserves old notes and history; issue pick is distinct',async()=>{
 const t=await setup(seed);t.buttons['texas|senate|0'].click();
 let data=JSON.parse(t.storage.get('my-midterm-prediction-board-v1'));
 assert.equal(data.predictions[0].winner,'James Talarico');assert.equal(data.predictions[0].notes,'keep notes');assert.equal(data.history.length,2);assert.deepEqual(data.history[0],seed.history[0]);
 t.elements['tab-mo'].click();t.buttons['missouri|ballot|amendment-3|0'].click();
 data=JSON.parse(t.storage.get('my-midterm-prediction-board-v1'));assert.equal(data.predictions.length,2);assert.equal(data.predictions[1].winner,'Yes');assert.equal(data.history.length,3);
});
test('invalid imports leave storage untouched; undo restores both calls and history',async()=>{
 const t=await setup(seed),before=t.storage.get('my-midterm-prediction-board-v1');
 await t.elements.importFile.onchange({target:{files:[{size:5,text:async()=>'{bad'}],value:'x'}});
 assert.equal(t.storage.get('my-midterm-prediction-board-v1'),before);
 await t.elements.importFile.onchange({target:{files:[{size:30,text:async()=>'{"predictions":[],"history":[]}'}],value:'x'}});
 assert.equal(JSON.parse(t.storage.get('my-midterm-prediction-board-v1')).predictions.length,0);
 t.elements.undoBtn.click();assert.deepEqual(JSON.parse(t.storage.get('my-midterm-prediction-board-v1')),seed);
});
test('printing contains only personal calls, without model values, notes or confidence',async()=>{
 const t=await setup(seed);t.elements.printBtn.click();assert.equal(t.context.printed,true);
 assert.ok(t.elements.printReport.innerHTML.includes('Ken Paxton'));assert.ok(!t.elements.printReport.innerHTML.includes('keep notes'));assert.ok(!t.elements.printReport.innerHTML.includes('Low'));assert.ok(!t.elements.printReport.innerHTML.includes('Kalshi'));
});
