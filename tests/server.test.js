import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';

test('Render server still serves the board, assets, snapshot and legacy API', {timeout:10000}, async()=>{
 const child=spawn(process.execPath,['server.js'],{cwd:new URL('../',import.meta.url),env:{...process.env,PORT:'31941'},stdio:['ignore','pipe','pipe']});
 try{
  await Promise.race([once(child.stdout,'data'),once(child,'exit').then(([code])=>{throw Error('Server exited: '+code)})]);
  for(const route of ['/','/backup.js','/state-paths.js','/data/source-data.json','/api/race-data?state=Texas&office=Senate']){
   const response=await fetch('http://127.0.0.1:31941'+route);
   assert.equal(response.status,200,route);
   if(route==='/data/source-data.json')assert.ok((await response.json()).races['texas|senate']);
  }
 }finally{child.kill();await once(child,'exit');}
});
