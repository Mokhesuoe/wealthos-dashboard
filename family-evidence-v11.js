/* WealthOS Family Capital Evidence v0.11 — local-only source provenance and spendability evidence. */
(function(root){
'use strict';

const SLOT_COUNT=8;
const STALE_DAYS=370;
const fields=['name','amount','manager','bank','assetClass','currency','jurisdiction','taxRatePct','annualFeePct','distributionPct','totalReturnPct',
  'ownershipRef','ownershipDate','taxRef','taxDate','feeRef','feeDate','incomeRef','incomeDate','counterpartyRef','counterpartyDate'];

const blank=()=>({
  name:'',amount:0,manager:'',bank:'',assetClass:'',currency:'',jurisdiction:'',
  taxRatePct:0,annualFeePct:0,distributionPct:0,totalReturnPct:0,
  ownershipRef:'',ownershipDate:'',taxRef:'',taxDate:'',feeRef:'',feeDate:'',
  incomeRef:'',incomeDate:'',counterpartyRef:'',counterpartyDate:''
});

function finite(n){return typeof n==='number'&&Number.isFinite(n);}
function clean(v,max=160){return String(v??'').trim().slice(0,max);}
function dateOnly(v){
  if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return null;
  const d=new Date(v+'T00:00:00Z');
  return Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==v?null:d;
}
function evidenceState(ref,date,now){
  const r=clean(ref),d=dateOnly(date),n=dateOnly(now);
  if(!r&&!date)return {state:'missing',current:false,ageDays:null};
  if(!r||!d||!n)return {state:'invalid',current:false,ageDays:null};
  const age=Math.floor((n-d)/(24*3600*1000));
  if(age<0)return {state:'future',current:false,ageDays:age};
  if(age>STALE_DAYS)return {state:'stale',current:false,ageDays:age};
  return {state:'current_reference',current:true,ageDays:age};
}
function validateRows(input){
  if(!Array.isArray(input)||input.length!==SLOT_COUNT)throw Error('Exactly '+SLOT_COUNT+' evidence slots are required');
  return input.map((row,i)=>{
    const x={...blank(),...(row||{})};
    for(const k of ['amount','taxRatePct','annualFeePct','distributionPct','totalReturnPct'])
      if(!finite(x[k]))throw Error('Holding '+(i+1)+' '+k+' must be finite');
    if(x.amount<0)throw Error('Holding '+(i+1)+' amount cannot be negative');
    if(x.taxRatePct<0||x.taxRatePct>=100)throw Error('Holding '+(i+1)+' tax rate must be between 0% and below 100%');
    if(x.annualFeePct<0||x.annualFeePct>=100)throw Error('Holding '+(i+1)+' annual fee must be between 0% and below 100%');
    if(x.distributionPct<0||x.distributionPct>=100)throw Error('Holding '+(i+1)+' distribution rate must be between 0% and below 100%');
    if(x.totalReturnPct<=-100||x.totalReturnPct>300)throw Error('Holding '+(i+1)+' total return must be above -100% and no more than 300%');
    for(const k of fields.filter(k=>!['amount','taxRatePct','annualFeePct','distributionPct','totalReturnPct'].includes(k)))x[k]=clean(x[k]);
    if(x.amount>0&&!x.name)throw Error('Holding '+(i+1)+' needs a name when amount is entered');
    return x;
  });
}
function calculate(input,now=new Date().toISOString().slice(0,10)){
  const rows=validateRows(input),active=rows.filter(x=>x.amount>0);
  const total=active.reduce((s,x)=>s+x.amount,0);
  if(!Number.isFinite(total))throw Error('Evidence portfolio total exceeds supported numerical limits');
  const enriched=active.map(x=>{
    const evidence={
      ownership:evidenceState(x.ownershipRef,x.ownershipDate,now),
      tax:evidenceState(x.taxRef,x.taxDate,now),
      fee:evidenceState(x.feeRef,x.feeDate,now),
      income:evidenceState(x.incomeRef,x.incomeDate,now),
      counterparty:evidenceState(x.counterpartyRef,x.counterpartyDate,now)
    };
    const currentCount=Object.values(evidence).filter(v=>v.current).length;
    const classificationComplete=Boolean(x.manager&&x.bank&&x.assetClass&&x.currency&&x.jurisdiction);
    const grossDistribution=x.amount*x.distributionPct/100;
    const estimatedTax=grossDistribution*x.taxRatePct/100;
    const annualFees=x.amount*x.annualFeePct/100;
    const netDistribution=grossDistribution-estimatedTax-annualFees;
    const totalReturnAmount=x.amount*x.totalReturnPct/100;
    if(![grossDistribution,estimatedTax,annualFees,netDistribution,totalReturnAmount].every(Number.isFinite))
      throw Error('Evidence arithmetic exceeds supported numerical limits');
    return {...x,evidence,currentCount,classificationComplete,grossDistribution,estimatedTax,annualFees,netDistribution,totalReturnAmount,
      sharePct:total?x.amount/total*100:0};
  });

  const axisCapital={ownership:0,tax:0,fee:0,income:0,counterparty:0};
  for(const x of enriched)for(const k of Object.keys(axisCapital))if(x.evidence[k].current)axisCapital[k]+=x.amount;
  const axisCoverage=Object.fromEntries(Object.entries(axisCapital).map(([k,v])=>[k,total?v/total*100:0]));
  const allClassified=enriched.every(x=>x.classificationComplete);
  const fullyCurrent=enriched.every(x=>x.currentCount===5&&x.classificationComplete);
  const grossAnnualDistribution=enriched.reduce((s,x)=>s+x.grossDistribution,0);
  const estimatedAnnualTax=enriched.reduce((s,x)=>s+x.estimatedTax,0);
  const estimatedAnnualFees=enriched.reduce((s,x)=>s+x.annualFees,0);
  const estimatedNetAnnualDistribution=enriched.reduce((s,x)=>s+x.netDistribution,0);
  const weightedTotalReturnAmount=enriched.reduce((s,x)=>s+x.totalReturnAmount,0);
  const effectiveGrossDistributionPct=total?grossAnnualDistribution/total*100:0;
  const effectiveTaxOnDistributionsPct=grossAnnualDistribution?estimatedAnnualTax/grossAnnualDistribution*100:0;
  const effectiveFeePct=total?estimatedAnnualFees/total*100:0;
  const weightedTotalReturnPct=total?weightedTotalReturnAmount/total*100:0;
  const differencePct=weightedTotalReturnPct-effectiveGrossDistributionPct;
  if(![grossAnnualDistribution,estimatedAnnualTax,estimatedAnnualFees,estimatedNetAnnualDistribution,weightedTotalReturnAmount,
    effectiveGrossDistributionPct,effectiveTaxOnDistributionsPct,effectiveFeePct,weightedTotalReturnPct,differencePct].every(Number.isFinite))
      throw Error('Evidence portfolio aggregation exceeds supported numerical limits');

  const blockers=[];
  if(!active.length)blockers.push('NO_FUNDED_HOLDINGS');
  if(!allClassified&&active.length)blockers.push('INCOMPLETE_HOLDING_CLASSIFICATION');
  for(const [k,v] of Object.entries(axisCoverage))if(v<99.999&&active.length)blockers.push(k.toUpperCase()+'_EVIDENCE_INCOMPLETE');
  if(enriched.some(x=>Object.values(x.evidence).some(v=>['invalid','future','stale'].includes(v.state))))blockers.push('INVALID_FUTURE_OR_STALE_EVIDENCE');

  return {
    rows,enriched,total,activeCount:active.length,axisCoverage,allClassified,fullyCurrent,
    grossAnnualDistribution,estimatedAnnualTax,estimatedAnnualFees,estimatedNetAnnualDistribution,
    effectiveGrossDistributionPct,effectiveTaxOnDistributionsPct,effectiveFeePct,
    weightedTotalReturnPct,distributionVsTotalReturnDifferencePct:differencePct,
    blockers:[...new Set(blockers)],
    readyForPolicyReview:fullyCurrent&&active.length>0,
    certified:false,tradeEligible:false,
    methodology:'References are user-entered provenance pointers, not document verification. Distribution income is reconciled separately from total return. Tax and fee figures remain assumptions until source documents are independently checked.'
  };
}

const api={SLOT_COUNT,STALE_DAYS,blank,fields,evidenceState,validateRows,calculate};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.WealthOSFamilyEvidenceV11=api;
if(!root.document)return;

const doc=root.document,$=id=>doc.getElementById(id);
if(!$('familyEvidencePanel'))return;
const money=v=>Number.isFinite(v)?'M'+Math.round(v).toLocaleString('en-US'):'—';
const pct=v=>Number.isFinite(v)?v.toFixed(2)+'%':'—';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state=Array.from({length:SLOT_COUNT},()=>blank());
let selected=0,lastResult=null;
function node(field){return $('fe_'+field);}
function importComposition(){
  const snap=root.WealthOSFamilyPortfolioV10?.getLiveSnapshot?.();
  if(!snap||!Array.isArray(snap.rows)||!snap.rows.length)throw Error('Enter a funded v0.10 portfolio composition before importing evidence slots.');
  state.splice(0,state.length,...Array.from({length:SLOT_COUNT},(_,i)=>{
    const src=snap.rows[i];
    return src?{...blank(),name:src.name,amount:src.amount,manager:src.manager,bank:src.bank,assetClass:src.assetClass,currency:src.currency}:blank();
  }));
  selected=0;fill();render();
}
function capture(){
  const x={...state[selected]};
  for(const k of ['name','manager','bank','assetClass','currency','jurisdiction','ownershipRef','ownershipDate','taxRef','taxDate','feeRef','feeDate','incomeRef','incomeDate','counterpartyRef','counterpartyDate'])x[k]=node(k).value;
  for(const k of ['amount','taxRatePct','annualFeePct','distributionPct','totalReturnPct'])x[k]=Number(node(k).value);
  state[selected]=x;
}
function fill(){
  const x=state[selected];
  for(const k of fields)node(k).value=String(x[k]??'');
  for(let i=0;i<SLOT_COUNT;i++)$('fe_slot'+i).className='btn'+(i===selected?' primary':'');
  $('fe_selected').textContent=x.name||'Holding '+(selected+1);
}
function render(){
  try{
    const r=calculate(state);lastResult=r;
    $('fe_error').textContent='';
    $('fe_total').textContent=money(r.total);
    $('fe_ownership').textContent=pct(r.axisCoverage.ownership);
    $('fe_tax').textContent=pct(r.axisCoverage.tax);
    $('fe_fee').textContent=pct(r.axisCoverage.fee);
    $('fe_income').textContent=pct(r.axisCoverage.income);
    $('fe_counterparty').textContent=pct(r.axisCoverage.counterparty);
    $('fe_grossYield').textContent=pct(r.effectiveGrossDistributionPct);
    $('fe_effectiveTax').textContent=pct(r.effectiveTaxOnDistributionsPct);
    $('fe_effectiveFee').textContent=pct(r.effectiveFeePct);
    $('fe_totalReturn').textContent=pct(r.weightedTotalReturnPct);
    $('fe_netIncome').textContent=money(r.estimatedNetAnnualDistribution/12);
    $('fe_status').textContent=r.readyForPolicyReview?'EVIDENCE REFERENCES CURRENT — HUMAN REVIEW REQUIRED':'EVIDENCE INCOMPLETE';
    $('fe_status').className=r.readyForPolicyReview?'green':'amber';
    $('fe_blockers').textContent=r.blockers.join(' · ')||'No structural evidence blocker detected. References still require independent document checking.';
    $('fe_rows').innerHTML=r.enriched.map(x=>'<tr><td>'+esc(x.name)+'</td><td>'+money(x.amount)+'</td><td>'+x.currentCount+'/5</td><td>'+pct(x.distributionPct)+'</td><td>'+pct(x.totalReturnPct)+'</td><td>'+pct(x.taxRatePct)+'</td><td>'+pct(x.annualFeePct)+'</td><td>'+esc(x.jurisdiction||'—')+'</td></tr>').join('');
    api.getLiveSnapshot=()=>JSON.parse(JSON.stringify(r));
  }catch(e){
    lastResult=null;$('fe_error').textContent=e.message;$('fe_status').textContent='EVIDENCE INVALID';
    for(const id of ['total','ownership','tax','fee','income','counterparty','grossYield','effectiveTax','effectiveFee','totalReturn','netIncome'])$('fe_'+id).textContent='—';
    $('fe_blockers').textContent='';$('fe_rows').innerHTML='';api.getLiveSnapshot=()=>null;
  }
}
for(let i=0;i<SLOT_COUNT;i++)$('fe_slot'+i).addEventListener('click',()=>{capture();selected=i;fill();render();});
for(const k of fields)node(k).addEventListener('input',()=>{capture();render();});
$('fe_import').addEventListener('click',()=>{try{importComposition();$('fe_note').textContent='v0.10 composition copied locally. Add source references and dates before treating evidence as current.';}catch(e){$('fe_note').textContent=e.message;}});
$('fe_toFreedom').addEventListener('click',()=>{
  try{
    const r=lastResult||calculate(state);
    if(!r.readyForPolicyReview)throw Error('All five evidence axes and classifications must be current before transferring derived spendability assumptions.');
    const values={fc_currentCapital:r.total,fc_annualDistributionRatePct:r.effectiveGrossDistributionPct,fc_distributionTaxPct:r.effectiveTaxOnDistributionsPct,fc_annualPortfolioFeePct:r.effectiveFeePct};
    for(const [id,v] of Object.entries(values)){const n=$(id);if(!n)throw Error('Freedom Dashboard input '+id+' is unavailable');n.value=String(v);}
    const trigger=$('fc_currentCapital');if(typeof Event!=='undefined')trigger.dispatchEvent(new Event('input',{bubbles:true}));else if(typeof trigger.input==='function')trigger.input();
    $('fe_note').textContent='Evidence-derived capital/yield/tax/fee assumptions copied locally into v0.9. Source documents remain independently unverified.';
  }catch(e){$('fe_note').textContent=e.message;}
});
fill();render();
})(typeof window!=='undefined'?window:globalThis);
