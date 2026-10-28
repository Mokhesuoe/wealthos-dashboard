// WealthOS v0.8 Capital Allocation acceptance tests — Node.js stdlib only.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const creation=require('../capital-creation-v06.js'),evidence=require('../capital-evidence-v07.js');
const model=require('../capital-allocation-v08.js'),html=fs.readFileSync('index.html','utf8');
const script=fs.readFileSync('capital-allocation-v08.js','utf8');
const date='2026-10-27';
const baseline={netWorth:19000,liquid:18000,available:15000,transferAllowed:true,daysOld:2};
const A={...creation.defaultOpportunity,name:'Candidate A',ownerCapital:3000,monthlyRevenue:1000,grossMarginPct:50,monthlyFixedCosts:200,annualCostInflationPct:0,horizonMonths:12};
const B={...creation.defaultOpportunity,name:'Candidate B',ownerCapital:2000,monthlyRevenue:1000,grossMarginPct:50,monthlyFixedCosts:450,annualCostInflationPct:0,horizonMonths:12};
const C={...creation.defaultOpportunity,name:'Candidate C'};
const opportunities=[A,B,C],missing=[evidence.blankEvidence(),evidence.blankEvidence(),evidence.blankEvidence()];
const calculate=(changes={})=>model.allocate({baseline,opportunities,diligence:missing,asOfDate:date,...changes});
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<.00001,String(actual)+' != '+String(expected));
let r=calculate();
close(r.startingCapital,5000);close(r.downsideReserve,1500);
close(r.totalRequired,6500);close(r.fundingGap,0);close(r.unreservedAfter,8500);
close(r.items[1].downsideBusinessDeficit,1500);
close(r.items[1].totalRequired,3500);
assert.equal(r.items[2].active,false);
assert.equal(r.items[2].totalRequired,0);
assert(r.riskFlags.some(s=>s.includes('externally reviewed evidence')));
assert.equal(r.approved,false);
assert.equal(r.investmentAuthority,false);
assert(r.items.every(i=>i.approved===false&&i.tradeEligible===false));
r=calculate({policy:{downsideFundingSharePct:[100,50,100]}});
close(r.downsideReserve,750);close(r.totalRequired,5750);
assert(r.riskFlags.some(s=>s.includes('Partial funding responsibility')));
r=calculate({baseline:{...baseline,available:5000}});
close(r.fundingGap,1500);close(r.unreservedAfter,-1500);
assert(r.riskFlags.some(s=>s.includes('exceed unreserved liquid capital')));
assert(r.items[0].concentrated);
r=calculate({policy:{minRemainingPct:70}});
assert(r.riskFlags.some(s=>s.includes('liquidity')));
r=calculate({policy:{maxSinglePct:15}});
assert(r.riskFlags.some(s=>s.includes('concentration')));
r=calculate({baseline:{...baseline,transferAllowed:false,daysOld:300}});
assert.equal(r.baselineCurrent,false);
assert(r.riskFlags.some(s=>s.includes('not a current')));
r=calculate({opportunities:[A,{...B,monthlyFixedCosts:600},C]});
assert(r.items[1].baseHasDeficit);
assert(r.riskFlags.some(s=>s.includes('base scenarios')));
const full=evidence.blankEvidence();
for(const [key] of evidence.AXES)full[key]={status:'external_reported',reference:'SourceRef-'+key,reviewDate:date};
r=calculate({diligence:[full,full,full]});
assert(r.items[0].diligenceComplete===true);
assert.equal(r.state,'ILLUSTRATIVE ONLY — INDEPENDENT APPROVAL STILL REQUIRED');
assert.equal(r.approved,false);
assert.throws(()=>calculate({baseline:{...baseline,available:-10}}));
assert.throws(()=>calculate({baseline:{...baseline,available:Infinity}}));
assert.throws(()=>calculate({policy:{maxSinglePct:101}}));
assert.throws(()=>calculate({policy:{downsideFundingSharePct:[100,101,100]}}));
assert.throws(()=>calculate({policy:{downsideFundingSharePct:[100,100]}}));
assert.throws(()=>calculate({opportunities:[A,B]}));
assert.throws(()=>calculate({opportunities:[{...A,ownerCapital:1e308},{...B,ownerCapital:1e308},C]}));
console.log('PASS v0.8 allocation, deficits, liquidity, concentration, evidence, safeguards and overflow');
for(const id of ['allocationPanel','alloc_available','alloc_startup','alloc_support','alloc_required','alloc_gap','alloc_remaining','alloc_state','alloc_error','alloc_risks','alloc_rows','alloc_refresh','alloc_export','alloc_concentration','alloc_minBuffer','alloc_share0','alloc_share1','alloc_share2'])
 assert(html.includes('id="'+id+'"'),id+' missing from authenticated panel');
