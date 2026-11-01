import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import '../public/forecast.js';
import '../public/board-data.js';
import '../public/backup.js';
const now=Date.parse('2026-11-01T01:00:00Z');
const race=BoardData.races.find(r=>r.id==='texas|senate');
const sources={kalshi:{value:'Talarico 71%; Paxton 29%',status:'verified-page-fallback',fetchedAt:'2026-10-31T08:55:43Z'},rcp:{value:'Talarico 48.8%; Paxton 47.0%; Talarico +1.8; Rating: Toss Up',status:'verified',fetchedAt:'2026-10-31T08:55:43Z',publishedAt:'2026-10-28'}};
test('normal error conversion is bounded and symmetric',()=>{assert.ok(Math.abs(Forecast.cdf(0)-.5)<1e-6);for(const z of [-8,-2,-1,1,2,8]){assert.ok(Forecast.cdf(z)>=0&&Forecast.cdf(z)<=1);assert.ok(Math.abs(Forecast.cdf(z)+Forecast.cdf(-z)-1)<1e-6);}});
test('vote support is not mistaken for probability; sum remains one',()=>{const m=Forecast.estimate(race,sources,'combined',.6,null,now);assert.equal(m.probabilities.length,2);assert.equal(m.probabilities[0]+m.probabilities[1],1);assert.notEqual(m.probabilities[0],.488);assert.ok(m.effectiveWeights.polls<.6);});
test('Kalshi-only ignores polling; poll-only ignores Kalshi',()=>{assert.deepEqual(Forecast.estimate(race,{kalshi:sources.kalshi},'market',.6,null,now).probabilities,[.71,.29000000000000004]);assert.ok(Forecast.estimate(race,{rcp:sources.rcp},'polls',.6,null,now).probabilities);});
test('shared swing changes polls in the party direction, never market-only quotes',()=>{
 const estimate=(mode,swing=0,spread=1)=>Forecast.estimate(race,sources,mode,.6,null,now,{swing,spread});
 assert.ok(estimate('polls',2).probabilities[0]>estimate('polls').probabilities[0]);
 assert.ok(estimate('polls',-2).probabilities[0]<estimate('polls').probabilities[0]);
 assert.deepEqual(estimate('market',6,2).probabilities,estimate('market').probabilities);
 assert.ok(estimate('polls',0,2).probabilities[0]<estimate('polls').probabilities[0]);
 assert.ok(estimate('polls').pollingInterval[0]<estimate('polls').pollMargin);
 const reverse={...race,candidates:[...race.candidates].reverse()};
 assert.ok(Forecast.estimate(reverse,sources,'polls',.6,null,now,{swing:2}).probabilities[0]<Forecast.estimate(reverse,sources,'polls',.6,null,now).probabilities[0]);
});
test('combined never silently becomes market-only when poll is missing',()=>{assert.equal(Forecast.estimate(race,{kalshi:sources.kalshi},'combined',.6,null,now).probabilities,null);assert.ok(Forecast.estimate(race,{kalshi:sources.kalshi},'combined',0,null,now).probabilities);});
test('ratings do not become numeric probabilities',()=>{assert.deepEqual(Forecast.parseShares('Toss Up'),[]);assert.equal(Forecast.estimate(race,{...sources,rcp:{...sources.rcp,value:'Toss Up'}},'combined',.6,null,now).probabilities,null);});
test('stale, old and mismatched sources are excluded, not fabricated',()=>{
 assert.equal(Forecast.estimate(race,{...sources,kalshi:{...sources.kalshi,status:'stale'}},'combined',.6,null,now).probabilities,null);
 assert.equal(Forecast.estimate(race,sources,'combined',.6,null,now+3*86400000).probabilities,null);
 assert.equal(Forecast.estimate(race,{...sources,kalshi:{...sources.kalshi,value:'Brown 71%; Husted 29%'}},'market',.6,null,now).probabilities,null);
 assert.equal(Forecast.estimate(race,sources,'single',.6,{},now).probabilities,null);
});
test('single poll is used on its own, with wider error, without pooling its RCP average',()=>{
 const poll={...sources.rcp,shares:[{name:'Talarico',value:48},{name:'Paxton',value:49}]};
 const m=Forecast.estimate(race,sources,'single',.6,poll,now);assert.ok(m.probabilities[0]<.5);assert.ok(m.sigma>=6);
});
test('multi-outcome and ranked-choice quotes remain raw',()=>{
 for(const id of ['alaska|senate','nebraska|senate','maine|senate'])assert.equal(Forecast.estimate(BoardData.races.find(r=>r.id===id),sources,'combined',.6,null,now).probabilities,null);
});
test('all certified statewide measure cards are distinct and support recoverable backups',()=>{
 assert.equal(BoardData.races.filter(r=>r.tab==='mo').length,5);assert.equal(BoardData.races.filter(r=>r.tab==='ma').length,9);
 assert.equal(new Set(BoardData.races.map(r=>r.id)).size,27);
 const p={id:'test-id',state:'Missouri',type:'Ballot',district:'Amendment 6',winner:'Yes',party:'Other',date:'2026-10-31',updatedAt:'2026-10-31T12:00:00Z',notes:'',confidence:'Medium'};
 const data={predictions:[p],history:[{...p,historyId:'history-id',savedAt:p.updatedAt}]};
 assert.deepEqual(BoardBackup.parse(BoardBackup.serialize(data)),data);
});
test('production scripts compile; all new map assets use project-relative paths',async()=>{
 for(const file of ['board.js','forecast.js','board-data.js','backup.js','state-map.js','electit-map-data.js'])new vm.Script(await readFile(new URL('../public/'+file,import.meta.url),'utf8'));
 const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
 assert.equal((html.match(/role="tab"/g)||[]).length,4);assert.ok(html.includes('./state-map.js'));assert.ok(html.includes('./state-paths.js'));assert.ok(!html.includes('src="/'));
 const polls=JSON.parse(await readFile(new URL('../data/individual-polls.json',import.meta.url),'utf8'));
 assert.equal(polls.polls.length,10);assert.equal(new Set(polls.polls.map(p=>p.id)).size,10);
 assert.ok(polls.polls.every(p=>BoardData.races.some(r=>r.id===p.raceId)&&p.shares.length===2&&p.sourceUrl.startsWith('https://')));
});
