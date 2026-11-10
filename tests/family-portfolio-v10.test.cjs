// WealthOS Family Portfolio Concentration v0.10 acceptance tests. Node.js stdlib only.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const model=require('../family-portfolio-v10.js');
const html=fs.readFileSync('index.html','utf8');
const source=fs.readFileSync('family-portfolio-v10.js','utf8');

const empty=Array.from({length:model.SLOT_COUNT},()=>model.emptyHolding());
const rows=empty.map(x=>({...x}));
rows[0]={name:'Income Fund A',amount:60_000_000,manager:'Manager A',bank:'Bank A',assetClass:'Income',currency:'LSL'};
rows[1]={name:'Equity Fund B',amount:25_000_000,manager:'Manager B',bank:'Bank B',assetClass:'Equity',currency:'ZAR'};
rows[2]={name:'Cash C',amount:15_000_000,manager:'Manager A',bank:'Bank A',assetClass:'Cash',currency:'LSL'};
let r=model.calculate(rows);
assert.equal(r.total,100_000_000);
assert.equal(r.activeCount,3);
assert.equal(r.largestHolding.name,'Income Fund A');
assert.equal(r.largestHolding.sharePct,60);
assert.equal(r.largestManager.label,'Manager A');
assert.equal(r.largestManager.sharePct,75);
assert.equal(r.largestBank.label,'Bank A');
assert.equal(r.largestBank.sharePct,75);
assert.equal(r.largestAssetClass.label,'Income');
assert.equal(r.largestAssetClass.sharePct,60);
assert.equal(r.largestCurrency.label,'LSL');
assert.equal(r.largestCurrency.sharePct,75);
assert(r.observations.some(x=>x.includes('One holding represents at least 50%')));
assert(r.observations.some(x=>x.includes('One manager represents at least 50%')));
assert.equal(r.approved,false);
assert.equal(r.tradeEligible,false);
assert(r.effectiveHoldingCount>2&&r.effectiveHoldingCount<3);

const missing=empty.map(x=>({...x}));
missing[0]={name:'Only Asset',amount:1000,manager:'',bank:'',assetClass:'',currency:''};
r=model.calculate(missing);
assert.equal(r.incompleteCount,1);
assert.equal(r.largestManager.label,'UNSPECIFIED');
assert(r.observations.some(x=>x.includes('missing manager')));

assert.throws(()=>model.calculate(rows.slice(0,7)));
const bad=empty.map(x=>({...x}));bad[0]={...bad[0],name:'Bad',amount:-1};
assert.throws(()=>model.calculate(bad));
const unnamed=empty.map(x=>({...x}));unnamed[0]={...unnamed[0],amount:100};
assert.throws(()=>model.calculate(unnamed));
const huge=empty.map(x=>({...x}));huge[0]={...huge[0],name:'A',amount:1e308};huge[1]={...huge[1],name:'B',amount:1e308};
assert.throws(()=>model.calculate(huge));

assert.match(html,/id="familyPortfolioPanel"/);
assert.match(html,/family-portfolio-v10\.js\?v=10/);
for(const id of ['fp_rows','fp_total','fp_count','fp_effective','fp_holding','fp_manager','fp_bank','fp_assetClass','fp_currency','fp_useTotal','fp_clear','fp_status'])
  assert(html.includes('id="'+id+'"'),id+' missing');
assert(html.indexOf('id="familyPortfolioPanel"')>html.indexOf('id="familyCapitalPanel"'));
assert(html.indexOf('id="familyPortfolioPanel"')<html.indexOf('<h2>Governance state'));
assert.match(html,/LIVE CAPITAL LOCKED/);
new vm.Script(source,{filename:'family-portfolio-v10.js'});
console.log('PASS v0.10 concentration arithmetic, incomplete metadata and static integration');

// Browser controller and local handoff to v0.9.
const baseIds=['familyPortfolioPanel','fp_rows','fp_error','fp_total','fp_count','fp_effective','fp_holding','fp_manager','fp_bank','fp_assetClass','fp_currency','fp_notes','fp_status','fp_useTotal','fp_clear','fp_transferNote','fc_currentCapital'];
const nodes=Object.fromEntries(baseIds.map(id=>[id,{value:'',textContent:'',innerHTML:'',addEventListener(ev,fn){this[ev]=fn;},dispatchEvent(ev){if(this.input)this.input(ev);}}]));
const doc={getElementById(id){
  if(!nodes[id])nodes[id]={value:'',textContent:'',innerHTML:'',addEventListener(ev,fn){this[ev]=fn;},dispatchEvent(ev){if(this.input)this.input(ev);}};
  return nodes[id];
}};
const Event=function(type){this.type=type;};
vm.runInNewContext(source,{window:{document:doc},document:doc,Event,console});
nodes.fp_name_0.value='Fund A';nodes.fp_amount_0.value='100000000';nodes.fp_manager_0.value='Manager A';nodes.fp_bank_0.value='Bank A';nodes.fp_assetClass_0.value='Income';nodes.fp_currency_0.value='LSL';
nodes.fp_amount_0.input();
assert.equal(nodes.fp_total.textContent,'M100,000,000');
assert(nodes.fp_holding.textContent.includes('100.00%'));
let handed=false;nodes.fc_currentCapital.input=()=>{handed=true;};
nodes.fp_useTotal.click();
assert.equal(nodes.fc_currentCapital.value,'100000000');
assert.equal(handed,true);
assert(nodes.fp_transferNote.textContent.includes('copied locally'));
nodes.fp_clear.click();
assert.equal(nodes.fp_total.textContent,'M0');
console.log('PASS v0.10 browser concentration register, clearing and local v0.9 handoff');
