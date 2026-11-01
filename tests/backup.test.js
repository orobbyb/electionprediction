import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import '../public/backup.js';

const record={id:'test-id',state:'Texas',type:'Senate',winner:'My choice',party:'Democrat',date:'2026-10-31',updatedAt:'2026-10-31T12:00:00Z',district:'',notes:'original notes',confidence:'Medium'};
const legacy={predictions:[record],history:[{...record,historyId:'history-id',savedAt:record.updatedAt}]};
test('legacy export preserves every prediction and history field',()=>{
 assert.deepEqual(BoardBackup.parse(JSON.stringify(legacy)),legacy);
});
test('versioned export round trips without changing selections',()=>{
 const text=BoardBackup.serialize(legacy);
 assert.equal(JSON.parse(text).schemaVersion,1);
 assert.deepEqual(BoardBackup.parse(text),legacy);
});
test('rejects malformed, unsafe, future-version and incomplete backups',()=>{
 for(const value of [null,{}, {predictions:[{}],history:[]}, {...legacy,schemaVersion:2},
  {predictions:[{...record,id:"bad');alert(1)//"}],history:[]}])assert.throws(()=>BoardBackup.validate(value));
 assert.throws(()=>BoardBackup.parse('{bad'));
 assert.throws(()=>BoardBackup.parse(' '.repeat(10*1024*1024+1)));
});
test('duplicate active IDs rejected; repeated prediction ID in history allowed',()=>{
 assert.throws(()=>BoardBackup.validate({predictions:[record,record],history:[]}));
 assert.doesNotThrow(()=>BoardBackup.validate({predictions:[],history:[...legacy.history,{...legacy.history[0],historyId:'another-id'}]}));
});
test('inline application scripts compile and use project-relative assets',async()=>{
 const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
 for(const [,script] of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(script);
 assert.ok(html.includes('src="./state-paths.js"'));
 assert.ok(html.includes("new URL('./data/source-data.json',document.baseURI)"));
 assert.ok(!html.includes("fetch('/api/"));
});
