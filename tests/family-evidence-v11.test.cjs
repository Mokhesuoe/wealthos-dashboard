// WealthOS Family Capital Evidence v0.11 acceptance tests. Node.js stdlib only.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const model=require('../family-evidence-v11.js');
const html=fs.readFileSync('index.html','utf8');
const source=fs.readFileSync('family-evidence-v11.js','utf8');

const rows=Array.from({length:model.SLOT_COUNT},()=>model.blank());
rows[0]={
  ...model.blank(),name:'Income Fund',amount:100_000_000,manager:'Manager A',bank:'Bank A',assetClass:'Income',currency:'LSL',jurisdiction:'Lesotho',
  taxRatePct:10,annualFeePct:1,distributionPct:6,totalReturnPct:7,
  ownershipRef:'Statement-1',ownershipDate:'2026-11-01',
  taxRef:'Tax-note-1',taxDate:'2026-11-01',
  feeRef:'Fee-schedule-1',feeDate:'2026-11-01',
  incomeRef:'Distribution-history-1',incomeDate:'2026-11-01',
  counterpartyRef:'Counterparty-review-1',counterpartyDate:'2026-11-01'
};
let r=model.calculate(rows,'2026-11-10');
assert.equal(r.total,100_000_000);
assert.equal(r.activeCount,1);
assert.equal(r.axisCoverage.ownership,100);
assert.equal(r.axisCoverage.tax,100);
assert.equal(r.axisCoverage.fee,100);
assert.equal(r.axisCoverage.income,100);
assert.equal(r.axisCoverage.counterparty,100);
assert.equal(r.readyForPolicyReview,true);
assert.equal(r.certified,false);
assert.equal(r.tradeEligible,false);
assert.equal(r.effectiveGrossDistributionPct,6);
assert.equal(r.effectiveTaxOnDistributionsPct,10);
assert.equal(r.effectiveFeePct,1);
assert.equal(r.weightedTotalReturnPct,7);
assert.equal(r.grossAnnualDistribution,6_000_000);
assert.equal(r.estimatedAnnualTax,600_000);
assert.equal(r.estimatedAnnualFees,1_000_000);
assert.equal(r.estimatedNetAnnualDistribution,4_400_000);
assert.equal(r.distributionVsTotalReturnDifferencePct,1);

const stale=rows.map(x=>({...x})); stale[0].taxDate='2025-01-01';
r=model.calculate(stale,'2026-11-10');
assert.equal(r.readyForPolicyReview,false);
assert(r.blockers.includes('TAX_EVIDENCE_INCOMPLETE'));
assert(r.blockers.includes('INVALID_FUTURE_OR_STALE_EVIDENCE'));

const future=rows.map(x=>({...x})); future[0].feeDate='2027-01-01';
r=model.calculate(future,'2026-11-10');
assert.equal(r.readyForPolicyReview,false);

const missingClass=rows.map(x=>({...x})); missingClass[0].jurisdiction='';
r=model.calculate(missingClass,'2026-11-10');
assert(r.blockers.includes('INCOMPLETE_HOLDING_CLASSIFICATION'));

assert.equal(model.evidenceState('Ref','2026-11-01','2026-11-10').state,'current_reference');
assert.equal(model.evidenceState('','2026-11-01','2026-11-10').state,'invalid');
assert.equal(model.evidenceState('Ref','','2026-11-10').state,'invalid');
assert.equal(model.evidenceState('Ref','2026-12-01','2026-11-10').state,'future');

for(const bad of [
  {amount:-1},{taxRatePct:100},{annualFeePct:100},{distributionPct:100},{totalReturnPct:-100}
]){
  const x=Array.from({length:model.SLOT_COUNT},()=>model.blank());
  x[0]={...model.blank(),name:'Bad',amount:100,...bad};
  assert.throws(()=>model.calculate(x,'2026-11-10'));
}
const huge=Array.from({length:model.SLOT_COUNT},()=>model.blank());
huge[0]={...model.blank(),name:'A',amount:1e308}; huge[1]={...model.blank(),name:'B',amount:1e308};
assert.throws(()=>model.calculate(huge,'2026-11-10'));

assert.match(html,/id="familyEvidencePanel"/);
assert.match(html,/family-evidence-v11\.js\?v=11/);
for(const id of ['fe_import','fe_toFreedom','fe_total','fe_ownership','fe_tax','fe_fee','fe_income','fe_counterparty','fe_grossYield','fe_effectiveTax','fe_effectiveFee','fe_totalReturn','fe_netIncome','fe_status','fe_blockers','fe_rows'])
  assert(html.includes('id="'+id+'"'),id+' missing');
assert(html.indexOf('id="familyEvidencePanel"')>html.indexOf('id="familyPortfolioPanel"'));
assert(html.indexOf('id="familyEvidencePanel"')<html.indexOf('<h2>Governance state'));
assert.match(html,/LIVE CAPITAL LOCKED/);
new vm.Script(source,{filename:'family-evidence-v11.js'});
console.log('PASS v0.11 evidence provenance, weighted spendability and static integration');
