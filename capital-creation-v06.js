/* WealthOS Capital Creation Studio v0.6. Research-only, local-input opportunity comparisons. */
(function(root){
'use strict';
const defaultOpportunity=Object.freeze({
 name:'', ownerCapital:0, monthlyRevenue:0, grossMarginPct:35, monthlyFixedCosts:0,
 annualRevenueGrowthPct:0, annualCostInflationPct:4, monthlyMaintenanceCapex:0,
 monthlyDebtService:0, effectiveTaxPct:0, workingCapitalReservePct:0,
 ownerSharePct:100, horizonMonths:36
});
const numericFields=Object.keys(defaultOpportunity).filter(k=>k!=='name');
function validate(x){
 if(!x||typeof x!=='object')throw Error('Opportunity assumptions are required.');
 const s={...defaultOpportunity,...x};
 if(typeof s.name!=='string'||s.name.length>80)throw Error('Opportunity name must be 80 characters or fewer.');
 for(const k of numericFields)if(typeof s[k]!=='number'||!Number.isFinite(s[k]))throw Error(k+' must be a finite number.');
 for(const k of ['ownerCapital','monthlyRevenue','monthlyFixedCosts','monthlyMaintenanceCapex','monthlyDebtService'])
  if(s[k]<0)throw Error(k+' must not be negative.');
 for(const k of ['grossMarginPct','effectiveTaxPct','workingCapitalReservePct','ownerSharePct'])
  if(s[k]<0||s[k]>100)throw Error(k+' must be between 0 and 100%.');
 if(s.annualRevenueGrowthPct<=-100||s.annualRevenueGrowthPct>200)throw Error('Revenue growth must be above -100% and no more than 200%.');
 if(s.annualCostInflationPct<=-100||s.annualCostInflationPct>200)throw Error('Cost inflation must be above -100% and no more than 200%.');
 if(!Number.isInteger(s.horizonMonths)||s.horizonMonths<12||s.horizonMonths>60||s.horizonMonths%12!==0)
  throw Error('Horizon must be 12–60 months, in whole years.');
 return s;
}
function simulate(input,salesFactor=1){
 const s=validate(input);
 if(!Number.isFinite(salesFactor)||salesFactor<0||salesFactor>3)throw Error('Invalid revenue stress factor.');
 let cumulativeOwnerCash=0,cumulativeShortfalls=0,shortfallMonths=0,paybackMonth=null;
 let firstOwnerCash=0,lastOwnerCash=0,lastMonthlyBusinessCash=0;
 let totalOperatingSurplus=0,totalEntityTax=0;
 let totalGrossRevenue=0;
 const rows=[];
 for(let m=1;m<=s.horizonMonths;m++){
  const revenue=s.monthlyRevenue*salesFactor*Math.pow(1+s.annualRevenueGrowthPct/100,(m-1)/12);
  const fixedCosts=s.monthlyFixedCosts*Math.pow(1+s.annualCostInflationPct/100,(m-1)/12);
  const grossProfit=revenue*s.grossMarginPct/100;
  const operatingBeforeTax=grossProfit-fixedCosts;
  const tax=Math.max(0,operatingBeforeTax)*s.effectiveTaxPct/100;
  const cashAfterCommitments=operatingBeforeTax-tax-s.monthlyMaintenanceCapex-s.monthlyDebtService-revenue*s.workingCapitalReservePct/100;
  const ownerCash=Math.max(0,cashAfterCommitments)*s.ownerSharePct/100;
  const deficit=Math.max(0,-cashAfterCommitments);
  if(![revenue,fixedCosts,grossProfit,operatingBeforeTax,tax,cashAfterCommitments,ownerCash,deficit,cumulativeOwnerCash].every(Number.isFinite))throw Error('Scenario arithmetic exceeds supported limits.');
  cumulativeOwnerCash+=ownerCash;cumulativeShortfalls+=deficit;
  totalOperatingSurplus+=cashAfterCommitments;totalEntityTax+=tax;totalGrossRevenue+=revenue;
  if(deficit>0.005)shortfallMonths++;
  if(paybackMonth===null&&s.ownerCapital>0&&cumulativeOwnerCash>=s.ownerCapital)paybackMonth=m;
  if(m===1)firstOwnerCash=ownerCash;
  if(m===s.horizonMonths){lastOwnerCash=ownerCash;lastMonthlyBusinessCash=cashAfterCommitments;}
  if(m%12===0)rows.push({year:m/12,cumulativeOwnerCash,cumulativeShortfalls,ownerMonthlyCash:ownerCash,monthlyRevenue:revenue});
 }
 if(![cumulativeOwnerCash,cumulativeShortfalls,totalOperatingSurplus,totalEntityTax,totalGrossRevenue].every(Number.isFinite))throw Error('Scenario aggregate exceeds supported limits.');
 // Deficits need identifiable funding; capital-recovery claims are not reliable without it.
 if(cumulativeShortfalls>0.005)paybackMonth=null;
 return {assumptions:s,salesFactor,cumulativeOwnerCash,cumulativeShortfalls,shortfallMonths,
 paybackMonth,firstOwnerCash,lastOwnerCash,lastMonthlyBusinessCash,
 totalOperatingSurplus,totalEntityTax,totalGrossRevenue,rows,
 distributableMonthlyAtHorizon:lastOwnerCash,
 cashAfterOwnerCapital:cumulativeOwnerCash-s.ownerCapital,
 initialOwnerCapital:s.ownerCapital,
 modelLimitations:'Cash-flow illustration, not valuation, forecast, or financing approval. Tax is a user-defined effective assumption. Working-capital reserve is withheld from distributions, not an operating expense. Debt service is a cash outflow; interest/principal split is not modelled. No FX, bad-debt, churn, seasonality, working-capital recovery, equity dilution or reinvestment.'
 };
}
function evaluate(input){
 const s=validate(input);
 const stress=simulate(s,.65),base=simulate(s,1),growth=simulate(s,1.30);
 const notModelled=s.monthlyRevenue===0&&s.ownerCapital===0&&s.monthlyFixedCosts===0;
 const status=notModelled?'NOT MODELLED':base.cumulativeShortfalls>0.005?'FUNDING GAP':
   stress.cumulativeShortfalls>0.005||stress.cumulativeOwnerCash<=0?'DOWNSIDE RISK':
   base.paybackMonth===null?'NO PAYBACK IN HORIZON':'SCENARIO ONLY';
 return {status,stress,base,growth,assumptions:s,
 warnings:[
 ...(base.cumulativeShortfalls>0.005?['Base case has '+base.shortfallMonths+' cash-deficit months; additional working capital or financing may be needed.']:[]),
 ...(stress.cumulativeShortfalls>0.005?['Downside case produces cash deficits; stress resilience is unproven.']:[]),
 ...(s.monthlyRevenue>0&&s.ownerCapital===0?['No owner startup capital entered; payback cannot be evaluated.']:[]),
 ...(s.ownerSharePct<100?['Only the selected ownership share of distributable cash is attributable to you.']:[])
 ]};
}
const engine={defaultOpportunity,numericFields,validate,simulate,evaluate};
if(typeof module!=='undefined'&&module.exports)module.exports=engine;
root.WealthOSCreationV06=engine;
if(!root.document)return;
const doc=root.document,$=id=>doc.getElementById(id);
if(!$('creationStudio'))return;
const possibilities=[{...defaultOpportunity,name:'Opportunity A'},{...defaultOpportunity,name:'Opportunity B'},{...defaultOpportunity,name:'Opportunity C'}];
let active=0,results=[];
const format=x=>Number.isFinite(x)?'M'+Math.round(x).toLocaleString('en-US'):'—';
const escapeHTML=s=>String(s).replace(/[&<>"']/g,k=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[k]));
const formKeys=['name',...numericFields];
const inputs=Object.fromEntries(formKeys.map(k=>[k,'create_'+k]));
function fillInputs(){
 const candidate=possibilities[active];
 for(const k of formKeys)$(inputs[k]).value=String(candidate[k]);
 for(let i=0;i<3;i++)$('create_tab'+i).className='btn'+(i===active?' primary':'');
}
function currentInputs(){
 const newCandidate={};
 for(const k of formKeys){
  const v=$(inputs[k]).value;
  if(k==='name')newCandidate[k]=v;
  else if(v.trim()==='')throw Error('Please complete '+k+' before evaluating.');
  else newCandidate[k]=Number(v);
 }
 return validate(newCandidate);
}
function render(){
 results=possibilities.map((c,i)=>{try{return {i,...evaluate(c)};}catch(e){return {i,error:e.message};}});
 const rows=results.map((r,i)=>{
  const name=escapeHTML(possibilities[i].name||'Opportunity '+(i+1));
  if(r.error)return '<tr><td>'+name+'</td><td colspan="6" class="red">'+escapeHTML(r.error)+'</td></tr>';
  const base=r.base,stress=r.stress;
  const payback=base.paybackMonth===null?'Not established':base.paybackMonth+' months';
  return '<tr><td><strong>'+name+'</strong><div class="muted">'+escapeHTML(r.status)+'</div></td>'+
   '<td>'+format(base.initialOwnerCapital)+'</td><td>'+format(base.cumulativeOwnerCash)+'</td>'+
   '<td>'+format(stress.cumulativeOwnerCash)+'</td><td>'+format(base.cumulativeShortfalls)+'</td>'+
   '<td>'+payback+'</td><td>'+format(base.lastOwnerCash)+'</td></tr>';
 });
 $('create_comparison').innerHTML=rows.join('');
 const chosen=results[active];
 if(chosen.error){$('create_error').textContent=chosen.error;$('create_caveat').textContent='';}
 else{$('create_error').textContent='';$('create_caveat').textContent=chosen.warnings.join(' ')||
 'Base and stress results remain hypothetical. Validate customer demand, costs, financing and distributions independently.';}
}
for(let i=0;i<3;i++)$('create_tab'+i).addEventListener('click',()=>{active=i;fillInputs();render();});
for(const k of formKeys)$(inputs[k]).addEventListener('input',()=>{
 try{possibilities[active]=currentInputs();$('create_error').textContent='';}
 catch(e){$('create_error').textContent=e.message;return;}
 render();
});
$('create_export').addEventListener('click',()=>{
 if(!results.length)return;
 const cols=['opportunity','status','owner_capital_M','base_owner_cash_M','downside_owner_cash_M','upside_owner_cash_M','base_funding_gaps_M','payback_month','month_36_owner_cash_M'];
 const csvEsc=v=>{const raw=String(v==null?'':v);const safe=/^[=+\-@\t\r]/.test(raw)?"'"+raw:raw;return '"'+safe.replace(/"/g,'""')+'"';};
 const rows=[cols.join(',')];
 results.forEach((r,i)=>{
  if(r.error)return;
  const b=r.base;
  const cells=[possibilities[i].name,r.status,b.initialOwnerCapital,b.cumulativeOwnerCash,r.stress.cumulativeOwnerCash,r.growth.cumulativeOwnerCash,b.cumulativeShortfalls,b.paybackMonth??'',b.lastOwnerCash];
  rows.push(cells.map(csvEsc).join(','));
 });
 const url=URL.createObjectURL(new Blob([rows.join('\n')],{type:'text/csv;charset=utf-8'}));
 const a=doc.createElement('a');a.href=url;a.download='WealthOS_Capital_Creation_Comparison_v06.csv';a.click();
 root.setTimeout(()=>URL.revokeObjectURL(url),1000);
});
fillInputs();render();
})(typeof window!=='undefined'?window:globalThis);
