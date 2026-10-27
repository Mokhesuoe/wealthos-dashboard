// WealthOS release checks: security, Capital v0.5 computations and browser wiring.
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8'),js=fs.readFileSync('capital-v05.js','utf8');
for(const [label,re] of [
 ['private application shell',/id="appPanel" class="hidden"/],
 ['MFA challenge',/id="mfaChallengePanel"/],
 ['live capital lock',/LIVE CAPITAL LOCKED/],
 ['capital panel',/id="capitalPanel"/],
 ['v0.5 script link',/capital-v05\.js\?v=05/],
 ['debt repayment input',/id="cap5_monthlyDebtPayment"/],
 ['distribution tax',/id="cap5_distributionTaxPct"/],
 ['liquidity haircut',/id="cap5_equityHaircutPct"/],
 ['capital export',/id="cap5_export"/]
]){assert.match(html,re,label);console.log('PASS '+label);}
assert.doesNotMatch(html,/service_role|sb_secret_/,'Browser cannot embed privileged keys');
assert.match(html,/outside_regular_us_session/,'Dashboard must identify expected market-closed ingestion skips');
assert.match(html,/MARKET CLOSED \/ SKIPPED/,'Dashboard must clearly label scheduled closed-market skips');
assert.match(html,/id="lastVerifiedState"/,'Last qualifying ingestion indicator must render');
assert.match(html,/\.gte\('data_eligible_count',3\)/,'Last qualifying ingest must require three eligible symbols');
assert.match(html,/historical, not necessarily fresh/,'Historical success must not be described as current data');
assert.match(html,/if\(aal\.currentLevel!=='aal2'\)/,'AAL2 required');
assert.doesNotMatch(html,/if\(m\.require_mfa\s*&&/,'MFA not conditional');
const inline=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].at(-1);
new vm.Script(inline[1].replace(/^import\s+.*?;\s*$/gm,''),{filename:'index-module.js'});
new vm.Script(js,{filename:'capital-v05.js'});
console.log('PASS authentication enforcement and JS parsing');
const m=require('../capital-v05.js'),s=m.defaults;
const close=(a,b)=>assert.ok(Math.abs(a-b)<.0001,String(a)+' != '+String(b));
let r=m.simulate({...s,years:1,liquidStart:100,monthlyContribution:10,annualPortfolioReturn:0,annualInflation:0});close(r.final.net,220);
r=m.simulate({...s,years:1,liquidStart:1000,debtStart:700,monthlyContribution:0,annualPortfolioReturn:0,debtAPR:0});close(r.final.net,300);
r=m.simulate({...s,years:1,monthlyContribution:0,monthlyBusinessDistribution:100,annualPortfolioReturn:0});close(r.final.net,1200);
r=m.simulate({...s,years:1,debtStart:1200,monthlyDebtPayment:100,monthlyContribution:100,annualPortfolioReturn:0});close(r.final.debt,0);close(r.final.liquid,0);
r=m.simulate({...s,years:1,debtStart:1200,monthlyDebtPayment:100,monthlyContribution:100,annualPortfolioReturn:0,debtAPR:12});assert(r.final.debt>0);
r=m.simulate({...s,years:1,monthlyContribution:100,monthlyBusinessDistribution:100,distributionTaxPct:20,annualPortfolioReturn:0});close(r.final.liquid,2160);
r=m.simulate({...s,years:1,liquidStart:1000,monthlyContribution:0,investmentTaxPct:50,annualPortfolioReturn:12});assert(r.final.liquid>1000&&r.final.liquid<1120);
r=m.simulate({...s,years:1,equityStart:1000,monthlyContribution:0,equityHaircutPct:50});close(r.final.net,1000);close(r.final.liquidityAdjusted,500);
r=m.simulate({...s,years:1,debtStart:1000,monthlyDebtPayment:100,monthlyContribution:0});assert.equal(r.status,'cash_shortfall');assert.equal(r.shortfallMonth,1);
r=m.simulate({...s,years:1,debtStart:1000,debtAPR:12,monthlyDebtPayment:0,monthlyContribution:0});assert(r.final.debt>1000);
assert(m.requiredContribution({...s,years:20})>0);
assert.equal(m.requiredContribution({...s,liquidStart:1e9}),0);
for(const bad of [{years:0},{annualInflation:-100},{equityHaircutPct:100},{monthlyContribution:-1},{annualPortfolioReturn:-100},{debtAPR:-1}])
 assert.throws(()=>m.simulate({...s,...bad}));
