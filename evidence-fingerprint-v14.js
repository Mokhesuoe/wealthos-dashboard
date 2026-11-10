/* WealthOS Evidence Fingerprint Manifest v0.14 — local SHA-256 only; no uploads. */
(function(root){
'use strict';

const CATEGORIES=Object.freeze([
  'ownership_balance','tax','fee','income_total_return','counterparty_custodian',
  'leverage','succession_continuity','authenticated_uat','human_signoff','other'
]);

function bytesToHex(buffer){
  return [...new Uint8Array(buffer)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

async function sha256HexFromBytes(bytes,cryptoLike){
  const c=cryptoLike||root.crypto;
  if(!c?.subtle?.digest)throw Error('WebCrypto SHA-256 is unavailable in this browser');
  const data=bytes instanceof ArrayBuffer?bytes:bytes.buffer?.slice(bytes.byteOffset||0,(bytes.byteOffset||0)+(bytes.byteLength||bytes.length||0));
  if(!(data instanceof ArrayBuffer))throw Error('Hash input must be byte data');
  return bytesToHex(await c.subtle.digest('SHA-256',data));
}

function cleanText(v,max=220){return String(v??'').trim().slice(0,max);}
function normalizeRecord(record){
  const r={
    category:cleanText(record?.category,64),
    fileName:cleanText(record?.fileName,220),
    size:Number(record?.size),
    lastModified:Number(record?.lastModified),
    sha256:cleanText(record?.sha256,64).toLowerCase()
  };
  if(!CATEGORIES.includes(r.category))throw Error('Invalid evidence category');
  if(!r.fileName)throw Error('Evidence filename is required');
  if(!Number.isFinite(r.size)||r.size<0)throw Error('Evidence file size must be a nonnegative finite number');
  if(!Number.isFinite(r.lastModified)||r.lastModified<0)throw Error('Evidence lastModified must be nonnegative');
  if(!/^[a-f0-9]{64}$/.test(r.sha256))throw Error('Evidence SHA-256 digest must contain 64 hexadecimal characters');
  return r;
}

function buildManifest(records,generatedAt=new Date().toISOString()){
  if(!Array.isArray(records))throw Error('Evidence records must be an array');
  const normalized=records.map(normalizeRecord);
  const byDigest=new Map();
  for(const r of normalized)byDigest.set(r.sha256,(byDigest.get(r.sha256)||0)+1);
  const duplicates=[...byDigest.entries()].filter(([,count])=>count>1).map(([sha256,count])=>({sha256,count}));
  const categoryCounts=Object.fromEntries(CATEGORIES.map(c=>[c,normalized.filter(r=>r.category===c).length]));
  return {
    schema:'wealthos_evidence_fingerprint_manifest_v0.14',
    generatedAt:String(generatedAt),
    records:normalized,
    recordCount:normalized.length,
    categoryCounts,
    duplicates,
    hasDuplicates:duplicates.length>0,
    filesUploaded:false,
    documentContentsVerified:false,
    certified:false,
    methodology:'SHA-256 fingerprints and local file metadata only. Private file bytes are not uploaded or persisted by this module. A digest proves file identity, not truth or legal validity of its contents.'
  };
}

const api={CATEGORIES,bytesToHex,sha256HexFromBytes,normalizeRecord,buildManifest};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.WealthOSEvidenceFingerprintV14=api;
if(!root.document)return;

const doc=root.document,$=id=>doc.getElementById(id);
if(!$('evidenceFingerprintPanel'))return;
let records=[];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const size=v=>v<1024?v+' B':v<1024*1024?(v/1024).toFixed(1)+' KB':(v/1024/1024).toFixed(2)+' MB';

function render(){
  try{
    const m=buildManifest(records);api.getLiveSnapshot=()=>JSON.parse(JSON.stringify(m));
    $('ef_count').textContent=String(m.recordCount);
    $('ef_duplicates').textContent=m.hasDuplicates?String(m.duplicates.length):'0';
    $('ef_status').textContent=m.recordCount?'LOCAL FINGERPRINTS RECORDED · CONTENTS NOT VERIFIED':'AWAITING LOCAL FILE SELECTION';
    $('ef_rows').innerHTML=m.records.map((r,i)=>'<tr><td>'+esc(r.category)+'</td><td>'+esc(r.fileName)+'</td><td>'+size(r.size)+'</td><td>'+new Date(r.lastModified).toLocaleString()+'</td><td><code>'+r.sha256.slice(0,16)+'…'+r.sha256.slice(-12)+'</code></td><td><button class="btn" type="button" data-ef-remove="'+i+'">Remove</button></td></tr>').join('');
    for(const b of doc.querySelectorAll('[data-ef-remove]'))b.addEventListener('click',()=>{records.splice(Number(b.dataset.efRemove),1);render();});
    $('ef_error').textContent='';
  }catch(e){api.getLiveSnapshot=()=>null;$('ef_error').textContent=e.message;$('ef_status').textContent='INVALID MANIFEST';}
}

$('ef_hash').addEventListener('click',async()=>{
  const files=[...($('ef_files').files||[])],category=$('ef_category').value;
  if(!files.length){$('ef_error').textContent='Choose one or more local evidence files first.';return;}
  $('ef_error').textContent='';$('ef_progress').textContent='Hashing locally…';
  try{
    for(const file of files){
      const bytes=await file.arrayBuffer();
      const digest=await sha256HexFromBytes(bytes,root.crypto);
      records.push(normalizeRecord({category,fileName:file.name,size:file.size,lastModified:file.lastModified,sha256:digest}));
    }
    $('ef_files').value='';$('ef_progress').textContent='Fingerprinting complete. File contents were not uploaded.';render();
  }catch(e){$('ef_progress').textContent='';$('ef_error').textContent=e.message;}
});
$('ef_clear').addEventListener('click',()=>{records=[];$('ef_files').value='';$('ef_progress').textContent='';render();});
$('ef_export').addEventListener('click',()=>{
  const manifest=buildManifest(records);
  const url=URL.createObjectURL(new Blob([JSON.stringify(manifest,null,2)],{type:'application/json'}));
  const a=doc.createElement('a');a.href=url;a.download='WealthOS_Evidence_Fingerprint_Manifest.json';a.click();root.setTimeout(()=>URL.revokeObjectURL(url),1000);
});
render();
})(typeof window!=='undefined'?window:globalThis);
