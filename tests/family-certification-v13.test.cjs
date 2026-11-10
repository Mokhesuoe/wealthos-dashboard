// WealthOS Family Capital Certification v0.13 acceptance tests. Node.js stdlib only.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const model=require('../family-certification-v13.js');
const html=fs.readFileSync('index.html','utf8');
const source=fs.readFileSync('family-certification-v13.js','utf8');

function complete(overrides={}){
  return {
    qualifyingCapital:150_000_000,
    ownershipEvidence:true,taxEvidence:true,feeEvidence:true,incomeTotalReturnEvidence:true,counterpartyEvidence:true,
    concentrationModule:true,governanceModule:true,
    concentrationReview:true,withdrawalPolicyReview:true,sequenceStressReview:true,rebalancingReview:true,leverageReview:true,successionReview:true,
    authenticatedUAT:false,humanSignoffRef:'',
    ...overrides
  };
}

let r=model.evaluate(complete());
assert.equal(r.softwareEvidenceReady,true);
assert.equal(r.state,'SOFTWARE EVIDENCE READY · PHYSICAL UAT REQUIRED');
assert.equal(r.certified,false);
assert.equal(r.liveCapitalAuthorized,false);
assert(r.blockers.includes('AUTHENTICATED_MULTI_DEVICE_UAT_REQUIRED'));

r=model.evaluate(complete({authenticatedUAT:true}));
assert.equal(r.state,'READY FOR HUMAN GOVERNANCE SIGN-OFF');
assert(r.blockers.includes('HUMAN_GOVERNANCE_SIGNOFF_REQUIRED'));

r=model.evaluate(complete({authenticatedUAT:true,humanSignoffRef:'Signed pack ref'}));
assert.equal(r.state,'SIGN-OFF REFERENCE RECORDED · INDEPENDENT VERIFICATION REQUIRED');
assert.equal(r.certified,false);
assert(r.blockers.includes('HUMAN_SIGNOFF_INDEPENDENT_VERIFICATION_REQUIRED'));

r=model.evaluate(complete({taxEvidence:false}));
assert.equal(r.softwareEvidenceReady,false);
assert.equal(r.state,'EVIDENCE INCOMPLETE');
assert(r.blockers.includes('TAXEVIDENCE_INCOMPLETE'));

r=model.evaluate(complete({qualifyingCapital:50_000_000}));
assert.equal(r.stage,'ACCUMULATION');
assert(r.blockers.includes('BELOW_FREEDOM_FLOOR'));

assert.throws(()=>model.evaluate(complete({qualifyingCapital:-1})));
assert.throws(()=>model.evaluate(complete({qualifyingCapital:Infinity})));

assert.match(html,/id="familyCertificationPanel"/);
assert.match(html,/family-certification-v13\.js\?v=13/);
for(const id of ['cert_refresh','cert_export','cert_capital','cert_stage','cert_software','cert_state','cert_blockers','cert_rows','cert_final','cert_authenticatedUAT','cert_humanSignoffRef'])
  assert(html.includes('id="'+id+'"'),id+' missing');
assert(html.indexOf('id="familyCertificationPanel"')>html.indexOf('id="familyGovernancePanel"'));
assert(html.indexOf('id="familyCertificationPanel"')<html.indexOf('<h2>Governance state'));
assert.match(html,/LIVE CAPITAL LOCKED/);
new vm.Script(source,{filename:'family-certification-v13.js'});
console.log('PASS v0.13 certification readiness, physical UAT boundary and static integration');
