/* WealthOS Family Capital Certification v0.13 — readiness ledger only, never self-certification. */
(function(root){
'use strict';

const REVIEW_KEYS=Object.freeze([
  ['concentrationReview','Concentration review'],
  ['withdrawalPolicyReview','Withdrawal policy review'],
  ['sequenceStressReview','Sequence-stress review'],
  ['rebalancingReview','Rebalancing review'],
  ['leverageReview','Leverage / forced-sale review'],
  ['successionReview','Succession / continuity review']
]);

function evaluate(input){
  const capital=Number(input.qualifyingCapital);
  if(!Number.isFinite(capital)||capital<0)throw Error('qualifyingCapital must be a nonnegative finite amount');
  const technical={
    ownershipEvidence:Boolean(input.ownershipEvidence),
    taxEvidence:Boolean(input.taxEvidence),
    feeEvidence:Boolean(input.feeEvidence),
    incomeTotalReturnEvidence:Boolean(input.incomeTotalReturnEvidence),
    counterpartyEvidence:Boolean(input.counterpartyEvidence),
    concentrationModule:Boolean(input.concentrationModule),
    governanceModule:Boolean(input.governanceModule)
  };
  const reviews=Object.fromEntries(REVIEW_KEYS.map(([k])=>[k,Boolean(input[k])]));
  const blockers=[];
  if(capital<100_000_000)blockers.push('BELOW_FREEDOM_FLOOR');
  for(const [k,v] of Object.entries(technical))if(!v)blockers.push(k.toUpperCase()+'_INCOMPLETE');
  for(const [k,v] of Object.entries(reviews))if(!v)blockers.push(k.toUpperCase()+'_REQUIRED');
  const softwareEvidenceReady=blockers.length===0;
  const uat=Boolean(input.authenticatedUAT);
  const signoffRef=String(input.humanSignoffRef||'').trim();
  let state='EVIDENCE_INCOMPLETE';
  if(softwareEvidenceReady&&!uat)state='SOFTWARE EVIDENCE READY · PHYSICAL UAT REQUIRED';
  else if(softwareEvidenceReady&&uat&&!signoffRef)state='READY FOR HUMAN GOVERNANCE SIGN-OFF';
  else if(softwareEvidenceReady&&uat&&signoffRef)state='SIGN-OFF REFERENCE RECORDED · INDEPENDENT VERIFICATION REQUIRED';
  const finalBlockers=[...blockers];
  if(!uat)finalBlockers.push('AUTHENTICATED_MULTI_DEVICE_UAT_REQUIRED');
  if(!signoffRef)finalBlockers.push('HUMAN_GOVERNANCE_SIGNOFF_REQUIRED');
  else finalBlockers.push('HUMAN_SIGNOFF_INDEPENDENT_VERIFICATION_REQUIRED');
  const stage=capital>=1_000_000_000?'M1B_NORTH_STAR':capital>=150_000_000?'PERMANENT_FREEDOM':capital>=125_000_000?'FREEDOM_BUFFER':capital>=100_000_000?'FREEDOM_FLOOR':'ACCUMULATION';
  return {stage,capital,technical,reviews,softwareEvidenceReady,authenticatedUAT:uat,humanSignoffRefRecorded:Boolean(signoffRef),state,blockers:finalBlockers,certified:false,liveCapitalAuthorized:false,tradeEligible:false};
}
const api={REVIEW_KEYS,evaluate};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.WealthOSFamilyCertificationV13=api;
if(!root.document)return;

const doc=root.document,$=id=>doc.getElementById(id);
if(!$('familyCertificationPanel'))return;
let detected=null,last=null;
const money=v=>Number.isFinite(v)?'M'+Math.round(v).toLocaleString('en-US'):'—';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function detect(){
  const e=root.WealthOSFamilyEvidenceV11?.getLiveSnapshot?.();
  const p=root.WealthOSFamilyPortfolioV10?.getLiveSnapshot?.();
  const g=root.WealthOSFamilyGovernanceV12?.getLiveSnapshot?.();
  detected={
    qualifyingCapital:e?.total||0,
    ownershipEvidence:Boolean(e&&e.axisCoverage?.ownership>=99.999),
    taxEvidence:Boolean(e&&e.axisCoverage?.tax>=99.999),
    feeEvidence:Boolean(e&&e.axisCoverage?.fee>=99.999),
    incomeTotalReturnEvidence:Boolean(e&&e.axisCoverage?.income>=99.999),
    counterpartyEvidence:Boolean(e&&e.axisCoverage?.counterparty>=99.999),
    concentrationModule:Boolean(p&&p.total>0),
    governanceModule:Boolean(g&&g.withdrawal&&g.sequence&&g.rebalance)
  };
  $('cert_detectNote').textContent='Detected current local module state. Detection is not independent verification.';
}
function read(){
  if(!detected)detect();
  const x={...detected};
  for(const [k] of REVIEW_KEYS)x[k]=$('cert_'+k).checked;
  x.authenticatedUAT=$('cert_authenticatedUAT').checked;
  x.humanSignoffRef=$('cert_humanSignoffRef').value;
  return x;
}
function render(){
  try{
    const r=evaluate(read());last=r;
    $('cert_error').textContent='';
    $('cert_capital').textContent=money(r.capital);$('cert_stage').textContent=r.stage;
    $('cert_software').textContent=r.softwareEvidenceReady?'READY':'INCOMPLETE';$('cert_software').className='value '+(r.softwareEvidenceReady?'green':'amber');
    $('cert_state').textContent=r.state;$('cert_state').className='value '+(r.softwareEvidenceReady?'amber':'red');
    $('cert_blockers').textContent=r.blockers.join(' · ');
    $('cert_rows').innerHTML=[
      ['Ownership / balance evidence',r.technical.ownershipEvidence],
      ['Tax evidence',r.technical.taxEvidence],
      ['Recurring-fee evidence',r.technical.feeEvidence],
      ['Income + total-return evidence',r.technical.incomeTotalReturnEvidence],
      ['Counterparty / custodian evidence',r.technical.counterpartyEvidence],
      ['Portfolio concentration module',r.technical.concentrationModule],
      ['Withdrawal / sequence / rebalancing module',r.technical.governanceModule],
      ...REVIEW_KEYS.map(([k,label])=>[label,r.reviews[k]]),
      ['Authenticated multi-device UAT',r.authenticatedUAT],
      ['Human sign-off reference recorded',r.humanSignoffRefRecorded]
    ].map(([label,ok])=>'<tr><td>'+esc(label)+'</td><td class="'+(ok?'green':'red')+'"><strong>'+(ok?'COMPLETE':'OUTSTANDING')+'</strong></td></tr>').join('');
    $('cert_final').textContent='CERTIFIED = FALSE · LIVE CAPITAL AUTHORIZED = FALSE';
  }catch(e){last=null;$('cert_error').textContent=e.message;$('cert_state').textContent='INVALID';$('cert_blockers').textContent='';$('cert_rows').innerHTML='';$('cert_final').textContent='CERTIFIED = FALSE';}
}
$('cert_refresh').addEventListener('click',()=>{detect();render();});
for(const [k] of REVIEW_KEYS)$('cert_'+k).addEventListener('change',render);
$('cert_authenticatedUAT').addEventListener('change',render);$('cert_humanSignoffRef').addEventListener('input',render);
$('cert_export').addEventListener('click',()=>{
  if(!last)return;
  const payload={generated_at:new Date().toISOString(),wealthos_module:'family-certification-v0.13',...last,methodology:'Readiness pack only. Recorded references and checkboxes are not independently verified approvals.'};
  const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
  const a=doc.createElement('a');a.href=url;a.download='WealthOS_Permanent_Family_Capital_Readiness.json';a.click();root.setTimeout(()=>URL.revokeObjectURL(url),1000);
});
detect();render();
})(typeof window!=='undefined'?window:globalThis);
