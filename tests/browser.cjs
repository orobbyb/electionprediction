// Optional end-to-end check: requires Playwright and its Chromium browser.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');

(async()=>{
 const root=path.resolve(__dirname,'../_site');
 const server=http.createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,'http://localhost'),prefix='/electionprediction/';
   if(!url.pathname.startsWith(prefix)){res.writeHead(404);return res.end();}
   const name=url.pathname.slice(prefix.length)||'index.html';
   const file=path.resolve(root,name);if(!file.startsWith(root+path.sep))throw Error();
   const body=await fs.readFile(file);
   res.setHeader('Content-Type',name.endsWith('.js')?'application/javascript':name.endsWith('.json')?'application/json':'text/html');res.end(body);
  }catch{res.writeHead(404);res.end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 server.unref();
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
 try{
  const page=await browser.newPage(),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  await page.goto('http://127.0.0.1:'+server.address().port+'/electionprediction/legacy.html');
  await page.waitForFunction(()=>document.getElementById('summarySnapshot').textContent!=='Verified sources');
  assert.equal(await page.locator('#usMap path').count(),50);
  await page.click('#listViewBtn');
  await page.locator('[data-list-state="Texas"][data-list-office="Senate"]').first().click();
  const original=await page.evaluate(()=>JSON.parse(localStorage.getItem('my-midterm-prediction-board-v1')));
  assert.equal(original.predictions.length,1);assert.equal(original.history.length,1);
  await page.reload();assert.equal(await page.locator('#totalStat').textContent(),'1');
  const download=page.waitForEvent('download');await page.click('#exportBtn');
  const exported=await download;const backup=JSON.parse(await fs.readFile(await exported.path(),'utf8'));
  assert.deepEqual(backup.predictions,original.predictions);assert.deepEqual(backup.history,original.history);
  page.on('dialog',d=>d.accept());
  await page.locator('#importFile').setInputFiles({name:'empty.json',mimeType:'application/json',buffer:Buffer.from('{"predictions":[],"history":[]}')});
  await page.waitForFunction(()=>document.getElementById('backupStatus').textContent.startsWith('Imported'));
  assert.equal(await page.locator('#totalStat').textContent(),'0');
  await page.click('#restoreBackupBtn');assert.equal(await page.locator('#totalStat').textContent(),'1');
  await page.locator('#importFile').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"predictions":[{}],"history":[]}')});
  await page.waitForFunction(()=>document.getElementById('backupStatus').textContent.startsWith('Import failed'));
  assert.equal(await page.locator('#totalStat').textContent(),'1');
  await page.evaluate(()=>{openModal();document.getElementById('state').value='Texas';document.getElementById('type').value='Senate';renderSources();});
  await page.waitForFunction(()=>document.querySelector('[data-source-key="kalshi"] .source-value').textContent.includes('Talarico'));
  assert.ok((await page.locator('[data-source-key="sabato"] small').textContent()).includes('stale'));
  assert.equal(await page.locator('[data-source-key="kalshi"] a').getAttribute('href'),'https://kalshi.com/markets/senatetx/texas-senate-race/senatetx-26');
  await page.click('#closeModal');
  await page.evaluate(()=>{window.print=()=>{window.didPrint=true};});await page.click('#printBtn');
  assert.ok(await page.evaluate(()=>window.didPrint));assert.ok((await page.locator('#printReport').textContent()).includes(original.predictions[0].winner));
  await page.evaluate(()=>navigator.share=async payload=>{window.shared=payload.text;});await page.click('#shareBtn');
  assert.ok((await page.evaluate(()=>window.shared)).includes(original.predictions[0].winner));
  await page.click('#mapViewBtn');
  await page.locator('#usMap path[data-state="Texas"]').click({force:true});
  assert.equal(await page.locator('#totalStat').textContent(),'2');
  assert.ok(requests.every(url=>!url.includes('/api/')));
  assert.ok(requests.some(url=>url.endsWith('/electionprediction/data/source-data.json')));
  assert.deepEqual(errors,[]);
  console.log('PASS: project subpath, 50-state map, list picks, persistence, export/import/undo, malformed import, stale indicators, source links, print, share, color cycling.');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1});
