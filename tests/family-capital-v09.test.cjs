// WealthOS Permanent Family Capital v0.9 acceptance tests. Node.js stdlib only.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const model=require('../family-capital-v09.js');
const html=fs.readFileSync('index.html','utf8');
const source=fs.readFileSync('family-capital-v09.js','utf8');

const close=(a,b,d=.01)=>assert.ok(Math.abs(a-b)<=d,String(a)+' != '+String(b));

let r=model.calculate({...model.defaults,currentCapital:100_000_000,monthlyLifestyle:500_000,annualDistributionRatePct:6,distributionTaxPct:0,annualPortfolioFeePct:0,liquidityReserve:6_000_000});
close(r.requiredDistributionRatePct,6);
close(r.income.grossMonthly,500_000);
close(r.income.netMonthly,500_000);
close(r.monthlySurplus,0);
close(r.reserveMonths,12);
assert.equal(r.state,'NUMERIC FREEDOM FLOOR — NOT CERTIFIED');
assert.equal(r.certified,false);
assert.equal(r.tradeEligible,false);

r=model.calculate({...model.defaults,currentCapital:125_000_000,monthlyLifestyle:500_000});
close(r.requiredDistributionRatePct,4.8);
assert.equal(r.state,'NUMERIC FREEDOM BUFFER — NOT CERTIFIED');

r=model.calculate({...model.defaults,currentCapital:150_000_000,monthlyLifestyle:500_000});
close(r.requiredDistributionRatePct,4);
assert.equal(r.state,'NUMERIC PERMANENT FREEDOM — NOT CERTIFIED');

r=model.calculate({...model.defaults,currentCapital:100_000_000,monthlyLifestyle:500_000,annualDistributionRatePct:6,distributionTaxPct:10,annualPortfolioFeePct:1});
close(r.income.grossAnnual,6_000_000);
close(r.income.tax,600_000);
close(r.income.fees,1_000_000);
close(r.income.netAnnual,4_400_000);
close(r.income.netMonthly,366_666.6666666667);
assert(r.monthlySurplus<0);
assert(r.warnings.some(x=>x.includes('below the lifestyle target')));

r=model.calculate({...model.defaults,currentCapital:100_000_000,monthlyLifestyle:500_000,drawdownPct:20});
close(r.afterDrawdownCapital,80_000_000);
close(r.afterDrawdownRequiredDistributionRatePct,7.5);
assert(r.warnings.some(x=>x.includes('higher distribution rate')));

r=model.calculate({...model.defaults,currentCapital:100_000_000,monthlyLifestyle:500_000,liquidityReserve:3_000_000,interruptionMonths:12});
close(r.reserveMonths,6);
close(r.interruptionNeed,6_000_000);
close(r.interruptionGap,3_000_000);
assert(r.warnings.some(x=>x.includes('does not fully cover')));

r=model.calculate({...model.defaults,currentCapital:100_000_000,monthlyLifestyle:500_000,annualInflationPct:4,inflationHorizonYears:10});
close(r.futureMonthlyLifestyle,500_000*Math.pow(1.04,10),.01);
assert(r.futureRequiredDistributionRatePct>6);

r=model.calculate({...model.defaults,currentCapital:100_000_000,monthlyLifestyle:500_000,annualDistributionRatePct:6});
assert.deepEqual(r.stressRates.map(x=>x.annualDistributionRatePct),[6,5,4,3]);
assert.equal(r.stressRates[0].status,'COVERS');
assert.equal(r.stressRates[1].status,'SHORTFALL');
close(r.northStarProgressPct,10);
assert.equal(r.gates.find(x=>x.key==='FREEDOM_FLOOR').reached,true);
assert.equal(r.gates.find(x=>x.key==='FREEDOM_BUFFER').reached,false);

for(const bad of [
  {currentCapital:-1},{monthlyLifestyle:-1},{annualDistributionRatePct:100},
  {distributionTaxPct:-1},{annualPortfolioFeePct:100},{drawdownPct:100},
  {annualInflationPct:-51},{inflationHorizonYears:0},{inflationHorizonYears:2.5},
  {interruptionMonths:-1},{interruptionMonths:61},{liquidityReserve:Infinity}
])assert.throws(()=>model.calculate({...model.defaults,...bad}));

assert.match(html,/id="familyCapitalPanel"/);
assert.match(html,/family-capital-v09\.js\?v=09/);
assert.match(html,/id="fc_currentCapital"/);
assert.match(html,/id="fc_monthlyLifestyle"/);
assert.match(html,/id="fc_requiredYield"/);
assert.match(html,/id="fc_gateRows"/);
assert.match(html,/id="fc_stressRows"/);
assert.match(html,/id="fc_certification"/);
assert.match(html,/LIVE CAPITAL LOCKED/);
assert(html.indexOf('id="familyCapitalPanel"')>html.indexOf('id="appPanel"'));
assert(html.indexOf('id="familyCapitalPanel"')<html.indexOf('<h2>Governance state'));
new vm.Script(source,{filename:'family-capital-v09.js'});
console.log('PASS v0.9 freedom gates, tax/fee spendability, inflation, drawdown, interruption and static integration');

// Exercise the real browser controller in a minimal DOM.
const ids=['familyCapitalPanel','fc_error','fc_warning','fc_state','fc_next','fc_requiredYield','fc_grossMonthly','fc_netMonthly','fc_surplus','fc_reserveMonths','fc_m1bProgress','fc_futureLifestyle','fc_drawdownYield','fc_gateRows','fc_stressRows','fc_certification','fc_useEvidence','fc_importNote',...model.keys.map(k=>'fc_'+k)];
const nodes=Object.fromEntries(ids.map(id=>[id,{value:'',textContent:'',innerHTML:'',className:'',addEventListener(ev,fn){this[ev]=fn;}}]));
for(const k of model.keys)nodes['fc_'+k].value=String(model.defaults[k]);
const fakeEvidence={getLiveSnapshot:()=>({baseline:{liquid:100_000_000,liquidityReserve:6_000_000,transferAllowed:true}})};
vm.runInNewContext(source,{window:{document:{getElementById:id=>nodes[id]},WealthOSEvidenceV07:fakeEvidence},console});
assert.equal(nodes.fc_state.textContent,'BELOW FREEDOM FLOOR');
nodes.fc_currentCapital.value='100000000';nodes.fc_currentCapital.input();
assert.equal(nodes.fc_state.textContent,'NUMERIC FREEDOM FLOOR — NOT CERTIFIED');
assert.equal(nodes.fc_requiredYield.textContent,'6.00%');
assert.equal(nodes.fc_grossMonthly.textContent,'M500,000');
assert.equal(nodes.fc_certification.textContent.includes('NOT CERTIFIED'),true);
nodes.fc_useEvidence.click();
assert.equal(nodes.fc_currentCapital.value,'100000000');
assert.equal(nodes.fc_liquidityReserve.value,'6000000');
assert(nodes.fc_importNote.textContent.includes('user-attested'));
nodes.fc_distributionTaxPct.value='101';nodes.fc_distributionTaxPct.input();
assert.notEqual(nodes.fc_error.textContent,'');
assert.equal(nodes.fc_requiredYield.textContent,'—');
console.log('PASS v0.9 browser wiring, v0.7 local import and fail-closed invalid inputs');
