/* WealthOS Family Capital Governance v0.12 — withdrawal, sequence-risk and rebalancing review. */
(function(root){
'use strict';

const BUCKETS=Object.freeze([
  ['liquidity','Liquidity Reserve'],
  ['income','Income Core'],
  ['realGrowth','Inflation / Real-Growth'],
  ['growth','Growth Portfolio'],
  ['opportunity','Opportunity Portfolio']
]);

const defaults=Object.freeze({
  capital:0,
  monthlyLifestyle:500_000,
  netMonthlyDistribution:0,
  liquidityReserve:0,
  annualInflationPct:4,
  annualFeePct:0,
  rebalanceTolerancePP:5,
  sequenceReturnsText:'-25,10,10,10,10'
});

function finite(n){return typeof n==='number'&&Number.isFinite(n);}
function nonnegative(name,n){if(!finite(n)||n<0)throw Error(name+' must be a nonnegative finite number');return n;}
function validatePct(name,n,{max=100,allowNegative=false}={}){
  if(!finite(n))throw Error(name+' must be finite');
  if((!allowNegative&&n<0)||n>=max)throw Error(name+' is outside the supported range');
  return n;
}
function parseReturns(text){
  if(typeof text!=='string'||!text.trim())throw Error('Enter at least one annual return for sequence stress');
  const values=text.split(',').map(x=>Number(x.trim())/100);
  if(!values.length||values.length>50)throw Error('Sequence must contain 1 to 50 annual returns');
  values.forEach((r,i)=>{if(!finite(r)||r<=-1||r>3)throw Error('Return '+(i+1)+' must be above -100% and no more than 300%');});
  return values;
}
function withdrawalReadiness({capital,monthlyLifestyle,netMonthlyDistribution,liquidityReserve}){
  nonnegative('capital',capital);nonnegative('monthlyLifestyle',monthlyLifestyle);nonnegative('liquidityReserve',liquidityReserve);
  if(!finite(netMonthlyDistribution))throw Error('netMonthlyDistribution must be finite');
  const reserveMonths=monthlyLifestyle===0?null:liquidityReserve/monthlyLifestyle;
  const coverage=monthlyLifestyle===0?null:netMonthlyDistribution/monthlyLifestyle;
  const blockers=[],cautions=[];
  if(capital<100_000_000)blockers.push('BELOW_FREEDOM_FLOOR');
  if(monthlyLifestyle>0&&netMonthlyDistribution<monthlyLifestyle)blockers.push('NET_DISTRIBUTION_BELOW_LIFESTYLE');
  if(monthlyLifestyle>0&&(reserveMonths===null||reserveMonths<6))blockers.push('LIQUIDITY_RESERVE_BELOW_CAUTION_FLOOR');
  else if(monthlyLifestyle>0&&reserveMonths<12)cautions.push('LIQUIDITY_RESERVE_BELOW_REFERENCE_TARGET');
  const stage=capital>=150_000_000?'PERMANENT_FREEDOM':capital>=125_000_000?'FREEDOM_BUFFER':capital>=100_000_000?'FREEDOM_FLOOR':'ACCUMULATION';
  return {stage,reserveMonths,coverage,blockers,cautions,state:blockers.length?'BLOCKED':cautions.length?'CAUTION':'ELIGIBLE FOR HUMAN REVIEW',certified:false,tradeEligible:false};
}
function simulateSequence({initialCapital,annualReturns,monthlyWithdrawal,annualInflationPct,annualFeePct,withdrawalTiming='start'}){
  nonnegative('initialCapital',initialCapital);nonnegative('monthlyWithdrawal',monthlyWithdrawal);
  validatePct('annualFeePct',annualFeePct);if(!finite(annualInflationPct)||annualInflationPct<=-100||annualInflationPct>=100)throw Error('annualInflationPct must be above -100% and below 100%');
  if(!['start','end'].includes(withdrawalTiming))throw Error('withdrawalTiming must be start or end');
  if(!Array.isArray(annualReturns)||!annualReturns.length)throw Error('annualReturns are required');
  let capital=initialCapital,peak=initialCapital,maxDrawdown=0,depletedYear=null,cumulativeWithdrawals=0;
  const rows=[];
  for(let i=0;i<annualReturns.length;i++){
    const r=annualReturns[i];if(!finite(r)||r<=-1||r>3)throw Error('Annual return is outside supported range');
    const year=i+1,planned=monthlyWithdrawal*12*Math.pow(1+annualInflationPct/100,i);
    if(!finite(planned))throw Error('Withdrawal arithmetic exceeds supported numerical limits');
    const opening=capital;let actual;
    if(withdrawalTiming==='start'){
      actual=Math.min(capital,planned);capital-=actual;cumulativeWithdrawals+=actual;capital*=(1+r)*(1-annualFeePct/100);
    }else{
      capital*=(1+r)*(1-annualFeePct/100);actual=Math.min(capital,planned);capital-=actual;cumulativeWithdrawals+=actual;
    }
    if(![capital,cumulativeWithdrawals].every(Number.isFinite))throw Error('Sequence arithmetic exceeds supported numerical limits');
    if(actual+1e-9<planned&&depletedYear===null)depletedYear=year;
    if(capital<=0&&depletedYear===null)depletedYear=year;
    peak=Math.max(peak,capital);const drawdown=peak<=0?0:(capital-peak)/peak;maxDrawdown=Math.min(maxDrawdown,drawdown);
    const real=capital/Math.pow(1+annualInflationPct/100,year);
    rows.push({year,opening,returnPct:r*100,plannedWithdrawal:planned,actualWithdrawal:actual,endingCapital:capital,realEndingCapital:real,drawdownPct:drawdown*100});
    if(capital<=0)break;
  }
  return {rows,endingCapital:capital,realEndingCapital:rows.length?rows.at(-1).realEndingCapital:initialCapital,cumulativeWithdrawals,depletedYear,maxDrawdownPct:maxDrawdown*100,
    capitalPreservedNominally:capital>=initialCapital,capitalPreservedReally:rows.length?rows.at(-1).realEndingCapital>=initialCapital:false,certified:false,tradeEligible:false};
}
function rebalanceReview(current,target,tolerancePP=5){
  nonnegative('tolerancePP',tolerancePP);if(tolerancePP>100)throw Error('tolerancePP cannot exceed 100');
  const names=BUCKETS.map(x=>x[0]);if(!names.every(k=>finite(current[k])&&finite(target[k])))throw Error('Every rebalancing bucket requires current and target percentages');
  if(names.some(k=>current[k]<0||target[k]<0))throw Error('Rebalancing weights cannot be negative');
  const cs=names.reduce((s,k)=>s+current[k],0),ts=names.reduce((s,k)=>s+target[k],0);
  if(Math.abs(cs-100)>0.001||Math.abs(ts-100)>0.001)throw Error('Current and target weights must each sum to 100%');
  const rows=names.map(k=>{const drift=current[k]-target[k],review=Math.abs(drift)>tolerancePP;return {key:k,label:BUCKETS.find(x=>x[0]===k)[1],currentPct:current[k],targetPct:target[k],driftPP:drift,review};});
  return {rows,reviewRequired:rows.some(x=>x.review),action:rows.some(x=>x.review)?'HUMAN REBALANCING REVIEW':'NO BAND BREACH',automaticTrades:false,tradeEligible:false};
}
function calculate(raw){
  const s={...defaults,...raw};
  for(const k of ['capital','monthlyLifestyle','netMonthlyDistribution','liquidityReserve','annualInflationPct','annualFeePct','rebalanceTolerancePP'])
    if(!finite(s[k]))throw Error(k+' must be finite');
  const returns=parseReturns(s.sequenceReturnsText);
  const withdrawal=withdrawalReadiness(s);
  const sequence=simulateSequence({initialCapital:s.capital,annualReturns:returns,monthlyWithdrawal:s.monthlyLifestyle,annualInflationPct:s.annualInflationPct,annualFeePct:s.annualFeePct});
  const current=Object.fromEntries(BUCKETS.map(([k])=>[k,s['current_'+k]]));
  const target=Object.fromEntries(BUCKETS.map(([k])=>[k,s['target_'+k]]));
  const rebalance=rebalanceReview(current,target,s.rebalanceTolerancePP);
  return {assumptions:s,returns,withdrawal,sequence,rebalance,certified:false,tradeEligible:false};
}

const model={BUCKETS,defaults,parseReturns,withdrawalReadiness,simulateSequence,rebalanceReview,calculate};
if(typeof module!=='undefined'&&module.exports)module.exports=model;
root.WealthOSFamilyGovernanceV12=model;
if(!root.document)return;

const doc=root.document,$=id=>doc.getElementById(id);
if(!$('familyGovernancePanel'))return;
const money=v=>Number.isFinite(v)?'M'+Math.round(v).toLocaleString('en-US'):'—';
const pct=v=>Number.isFinite(v)?v.toFixed(2)+'%':'—';
const num=v=>Number.isFinite(v)?v.toFixed(2):'—';
function read(){
  const s={};
  for(const k of ['capital','monthlyLifestyle','netMonthlyDistribution','liquidityReserve','annualInflationPct','annualFeePct','rebalanceTolerancePP']){
    const n=$('fg_'+k);if(!n||n.value.trim()==='')throw Error('Complete '+k);s[k]=Number(n.value);
  }
  s.sequenceReturnsText=$('fg_sequenceReturnsText').value;
  for(const [k] of BUCKETS){s['current_'+k]=Number($('fg_current_'+k).value);s['target_'+k]=Number($('fg_target_'+k).value);}
  return s;
}
function render(){
  try{
    const r=calculate(read());model.getLiveSnapshot=()=>JSON.parse(JSON.stringify(r));
    $('fg_error').textContent='';$('fg_withdrawalState').textContent=r.withdrawal.state;$('fg_withdrawalState').className='value '+(r.withdrawal.state==='BLOCKED'?'red':r.withdrawal.state==='CAUTION'?'amber':'green');
    $('fg_stage').textContent=r.withdrawal.stage;$('fg_coverage').textContent=r.withdrawal.coverage===null?'—':num(r.withdrawal.coverage)+'x';$('fg_reserveMonths').textContent=r.withdrawal.reserveMonths===null?'—':num(r.withdrawal.reserveMonths)+' months';
    $('fg_blockers').textContent=[...r.withdrawal.blockers,...r.withdrawal.cautions].join(' · ')||'No withdrawal-policy blocker detected; human approval and evidence certification are still required.';
    $('fg_endCapital').textContent=money(r.sequence.endingCapital);$('fg_realCapital').textContent=money(r.sequence.realEndingCapital);$('fg_maxDrawdown').textContent=pct(r.sequence.maxDrawdownPct);
    $('fg_depleted').textContent=r.sequence.depletedYear?'Year '+r.sequence.depletedYear:'Not depleted in sequence';$('fg_cumulative').textContent=money(r.sequence.cumulativeWithdrawals);
    $('fg_sequenceRows').innerHTML=r.sequence.rows.map(x=>'<tr><td>'+x.year+'</td><td>'+pct(x.returnPct)+'</td><td>'+money(x.plannedWithdrawal)+'</td><td>'+money(x.endingCapital)+'</td><td>'+money(x.realEndingCapital)+'</td><td>'+pct(x.drawdownPct)+'</td></tr>').join('');
    $('fg_rebalanceState').textContent=r.rebalance.action;$('fg_rebalanceState').className=r.rebalance.reviewRequired?'amber':'green';
    $('fg_rebalanceRows').innerHTML=r.rebalance.rows.map(x=>'<tr><td>'+x.label+'</td><td>'+pct(x.currentPct)+'</td><td>'+pct(x.targetPct)+'</td><td>'+pct(x.driftPP)+'</td><td>'+(x.review?'REVIEW':'OK')+'</td></tr>').join('');
    $('fg_certification').textContent='NOT CERTIFIED · NO AUTOMATIC TRADES · LIVE CAPITAL LOCKED';
  }catch(e){
    model.getLiveSnapshot=()=>null;$('fg_error').textContent=e.message;
    for(const id of ['withdrawalState','stage','coverage','reserveMonths','endCapital','realCapital','maxDrawdown','depleted','cumulative','rebalanceState'])$('fg_'+id).textContent='—';
    $('fg_blockers').textContent='';$('fg_sequenceRows').innerHTML='';$('fg_rebalanceRows').innerHTML='';$('fg_certification').textContent='NOT CERTIFIED';
  }
}
const inputIds=['capital','monthlyLifestyle','netMonthlyDistribution','liquidityReserve','annualInflationPct','annualFeePct','rebalanceTolerancePP','sequenceReturnsText'];
for(const id of inputIds)$('fg_'+id).addEventListener('input',render);
for(const [k] of BUCKETS)for(const side of ['current','target'])$('fg_'+side+'_'+k).addEventListener('input',render);
$('fg_useEvidence').addEventListener('click',()=>{
  try{
    const e=root.WealthOSFamilyEvidenceV11?.getLiveSnapshot?.();if(!e||!e.readyForPolicyReview)throw Error('v0.11 evidence must be current and ready for policy review before importing.');
    $('fg_capital').value=String(e.total);$('fg_netMonthlyDistribution').value=String(e.estimatedNetAnnualDistribution/12);
    const lifestyle=$('fc_monthlyLifestyle'),reserve=$('fc_liquidityReserve'),fee=$('fc_annualPortfolioFeePct');
    if(lifestyle)$('fg_monthlyLifestyle').value=lifestyle.value;if(reserve)$('fg_liquidityReserve').value=reserve.value;if(fee)$('fg_annualFeePct').value=fee.value;
    $('fg_note').textContent='Current v0.11 evidence-derived capital/net distribution and v0.9 lifestyle/reserve assumptions copied locally.';render();
  }catch(e){$('fg_note').textContent=e.message;}
});
$('fg_presetEarly').addEventListener('click',()=>{$('fg_sequenceReturnsText').value='-25,-10,5,7,7,7,7,7,7,7';render();});
$('fg_presetLate').addEventListener('click',()=>{$('fg_sequenceReturnsText').value='7,7,7,7,7,7,7,7,-25,-10';render();});
$('fg_presetLow').addEventListener('click',()=>{$('fg_sequenceReturnsText').value='2,2,2,2,2,2,2,2,2,2';render();});
$('fg_presetFlat').addEventListener('click',()=>{$('fg_sequenceReturnsText').value='0,0,0,0,0,0,0,0,0,0';render();});
render();
})(typeof window!=='undefined'?window:globalThis);
