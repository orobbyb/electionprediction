// Real-browser assertions run against the build in an isolated, synthetic profile.
const {chromium}=require('playwright');
const {createServer}=require('node:http');
const {readFile,mkdir}=require('node:fs/promises');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve('_site');
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(!pathname.startsWith('/electionprediction/')){res.writeHead(404).end();return;}
  const relative=pathname.slice('/electionprediction/'.length)||'index.html';
  const file=path.resolve(root,relative);if(!file.startsWith(root+path.sep))throw Error('Invalid path');
  const data=await readFile(file),ext=path.extname(file);
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json'})[ext]||'application/octet-stream');res.end(data);
 }catch{res.writeHead(404).end();}
});
(async()=>{
 await mkdir('test-results',{recursive:true});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1100}}),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const key='my-midterm-prediction-board-v1';
  const seed={predictions:[{id:'qa-call',state:'Texas',type:'Senate',district:'',winner:'Ken Paxton',party:'Republican',date:'2026-10-31',updatedAt:'2026-10-31T01:00:00Z',confidence:'Low',notes:'QA only'}],history:[]};
  await page.clock.install({time:new Date('2026-11-01T01:00:00Z')});
  await page.addInitScript(({key,seed})=>localStorage.setItem(key,JSON.stringify(seed)),{key,seed});
  await page.goto(`http://127.0.0.1:${server.address().port}/electionprediction/`);
  await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('Loaded source snapshots'));
  const before=await page.evaluate(key=>localStorage.getItem(key),key);
  await page.locator('#mapView').click();
  assert.equal(await page.locator('.map-state').count(),50);
  assert.equal(await page.locator('.map-state.tracked').count(),8);
  const misplaced=await page.locator('#stateSvg').evaluate(svg=>[...svg.querySelectorAll('.map-state-label')].filter(label=>{
   const path=svg.querySelector(`[data-abbr="${label.textContent.toLowerCase()}"]`);
   return !path.isPointInFill(new DOMPoint(Number(label.getAttribute('x')),Number(label.getAttribute('y'))));
  }).map(label=>label.textContent));
  assert.deepEqual(misplaced,[],'All state labels must lie inside their state path');
  await page.locator('[data-map-race="texas|senate"]').press('Enter');
  assert.match(await page.locator('#scenarioTitle').textContent(),/^Texas/);
  assert.match(await page.locator('[data-race="texas|senate"]').getAttribute('class'),/focused/);
  await page.locator('#mapLayer').selectOption('picks');
  assert.equal(await page.locator('[data-abbr="tx"]').getAttribute('fill'),'#bc414b');
  await page.locator('#sourceMode').selectOption('polls');
  const baseline=await page.locator('[data-race="texas|senate"] .probability').first().textContent();
  await page.locator('[data-scenario="2"]').click();
  const shifted=await page.locator('[data-race="texas|senate"] .probability').first().textContent();
  assert.ok(parseInt(shifted)>parseInt(baseline),'D+2 scenario increases Democratic chance');
  await page.locator('#spread').selectOption('2');
  await page.locator('#mapLayer').selectOption('model');
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),before);
  await page.locator('#sourceMode').selectOption('market');
  const market=await page.locator('[data-race="texas|senate"] .probability').first().textContent();
  await page.locator('[data-scenario="-2"]').click();
  assert.equal(await page.locator('[data-race="texas|senate"] .probability').first().textContent(),market);
  await page.locator('#sourceMode').selectOption('combined');await page.locator('#resetAssumptions').click();
  await page.screenshot({path:'test-results/explorer-desktop.png',fullPage:true});
  for(const width of [375,320]){
   await page.setViewportSize({width,height:900});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`No overflow at ${width}px`);
  }
  await page.screenshot({path:'test-results/explorer-mobile.png',fullPage:true});
  await page.locator('#tab-ma').click();assert.equal(await page.locator('#mapPanel').isVisible(),false);assert.equal(await page.locator('#explorerControls').isVisible(),false);
  assert.equal(await page.locator('.race-card').count(),9);
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),key),before);
  assert.deepEqual(errors,[]);console.log('PASS: map geometry, label positions, linked cards, scenario effects, pick preservation, tabs, desktop/mobile layout.');
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
