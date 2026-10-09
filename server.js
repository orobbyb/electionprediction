import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = fileURLToPath(new URL('.', import.meta.url));
const root = join(appRoot, 'public');
const sourceDataFile = join(appRoot, 'data', 'source-data.json');
const port = Number(process.env.PORT || 3000);
const sources = {
  kalshi: 'https://docs.kalshi.com/getting_started/quick_start_market_data',
  rcp: 'https://www.realclearpolitics.com/polls/',
  sabato: 'https://centerforpolitics.org/crystalball/',
  cook: 'https://www.cookpolitical.com/ratings/senate-race-ratings'
};

const sourceNames = {kalshi:'Kalshi odds', rcp:'RCP polls', sabato:'Sabato’s Crystal Ball', cook:'Cook Political Report'};

async function loadSourceData() {
  try { return JSON.parse(await readFile(sourceDataFile, 'utf8')); }
  catch (error) { return {schemaVersion:1, generatedAt:null, races:{}, error:error.message}; }
}

function raceKey(state, office) {
  return `${state.trim().toLowerCase()}|${office.trim().toLowerCase()}`;
}

function sourceRow(key, snapshot, fetchedAt) {
  const record = snapshot.races?.[raceKey(snapshot.state, snapshot.office)]?.sources?.[key] || {};
  return {
    name: sourceNames[key],
    url: record.url || sources[key],
    value: record.value || 'No verified snapshot yet',
    status: record.status || 'awaiting verified update',
    fetchedAt: record.fetchedAt || snapshot.generatedAt || fetchedAt,
    publishedAt: record.publishedAt || null,
    note: record.note || null
  };
}

async function raceData(url) {
  const u = new URL(url, `http://localhost:${port}`);
  const state = u.searchParams.get('state');
  const office = u.searchParams.get('office');
  if (!state || !office) return {error:'state and office are required'};
  const fetchedAt = new Date().toISOString();
  const data = await loadSourceData();
  const snapshot = {...data, state, office};
  const results = Object.keys(sourceNames).map(key => sourceRow(key, snapshot, fetchedAt));
  return {state, office, fetchedAt, generatedAt:data.generatedAt || null, sources:results};
}

async function send(res, status, body, type='text/plain; charset=utf-8') { res.writeHead(status, {'content-type':type, 'cache-control':'no-store'}); res.end(body); }
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8'};
const server = createServer(async (req,res)=>{
  try {
    if (req.url.startsWith('/api/race-data')) return send(res,200,JSON.stringify(await raceData(req.url)),'application/json; charset=utf-8');
    const pathname = normalize(new URL(req.url, `http://localhost:${port}`).pathname);
    const file = join(root, pathname === '/' ? 'index.html' : pathname.replaceAll('/',''));
    if (!file.startsWith(root)) return send(res,403,'Forbidden');
    return send(res,200,await readFile(file),mime[extname(file)]||'application/octet-stream');
  } catch (e) { return send(res, e.code === 'ENOENT' ? 404 : 500, e.code === 'ENOENT' ? 'Not found' : 'Server error'); }
});
server.listen(port,()=>console.log(`Midterm Prediction Board running at http://localhost:${port}`));
