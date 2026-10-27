/* WealthOS Capital Intelligence v0.5: deterministic financial scenarios, never a forecast. */
(function(root){
'use strict';
const GOAL=1_000_000_000;
const defaults=Object.freeze({liquidStart:0,equityStart:0,debtStart:0,monthlyContribution:5000,monthlyBusinessDistribution:0,annualPortfolioReturn:8,annualEquityGrowth:0,annualInflation:4,years:20,debtAPR:0,monthlyDebtPayment:0,distributionTaxPct:0,investmentTaxPct:0,annualFeePct:0,equityHaircutPct:0});
const keys=Object.keys(defaults);
function validate(raw){
 if(!raw||typeof raw!=='object')throw Error('Scenario is required');
 const s={...defaults,...raw};
 for(const k of keys)if(typeof s[k]!=='number'||!Number.isFinite(s[k]))throw Error(k+' must be a finite number');
 if(!Number.isInteger(s.years)||s.years<1||s.years>60)throw Error('Years must be between 1 and 60');
 for(const k of ['liquidStart','equityStart','debtStart','monthlyContribution','monthlyBusinessDistribution','monthlyDebtPayment'])if(s[k]<0)throw Error(k+' cannot be negative');
 for(const k of ['distributionTaxPct','investmentTaxPct','annualFeePct','equityHaircutPct'])if(s[k]<0||s[k]>=100)throw Error(k+' must be between 0% and below 100%');
 if(s.debtAPR<0||s.debtAPR>200)throw Error('Debt APR must be between 0% and 200%');
 if(s.annualPortfolioReturn<=-100||s.annualPortfolioReturn>200||s.annualEquityGrowth<=-100||s.annualEquityGrowth>200)throw Error('Investment and business growth must be above -100% and no more than 200%');
 if(s.annualInflation<=-100||s.annualInflation>100)throw Error('Inflation must be above -100% and no more than 100%');
 return s;
}
function simulate(input){
 const s=validate(input);let liquid=s.liquidStart,equity=s.equityStart,debt=s.debtStart;
 let targetMonth=null,shortfallMonth=null,totalInterest=0,totalDebtPaid=0,totalDistributionTax=0,totalReturnTax=0;
 const rows=[];
 const monthlyPortfolio=Math.pow(1+s.annualPortfolioReturn/100,1/12)-1;
 const monthlyFees=Math.pow(1-s.annualFeePct/100,1/12)-1;
 const monthlyEquity=Math.pow(1+s.annualEquityGrowth/100,1/12)-1;
 for(let m=1;m<=12*s.years;m++){
   const beforeTax=liquid*(1+monthlyPortfolio)*(1+monthlyFees);
   const gain=beforeTax-liquid;
   const taxOnReturn=Math.max(0,gain)*(s.investmentTaxPct/100);
   const afterReturn=beforeTax-taxOnReturn;
   const taxOnDistribution=s.monthlyBusinessDistribution*s.distributionTaxPct/100;
   const interest=debt*s.debtAPR/1200;
   const actualPayment=Math.min(debt+interest,s.monthlyDebtPayment);
   const newDebt=Math.max(0,debt+interest-actualPayment);
   const newLiquid=afterReturn+s.monthlyContribution+s.monthlyBusinessDistribution-taxOnDistribution-actualPayment;
   if(![beforeTax,gain,taxOnReturn,afterReturn,taxOnDistribution,interest,actualPayment,newDebt,newLiquid].every(Number.isFinite))throw Error('Projection exceeds supported numerical limits');
   if(newLiquid < -0.000001){shortfallMonth=m;break;}
   liquid=Math.max(0,newLiquid);debt=newDebt;equity*=1+monthlyEquity;
   totalInterest+=interest;totalDebtPaid+=actualPayment;totalDistributionTax+=taxOnDistribution;totalReturnTax+=taxOnReturn;
   const nominal=liquid+equity-debt,real=nominal/Math.pow(1+s.annualInflation/100,m/12);
   const liquidityAdjusted=liquid+equity*(1-s.equityHaircutPct/100)-debt;
   if(![liquid,debt,equity,nominal,real,liquidityAdjusted,totalInterest,totalDebtPaid,totalDistributionTax,totalReturnTax].every(Number.isFinite))throw Error('Projection exceeds supported numerical limits');
   if(nominal>=GOAL&&targetMonth===null)targetMonth=m;
   if(m%12===0)rows.push({year:m/12,liquid,equity,debt,net:nominal,real,liquidityAdjusted,interestPaid:totalInterest,debtPaid:totalDebtPaid,distributionTax:totalDistributionTax,returnTax:totalReturnTax});
 }
 return {status:shortfallMonth===null?'ok':'cash_shortfall',shortfallMonth,targetMonth,rows,
   final:shortfallMonth===null?rows[rows.length-1]:null,
   warnings:[
     ...(s.debtStart>0&&s.monthlyDebtPayment<=s.debtStart*s.debtAPR/1200?['Debt payments do not cover initial monthly interest; debt may grow.']:[]),
     ...(s.equityStart>0&&s.monthlyBusinessDistribution>0?['Equity growth and cash distributions are independently assumed; do not also count distributed cash in business equity.']:[])
   ],
   assumptions:'End-of-month cash flows. No FX, debt-rate changes, loss carry-forward, tax-law changes or business dilution. Equity haircut only adjusts illustrative realisability.'
 };
}
function requiredContribution(input){
 const s=validate(input);let lo=0,hi=GOAL;
 const qualifies=c=>{const r=simulate({...s,monthlyContribution:c});return r.status==='ok'&&r.final.net>=GOAL;};
 if(qualifies(0))return 0;
 if(!qualifies(hi))throw Error('Target cannot be reached within supported assumptions');
 for(let i=0;i<44;i++){const mid=(lo+hi)/2;if(qualifies(mid))hi=mid;else lo=mid;}
 return Math.ceil(hi*100)/100;
}
const model={defaults,keys,GOAL,validate,simulate,requiredContribution};
if(typeof module!=='undefined'&&module.exports)module.exports=model;
root.WealthOSCapitalV05=model;
if(!root.document)return;
const doc=root.document,$=id=>doc.getElementById(id);
const ids=Object.fromEntries(keys.map(k=>[k,'cap5_'+k]));
const outputs=['cap5_nominal','cap5_real','cap5_liquid','cap5_adjusted','cap5_debt','cap5_required','cap5_target','cap5_rows'];
function currency(v){return Number.isFinite(v)?'M'+Math.round(v).toLocaleString('en-US'):'—';}
let latest=null;
function clear(){for(const id of outputs.slice(0,7))$(id).textContent='—';$('cap5_rows').innerHTML='';}
function recalc(){
 try{
   const vals={};for(const k of keys){const x=$(ids[k]);if(!x||x.value.trim()==='')throw Error('Complete every scenario assumption');vals[k]=Number(x.value);}
   const s=validate(vals),result=simulate(s);
   if(result.status==='cash_shortfall')throw Error('Cash shortfall in month '+result.shortfallMonth+'. Increase contributions or reduce debt payments.');
   const r=result.final,needed=requiredContribution(s);
   for(const [id,num] of Object.entries({cap5_nominal:r.net,cap5_real:r.real,cap5_liquid:r.liquid,cap5_adjusted:r.liquidityAdjusted,cap5_debt:r.debt,cap5_required:needed}))$(id).textContent=currency(num);
   $('cap5_target').textContent=result.targetMonth?'Year '+(result.targetMonth/12).toFixed(1):'Not within horizon';
   $('cap5_rows').innerHTML=result.rows.map(y=>'<tr><td>'+y.year+'</td><td>'+currency(y.liquid)+'</td><td>'+currency(y.equity)+'</td><td>'+currency(y.debt)+'</td><td>'+currency(y.net)+'</td><td>'+currency(y.real)+'</td></tr>').join('');
   $('cap5_error').textContent='';$('cap5_warning').textContent=result.warnings.join(' ');latest={s,result};
 }catch(e){latest=null;clear();$('cap5_error').textContent=e.message;$('cap5_warning').textContent='';}
}
function exportFile(){
 if(!latest)return;
 const columns=['year','liquid','equity','debt','net','real','liquidityAdjusted','interestPaid','debtPaid','distributionTax','returnTax'];
 const csv=[columns.join(','),...latest.result.rows.map(r=>columns.map(k=>k==='year'?r[k]:r[k].toFixed(2)).join(','))].join('\n');
 const href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
 const a=doc.createElement('a');a.href=href;a.download='WealthOS_Capital_Intelligence_v05.csv';a.click();
 root.setTimeout(()=>URL.revokeObjectURL(href),1000);
}
if($('capitalPanel')){
 for(const k of keys)$(ids[k]).addEventListener('input',recalc);
 $('cap5_export').addEventListener('click',exportFile);
 recalc();
}
})(typeof window!=='undefined'?window:globalThis);
