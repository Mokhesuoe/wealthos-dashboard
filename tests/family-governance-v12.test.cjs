// WealthOS Family Capital Governance v0.12 acceptance tests. Node.js stdlib only.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const model=require('../family-governance-v12.js');
const html=fs.readFileSync('index.html','utf8');
const source=fs.readFileSync('family-governance-v12.js','utf8');

let w=model.withdrawalReadiness({capital:100_000_000,monthlyLifestyle:500_000,netMonthlyDistribution:500_000,liquidityReserve:6_000_000});
assert.equal(w.state,'ELIGIBLE FOR HUMAN REVIEW');
assert.equal(w.stage,'FREEDOM_FLOOR');
assert.equal(w.reserveMonths,12);
assert.equal(w.certified,false);

w=model.withdrawalReadiness({capital:150_000_000,monthlyLifestyle:500_000,netMonthlyDistribution:400_000,liquidityReserve:12_000_000});
assert.equal(w.state,'BLOCKED');
assert(w.blockers.includes('NET_DISTRIBUTION_BELOW_LIFESTYLE'));

w=model.withdrawalReadiness({capital:150_000_000,monthlyLifestyle:500_000,netMonthlyDistribution:600_000,liquidityReserve:4_000_000});
assert.equal(w.state,'CAUTION');
assert(w.cautions.includes('LIQUIDITY_RESERVE_BELOW_REFERENCE_TARGET'));

let s=model.simulateSequence({initialCapital:100_000_000,annualReturns:[0,0],monthlyWithdrawal:500_000,annualInflationPct:0,annualFeePct:0});
assert.equal(s.endingCapital,88_000_000);
assert.equal(s.cumulativeWithdrawals,12_000_000);

const early=model.simulateSequence({initialCapital:100_000_000,annualReturns:[-.25,.1,.1,.1,.1],monthlyWithdrawal:500_000,annualInflationPct:0,annualFeePct:0});
const late=model.simulateSequence({initialCapital:100_000_000,annualReturns:[.1,.1,.1,.1,-.25],monthlyWithdrawal:500_000,annualInflationPct:0,annualFeePct:0});
assert(early.endingCapital<late.endingCapital);

assert.deepEqual(model.parseReturns('-25,10,0'),[-.25,.1,0]);
assert.throws(()=>model.parseReturns('-100,5'));
assert.throws(()=>model.parseReturns(''));

let r=model.rebalanceReview(
  {liquidity:10,income:60,realGrowth:10,growth:15,opportunity:5},
  {liquidity:15,income:50,realGrowth:10,growth:20,opportunity:5},
  5
);
assert.equal(r.reviewRequired,true);
assert.equal(r.action,'HUMAN REBALANCING REVIEW');
assert.equal(r.automaticTrades,false);

r=model.rebalanceReview(
  {liquidity:10,income:55,realGrowth:10,growth:20,opportunity:5},
  {liquidity:15,income:50,realGrowth:10,growth:20,opportunity:5},
  5
);
assert.equal(r.reviewRequired,false);

assert.match(html,/id="familyGovernancePanel"/);
assert.match(html,/family-governance-v12\.js\?v=12/);
for(const id of ['fg_capital','fg_monthlyLifestyle','fg_netMonthlyDistribution','fg_liquidityReserve','fg_sequenceReturnsText','fg_withdrawalState','fg_sequenceRows','fg_rebalanceState','fg_rebalanceRows','fg_certification'])
  assert(html.includes('id="'+id+'"'),id+' missing');
assert(html.indexOf('id="familyGovernancePanel"')>html.indexOf('id="familyEvidencePanel"'));
assert(html.indexOf('id="familyGovernancePanel"')<html.indexOf('<h2>Governance state'));
assert.match(html,/LIVE CAPITAL LOCKED/);
new vm.Script(source,{filename:'family-governance-v12.js'});
console.log('PASS v0.12 withdrawal readiness, sequence risk, rebalancing and static integration');
