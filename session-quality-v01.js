/* WealthOS session-quality presentation v0.1.
 * The currently queried research_session_quality_runs table contains intraday
 * snapshots, NOT independently certified end-of-session acceptance receipts.
 * Presentation must never promote an intraday PASS into a final-session PASS.
 * Pure source-only module; no database writes, broker actions or credentials.
 */
(function(root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.WealthOSSessionQualityV01 = api;
})(typeof window !== 'undefined' ? window
   : typeof globalThis !== 'undefined' ? globalThis : null, function() {
  'use strict';

  function formatCount(value) {
    return Number.isInteger(value) && value >= 0 ? String(value) : '?';
  }

  function statusCode(value) {
    const code = String(value || '').toLowerCase();
    return code === 'passed' || code === 'failed' ? code.toUpperCase() : 'UNKNOWN';
  }

  function sessionDayFromTimestamp(value) {
    if (typeof value !== 'string' || !value) return null;
    const d = new Date(value);
    if (!Number.isFinite(d.getTime())) return null;
    const dateParts = Object.fromEntries(
      new Intl.DateTimeFormat('en-US', {
        timeZone:'America/New_York',
        year:'numeric', month:'2-digit', day:'2-digit'
      }).formatToParts(d).filter(p => p.type !== 'literal')
       .map(p => [p.type, p.value])
    );
    return dateParts.year + '-' + dateParts.month + '-' + dateParts.day;
  }

  function present({record, queryError=false, todayNY=null, timestampLabel=null}={}) {
    const disclaimer = 'FINAL SESSION NOT CERTIFIED · intraday research only · not investment approval';
    if (queryError) return {
      state:'QUERY ERROR', className:'value red',
      meta:'Session-quality data unavailable. ' + disclaimer
    };
    if (!record || typeof record !== 'object') return {
      state:'NO VISIBLE INTRADAY CHECK', className:'value amber',
      meta:'No permitted session-quality row visible. ' + disclaimer
    };
    const isToday = todayNY === record.session_date;
    const dateOfEvaluation = sessionDayFromTimestamp(record.evaluated_at);
    const reasons = Array.isArray(record.reasons)
      ? record.reasons.filter(x => typeof x === 'string').slice(0, 12)
      : [];
    const fields = [
      formatCount(record.feature_count) + '/3 features',
      formatCount(record.valuation_count) + '/3 valuations',
      formatCount(record.card_count) + '/3 cards',
      String(record.session_date || 'date unknown'),
      String(timestampLabel || record.evaluated_at || 'timestamp unavailable')
    ];
    if (reasons.length) fields.push('Reasons: ' + reasons.join(', '));

    let state = (isToday ? 'INTRADAY ' : 'HISTORICAL INTRADAY ')
       + statusCode(record.status);
    let className = statusCode(record.status) === 'FAILED' && isToday
      ? 'value red' : 'value amber';
    if (!dateOfEvaluation || dateOfEvaluation !== record.session_date) {
      state = 'SESSION DATE / TIME UNVERIFIED';
      className = 'value red';
      fields.push('Evaluation timestamp does not match declared NY session');
    }
    if (record.trade_eligible !== false) {
      state = record.trade_eligible === true
        ? 'UNEXPECTED TRADE ELIGIBILITY' : 'TRADE LOCK UNVERIFIED';
      className = 'value red';
      fields.push('Manual security review required: trade eligibility must be explicitly false');
    }
    return {
      state, className, meta: fields.join(' · ') + ' · ' + disclaimer
    };
  }

  return Object.freeze({present, sessionDayFromTimestamp});
});