assert(html.includes('capital-allocation-v08.js?v=08'));
assert(html.indexOf('id="allocationPanel"')>html.indexOf('id="appPanel"'));
assert(html.indexOf('id="allocationPanel"')<html.indexOf('<h2>Governance state'));
assert(html.includes('LIVE CAPITAL LOCKED'));
new vm.Script(script,{filename:'capital-allocation-v08.js'});
console.log('PASS v0.8 static source integration');
const names=['available','startup','support','required','gap','remaining','state','error','risks','rows','refresh','export','concentration','minBuffer','share0','share1','share2'];
const nodes={allocationPanel:{},...Object.fromEntries(names.map(k=>['alloc_'+k,{value:k==='concentration'?'35':k==='minBuffer'?'25':k.startsWith('share')?'100':'',textContent:'',innerHTML:'',
 addEventListener(ev,cb){this[ev]=cb;}}]))};
let stateBaseline={...baseline};
const win={document:{getElementById:id=>nodes[id]},
  WealthOSCreationV06:{...creation,getOpportunityScenarios:()=>opportunities.map(o=>({...o}))},
  WealthOSEvidenceV07:{...evidence,getLiveSnapshot:()=>({baseline:{...stateBaseline},diligence:missing})},setTimeout:()=>{}};
vm.runInNewContext(script,{window:win,console});
assert.equal(nodes.alloc_required.textContent,'M6,500');
assert.equal(nodes.alloc_gap.textContent,'M0');
assert.equal(nodes.alloc_rows.innerHTML.includes('Candidate A'),true);
assert.equal(nodes.alloc_rows.innerHTML.includes('>NO</td>'),true);
stateBaseline={...baseline,available:4000};nodes.alloc_refresh.click();
assert.equal(nodes.alloc_gap.textContent,'M2,500');
nodes.alloc_share1.value='-3';nodes.alloc_share1.input();
assert.equal(nodes.alloc_required.textContent,'—');
assert.notEqual(nodes.alloc_error.textContent,'');
nodes.alloc_share1.value='100';nodes.alloc_share1.input();
assert.equal(nodes.alloc_error.textContent,'');
console.log('PASS v0.8 actual browser controller source wiring and fail-closed invalid input');

/* Independent boundary acceptance: total funding, liquidity buffer and concentration. */
{
 const z=calculate({baseline:{...baseline,available:6500},policy:{maxSinglePct:100,minRemainingPct:0}});
 close(z.totalRequired,6500);close(z.fundingGap,0);close(z.unreservedAfter,0);
 assert.equal(z.riskFlags.some(v=>v.includes('exceed unreserved liquid capital')),false);
 assert.equal(z.approved,false);
}
{
 const z=calculate({baseline:{...baseline,available:10000},policy:{maxSinglePct:35,minRemainingPct:40}});
 // M6,500 required leaves M3,500, below the M4,000 buffer, even without a funding gap.
 close(z.fundingGap,0);close(z.unreservedAfter,3500);close(z.minRemaining,4000);
 assert(z.riskFlags.some(v=>v.includes('minimum buffer')));
 assert.equal(z.items[1].concentrated,false,'M3,500 / M10,000 is exactly 35%');
}
{
 const z=calculate({baseline:{...baseline,available:10000},policy:{maxSinglePct:34.99,minRemainingPct:0}});
 assert.equal(z.items[1].concentrated,true,'35% must breach 34.99% threshold');
 assert(z.riskFlags.some(v=>v.includes('concentration')));
}
{
 const z=calculate({policy:{downsideFundingSharePct:[100,0,100]}});
 close(z.downsideReserve,0);close(z.totalRequired,5000);
 assert(z.riskFlags.some(v=>v.includes('Partial funding responsibility')));
 assert.equal(z.investmentAuthority,false);
}
console.log('PASS independent allocation boundary, liquidity and concentration acceptance');
