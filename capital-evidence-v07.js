/* WealthOS Capital Evidence Register v0.7 — local-only, research-only; no investment approvals. */
(function(root){
'use strict';
const AXES=Object.freeze([
 ['customer','Customer demand and paying-customer evidence'],
 ['economics','Pricing, margins and operating-cost evidence'],
 ['capacity','Delivery capacity, counterparties and controls'],
 ['funding','Financing, liquidity and cash-deficit coverage'],
 ['legal','Ownership, contracts and regulatory permissions'],
 ['taxfx','Tax treatment and foreign-exchange exposure']
]);
const STATUS=['missing','internal','external_reported'];
const blankEvidence=()=>Object.fromEntries(AXES.map(([k])=>[k,{status:'missing',reference:'',reviewDate:''}]));
function finiteNonnegative(n){return typeof n==='number'&&Number.isFinite(n)&&n>=0;}
function parseDate(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
 const d=new Date(value+'T00:00:00Z');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===value?d:null;
}
function baseline(input,now='2026-10-27'){
 const a={liquid:0,businessEquity:0,otherAssets:0,liabilities:0,liquidityReserve:0,
   asOf:'',sourceRef:'',declaration:false,...input};
 for(const k of ['liquid','businessEquity','otherAssets','liabilities','liquidityReserve'])
  if(!finiteNonnegative(a[k]))throw Error('Opening '+k+' must be a nonnegative finite amount.');
 const netWorth=a.liquid+a.businessEquity+a.otherAssets-a.liabilities;
 const available=Math.max(0,a.liquid-a.liquidityReserve);
 if(![netWorth,available].every(Number.isFinite))throw Error('Balance sheet totals exceed supported numerical limits.');
 const asOf=parseDate(a.asOf),today=parseDate(now);
 const dated=!!asOf&&!!today&&asOf<=today;
 const ref=typeof a.sourceRef==='string'&&a.sourceRef.trim().length>=5&&a.sourceRef.length<=160;
 const daysOld=dated?Math.floor((today-asOf)/86400000):null;
 const evidenced=dated&&ref&&a.declaration===true;
 return {netWorth,available,liquid:a.liquid,businessEquity:a.businessEquity,
   otherAssets:a.otherAssets,liabilities:a.liabilities,liquidityReserve:a.liquidityReserve,
   daysOld,evidenced,transferAllowed:evidenced&&daysOld<=120&&a.liquidityReserve<=a.liquid,
   state:!evidenced?'USER INPUT — SOURCE NOT COMPLETE':daysOld>120?'USER ATTESTED — STALE RECORD':'USER ATTESTED — NOT INDEPENDENTLY VERIFIED',
   warnings:[
    ...(a.liquidityReserve>a.liquid?['Reserve exceeds liquid assets. No discretionary capital remains.']:[]),
    ...(dated&&daysOld>120?['Opening balances are more than 120 days old. Refresh before decisions.']:[]),
    ...(a.otherAssets>0?['Other nonbusiness assets count toward net worth but are not transferred into the v0.5 growth engine.']:[]),
    ...(!ref?['Add a non-sensitive source reference (not an account number, password or document upload).']:[])
   ]};
}
function diligence(input,now='2026-10-27'){
 const x=input||{},today=parseDate(now);
 if(!today)throw Error('Invalid evaluation date');
 let independent=0,internal=0,missing=0,invalid=0;
 const gaps=[];
 for(const [key,label] of AXES){
  const row=x[key]||{status:'missing',reference:'',reviewDate:''};
  if(!STATUS.includes(row.status))throw Error('Unsupported evidence status for '+key);
  if(row.status==='missing'){missing++;gaps.push(label+': not assessed');continue;}
  const ref=typeof row.reference==='string'&&row.reference.trim().length>=5&&row.reference.length<=160;
  const date=parseDate(row.reviewDate);
  const valid=ref&&date&&date<=today&&today-date<=365*86400000;
  if(!valid){invalid++;gaps.push(label+': add a current, non-sensitive source reference and review date');continue;}
  if(row.status==='internal')internal++;else independent++;
 }
 const complete=independent===AXES.length;
 return {independent,internal,missing,invalid,complete,
   status:complete?'EXTERNAL REVIEW REPORTED — HUMAN APPROVAL REQUIRED':
    independent+internal>0?'EVIDENCE COLLECTION IN PROGRESS':'NO SUFFICIENT EVIDENCE',
   gaps,approval:false,
   caveat:'Statuses and references are self-entered and are not independently verified by WealthOS. They cannot authorise financing, securities trading or business investment.'};
}
function portfolio(opportunities,records,baselineResult,now='2026-10-27'){
 if(!Array.isArray(opportunities)||opportunities.length!==3||!Array.isArray(records)||records.length!==3)
  throw Error('Three opportunities and three diligence records required.');
 const items=opportunities.map((o,i)=>{
  const e=diligence(records[i],now);
  const amount=typeof o.ownerCapital==='number'&&Number.isFinite(o.ownerCapital)&&o.ownerCapital>=0?o.ownerCapital:null;
  return {name:typeof o.name==='string'?o.name.slice(0,80):'Opportunity '+(i+1),
   capital:amount,evidence:e,
   researchOnly:true,approved:false};
 });
 const total=items.every(i=>i.capital!==null)?items.reduce((v,i)=>v+i.capital,0):null;
 if(total!==null&&!Number.isFinite(total))throw Error('Proposed capital exceeds numeric range');
 return {items,proposedCapital:total,
  fundingGap:total===null?null:Math.max(0,total-baselineResult.available),
  available:baselineResult.available,
  portfolioApproved:false};
}
const api={AXES,STATUS,blankEvidence,parseDate,baseline,diligence,portfolio};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.WealthOSEvidenceV07=api;
if(!root.document)return;
const doc=root.document,$=id=>doc.getElementById(id);
if(!$('evidencePanel'))return;
const refs=Array.from({length:3},()=>blankEvidence());
let selected=0,lastBaseline=null,lastPortfolio=null;
function esc(x){return String(x??'').replace(/[&<>"']/g,k=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[k]));}
function money(x){return Number.isFinite(x)?'M'+Math.round(x).toLocaleString('en-US'):'—';}
function getDate(){return new Date().toISOString().slice(0,10);}
function getOpportunities(){
 const provider=root.WealthOSCreationV06;
 return provider&&typeof provider.getOpportunityScenarios==='function'?provider.getOpportunityScenarios():
   [{name:'Opportunity A',ownerCapital:0},{name:'Opportunity B',ownerCapital:0},{name:'Opportunity C',ownerCapital:0}];
}
function readBaseline(){
 const x={};
 for(const k of ['liquid','businessEquity','otherAssets','liabilities','liquidityReserve']){
  const raw=$('ev_'+k).value.trim();if(raw==='')throw Error('Complete opening '+k);
  x[k]=Number(raw);
 }
 x.asOf=$('ev_asOf').value;x.sourceRef=$('ev_sourceRef').value;
 x.declaration=$('ev_declaration').checked;
 return baseline(x,getDate());
}
function updateBaseline(){
 try{
  const b=readBaseline();lastBaseline=b;
  for(const [id,val] of [['ev_net',b.netWorth],['ev_available',b.available]])$(id).textContent=money(val);
  $('ev_stage').textContent=b.state;
  $('ev_baselineError').textContent='';
  $('ev_baselineNotes').textContent=b.warnings.join(' ');
  $('ev_transfer').disabled=!b.transferAllowed;
 }catch(e){
  lastBaseline=null;
  for(const id of ['ev_net','ev_available','ev_stage'])$(id).textContent='—';
  $('ev_baselineNotes').textContent='';$('ev_baselineError').textContent=e.message;$('ev_transfer').disabled=true;
 }
 updatePortfolio();
}
function captureEvidence(){
 const e={};
 for(const [key] of AXES){
  e[key]={status:$('ev_status_'+key).value,
   reference:$('ev_ref_'+key).value,reviewDate:$('ev_date_'+key).value};
 }
 return e;
}
function fillEvidence(){
 const e=refs[selected];
 for(const [key] of AXES){
  $('ev_status_'+key).value=e[key].status;
  $('ev_ref_'+key).value=e[key].reference;
  $('ev_date_'+key).value=e[key].reviewDate;
 }
}
function updatePortfolio(){
 try{
  const b=lastBaseline||{available:0};
  const results=portfolio(getOpportunities(),refs,b,getDate());
  lastPortfolio=results;
  $('ev_portfolioRows').innerHTML=results.items.map((item,i)=>
   '<tr><td>'+esc(item.name||'Opportunity '+(i+1))+'</td><td>'+money(item.capital)+
   '</td><td>'+item.evidence.independent+'/6</td><td>'+esc(item.evidence.status)+
   '</td><td><strong>NO</strong></td></tr>').join('');
  $('ev_commitments').textContent=money(results.proposedCapital);
  $('ev_gap').textContent=money(results.fundingGap);
  $('ev_portfolioError').textContent='';
  const e=results.items[selected].evidence;
  $('ev_diligenceStatus').textContent=e.status;
  $('ev_diligenceNotes').textContent=[...e.gaps,e.caveat].join(' | ');
  $('ev_selectedName').textContent=results.items[selected].name||'Opportunity '+(selected+1);
  for(let i=0;i<3;i++)$('ev_op'+i).className='btn'+(i===selected?' primary':'');
 }catch(e){lastPortfolio=null;$('ev_portfolioRows').innerHTML='';$('ev_commitments').textContent='—';
  $('ev_gap').textContent='—';$('ev_diligenceStatus').textContent='—';$('ev_diligenceNotes').textContent='';
  $('ev_portfolioError').textContent=e.message;}
}
for(const k of ['liquid','businessEquity','otherAssets','liabilities','liquidityReserve','asOf','sourceRef'])
 $('ev_'+k).addEventListener('input',updateBaseline);
$('ev_declaration').addEventListener('change',updateBaseline);
for(let i=0;i<3;i++)$('ev_op'+i).addEventListener('click',()=>{selected=i;fillEvidence();updatePortfolio();});
for(const [key] of AXES)for(const id of ['ev_status_'+key,'ev_ref_'+key,'ev_date_'+key])
 $(id).addEventListener('input',()=>{refs[selected]=captureEvidence();updatePortfolio();});
$('ev_refreshOpportunities').addEventListener('click',updatePortfolio);
$('ev_transfer').addEventListener('click',()=>{
 try{
  const b=readBaseline();
  if(!b.transferAllowed)throw Error('A dated, user-attested baseline with a source reference and reserve within liquid assets is required.');
  if(!root.WealthOSCapitalV05)throw Error('Capital v0.5 is unavailable.');
  const vals={cap5_liquidStart:b.liquid,cap5_equityStart:b.businessEquity,cap5_debtStart:b.liabilities};
  for(const [id,value] of Object.entries(vals)){const node=$(id);if(!node)throw Error('Missing Capital v0.5 input '+id);}
  for(const [id,value] of Object.entries(vals))$(id).value=String(value);
  $('cap5_debtStart').dispatchEvent(new Event('input',{bubbles:true}));
  $('ev_transferNote').textContent='Opening balances copied into v0.5 locally (other assets excluded). No database update and no independent verification.';
 }catch(e){$('ev_transferNote').textContent=e.message;}
});
fillEvidence();updateBaseline();
})(typeof window!=='undefined'?window:globalThis);
