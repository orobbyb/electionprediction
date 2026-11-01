/* Transparent prototype model, not historically calibrated. No network or storage. */
(function(root){
 const VERSION='prototype-2-sensitivity';
 function parseShares(text=''){
  return [...text.matchAll(/(?:^|;)\s*([^;%]+?)\s+(\d+(?:\.\d+)?)%/g)].map(m=>({name:m[1].trim(),value:Number(m[2])})).filter(x=>Number.isFinite(x.value)&&x.value>=0&&x.value<=100);
 }
 function cdf(z){const sign=z<0?-1:1,x=Math.abs(z)/Math.sqrt(2),t=1/(1+.3275911*x);return .5*(1+sign*(1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t*Math.exp(-x*x)));}
 function eligible(record,now=Date.now(),isPoll=false){
  if(!record||!['verified','verified-page-fallback'].includes(record.status))return false;
  const fetched=Date.parse(record.fetchedAt);
  if(!Number.isFinite(fetched)||now-fetched>48*3600000||fetched-now>3600000)return false;
  if(isPoll){const end=Date.parse(record.publishedAt);if(!Number.isFinite(end)||now-end>35*86400000)return false;}
  return true;
 }
 function align(shares,candidates){
  return candidates.map(c=>{const found=shares.filter(s=>c.aliases.some(a=>a.toLowerCase()===s.name.toLowerCase()));return found.length===1?found[0].value:null;});
 }
 function estimate(race,records={},mode='combined',weight=.6,poll=null,now=Date.now(),scenario={}){
  const swing=Number(scenario.swing??0),spread=Number(scenario.spread??1);
  if(!Number.isFinite(swing)||Math.abs(swing)>10||!Number.isFinite(spread)||spread<.5||spread>3)throw Error('Invalid scenario assumptions.');
  const result={version:VERSION,label:'Not scored',probabilities:null,reason:'No usable source for this view.',pollShares:null,marketShares:null,effectiveWeights:null};
  if(!Number.isFinite(weight)||weight<0||weight>1)throw Error('Poll weight must be between 0 and 1.');
  const candidates=race.candidates;
  const market=align(parseShares(records.kalshi?.value),candidates);
  if(market.some(v=>v!==null))result.marketShares=market;
  const pollRecord=poll||records.rcp;
  const pollShares=poll?align(poll.shares||[],candidates):align(parseShares(records.rcp?.value),candidates);
  if(pollShares.some(v=>v!==null))result.pollShares=pollShares;
  if(candidates.length!==2||race.method==='ranked-choice'){
   result.reason='Joint multi-candidate / ranked-choice model not yet validated. Raw source quotes remain available.';return result;
  }
  const binary=(a)=>a.length===2&&a.every(v=>v!==null&&Number.isFinite(v))&&a[0]+a[1]>0&&a[0]+a[1]<=102;
  const haveMarket=eligible(records.kalshi,now)&&binary(market)&&Math.abs(market[0]+market[1]-100)<=2;
  const havePoll=eligible(pollRecord,now,true)&&binary(pollShares);
  let pollP=null;
  if(havePoll){
   const ageDays=Math.max(0,(now-Date.parse(pollRecord.publishedAt))/86400000);
   const sigma=Math.sqrt((poll?6:4)**2+Math.min(ageDays,35)*.25)*spread;
   const direction=candidates[0].party==='Democrat'?1:candidates[0].party==='Republican'?-1:0;
   const margin=pollShares[0]-pollShares[1]+direction*swing;
   pollP=cdf(margin/sigma);result.sigma=sigma;result.pollMargin=margin;
   result.pollingInterval=[margin-1.644854*sigma,margin+1.644854*sigma];
  }
  const marketP=haveMarket?market[0]/(market[0]+market[1]):null;
  let p=null;
  if(mode==='market'){p=marketP;result.label='Kalshi market-implied';result.effectiveWeights={polls:0,market:1};}
  else if(mode==='polls'||mode==='single'){p=pollP;result.label=mode==='single'?'Single-poll estimate (experimental)':'Polling estimate (experimental)';result.effectiveWeights={polls:1,market:0};}
  else if(mode==='combined'){
   if(weight===0&&haveMarket){p=marketP;result.label='Kalshi market-implied';result.effectiveWeights={polls:0,market:1};}
   else if(weight===1&&havePoll){p=pollP;result.label='Polling estimate (experimental)';result.effectiveWeights={polls:1,market:0};}
   else if(haveMarket&&havePoll){
    // Decay effective polling weight as its fieldwork ages; markets already incorporate polls.
    const age=Math.max(0,(now-Date.parse(pollRecord.publishedAt))/86400000);
    const wp=weight*Math.pow(.5,age/14),wm=1-weight;
    const w=wp/(wp+wm);p=w*pollP+(1-w)*marketP;
    result.label='Combined estimate (experimental)';result.effectiveWeights={polls:w,market:1-w};
   }else{result.reason='Combined view requires both a current numeric poll average and a current matching market. Try a single-source view.';return result;}
  }
  if(p!==null){result.probabilities=[p,1-p];result.reason='Two-outcome approximation; not a calibrated full-ballot forecast.';}
  else result.reason='Selected source is missing, stale, non-numeric, or does not match this contest. No replacement value was invented.';
  return result;
 }
 root.Forecast={VERSION,parseShares,cdf,eligible,align,estimate};
})(globalThis);
