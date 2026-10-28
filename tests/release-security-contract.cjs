// Security and release contract for the browser-delivered WealthOS modules.
// Dependency-free checks; does not replace an authenticated end-to-end test.
'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const files=['index.html','capital-v05.js','capital-creation-v06.js','capital-evidence-v07.js','capital-allocation-v08.js','session-quality-v01.js'];
const sources=Object.fromEntries(files.map(f=>[f,fs.readFileSync(f,'utf8')]));
const html=sources['index.html'];
for(const file of files){
 const src=sources[file];
 assert(src.length>100, file+' must not be empty');
 assert(!/sb_secret_|service_role|SUPABASE_SERVICE_ROLE_KEY|BEGIN (?:RSA |OPENSSH )?PRIVATE KEY/i.test(src),file+' contains forbidden privileged material');
}
for(const f of files.slice(1))assert(html.includes('./'+f+'?v='),f+' must be loaded by the dashboard');
assert.match(html, /if\(aal\.currentLevel!=='aal2'\)/, 'MFA AAL2 gate must be unconditional');
assert.match(html, /if\(!m\?\.active\)/, 'membership must be mandatory');
assert.match(html, /id="appPanel" class="hidden"/, 'research shell must not be visible before authorisation');
assert.match(html, /LIVE CAPITAL LOCKED/, 'no live capital claims');
assert.match(html, /trade_eligible=false/, 'research-only content');
assert(!/supabase\.from\(['"](?:trade_orders|live_orders|broker_orders)['"]\)\.insert\(/i.test(files.map(f=>sources[f]).join('\n')), 'no live-order insert in browser bundle');
for(const id of ['capitalPanel','creationStudio','allocationPanel','cap5_error','create_error','alloc_error']){
 assert(html.includes('id="'+id+'"'),id+' missing from dashboard');
}
console.log('PASS security contract: MFA, membership, all five modules, browser secrets and live lock');
