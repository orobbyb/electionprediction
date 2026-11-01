import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const html=await readFile(new URL('../public/legacy.html',import.meta.url),'utf8');
const script=html.slice(html.indexOf('let sourceSnapshot='),html.indexOf('function reportRows()'));
function setup(fetcher){
 const elements={state:{value:'Texas'},type:{value:'Senate'},summarySnapshot:{textContent:''}};
 const children={'.source-value':{},small:{},a:{}};
 const card={dataset:{sourceKey:'kalshi'},querySelector:key=>children[key]};
 const requests=[];
 const context=vm.createContext({URL,Date,console,sourceLinks:{kalshi:'https://kalshi.com'},
  $:id=>elements[id],standaloneSourceRender:()=>{},
  document:{baseURI:'https://example.com/electionprediction/',querySelectorAll:()=>[card]},
  fetch:async(url,options)=>{requests.push({url:String(url),options});return fetcher(url,options)}
 });
 vm.runInContext(script,context);
 return {context,requests,children,elements};
}
const snapshot={schemaVersion:1,generatedAt:'2026-10-31T08:55:43Z',races:{'texas|senate':{sources:{kalshi:{value:'Verified value',status:'stale',fetchedAt:'2026-10-30T08:55:09Z',publishedAt:'2026-10-29',lastAttemptedAt:'2026-10-31T08:55:43Z',error:'HTTP 403',url:'https://kalshi.com/verified-race'}}}}};
test('loads project-relative snapshot, displays provenance and stale errors',async()=>{
 const t=setup(async()=>({ok:true,json:async()=>snapshot}));
 await vm.runInContext('renderSources()',t.context);
 assert.equal(t.requests[0].url,'https://example.com/electionprediction/data/source-data.json');
 assert.equal(t.requests[0].options.cache,'no-store');
 assert.equal(t.children['.source-value'].textContent,'Verified value');
 assert.match(t.children.small.textContent,/stale.*Fetched.*Published.*Last attempted.*HTTP 403/);
 assert.equal(t.children.a.href,'https://kalshi.com/verified-race');
});
test('failed refresh retains cached values and explicitly marks them stale',async()=>{
 let fail=false;
 const t=setup(async()=>{if(fail)throw Error('Network unavailable');return {ok:true,json:async()=>snapshot}});
 await vm.runInContext('renderSources()',t.context);fail=true;
 await vm.runInContext('sourceLoadedAt=0;renderSources()',t.context);
 assert.equal(t.children['.source-value'].textContent,'Verified value');
 assert.match(t.children.small.textContent,/stale \(refresh unavailable\).*Network unavailable/);
});
test('missing races never inherit another race value',async()=>{
 const t=setup(async()=>({ok:true,json:async()=>snapshot}));
 t.elements.state.value='Hawaii';await vm.runInContext('renderSources()',t.context);
 assert.equal(t.children['.source-value'].textContent,'No verified snapshot for this race');
});
test('fast state changes cannot display a response for the previous race',async()=>{
 let resolve;
 const t=setup(()=>new Promise(r=>{resolve=r}));
 const first=vm.runInContext('renderSources()',t.context);
 t.elements.state.value='Hawaii';const last=vm.runInContext('renderSources()',t.context);
 resolve({ok:true,json:async()=>snapshot});await Promise.all([first,last]);
 assert.equal(t.children['.source-value'].textContent,'No verified snapshot for this race');
});
