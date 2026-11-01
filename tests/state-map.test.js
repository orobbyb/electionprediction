import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import '../public/state-map.js';
const context=vm.createContext({});
vm.runInContext(await readFile(new URL('../public/state-paths.js',import.meta.url),'utf8')+';globalThis.paths=statePaths;',context);
const entry={id:'texas|senate',state:'Texas',candidates:[{name:'Candidate D',party:'Democrat'},{name:'Candidate R',party:'Republican'}],model:{probabilities:[.7,.3],label:'Experimental'},pick:{winner:'Candidate R',party:'Republican'}};
test('true state geometry renders all 50 states but only tracked states are interactive',()=>{
 const html=StateMap.markup(context.paths,[entry]);
 assert.equal((html.match(/data-abbr=/g)||[]).length,50);
 assert.equal((html.match(/data-map-race=/g)||[]).length,1);
 assert.equal((html.match(/tabindex="0"/g)||[]).length,1);
 assert.ok(StateMap.states.every(([abbr])=>context.paths[abbr]?.length>10));
 assert.ok(html.includes('Candidate D 70%'));assert.ok(html.includes('viewBox="0 0 960 600"'));
});
test('personal-pick coloring cannot inherit model probabilities',()=>{
 const html=StateMap.markup(context.paths,[entry],'picks');
 assert.ok(html.includes('fill="#bc414b" data-abbr="tx"'));
 assert.ok(html.includes('Your call: Candidate R'));assert.ok(!html.includes('Candidate D 70%'));
});
test('missing models are hatched, missing calls white, unknown states grey',()=>{
 assert.ok(StateMap.markup(context.paths,[{...entry,model:{probabilities:null}}]).includes('fill="url(#noEstimate)" data-abbr="tx"'));
 assert.ok(StateMap.markup(context.paths,[{...entry,pick:null}],'picks').includes('fill="#ffffff" data-abbr="tx"'));
 assert.equal(StateMap.probabilityColor(.5,'Democrat'),StateMap.probabilityColor(.5,'Republican'));
 assert.equal(StateMap.probabilityColor(1,'Democrat'),StateMap.partyColor('Democrat'));
});
