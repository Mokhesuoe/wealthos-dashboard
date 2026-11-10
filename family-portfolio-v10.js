/* WealthOS Family Portfolio Concentration v0.10 — local-only composition analysis. */
(function(root){
'use strict';

const SLOT_COUNT=8;
const emptyHolding=()=>({name:'',amount:0,manager:'',bank:'',assetClass:'',currency:''});

function finiteNonnegative(n){return typeof n==='number'&&Number.isFinite(n)&&n>=0;}
function cleanText(v,max=80){return String(v??'').trim().slice(0,max);}
function validateHoldings(rows){
  if(!Array.isArray(rows)||rows.length!==SLOT_COUNT)throw Error('Exactly '+SLOT_COUNT+' portfolio slots are required');
  return rows.map((r,i)=>{
    const x={...emptyHolding(),...(r||{})};
    if(!finiteNonnegative(x.amount))throw Error('Holding '+(i+1)+' amount must be a nonnegative finite number');
    x.name=cleanText(x.name);x.manager=cleanText(x.manager);x.bank=cleanText(x.bank);x.assetClass=cleanText(x.assetClass);x.currency=cleanText(x.currency,24);
    if(x.amount>0&&!x.name)throw Error('Holding '+(i+1)+' needs a name when amount is entered');
    return x;
  });
}

function aggregate(rows,key,total){
  const map=new Map();
  for(const r of rows){
    if(r.amount<=0)continue;
    const label=r[key]||'UNSPECIFIED';
    map.set(label,(map.get(label)||0)+r.amount);
  }
  return [...map.entries()]
    .map(([label,amount])=>({label,amount,sharePct:total?amount/total*100:0}))
    .sort((a,b)=>b.amount-a.amount||a.label.localeCompare(b.label));
}

function largest(list){return list.length?list[0]:null;}

function calculate(inputRows){
  const rows=validateHoldings(inputRows);
  const active=rows.filter(r=>r.amount>0);
  const total=active.reduce((a,b)=>a+b.amount,0);
  if(!Number.isFinite(total))throw Error('Portfolio total exceeds supported numerical limits');
  const enriched=active.map(r=>({...r,sharePct:total?r.amount/total*100:0}));
  const dimensions={
    holdings:enriched.slice().sort((a,b)=>b.amount-a.amount||a.name.localeCompare(b.name)),
    managers:aggregate(active,'manager',total),
    banks:aggregate(active,'bank',total),
    assetClasses:aggregate(active,'assetClass',total),
    currencies:aggregate(active,'currency',total)
  };
  const sumSquares=total?enriched.reduce((s,r)=>s+Math.pow(r.sharePct/100,2),0):0;
  const effectiveHoldingCount=sumSquares>0?1/sumSquares:0;
  const incomplete=active.filter(r=>!r.manager||!r.bank||!r.assetClass||!r.currency);
  const observations=[];
  if(total===0)observations.push('No portfolio composition entered.');
  if(incomplete.length)observations.push(incomplete.length+' funded holding(s) have missing manager, bank/custodian, asset-class or currency labels.');
  if(largest(dimensions.holdings)?.sharePct>=50)observations.push('One holding represents at least 50% of entered liquid capital.');
  if(largest(dimensions.managers)?.sharePct>=50)observations.push('One manager represents at least 50% of entered liquid capital.');
  if(largest(dimensions.banks)?.sharePct>=50)observations.push('One bank/custodian represents at least 50% of entered liquid capital.');
  if(largest(dimensions.assetClasses)?.sharePct>=75)observations.push('One asset class represents at least 75% of entered liquid capital.');
  if(largest(dimensions.currencies)?.sharePct>=90)observations.push('One currency represents at least 90% of entered liquid capital.');
  return {
    rows,enriched,total,activeCount:active.length,effectiveHoldingCount,
    dimensions,
    largestHolding:largest(dimensions.holdings),
    largestManager:largest(dimensions.managers),
    largestBank:largest(dimensions.banks),
    largestAssetClass:largest(dimensions.assetClasses),
    largestCurrency:largest(dimensions.currencies),
    incompleteCount:incomplete.length,
    observations,
    approved:false,tradeEligible:false,
    methodology:'Concentration visibility only. Threshold observations are descriptive research flags, not investment standards or approvals.'
  };
}

const api={SLOT_COUNT,emptyHolding,validateHoldings,aggregate,calculate};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.WealthOSFamilyPortfolioV10=api;
if(!root.document)return;

const doc=root.document,$=id=>doc.getElementById(id);
if(!$('familyPortfolioPanel'))return;

const money=v=>Number.isFinite(v)?'M'+Math.round(v).toLocaleString('en-US'):'—';
const pct=v=>Number.isFinite(v)?v.toFixed(2)+'%':'—';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function id(field,i){return 'fp_'+field+'_'+i;}
function rowTemplate(i){
  return '<tr>'+
    '<td><input class="input" id="'+id('name',i)+'" placeholder="Holding '+(i+1)+'" maxlength="80"></td>'+
    '<td><input class="input" id="'+id('amount',i)+'" type="number" min="0" step="any" value="0"></td>'+
    '<td><input class="input" id="'+id('manager',i)+'" placeholder="Fund / asset manager" maxlength="80"></td>'+
    '<td><input class="input" id="'+id('bank',i)+'" placeholder="Bank / custodian" maxlength="80"></td>'+
    '<td><input class="input" id="'+id('assetClass',i)+'" placeholder="Income / equity / cash..." maxlength="80"></td>'+
    '<td><input class="input" id="'+id('currency',i)+'" placeholder="LSL / ZAR / USD..." maxlength="24"></td>'+
  '</tr>';
}
$('fp_rows').innerHTML=Array.from({length:SLOT_COUNT},(_,i)=>rowTemplate(i)).join('');

function read(){
  return Array.from({length:SLOT_COUNT},(_,i)=>({
    name:$(id('name',i)).value,
    amount:Number($(id('amount',i)).value),
    manager:$(id('manager',i)).value,
    bank:$(id('bank',i)).value,
    assetClass:$(id('assetClass',i)).value,
    currency:$(id('currency',i)).value
  }));
}
function summaryCell(x){return x?esc(x.label||x.name)+' · '+pct(x.sharePct):'—';}
function render(){
  try{
    const r=calculate(read());
    $('fp_error').textContent='';
    $('fp_total').textContent=money(r.total);
    $('fp_count').textContent=String(r.activeCount);
    $('fp_effective').textContent=r.effectiveHoldingCount?r.effectiveHoldingCount.toFixed(2):'—';
    $('fp_holding').textContent=summaryCell(r.largestHolding);
    $('fp_manager').textContent=summaryCell(r.largestManager);
    $('fp_bank').textContent=summaryCell(r.largestBank);
    $('fp_assetClass').textContent=summaryCell(r.largestAssetClass);
    $('fp_currency').textContent=summaryCell(r.largestCurrency);
    $('fp_notes').textContent=r.observations.join(' ')||'No descriptive concentration flag triggered by the current entries. This is not an approval.';
    $('fp_status').textContent='VISIBILITY ONLY · NOT APPROVED · LIVE CAPITAL LOCKED';
    api.getLiveSnapshot=()=>({total:r.total,activeCount:r.activeCount,rows:r.enriched.map(x=>({...x})),dimensions:r.dimensions});
  }catch(e){
    for(const k of ['total','count','effective','holding','manager','bank','assetClass','currency'])$('fp_'+k).textContent='—';
    $('fp_notes').textContent='';$('fp_error').textContent=e.message;$('fp_status').textContent='NOT APPROVED';
    api.getLiveSnapshot=()=>null;
  }
}
for(let i=0;i<SLOT_COUNT;i++)for(const field of ['name','amount','manager','bank','assetClass','currency'])
  $(id(field,i)).addEventListener('input',render);

$('fp_useTotal').addEventListener('click',()=>{
  try{
    const snap=api.getLiveSnapshot?.();
    if(!snap||snap.total<=0)throw Error('Enter at least one funded holding before using the portfolio total.');
    const target=$('fc_currentCapital');
    if(!target)throw Error('Permanent Family Capital v0.9 input is unavailable.');
    target.value=String(snap.total);
    if(typeof Event!=='undefined')target.dispatchEvent(new Event('input',{bubbles:true}));
    else if(typeof target.input==='function')target.input();
    $('fp_transferNote').textContent='Portfolio total copied locally into the v0.9 qualifying-liquid-capital input. No database write and no certification.';
  }catch(e){$('fp_transferNote').textContent=e.message;}
});
$('fp_clear').addEventListener('click',()=>{
  for(let i=0;i<SLOT_COUNT;i++){
    $(id('name',i)).value='';$(id('amount',i)).value='0';$(id('manager',i)).value='';
    $(id('bank',i)).value='';$(id('assetClass',i)).value='';$(id('currency',i)).value='';
  }
  $('fp_transferNote').textContent='';render();
});
render();
})(typeof window!=='undefined'?window:globalThis);
