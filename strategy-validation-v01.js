/* WealthOS strategy-validation presentation v0.1.
 * Displays evidence maturity only. It never converts research evidence into
 * strategy approval, trade eligibility, live execution or capital release.
 */
(function(root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.WealthOSStrategyValidationV01 = api;
})(typeof window !== 'undefined' ? window
   : typeof globalThis !== 'undefined' ? globalThis : null, function() {
  'use strict';

  function ints(values) {
    return [...new Set((values || []).map(Number).filter(v => Number.isInteger(v) && v > 0))]
      .sort((a,b)=>a-b);
  }

  function count(v) {
    return Number.isInteger(v) && v >= 0 ? v : null;
  }

  function present({
    record,
    recordQueryError=false,
    forecastHorizons=[],
    scoredOutcomeHorizons=[],
    horizonQueryError=false
  }={}) {
    const disclaimer='RESEARCH VALIDATION ONLY · PROMOTION NOT APPROVED · LIVE CAPITAL LOCKED';

    let validationState='NO VISIBLE VALIDATION RUN';
    let validationClass='value amber';
    let validationMeta='No permitted strategy-validation row visible. '+disclaimer;

    if (recordQueryError) {
      validationState='VALIDATION QUERY ERROR';
      validationClass='value red';
      validationMeta='Strategy-validation readiness is unavailable. '+disclaimer;
    } else if (record && typeof record === 'object') {
      const sessions=count(record.distinct_decision_sessions);
      const required=count(record.required_forward_sessions);
      const horizons=count(record.scored_horizon_count);
      const blockers=Array.isArray(record.blockers)
        ? record.blockers.filter(x=>typeof x==='string').slice(0,8)
        : [];
      validationState=(sessions==null||required==null)
        ? 'READINESS UNVERIFIED'
        : sessions+' / '+required+' SESSIONS';
      validationClass='value amber';
      const meta=[
        'Status '+String(record.status||'unknown').toUpperCase(),
        (horizons==null?'?':horizons)+' / 4 scored horizons',
        'benchmark '+String(record.benchmark_gate||'unknown'),
        'OOS '+String(record.out_of_sample_gate||'unknown'),
        'cost stress '+String(record.cost_stress_gate||'unknown'),
        'promotion '+String(record.promotion_eligible)
      ];
      if (blockers.length) meta.push('Blockers: '+blockers.join(' | '));
      validationMeta=meta.join(' · ')+' · '+disclaimer;

      if (record.trade_eligible !== false || record.promotion_eligible !== false) {
        validationState='VALIDATION CONTROL BREACH';
        validationClass='value red';
        validationMeta+=' · Expected trade_eligible=false and promotion_eligible=false';
      }
    }

    let horizonState='HORIZON EVIDENCE UNAVAILABLE';
    let horizonClass='value amber';
    let horizonMeta='Forecast/outcome horizon relationship not established. '+disclaimer;

    if (horizonQueryError) {
      horizonState='HORIZON QUERY ERROR';
      horizonClass='value red';
      horizonMeta='Cannot verify forecast/outcome horizon alignment. '+disclaimer;
    } else {
      const forecasts=ints(forecastHorizons);
      const outcomes=ints(scoredOutcomeHorizons);
      const overlap=forecasts.filter(v=>outcomes.includes(v));
      const fmt=a=>a.length?a.map(v=>v+'d').join(', '):'none';

      if (!forecasts.length || !outcomes.length) {
        horizonState='HORIZON EVIDENCE INCOMPLETE';
        horizonClass='value amber';
      } else if (!overlap.length) {
        horizonState='HORIZON MISMATCH';
        horizonClass='value red';
      } else if (overlap.length < outcomes.length || overlap.length < forecasts.length) {
        horizonState='PARTIAL HORIZON ALIGNMENT';
        horizonClass='value amber';
      } else {
        horizonState='HORIZONS ALIGNED';
        horizonClass='value green';
      }

      horizonMeta='Forecast horizons: '+fmt(forecasts)+
        ' · Scored outcome horizons: '+fmt(outcomes)+
        ' · Exact overlap: '+fmt(overlap)+
        ' · No cross-horizon substitution permitted · '+disclaimer;
    }

    return Object.freeze({
      validationState, validationClass, validationMeta,
      horizonState, horizonClass, horizonMeta
    });
  }

  return Object.freeze({present});
});
