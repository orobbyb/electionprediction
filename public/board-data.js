(function(root){
 const candidate=(name,party,...aliases)=>({name,party,aliases});
 const race=(state,office,candidates,extra={})=>({id:state.toLowerCase()+'|'+office.toLowerCase(),state,office,title:state,tab:office==='Senate'?'senate':'governor',candidates,...extra});
 const races=[
  race('Texas','Senate',[candidate('James Talarico','Democrat','Talarico'),candidate('Ken Paxton','Republican','Paxton')]),
  race('Ohio','Senate',[candidate('Sherrod Brown','Democrat','Brown'),candidate('Jon Husted','Republican','Husted')],{subtitle:'Special election'}),
  race('Michigan','Senate',[candidate('Abdul El-Sayed','Democrat','El-Sayed'),candidate('Mike Rogers','Republican','Rogers')]),
  race('Iowa','Senate',[candidate('Josh Turek','Democrat','Turek'),candidate('Ashley Hinson','Republican','Hinson')]),
  race('Kansas','Senate',[candidate('Adam Hamilton','Democrat','Hamilton'),candidate('Roger Marshall','Republican','Marshall')]),
  race('Alaska','Senate',[candidate('Mary Peltola','Democrat','Democrat'),candidate('Dan Sullivan','Republican','Republican')],{method:'ranked-choice',subtitle:'Party-level market; not person-specific'}),
  race('Nebraska','Senate',[candidate('Dan Osborn','Independent','Osborn'),candidate('Pete Ricketts','Republican','Ricketts'),candidate('Cindy Burbank','Democrat','Burbank')],{subtitle:'Three quoted outcomes; no binary model'}),
  race('Maine','Senate',[candidate('Troy Jackson','Democrat','Jackson'),candidate('Susan Collins','Republican','Collins')],{method:'ranked-choice',subtitle:'Ranked-choice election; raw sources only'}),
  race('Ohio','Governor',[candidate('Amy Acton','Democrat','Acton'),candidate('Vivek Ramaswamy','Republican','Ramaswamy')]),
  race('Texas','Governor',[candidate('Gina Hinojosa','Democrat','Hinojosa'),candidate('Greg Abbott','Republican','Abbott')]),
  race('Nevada','Governor',[candidate('Aaron Ford','Democrat','Ford'),candidate('Joe Lombardo','Republican','Lombardo')]),
  race('Georgia','Governor',[candidate('Keisha Lance Bottoms','Democrat','Bottoms'),candidate('Rick Jackson','Republican','Jackson')],{subtitle:'General-election win model only; runoff not modeled'}),
  race('Vermont','Governor',[candidate('Amanda Janoo','Democrat','Janoo'),candidate('Phil Scott','Republican','Scott')])
 ];
 const mo='https://www.sos.mo.gov/petitions/2026BallotMeasures';
 const ma='https://www.sec.state.ma.us/divisions/elections/research-and-statistics/2026-ballot-questions.htm';
 function issue(state,number,title,yes,no,url){return {id:state.toLowerCase()+'|ballot|'+number.toLowerCase().replaceAll(' ','-'),state,office:'Ballot',district:number,title:number,subtitle:title,tab:state==='Missouri'?'mo':'ma',candidates:[candidate('Yes','Other','Yes'),candidate('No','Other','No')],yes,no,url,verifiedAt:'2026-11-01T00:55:24Z'};}
 races.push(
  issue('Missouri','Amendment 3','Reproductive rights and procedures for minors','Replace the 2024 reproductive-rights provision and restrict specified procedures.','Keep the existing constitutional provision.',mo),
  issue('Missouri','Amendment 6','Initiative and referendum protections','Add constitutional protections for citizen initiatives and referenda.','Keep existing provisions.',mo),
  issue('Missouri','Amendment 7','State endowment fund','Create an endowment intended to replace state taxes when funded sufficiently.','Do not create the fund.',mo),
  issue('Missouri','Amendment 8','County sheriffs','Constitutionally require elected sheriffs and limit removal.','Keep current statutory rules.',mo),
  issue('Missouri','Proposition A','Congressional district boundaries','Approve the 2025 congressional redistricting law.','Retain the 2022 boundaries.',mo),
  issue('Massachusetts','Question 1','Public records','Expand public-records access to legislative and governor records.','No change.',ma),
  issue('Massachusetts','Question 2','Public counsel employees','Permit public counsel employees to collectively bargain.','No change.',ma),
  issue('Massachusetts','Question 3','All-party primaries','Replace party primaries with a top-two all-party primary.','No change.',ma),
  issue('Massachusetts','Question 4','Election Day registration','Permit Election Day voter registration and address updates.','No change.',ma),
  issue('Massachusetts','Question 5','State revenue limit','Revise revenue limits and refund excess collections.','No change.',ma),
  issue('Massachusetts','Question 6','Nature conservation fund','Allocate specified tax revenue to a conservation fund.','No new fund.',ma),
  issue('Massachusetts','Question 7','Single-family housing lots','Permit qualifying single-family homes on smaller lots.','No change.',ma),
  issue('Massachusetts','Question 8','Recreational marijuana retail','Repeal recreational retail legalization and change possession rules.','No change.',ma),
  issue('Massachusetts','Question 9','Firearms law referendum','Keep the 2024 firearms law.','Repeal that law.',ma)
 );
 root.BoardData={races};
})(globalThis);
