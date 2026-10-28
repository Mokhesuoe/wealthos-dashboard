// WealthOS Capital Creation v0.6 acceptance tests, Node.js stdlib only.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const engine=require('../capital-creation-v06.js');
const html=fs.readFileSync('index.html','utf8');
const script=fs.readFileSync('capital-creation-v06.js','utf8');
const sample={...engine.defaultOpportunity,name:'Small business',ownerCapital:1000,monthlyRevenue:1000,grossMarginPct:50,monthlyFixedCosts:200,annualCostInflationPct:0,horizonMonths:12};
const close=(x,y,delta=.00001)=>assert.ok(Math.abs(x-y)<delta,'Expected '+x+' to equal '+y);
let x=engine.simulate(sample);
close(x.cumulativeOwnerCash,3600);close(x.cumulativeShortfalls,0);
assert.equal(x.paybackMonth,4);
close(x.lastOwnerCash,300);
close(engine.simulate(sample,.65).cumulativeOwnerCash,1500);
close(engine.simulate(sample,1.3).cumulativeOwnerCash,5400);
x=engine.simulate({...sample,effectiveTaxPct:20});
close(x.cumulativeOwnerCash,2880);
x=engine.simulate({...sample,workingCapitalReservePct:10});
close(x.cumulativeOwnerCash,2400);
x=engine.simulate({...sample,ownerSharePct:40});
close(x.cumulativeOwnerCash,1440);
x=engine.simulate({...sample,monthlyDebtService:100,monthlyMaintenanceCapex:50});
close(x.cumulativeOwnerCash,1800);
x=engine.simulate({...sample,monthlyFixedCosts:600});
close(x.cumulativeOwnerCash,0);close(x.cumulativeShortfalls,1200);
assert.equal(x.shortfallMonths,12);
assert.equal(x.paybackMonth,null,'Do not claim payback when business has unfunded cash deficits');
assert.equal(engine.evaluate(sample).status,'SCENARIO ONLY');
assert.equal(engine.evaluate({...sample,monthlyFixedCosts:600}).status,'FUNDING GAP');
assert.equal(engine.evaluate(engine.defaultOpportunity).status,'NOT MODELLED');
const poor=engine.evaluate({...sample,grossMarginPct:20,monthlyFixedCosts:200});
assert.equal(poor.status,'DOWNSIDE RISK');
assert(poor.stress.cumulativeShortfalls>0);
for(const invalid of [
 {ownerCapital:-1},{monthlyRevenue:-1},{ownerSharePct:101},{grossMarginPct:-1},
 {workingCapitalReservePct:101},{annualRevenueGrowthPct:-100},{annualCostInflationPct:201},
 {horizonMonths:13},{horizonMonths:0},{horizonMonths:72},{effectiveTaxPct:101},
 {monthlyDebtService:NaN},{name:'.'.repeat(81)}
])assert.throws(()=>engine.validate({...sample,...invalid}));
assert.throws(()=>engine.simulate({...sample,monthlyRevenue:1e308,grossMarginPct:100}));
assert.throws(()=>engine.simulate(sample,4));
console.log('PASS Capital Creation v0.6 unit economics, tax, distributions, payback, downside, guardrails and overflow');
for(const id of ['creationStudio','create_name','create_ownerCapital','create_monthlyRevenue','create_effectiveTaxPct','create_comparison','create_tab0','create_tab1','create_tab2','create_export']){
 assert(html.includes('id="'+id+'"'),id+' HTML element missing');
}
assert(html.includes('capital-creation-v06.js?v=06'),'Versioned script missing');
assert(html.indexOf('id="creationStudio"')>html.indexOf('id="appPanel"'),'Studio must be inside authenticated panel');
assert(html.indexOf('id="creationStudio"')<html.lastIndexOf('</section>'),'Studio must appear before closing the app');
new vm.Script(script,{filename:'capital-creation-v06.js'});
console.log('PASS Capital Creation v0.6 static integration and script syntax');
// Exercise the actual browser module using a deliberately minimal DOM; no network, storage or Supabase mock.
const ids=['creationStudio','create_error','create_caveat','create_comparison','create_export',...Array.from({length:3},(_,i)=>'create_tab'+i),
'name',...engine.numericFields].flat().map(k=>['name',...engine.numericFields].includes(k)?'create_'+k:k);
const elements={};
for(const id of ids)elements[id]={value:'',textContent:'',innerHTML:'',className:'btn',
 addEventListener(type,callback){this[type]=callback;}};
const ctx={window:{document:{getElementById:id=>elements[id]},setTimeout:()=>{}},console};
vm.runInNewContext(script,ctx);
assert(elements.create_comparison.innerHTML.includes('NOT MODELLED'),'Default must not show fake business profit');
assert.equal(elements.create_ownerCapital.value,'0');
elements.create_ownerCapital.value='1000';elements.create_ownerCapital.input();
elements.create_monthlyRevenue.value='1000';elements.create_monthlyRevenue.input();
elements.create_monthlyFixedCosts.value='200';elements.create_monthlyFixedCosts.input();
elements.create_grossMarginPct.value='50';elements.create_grossMarginPct.input();
elements.create_annualCostInflationPct.value='0';elements.create_annualCostInflationPct.input();
elements.create_horizonMonths.value='12';elements.create_horizonMonths.input();
assert(elements.create_comparison.innerHTML.includes('M3,600'),'Dashboard should show calculated owner cash');
elements.create_tab1.click();
assert.equal(elements.create_monthlyRevenue.value,'0','Switching slots must load independent assumptions');
elements.create_tab0.click();
assert.equal(elements.create_monthlyRevenue.value,'1000','Opportunity values must remain across tab switches');
elements.create_monthlyRevenue.value='-2';elements.create_monthlyRevenue.input();
assert.notEqual(elements.create_error.textContent,'','Negative revenue must be rejected');
console.log('PASS browser-like studio integration, independent candidates and invalid input reporting');

/* Independent owner economics: zero ownership, dilution and explicit funding deficit. */
{
 const base={...sample,ownerSharePct:0};
 const r=engine.simulate(base);
 close(r.cumulativeOwnerCash,0);
 close(r.totalOperatingSurplus,3600);
 assert.equal(r.paybackMonth,null,'Zero ownership cannot repay owner capital');
}
{
 const r=engine.simulate({...sample,ownerSharePct:25,effectiveTaxPct:20,workingCapitalReservePct:10});
 // Monthly: gross profit 500 - fixed costs 200 = 300; tax 60;
 // working-capital holdback 100; distributable entity cash 140;
 // owner receives 25% = 35, for 12 months.
 close(r.cumulativeOwnerCash,420);
 close(r.totalEntityTax,720);
 close(r.totalGrossRevenue,12000);
 assert.equal(r.paybackMonth,null);
}
{
 const r=engine.simulate({...sample,monthlyFixedCosts:600,ownerSharePct:100});
 close(r.cumulativeShortfalls,1200);
 close(r.cumulativeOwnerCash,0);
 assert.equal(r.shortfallMonths,12);
 assert.equal(r.paybackMonth,null,'Unfunded downside must not show payback');
}
console.log('PASS independent capital creation ownership, tax, reserves and downside acceptance');
