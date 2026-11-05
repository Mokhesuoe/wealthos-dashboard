const assert=require('node:assert/strict');
const p=require('../strategy-validation-v01.js');

{
  const x=p.present({
    record:{
      status:'collecting',distinct_decision_sessions:9,required_forward_sessions:60,
      scored_horizon_count:2,benchmark_gate:'BLOCKED',out_of_sample_gate:'BLOCKED',
      cost_stress_gate:'BLOCKED',promotion_eligible:false,trade_eligible:false,
      blockers:['INSUFFICIENT_FORWARD_SESSION_HISTORY']
    },
    forecastHorizons:[365],
    scoredOutcomeHorizons:[1,7]
  });
  assert.equal(x.validationState,'9 / 60 SESSIONS');
  assert.equal(x.horizonState,'HORIZON MISMATCH');
  assert.match(x.horizonMeta,/Forecast horizons: 365d/);
  assert.match(x.horizonMeta,/Scored outcome horizons: 1d, 7d/);
  assert.match(x.horizonMeta,/No cross-horizon substitution permitted/);
  assert.match(x.validationMeta,/LIVE CAPITAL LOCKED/);
}

{
  const x=p.present({
    record:{
      status:'blocked',distinct_decision_sessions:60,required_forward_sessions:60,
      scored_horizon_count:4,benchmark_gate:'EVIDENCE_READY',
      out_of_sample_gate:'EVIDENCE_READY',cost_stress_gate:'EVIDENCE_READY',
      promotion_eligible:false,trade_eligible:false,blockers:[]
    },
    forecastHorizons:[1,7,30,90],
    scoredOutcomeHorizons:[1,7,30,90]
  });
  assert.equal(x.horizonState,'HORIZONS ALIGNED');
  assert.equal(x.horizonClass,'value green');
  assert.equal(x.validationState,'60 / 60 SESSIONS');
  assert.match(x.validationMeta,/PROMOTION NOT APPROVED/);
}

{
  const x=p.present({
    record:{
      status:'passed',distinct_decision_sessions:60,required_forward_sessions:60,
      scored_horizon_count:4,benchmark_gate:'PASSED',out_of_sample_gate:'PASSED',
      cost_stress_gate:'PASSED',promotion_eligible:true,trade_eligible:false
    },
    forecastHorizons:[90],scoredOutcomeHorizons:[90]
  });
  assert.equal(x.validationState,'VALIDATION CONTROL BREACH');
  assert.equal(x.validationClass,'value red');
}

{
  const x=p.present({recordQueryError:true,horizonQueryError:true});
  assert.equal(x.validationState,'VALIDATION QUERY ERROR');
  assert.equal(x.horizonState,'HORIZON QUERY ERROR');
  assert.equal(x.validationClass,'value red');
  assert.equal(x.horizonClass,'value red');
}

{
  const x=p.present({record:null,forecastHorizons:[],scoredOutcomeHorizons:[1]});
  assert.equal(x.validationState,'NO VISIBLE VALIDATION RUN');
  assert.equal(x.horizonState,'HORIZON EVIDENCE INCOMPLETE');
}

console.log('PASS strategy validation readiness and horizon-integrity presenter');
