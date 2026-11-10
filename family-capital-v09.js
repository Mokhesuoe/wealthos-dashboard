/* WealthOS Permanent Family Capital v0.9 — deterministic freedom planning, never certification. */
(function(root){
'use strict';

const GATES=Object.freeze([
  Object.freeze({key:'FREEDOM_FLOOR',label:'Freedom Floor',capital:100_000_000}),
  Object.freeze({key:'FREEDOM_BUFFER',label:'Freedom Buffer',capital:125_000_000}),
  Object.freeze({key:'PERMANENT_FREEDOM',label:'Permanent Freedom',capital:150_000_000}),
  Object.freeze({key:'M1B_NORTH_STAR',label:'M1bn North Star',capital:1_000_000_000})
]);

const defaults=Object.freeze({
  currentCapital:0,
  monthlyLifestyle:500_000,
  annualDistributionRatePct:6,
  distributionTaxPct:0,
  annualPortfolioFeePct:0,
  annualInflationPct:4,
  inflationHorizonYears:10,
  drawdownPct:20,
  interruptionMonths:12,
  liquidityReserve:0
});

const keys=Object.keys(defaults);

function finite(n){return typeof n==='number'&&Number.isFinite(n);}
function pctRate(n,name,{allow100=false,min=-100,max=100}={}){
  if(!finite(n))throw Error(name+' must be a finite number');
  if(n<min||n>(allow100?max:max-Number.EPSILON))throw Error(name+' is outside the supported range');
  return n;
}
function validate(raw){
  if(!raw||typeof raw!=='object')throw Error('Freedom-planning assumptions are required');
  const s={...defaults,...raw};
  for(const k of ['currentCapital','monthlyLifestyle','liquidityReserve'])
    if(!finite(s[k])||s[k]<0)throw Error(k+' must be a nonnegative finite amount');
  for(const k of ['annualDistributionRatePct','distributionTaxPct','annualPortfolioFeePct','drawdownPct'])
    if(!finite(s[k])||s[k]<0||s[k]>=100)throw Error(k+' must be between 0% and below 100%');
  pctRate(s.annualInflationPct,'annualInflationPct',{min:-50,max:100});
  if(!Number.isInteger(s.inflationHorizonYears)||s.inflationHorizonYears<1||s.inflationHorizonYears>50)
    throw Error('inflationHorizonYears must be a whole number from 1 to 50');
  if(!Number.isInteger(s.interruptionMonths)||s.interruptionMonths<0||s.interruptionMonths>60)
    throw Error('interruptionMonths must be a whole number from 0 to 60');
  return s;
}

function requiredDistributionRatePct(capital,monthlyLifestyle){
  if(!finite(capital)||capital<=0)return null;
  if(!finite(monthlyLifestyle)||monthlyLifestyle<0)throw Error('monthlyLifestyle must be nonnegative');
  return monthlyLifestyle*12/capital*100;
}

function incomeAtYield(capital,annualRatePct,taxPct,feePct){
  const grossAnnual=capital*annualRatePct/100;
  const tax=grossAnnual*taxPct/100;
  const fees=capital*feePct/100;
  const netAnnual=grossAnnual-tax-fees;
  return {
    grossAnnual,tax,fees,netAnnual,
    grossMonthly:grossAnnual/12,
    netMonthly:netAnnual/12
  };
}

function gateState(capital){
  if(capital>=150_000_000)return 'NUMERIC PERMANENT FREEDOM — NOT CERTIFIED';
  if(capital>=125_000_000)return 'NUMERIC FREEDOM BUFFER — NOT CERTIFIED';
  if(capital>=100_000_000)return 'NUMERIC FREEDOM FLOOR — NOT CERTIFIED';
  return 'BELOW FREEDOM FLOOR';
}

function nextGate(capital){
  const next=GATES.find(g=>capital<g.capital);
  return next||null;
}

function calculate(raw){
  const s=validate(raw);
  const annualLifestyle=s.monthlyLifestyle*12;
  const requiredRate=requiredDistributionRatePct(s.currentCapital,s.monthlyLifestyle);
  const income=incomeAtYield(s.currentCapital,s.annualDistributionRatePct,s.distributionTaxPct,s.annualPortfolioFeePct);
  const annualSurplus=income.netAnnual-annualLifestyle;
  const monthlySurplus=annualSurplus/12;
  const coverageRatio=annualLifestyle===0?null:income.netAnnual/annualLifestyle;
  const futureMonthlyLifestyle=s.monthlyLifestyle*Math.pow(1+s.annualInflationPct/100,s.inflationHorizonYears);
  const futureRequiredRate=requiredDistributionRatePct(s.currentCapital,futureMonthlyLifestyle);
  const afterDrawdownCapital=s.currentCapital*(1-s.drawdownPct/100);
  const afterDrawdownRequiredRate=requiredDistributionRatePct(afterDrawdownCapital,s.monthlyLifestyle);
  const reserveMonths=s.monthlyLifestyle===0?null:s.liquidityReserve/s.monthlyLifestyle;
  const interruptionNeed=s.monthlyLifestyle*s.interruptionMonths;
  const interruptionGap=Math.max(0,interruptionNeed-s.liquidityReserve);
  const next=nextGate(s.currentCapital);
  const derived=[annualLifestyle,income.grossAnnual,income.tax,income.fees,income.netAnnual,income.grossMonthly,income.netMonthly,annualSurplus,monthlySurplus,futureMonthlyLifestyle,afterDrawdownCapital,interruptionNeed,interruptionGap,s.currentCapital/1_000_000_000*100];
  if(!derived.every(Number.isFinite)||[requiredRate,futureRequiredRate,afterDrawdownRequiredRate,reserveMonths].some(v=>v!==null&&!Number.isFinite(v)))
    throw Error('Freedom planning arithmetic exceeds supported numerical limits');

  const stressRates=[0,1,2,3]
    .map(d=>Math.max(0,s.annualDistributionRatePct-d))
    .filter((v,i,a)=>a.indexOf(v)===i)
    .map(rate=>{
      const x=incomeAtYield(s.currentCapital,rate,s.distributionTaxPct,s.annualPortfolioFeePct);
      return {
        annualDistributionRatePct:rate,
        grossMonthly:x.grossMonthly,
        netMonthly:x.netMonthly,
        monthlySurplus:x.netMonthly-s.monthlyLifestyle,
        status:x.netMonthly>=s.monthlyLifestyle?'COVERS':'SHORTFALL'
      };
    });

  const gates=GATES.map(g=>({
    ...g,
    reached:s.currentCapital>=g.capital,
    progressPct:g.capital===0?0:Math.min(100,s.currentCapital/g.capital*100),
    distance:Math.max(0,g.capital-s.currentCapital),
    requiredDistributionRatePct:requiredDistributionRatePct(g.capital,s.monthlyLifestyle)
  }));

  const warnings=[];
  if(s.currentCapital===0)warnings.push('Enter qualifying liquid capital before interpreting yield or gate progress.');
  if(s.distributionTaxPct===0)warnings.push('Distribution tax is set to 0%; confirm actual tax treatment before treating gross income as spendable.');
  if(s.annualPortfolioFeePct===0)warnings.push('Portfolio fee drag is set to 0%; confirm actual recurring costs before reliance.');
  if(requiredRate!==null&&s.annualDistributionRatePct<requiredRate)warnings.push('Selected gross distribution rate is below the rate required to fund the lifestyle target.');
  if(monthlySurplus<0)warnings.push('Net spendable income is below the lifestyle target under the selected assumptions.');
  if(interruptionGap>0)warnings.push('Liquidity reserve does not fully cover the selected income-interruption period.');
  if(afterDrawdownRequiredRate!==null&&afterDrawdownRequiredRate>s.annualDistributionRatePct)
    warnings.push('After the selected drawdown, the same lifestyle would require a higher distribution rate than the base assumption.');
  if(s.currentCapital>=100_000_000)
    warnings.push('A numerical capital gate is not a WealthOS certification of financial independence.');

  return {
    assumptions:s,
    annualLifestyle,
    requiredDistributionRatePct:requiredRate,
    income,
    annualSurplus,
    monthlySurplus,
    coverageRatio,
    futureMonthlyLifestyle,
    futureRequiredDistributionRatePct:futureRequiredRate,
    afterDrawdownCapital,
    afterDrawdownRequiredDistributionRatePct:afterDrawdownRequiredRate,
    reserveMonths,
    interruptionNeed,
    interruptionGap,
    state:gateState(s.currentCapital),
    nextGate:next?{...next,distance:next.capital-s.currentCapital}:null,
    northStarProgressPct:Math.min(100,s.currentCapital/1_000_000_000*100),
    gates,
    stressRates,
    certified:false,
    tradeEligible:false,
    warnings,
    methodology:'Deterministic planning arithmetic only. Distribution yield is not total return. No tax law, future yield, inflation path, market return, or capital-preservation outcome is guaranteed.'
  };
}

const api={GATES,defaults,keys,validate,requiredDistributionRatePct,incomeAtYield,gateState,nextGate,calculate};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.WealthOSFamilyCapitalV09=api;
if(!root.document)return;

const doc=root.document,$=id=>doc.getElementById(id);
if(!$('familyCapitalPanel'))return;
const ids=Object.fromEntries(keys.map(k=>[k,'fc_'+k]));
const money=v=>Number.isFinite(v)?'M'+Math.round(v).toLocaleString('en-US'):'—';
const pct=v=>Number.isFinite(v)?v.toFixed(2)+'%':'—';
const num=v=>Number.isFinite(v)?v.toFixed(1):'—';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function clear(){
  for(const id of ['fc_state','fc_next','fc_requiredYield','fc_grossMonthly','fc_netMonthly','fc_surplus','fc_reserveMonths','fc_m1bProgress','fc_futureLifestyle','fc_drawdownYield'])
    $(id).textContent='—';
  $('fc_gateRows').innerHTML='';
  $('fc_stressRows').innerHTML='';
}
function read(){
  const out={};
  for(const k of keys){
    const node=$(ids[k]);
    if(!node||node.value.trim()==='')throw Error('Complete every Permanent Family Capital assumption');
    out[k]=Number(node.value);
  }
  return validate(out);
}
function render(){
  try{
    const r=calculate(read());
    $('fc_error').textContent='';
    $('fc_warning').textContent=r.warnings.join(' ');
    $('fc_state').textContent=r.state;
    $('fc_state').className='value '+(r.assumptions.currentCapital>=150_000_000?'green':r.assumptions.currentCapital>=100_000_000?'amber':'red');
    $('fc_next').textContent=r.nextGate?r.nextGate.label+' · '+money(r.nextGate.distance):'M1bn North Star reached';
    $('fc_requiredYield').textContent=pct(r.requiredDistributionRatePct);
    $('fc_grossMonthly').textContent=money(r.income.grossMonthly);
    $('fc_netMonthly').textContent=money(r.income.netMonthly);
    $('fc_surplus').textContent=money(r.monthlySurplus);
    $('fc_surplus').className='value '+(r.monthlySurplus>=0?'green':'red');
    $('fc_reserveMonths').textContent=r.reserveMonths===null?'—':num(r.reserveMonths)+' months';
    $('fc_m1bProgress').textContent=pct(r.northStarProgressPct);
    $('fc_futureLifestyle').textContent=money(r.futureMonthlyLifestyle);
    $('fc_drawdownYield').textContent=pct(r.afterDrawdownRequiredDistributionRatePct);
    $('fc_gateRows').innerHTML=r.gates.map(g=>
      '<tr><td>'+esc(g.label)+'</td><td>'+money(g.capital)+'</td><td>'+pct(g.progressPct)+'</td><td>'+money(g.distance)+'</td><td>'+pct(g.requiredDistributionRatePct)+'</td><td>'+(g.reached?'REACHED NUMERICALLY':'NOT REACHED')+'</td></tr>'
    ).join('');
    $('fc_stressRows').innerHTML=r.stressRates.map(x=>
      '<tr><td>'+pct(x.annualDistributionRatePct)+'</td><td>'+money(x.grossMonthly)+'</td><td>'+money(x.netMonthly)+'</td><td>'+money(x.monthlySurplus)+'</td><td class="'+(x.status==='COVERS'?'green':'red')+'"><strong>'+x.status+'</strong></td></tr>'
    ).join('');
    $('fc_certification').textContent='NOT CERTIFIED · planning evidence only · LIVE CAPITAL LOCKED';
  }catch(e){
    clear();$('fc_error').textContent=e.message;$('fc_warning').textContent='';$('fc_certification').textContent='NOT CERTIFIED';
  }
}
for(const k of keys)$(ids[k]).addEventListener('input',render);
$('fc_useEvidence').addEventListener('click',()=>{
  try{
    const snap=root.WealthOSEvidenceV07?.getLiveSnapshot?.();
    const b=snap?.baseline;
    if(!b||!b.transferAllowed)throw Error('A current dated and user-attested v0.7 opening wealth statement is required before copying values.');
    $('fc_currentCapital').value=String(b.liquid);
    $('fc_liquidityReserve').value=String(b.liquidityReserve);
    $('fc_importNote').textContent='Copied v0.7 user-attested liquid investments and ring-fenced reserve locally. No database write; no independent verification.';
    render();
  }catch(e){$('fc_importNote').textContent=e.message;}
});
render();
})(typeof window!=='undefined'?window:globalThis);
