/* WealthOS v0.6 horizon-registry presentation v0.1.
 * Read-only governance presentation. It never enables model fitting, forward
 * testing, strategy promotion, trading, or capital release.
 */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.WealthOSHorizonRegistryV01=api;
})(typeof window!=='undefined'?window:
   typeof globalThis!=='undefined'?globalThis:null,function(){
  'use strict';

  const REQUIRED=[1,7,30,90];

  function present({rows,queryError=false}={}){
    const disclaimer='RESEARCH MODEL CONTRACTS ONLY · LIVE CAPITAL LOCKED';
    if(queryError)return Object.freeze({
      modelState:'REGISTRY QUERY ERROR',modelClass:'value red',
      modelMeta:'Cannot verify v0.6 horizon-model governance. '+disclaimer,
      forwardState:'AUTHORITY UNVERIFIED',forwardClass:'value red',
      forwardMeta:'Fail closed until registry access is restored. '+disclaimer
    });
    if(!Array.isArray(rows))return Object.freeze({
      modelState:'REGISTRY UNAVAILABLE',modelClass:'value red',
      modelMeta:'No usable v0.6 registry data. '+disclaimer,
      forwardState:'FORWARD TEST LOCKED',forwardClass:'value green',
      forwardMeta:'No model fitting or forecast generation is authorized. '+disclaimer
    });

    const byHorizon=new Map();
    const reasons=[];
    for(const row of rows){
      const h=Number(row?.horizon_days);
      if(!REQUIRED.includes(h)){reasons.push('unexpected horizon '+String(row?.horizon_days));continue}
      if(byHorizon.has(h)){reasons.push('duplicate '+h+'d registry row');continue}
      byHorizon.set(h,row);
    }
    const missing=REQUIRED.filter(h=>!byHorizon.has(h));
    if(missing.length)reasons.push('missing '+missing.map(h=>h+'d').join(', '));

    let approved=0;
    let breach=false;
    const horizonStates=[];
    for(const h of REQUIRED){
      const row=byHorizon.get(h);
      if(!row)continue;
      const status=String(row.specification_status||'unknown').replaceAll('_',' ').toUpperCase();
      horizonStates.push(h+'d '+status);
      if(row.specification_status==='approved_for_forward_test')approved++;
      for(const field of ['forward_test_enabled','model_validated','promotion_eligible','trade_eligible']){
        if(row[field]!==false){breach=true;reasons.push(h+'d unexpected '+field)}
      }
      const g=row.governance;
      if(!g||g.decision_cadence!=='once_per_completed_regular_session')
        reasons.push(h+'d decision cadence unverified');
      if(!g||g.intraday_repeated_forecasts_permitted!==false)
        reasons.push(h+'d intraday-repeat lock unverified');
    }

    const structuralIssue=missing.length||rows.length!==4||reasons.some(x=>/unexpected|duplicate|unverified/.test(x));
    let modelState=approved+' / 4 SPECS APPROVED';
    let modelClass='value amber';
    if(structuralIssue){modelState='REGISTRY CONTROL ISSUE';modelClass='value red'}
    if(breach){modelState='REGISTRY CONTROL BREACH';modelClass='value red'}

    return Object.freeze({
      modelState,modelClass,
      modelMeta:(horizonStates.join(' · ')||'No horizon rows')+
        (reasons.length?' · Review: '+reasons.join(' | '):'')+
        ' · Completed-session daily targets · '+disclaimer,
      forwardState:breach?'FORWARD TEST CONTROL BREACH':'FORWARD TEST LOCKED',
      forwardClass:breach?'value red':'value green',
      forwardMeta:'Model fit: NOT AUTHORIZED · Forecast generation: NOT AUTHORIZED · Promotion: false · Trade eligibility: false · '+disclaimer
    });
  }

  return Object.freeze({present});
});