assert.throws(()=>m.simulate({...s,years:60,liquidStart:1e308,annualPortfolioReturn:200}));
console.log('PASS financial model scenarios');
const ids=[...m.keys.map(k=>'cap5_'+k),'capitalPanel','cap5_nominal','cap5_real','cap5_liquid','cap5_adjusted','cap5_debt','cap5_required','cap5_target','cap5_error','cap5_warning','cap5_rows','cap5_export'];
const nodes=Object.fromEntries(ids.map(id=>[id,{value:id.startsWith('cap5_')&&m.defaults[id.slice(5)]!==undefined?String(m.defaults[id.slice(5)]):'',textContent:'',innerHTML:'',addEventListener(ev,fn){this[ev]=fn;}}]));
vm.runInNewContext(js,{window:{document:{getElementById:id=>nodes[id]},setTimeout:()=>{}},console});
assert.equal(nodes.cap5_error.textContent,'');
assert.equal(nodes.cap5_nominal.textContent,'M2,844,995');
assert.equal(nodes.cap5_target.textContent,'Not within horizon');
nodes.cap5_monthlyContribution.value='0';nodes.cap5_monthlyContribution.input();
assert.equal(nodes.cap5_liquid.textContent,'M0');
nodes.cap5_debtStart.value='1000';nodes.cap5_monthlyDebtPayment.value='100';nodes.cap5_monthlyDebtPayment.input();
assert.notEqual(nodes.cap5_error.textContent,'');
assert.equal(nodes.cap5_nominal.textContent,'—');
nodes.cap5_monthlyContribution.value='5000';nodes.cap5_monthlyContribution.input();
assert.equal(nodes.cap5_error.textContent,'');
assert.equal(typeof nodes.cap5_export.click,'function');
console.log('PASS browser-like capital UI interaction');

assert.match(html,/SNAPSHOT VISIBLE/,'Valuation and event-risk snapshots should be labeled as visible, not validated');
assert.match(html,/No snapshot visible to this authenticated session/,'RLS-empty results must not be described as empty underlying tables');
assert.match(html,/freshness\/acceptance not established/,'Snapshot visibility must not imply freshness or model acceptance');
console.log('PASS research snapshot visibility semantics');

assert.match(html,/id="snapshotDiagnose"/,'Manual authenticated snapshot diagnostics control present');
assert.match(html,/async function diagnoseSnapshotAccess\(\)/,'Snapshot diagnostics implementation present');
assert.match(html,/authInfo\?\.currentLevel!=='aal2'/,'Snapshot diagnostics require MFA AAL2');
assert.match(html,/ZERO VISIBLE ROWS/,'Diagnostics distinguish RLS visibility from backend absence');
console.log('PASS authenticated snapshot diagnostics safety contract');

assert.match(html,/HISTORICAL /,'Acceptance gate must label old passes as historical');
assert.match(html,/current session NOT accepted/,'Acceptance gate cannot promote an old pass as current');
assert.match(html,/acceptanceAge<=60\*60\*1000/,'Acceptance status has an explicit recency window');
console.log('PASS acceptance gate result recency labels');

assert.match(html,/id="sessionQualityState"/,'Separate recurring session quality indicator must exist');
assert.match(html,/research_session_quality_runs/,'Dashboard must query recurring quality records');
assert.match(html,/not investment approval/,'Quality pass must explicitly deny investment approval');
assert.match(html,/qualityRun\.error/,'Quality query error must be visible');
console.log('PASS recurring quality display and no-trade semantics');

assert.match(html,/timeZone:'America\/New_York'/,'Recurring-quality recency uses market timezone');
assert.match(html,/HISTORICAL /,'Old session-quality results must be labeled historical');
assert.match(html,/current NY session not checked/,'Old checks cannot certify current market session');
console.log('PASS recurring research session freshness');
