// WealthOS Evidence Fingerprint Manifest v0.14 acceptance tests. Node.js stdlib only.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const model=require('../evidence-fingerprint-v14.js');
const html=fs.readFileSync('index.html','utf8');
const source=fs.readFileSync('evidence-fingerprint-v14.js','utf8');

(async()=>{
  const bytes=new TextEncoder().encode('abc');
  const digest=await model.sha256HexFromBytes(bytes,webcrypto);
  assert.equal(digest,'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');

  const r=model.normalizeRecord({category:'tax',fileName:'tax.pdf',size:123,lastModified:1,sha256:digest});
  assert.equal(r.category,'tax');
  assert.equal(r.fileName,'tax.pdf');

  const m=model.buildManifest([r,{...r,category:'fee',fileName:'fee.pdf'}],'2026-11-10T00:00:00Z');
  assert.equal(m.recordCount,2);
  assert.equal(m.categoryCounts.tax,1);
  assert.equal(m.categoryCounts.fee,1);
  assert.equal(m.hasDuplicates,true);
  assert.equal(m.duplicates[0].count,2);
  assert.equal(m.filesUploaded,false);
  assert.equal(m.documentContentsVerified,false);
  assert.equal(m.certified,false);

  assert.throws(()=>model.normalizeRecord({category:'bad',fileName:'x',size:1,lastModified:1,sha256:digest}));
  assert.throws(()=>model.normalizeRecord({category:'tax',fileName:'',size:1,lastModified:1,sha256:digest}));
  assert.throws(()=>model.normalizeRecord({category:'tax',fileName:'x',size:-1,lastModified:1,sha256:digest}));
  assert.throws(()=>model.normalizeRecord({category:'tax',fileName:'x',size:1,lastModified:1,sha256:'abc'}));

  assert.match(html,/id="evidenceFingerprintPanel"/);
  assert.match(html,/evidence-fingerprint-v14\.js\?v=14/);
  for(const id of ['ef_files','ef_category','ef_hash','ef_clear','ef_export','ef_count','ef_duplicates','ef_status','ef_rows'])
    assert(html.includes('id="'+id+'"'),id+' missing');
  assert(html.indexOf('id="evidenceFingerprintPanel"')>html.indexOf('id="familyCertificationPanel"'));
  assert(html.indexOf('id="evidenceFingerprintPanel"')<html.indexOf('<h2>Governance state'));
  assert.match(html,/LIVE CAPITAL LOCKED/);
  new vm.Script(source,{filename:'evidence-fingerprint-v14.js'});
  console.log('PASS v0.14 SHA-256, manifest integrity, duplicate detection and static integration');
})().catch(e=>{console.error(e);process.exit(1);});
