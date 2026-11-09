const assert=require('node:assert/strict');
const p=require('../horizon-registry-v01.js');

function rows(){
  return [1,7,30,90].map(h=>({
    model_family:'expected_return_multi_horizon_v0.6',
    model_version:'expected_return_'+h+'d_v0.6',
    horizon_days:h,
    specification_status:'specification_required',
    validation_status:'not_eligible',
    forward_test_enabled:false,
    model_validated:false,
    promotion_eligible:false,
    trade_eligible:false,
    governance:{
      decision_cadence:'once_per_completed_regular_session',
      intraday_repeated_forecasts_permitted:false
    }
  }));
}

{
  const x=p.present({rows:rows()});
  assert.equal(x.modelState,'0 / 4 SPECS APPROVED');
  assert.equal(x.modelClass,'value amber');
  assert.equal(x.forwardState,'FORWARD TEST LOCKED');
  assert.equal(x.forwardClass,'value green');
  assert.match(x.modelMeta,/1d SPECIFICATION REQUIRED/);
  assert.match(x.modelMeta,/90d SPECIFICATION REQUIRED/);
  assert.match(x.modelMeta,/Completed-session daily targets/);
  assert.match(x.forwardMeta,/Model fit: NOT AUTHORIZED/);
  assert.match(x.forwardMeta,/LIVE CAPITAL LOCKED/);
}

{
  const data=rows();
  data[0].forward_test_enabled=true;
  const x=p.present({rows:data});
  assert.equal(x.modelState,'REGISTRY CONTROL BREACH');
  assert.equal(x.forwardState,'FORWARD TEST CONTROL BREACH');
  assert.equal(x.forwardClass,'value red');
}

{
  const data=rows().slice(0,3);
  const x=p.present({rows:data});
  assert.equal(x.modelState,'REGISTRY CONTROL ISSUE');
  assert.equal(x.forwardState,'FORWARD TEST LOCKED');
  assert.match(x.modelMeta,/missing 90d/);
}

{
  const x=p.present({rows:null,queryError:true});
  assert.equal(x.modelState,'REGISTRY QUERY ERROR');
  assert.equal(x.forwardState,'AUTHORITY UNVERIFIED');
  assert.equal(x.modelClass,'value red');
}

console.log('PASS v0.6 horizon registry presenter');
