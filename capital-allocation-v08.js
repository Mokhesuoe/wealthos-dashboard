/* WealthOS Capital Allocation & Downside Guardrails v0.8 — research only, never investment approval. */
(function(root){
'use strict';
const creation=(typeof module!=='undefined'&&module.exports)?require('./capital-creation-v06.js'):root.WealthOSCreationV06;
const evidence=(typeof module!=='undefined'&&module.exports)?require('./capital-evidence-v07.js'):root.WealthOSEvidenceV07;
const defaults=Object.freeze({maxSinglePct:35,minRemainingPct:25,downsideFundingSharePct:[100,100,100]});
function policyOf(input={}){
 const p={...defaults,...input};
 for(const key of ['maxSinglePct','minRemainingPct'])
  if(typeof p[key]!=='number'||!Number.isFinite(p[key])||p[key]<0||p[key]>100)throw Error(key+' must be a percentage from 0 to 100');
 if(!Array.isArray(p.downsideFundingSharePct)||p.downsideFundingSharePct.length!==3||p.downsideFundingSharePct.some(x=>typeof x!=='number'||!Number.isFinite(x)||x<0||x>100))
  throw Error('Set the assumed downside funding responsibility from 0% to 100% for all three opportunities');
 return {...p,downsideFundingSharePct:[...p.downsideFundingSharePct]};
}
function allocate({baseline,opportunities,diligence,policy}={}){
 const p=policyOf(policy);
 if(!baseline||typeof baseline!=='object'||!Number.isFinite(baseline.available)||baseline.available<0||!Number.isFinite(baseline.liquid)||baseline.liquid<0)
  throw Error('A valid v0.7 liquid-capital baseline is required');
 if(!Array.isArray(opportunities)||opportunities.length!==3||!Array.isArray(diligence)||diligence.length!==3)throw Error('Exactly three opportunities and three diligence records are required');
 let totalStart=0,totalSupport=0,totalBaseOwner=0;
 let anyActive=false,insufficientEvidence=false,anyConcentration=false;
 const items=opportunities.map((raw,i)=>{
  const opportunity=creation.validate(raw);
  const cases=creation.evaluate(opportunity);
  const active=cases.status!=='NOT MODELLED';
  const due=evidence.diligence(diligence[i]);
  const reserve=active?cases.stress.cumulativeShortfalls*(p.downsideFundingSharePct[i]/100):0;
  const committed=active?opportunity.ownerCapital:0;
  const needed=committed+reserve;
  const portfolioShare=baseline.available>0?needed/baseline.available*100:(needed>0?null:0);
  if(![reserve,committed,needed].every(Number.isFinite)||portfolioShare!==null&&!Number.isFinite(portfolioShare))throw Error('Projected capital requirement exceeds numeric limits');
  totalStart+=committed;totalSupport+=reserve;totalBaseOwner+=active?cases.base.cumulativeOwnerCash:0;
  anyActive=anyActive||active;
  const concentrated=needed>0&&(portfolioShare===null||portfolioShare>p.maxSinglePct+1e-8);
  anyConcentration=anyConcentration||concentrated;
  insufficientEvidence=insufficientEvidence||(active&&!due.complete);
  return {name:opportunity.name||'Opportunity '+(i+1),active,ownerStart:committed,
    downsideBusinessDeficit:active?cases.stress.cumulativeShortfalls:0,
    assumedFundingSharePct:p.downsideFundingSharePct[i],downsideSupportReserve:reserve,
    totalRequired:needed,shareOfAvailablePct:portfolioShare,concentrated,
    diligenceReported:due.independent,diligenceComplete:due.complete,
    baseOwnerCash:active?cases.base.cumulativeOwnerCash:0,
    downsideOwnerCash:active?cases.stress.cumulativeOwnerCash:0,
    baseHasDeficit:active&&cases.base.cumulativeShortfalls>.005,
    status:active?'REVIEW REQUIRED':'NOT MODELLED',
    approved:false,tradeEligible:false};
 });
 const totalRequired=totalStart+totalSupport;
 const left=baseline.available-totalRequired;
 const gap=Math.max(0,-left);
 const minRemaining=baseline.available*p.minRemainingPct/100;
 if(![totalStart,totalSupport,totalBaseOwner,totalRequired,left,gap,minRemaining].every(Number.isFinite))throw Error('Aggregated capital requirement exceeds numerical limits');
 const baselineCurrent=baseline.transferAllowed===true&&baseline.daysOld!==null&&baseline.daysOld<=120;
 const riskFlags=[
   ...(!baselineCurrent?['Opening balance sheet is not a current, user-attested v0.7 position']:[]),
   ...(!anyActive?['No business opportunity has been modelled']:[]),
   ...(gap>.005?['Combined startup commitments and downside reserve exceed unreserved liquid capital']:[]),
   ...(left<minRemaining-.005?['Post-allocation liquidity would fall below selected minimum buffer']:[]),
   ...(anyConcentration?['One or more opportunities breaches the selected single-opportunity concentration threshold']:[]),
   ...(insufficientEvidence?['One or more modelled opportunities lack six current externally reviewed evidence declarations']:[]),
   ...(items.some(q=>q.active&&q.baseHasDeficit)?['One or more base scenarios has operational cash deficits']:[]),
   ...(items.some(q=>q.active&&q.assumedFundingSharePct<100)?['Partial funding responsibility is an assumption; verify binding financing obligations before use']:[])
 ];
 const state=riskFlags.length?'RESEARCH GAPS / STOP & REVIEW':'ILLUSTRATIVE ONLY — INDEPENDENT APPROVAL STILL REQUIRED';
 return {policy:p,items,available:baseline.available,liquid:baseline.liquid,netWorth:baseline.netWorth,
   startingCapital:totalStart,downsideReserve:totalSupport,totalRequired,
   fundingGap:gap,unreservedAfter:left,minRemaining,targetShortfallPct:baseline.available>0?totalRequired/baseline.available*100:null,
   baseDistributions:totalBaseOwner,baselineCurrent,state,riskFlags,
   approved:false,investmentAuthority:false,
   caveat:'Aggregates three hypothetical commitments; startup cash plus gross downside monthly-deficit support. Downside deficit needs are estimated using a user-chosen funding-responsibility assumption, not legally established liabilities. Sum of deficit months is a conservative funding proxy and is not a maximum cash draw or full liquidity-at-risk model. Cash distributions are not investment returns and no sale valuation or approval is inferred.'};
}
const api={defaults,policyOf,allocate};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.WealthOSAllocationV08=api;
if(!root.document)return;
const doc=root.document,$=id=>doc.getElementById(id);
if(!$('allocationPanel'))return;
let latest=null;
const fmt=n=>typeof n==='number'&&Number.isFinite(n)?'M'+Math.round(n).toLocaleString('en-US'):'—';
const pct=n=>typeof n==='number'&&Number.isFinite(n)?n.toFixed(1)+'%':'—';
const esc=x=>String(x??'').replace(/[&<>"']/g,v=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[v]));
function clear(){
 for(const k of ['available','startup','support','required','gap','remaining','state'])$('alloc_'+k).textContent='—';
 $('alloc_rows').innerHTML='';
}
function assess(){
 try{
  const provider=root.WealthOSEvidenceV07;
  const creationProvider=root.WealthOSCreationV06;
  if(!provider||typeof provider.getLiveSnapshot!=='function')throw Error('Capital Evidence v0.7 is not available');
  if(!creationProvider||typeof creationProvider.getOpportunityScenarios!=='function')throw Error('Capital Creation v0.6 is not available');
  const snapshot=provider.getLiveSnapshot();
  const raw={
   maxSinglePct:Number($('alloc_concentration').value),
   minRemainingPct:Number($('alloc_minBuffer').value),
   downsideFundingSharePct:[0,1,2].map(i=>Number($('alloc_share'+i).value))
  };
  if(['alloc_concentration','alloc_minBuffer','alloc_share0','alloc_share1','alloc_share2'].some(id=>$(id).value.trim()===''))throw Error('Complete all risk policy assumptions');
  const result=allocate({baseline:snapshot.baseline,opportunities:creationProvider.getOpportunityScenarios(),diligence:snapshot.diligence,policy:raw});
  latest=result;
  for(const [k,n] of Object.entries({available:result.available,startup:result.startingCapital,support:result.downsideReserve,required:result.totalRequired,gap:result.fundingGap,remaining:result.unreservedAfter}))$('alloc_'+k).textContent=fmt(n);
  $('alloc_state').textContent=result.state;
  $('alloc_rows').innerHTML=result.items.map((item)=>
   '<tr><td>'+esc(item.name)+'</td><td>'+fmt(item.ownerStart)+'</td><td>'+
   fmt(item.downsideBusinessDeficit)+'</td><td>'+pct(item.assumedFundingSharePct)+'</td><td>'+fmt(item.downsideSupportReserve)+'</td><td>'+
   fmt(item.totalRequired)+'</td><td>'+pct(item.shareOfAvailablePct)+'</td><td>'+item.diligenceReported+'/6</td><td class="red">NO</td></tr>').join('');
  $('alloc_risks').textContent=result.riskFlags.join(' | ')||result.caveat;
  $('alloc_error').textContent='';
 }catch(e){latest=null;clear();$('alloc_risks').textContent='';$('alloc_error').textContent=e.message;}
}
function exportCSV(){
 if(!latest)return;
 const csvQuote=x=>{const str=String(x==null?'':x);const protectedValue=/^[=+\-@\t\r]/.test(str)?"'"+str:str;return '"'+protectedValue.replace(/"/g,'""')+'"';};
 const columns=['opportunity','startup_M','downside_business_deficit_M','assumed_owner_funding_pct','owner_downside_support_M','total_owner_funding_M','share_of_available_pct','external_evidence_count','approved'];
 const lines=[columns.join(',')];
 for(const row of latest.items)lines.push([row.name,row.ownerStart,row.downsideBusinessDeficit,row.assumedFundingSharePct,row.downsideSupportReserve,row.totalRequired,row.shareOfAvailablePct??'',row.diligenceReported,'NO'].map(csvQuote).join(','));
 const summary=['TOTAL','','','','',latest.totalRequired,'','',latest.approved?'YES':'NO'];
 lines.push(summary.map(csvQuote).join(','));
 const u=URL.createObjectURL(new Blob([lines.join('\n')],{type:'text/csv;charset=utf-8'}));
 const a=doc.createElement('a');a.href=u;a.download='WealthOS_v08_Capital_Allocation_Research.csv';a.click();
 root.setTimeout(()=>URL.revokeObjectURL(u),1000);
}
$('alloc_refresh').addEventListener('click',assess);
$('alloc_export').addEventListener('click',exportCSV);
for(const id of ['alloc_concentration','alloc_minBuffer','alloc_share0','alloc_share1','alloc_share2'])$(id).addEventListener('input',assess);
assess();
})(typeof window!=='undefined'?window:globalThis);
