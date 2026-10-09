import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), 'public');
const port = Number(process.env.PORT || 3000);
const stateAbbr = {
  Alabama:'AL', Alaska:'AK', Arizona:'AZ', Arkansas:'AR', California:'CA', Colorado:'CO', Connecticut:'CT', Delaware:'DE', Florida:'FL', Georgia:'GA', Hawaii:'HI', Idaho:'ID', Illinois:'IL', Indiana:'IN', Iowa:'IA', Kansas:'KS', Kentucky:'KY', Louisiana:'LA', Maine:'ME', Maryland:'MD', Massachusetts:'MA', Michigan:'MI', Minnesota:'MN', Mississippi:'MS', Missouri:'MO', Montana:'MT', Nebraska:'NE', Nevada:'NV', 'New Hampshire':'NH', 'New Jersey':'NJ', 'New Mexico':'NM', 'New York':'NY', 'North Carolina':'NC', 'North Dakota':'ND', Ohio:'OH', Oklahoma:'OK', Oregon:'OR', Pennsylvania:'PA', 'Rhode Island':'RI', 'South Carolina':'SC', 'South Dakota':'SD', Tennessee:'TN', Texas:'TX', Utah:'UT', Vermont:'VT', Virginia:'VA', Washington:'WA', 'West Virginia':'WV', Wisconsin:'WI', Wyoming:'WY'
};
const sources = {
  kalshi: 'https://www.270towin.com/content/kalshi-2026-prediction-markets-for-senate-house-and-governor',
  rcp: 'https://www.realclearpolitics.com/polls/',
  sabato: 'https://www.270towin.com/content/sabatos-crystal-ball-2026-election-ratings/',
  cook: 'https://www.270towin.com/2026-senate-election/cook-political-report-2026-senate'
};
const timeout = 9000;

async function getText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const r = await fetch(url, {headers:{'user-agent':'Midterm Prediction Board/1.0'}, signal:controller.signal});
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.text();
  } finally { clearTimeout(timer); }
}

function clean(s='') { return s.replace(/\\s+/g, ' ').trim(); }
function sourceRow(name, url, value, status, fetchedAt) { return {name, url, value, status, fetchedAt}; }

async function fetchKalshi(state, office, fetchedAt) {
  const url = process.env.KALSHI_URL || 'https://api.elections.kalshi.com/trade-api/v2/markets?limit=1000&status=open';
  try {
    const raw = await getText(url);
    const json = JSON.parse(raw);
    const markets = json.markets || [];
    const abbr = stateAbbr[state];
    const candidates = markets.filter(m => {
      const hay = `${m.ticker||''} ${m.title||''} ${m.subtitle||''}`.toLowerCase();
      return (hay.includes(state.toLowerCase()) || hay.includes(`-${abbr.toLowerCase()}-`) || hay.includes(`_${abbr.toLowerCase()}_`)) && hay.includes(office.toLowerCase());
    });
    const m = candidates[0];
    const price = m && (m.last_price ?? m.yes_bid ?? m.yes_ask);
    const value = price == null ? 'Market found; see live source' : `${Number(price) > 1 ? Number(price) : Number(price)*100}%`;
    return sourceRow('Kalshi odds', sources.kalshi, value, m ? 'live' : 'no matching market', fetchedAt);
  } catch (e) { return sourceRow('Kalshi odds', sources.kalshi, 'Unavailable', e.message, fetchedAt); }
}

async function fetchPageSource(key, state, office, fetchedAt) {
  const url = sources[key];
  try {
    const text = clean(await getText(url));
    const abbr = stateAbbr[state];
    const pos = Math.max(text.toLowerCase().indexOf(state.toLowerCase()), text.toLowerCase().indexOf(` ${abbr.toLowerCase()} `));
    const excerpt = pos >= 0 ? text.slice(Math.max(0,pos-90), pos+220) : '';
    const value = excerpt ? `Live page found for ${state}` : 'Live source reachable';
    return sourceRow(key === 'rcp' ? 'RCP polls' : key === 'sabato' ? 'Sabato’s Crystal Ball' : 'Cook Political Report', url, value, excerpt || `${office} page fetched`, fetchedAt);
  } catch (e) { return sourceRow(key === 'rcp' ? 'RCP polls' : key === 'sabato' ? 'Sabato’s Crystal Ball' : 'Cook Political Report', url, 'Unavailable', e.message, fetchedAt); }
}

async function raceData(url) {
  const u = new URL(url, `http://localhost:${port}`);
  const state = u.searchParams.get('state');
  const office = u.searchParams.get('office');
  if (!state || !office) return {error:'state and office are required'};
  const fetchedAt = new Date().toISOString();
  const results = await Promise.all([fetchKalshi(state, office, fetchedAt), fetchPageSource('rcp',state,office,fetchedAt), fetchPageSource('sabato',state,office,fetchedAt), fetchPageSource('cook',state,office,fetchedAt)]);
  return {state, office, fetchedAt, sources:results};
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
