// WealthOS dashboard: intraday research quality must never imply final market close.
const assert = require('node:assert/strict');
const view = require('../session-quality-v01.js');

const current = {
  evaluated_at:'2026-10-27T16:30:00Z',
  session_date:'2026-10-27',
  status:'passed',
  feature_count:3,valuation_count:3,card_count:3,
  reasons:[],trade_eligible:false
};

function present(record,opts={}) {
  return view.present({record,todayNY:'2026-10-27',...opts});
}

{
  const r=present(current);
  assert.equal(r.state,'INTRADAY PASSED');
  assert.equal(r.className,'value amber');
  assert.match(r.meta,/3\/3 features.*3\/3 valuations.*3\/3 cards/);
  assert.match(r.meta,/FINAL SESSION NOT CERTIFIED/);
  assert.match(r.meta,/not investment approval/);
  assert.doesNotMatch(r.state,/\bFINAL PASSED\b/);
  console.log('PASS current intraday PASS is not final');
}
{
  const r=present({...current,evaluated_at:'2026-10-26T16:30:00Z',
                   session_date:'2026-10-26'});
  assert.equal(r.state,'HISTORICAL INTRADAY PASSED');
  assert.match(r.meta,/FINAL SESSION NOT CERTIFIED/);
  console.log('PASS historical intraday PASS is not current');
}
{
  const r=present({...current,status:'failed',reasons:['STALE_QUOTES']});
  assert.equal(r.state,'INTRADAY FAILED');
  assert.equal(r.className,'value red');
  assert.match(r.meta,/STALE_QUOTES/);
}
{
  const r=present(null);
  assert.equal(r.state,'NO VISIBLE INTRADAY CHECK');
  assert.match(r.meta,/FINAL SESSION NOT CERTIFIED/);
}
{
  const r=present(current,{queryError:true});
  assert.equal(r.state,'QUERY ERROR');
  assert.equal(r.className,'value red');
  assert.match(r.meta,/unavailable/);
}
{
  const r=present({...current,trade_eligible:true});
  assert.equal(r.state,'UNEXPECTED TRADE ELIGIBILITY');
  assert.equal(r.className,'value red');
  assert.match(r.meta,/trade eligibility must be explicitly false/);
}
{
  const r=present({...current,trade_eligible:null});
  assert.equal(r.state,'TRADE LOCK UNVERIFIED');
  assert.equal(r.className,'value red');
}
{
  const r=present({...current,evaluated_at:'2026-10-26T16:30:00Z'});
  assert.equal(r.state,'SESSION DATE / TIME UNVERIFIED');
  assert.equal(r.className,'value red');
}
{
  const r=present({...current,evaluated_at:null});
  assert.equal(r.state,'SESSION DATE / TIME UNVERIFIED');
}
{
  const r=present({...current,status:'something-new'});
  assert.equal(r.state,'INTRADAY UNKNOWN');
  assert.equal(r.className,'value amber');
}
{
  const r=present({...current,feature_count:null,valuation_count:-1,card_count:'3'});
  assert.match(r.meta,/\?\/3 features · \?\/3 valuations · \?\/3 cards/);
  console.log('PASS insufficient count evidence is not silently zero');
}
{
  assert.equal(view.sessionDayFromTimestamp('2026-10-27T16:30:00Z'),'2026-10-27');
  assert.equal(view.sessionDayFromTimestamp('2026-11-02T21:00:00Z'),'2026-11-02');
  assert.equal(view.sessionDayFromTimestamp('2026-11-02T03:00:00Z'),'2026-11-01');
  assert.equal(view.sessionDayFromTimestamp('malformed'),null);
  console.log('PASS New York timezone dates including DST change');
}
{
  const r=view.present();
  assert.equal(r.state,'NO VISIBLE INTRADAY CHECK');
  assert.match(r.meta,/NOT CERTIFIED/);
}
console.log('PASS all intraday-vs-final WealthOS status presentation checks');
