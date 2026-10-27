// WealthOS Evidence v0.7 regression and browser integration tests. Node.js stdlib only.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const model=require('../capital-evidence-v07.js');
const html=fs.readFileSync('index.html','utf8');
const source=fs.readFileSync('capital-evidence-v07.js','utf8');
assert.match(html,/id="evidencePanel"/);
assert.match(html,/capital-evidence-v07\.js\?v=07/);
assert(html.indexOf('id="evidencePanel"')>html.indexOf('id="appPanel"'));
assert(html.indexOf('id="evidencePanel"')<html.indexOf('<h2>Governance state'));
assert.match(html,/LIVE CAPITAL LOCKED/);
new vm.Script(source);
const now='2026-10-27';
let b=model.baseline({liquid:1000,businessEquity:2000,otherAssets:500,liabilities:400,liquidityReserve:200,asOf:'2026-10-26',sourceRef:'LedgerRef2026',declaration:true},now);
assert.equal(b.netWorth,3100);
assert.equal(b.available,800);
assert.equal(b.evidenced,true);
assert.equal(b.transferAllowed,true);
assert.equal(b.state,'USER ATTESTED — NOT INDEPENDENTLY VERIFIED');
assert.equal(model.baseline({liquid:1000,liquidityReserve:1200},now).available,0);
assert.equal(model.baseline({liquid:1000,liquidityReserve:1200,asOf:'2026-10-25',sourceRef:'LedgerRef2026',declaration:true},now).transferAllowed,false);
assert.equal(model.baseline({liquid:10,asOf:'2026-10-29',sourceRef:'LedgerRef2026',declaration:true},now).evidenced,false);
assert.equal(model.baseline({liquid:10,asOf:'2026-01-01',sourceRef:'LedgerRef2026',declaration:true},now).state,'USER ATTESTED — STALE RECORD');
assert.equal(model.baseline({liquid:10,asOf:'2026-01-01',sourceRef:'LedgerRef2026',declaration:true},now).transferAllowed,false,'Stale balances must not be copied to v0.5');
assert.equal(model.baseline({liquid:10,asOf:'2026-10-25',sourceRef:'',declaration:true},now).evidenced,false);
for(const invalid of [{liquid:-1},{businessEquity:Infinity},{liabilities:NaN},{otherAssets:1e308,liquid:1e308}])assert.throws(()=>model.baseline(invalid,now));
console.log('PASS evidence baseline arithmetic, dated attestations, liquidity reserve, overflow and unverifiable source flags');
const blank=model.blankEvidence();
let e=model.diligence(blank,now);
assert.equal(e.complete,false);
assert.equal(e.status,'NO SUFFICIENT EVIDENCE');
const full=model.blankEvidence();
for(const [k] of model.AXES)full[k]={status:'external_reported',reference:'Evidence-'+k,reviewDate:'2026-10-20'};
e=model.diligence(full,now);
assert.equal(e.complete,true);
assert.equal(e.independent,6);
assert.equal(e.approval,false);
full.legal.reference='';
e=model.diligence(full,now);
assert.equal(e.complete,false);
assert.equal(e.invalid,1);
full.legal.reference='Evidence-legal';full.taxfx.reviewDate='2024-02-01';
assert.equal(model.diligence(full,now).complete,false);
assert.throws(()=>model.diligence({...blank,customer:{status:'approved',reference:'fake',reviewDate:now}},now));
const p=model.portfolio([{name:'A',ownerCapital:1000},{name:'B',ownerCapital:2000},{name:'C',ownerCapital:3000}],[blank,blank,blank],b,now);
assert.equal(p.proposedCapital,6000);
assert.equal(p.fundingGap,5200);
assert.equal(p.portfolioApproved,false);
assert(p.items.every(item=>item.approved===false));
console.log('PASS six-axis evidence gate, stale references, no automated approvals and funding-gap comparison');
// Run actual browser controller in a detached mock DOM.
const fields=['liquid','businessEquity','otherAssets','liabilities','liquidityReserve','asOf','sourceRef'];
const keys=['evidencePanel',...fields.map(k=>'ev_'+k),'ev_declaration','ev_net','ev_available','ev_stage',
'ev_baselineError','ev_baselineNotes','ev_transfer','ev_transferNote',
'ev_portfolioRows','ev_commitments','ev_gap','ev_portfolioError','ev_diligenceStatus',
'ev_diligenceNotes','ev_selectedName','ev_refreshOpportunities','ev_op0','ev_op1','ev_op2',
'cap5_liquidStart','cap5_equityStart','cap5_debtStart',
...model.AXES.flatMap(([k])=>['ev_status_'+k,'ev_ref_'+k,'ev_date_'+k])];
const nodes={};
for(const id of keys)nodes[id]={value:'',textContent:'',innerHTML:'',className:'btn',checked:false,disabled:true,
 addEventListener(ev,fn){this[ev]=fn;},
 dispatchEvent(ev){this.lastEvent=ev.type;}};
for(const k of fields.slice(0,5))nodes['ev_'+k].value='0';
for(const [k] of model.AXES)nodes['ev_status_'+k].value='missing';
const sample=[{name:'Example <b>1</b>',ownerCapital:1500},{name:'Example 2',ownerCapital:500},{name:'Example 3',ownerCapital:0}];
const windowMock={document:{getElementById:id=>nodes[id]},setTimeout:()=>{},
 WealthOSCreationV06:{getOpportunityScenarios:()=>sample},
 WealthOSCapitalV05:{}};
const Event=function(type){this.type=type;};
vm.runInNewContext(source,{window:windowMock,Event,console,Date});
assert(nodes.ev_portfolioRows.innerHTML.includes('Example &lt;b&gt;1&lt;/b&gt;'),'Opportunity label HTML must be escaped');
assert.equal(nodes.ev_transfer.disabled,true);
nodes.ev_liquid.value='1000';nodes.ev_liquid.input();
nodes.ev_businessEquity.value='2000';nodes.ev_businessEquity.input();
nodes.ev_liabilities.value='400';nodes.ev_liabilities.input();
nodes.ev_liquidityReserve.value='200';nodes.ev_liquidityReserve.input();
nodes.ev_asOf.value=new Date().toISOString().slice(0,10);nodes.ev_asOf.input();
nodes.ev_sourceRef.value='LedgerSnapshotRef';nodes.ev_sourceRef.input();
nodes.ev_declaration.checked=true;nodes.ev_declaration.change();
assert.equal(nodes.ev_net.textContent,'M2,600');
assert.equal(nodes.ev_available.textContent,'M800');
assert.equal(nodes.ev_gap.textContent,'M1,200');
assert.equal(nodes.ev_transfer.disabled,false);
nodes.ev_transfer.click();
assert.equal(nodes.cap5_liquidStart.value,'1000');
assert.equal(nodes.cap5_equityStart.value,'2000');
assert.equal(nodes.cap5_debtStart.value,'400');
assert.equal(nodes.cap5_debtStart.lastEvent,'input');
for(const [k] of model.AXES){
 nodes['ev_status_'+k].value='external_reported';nodes['ev_status_'+k].input();
 nodes['ev_ref_'+k].value='SourceRef-'+k;nodes['ev_ref_'+k].input();
 nodes['ev_date_'+k].value=new Date().toISOString().slice(0,10);nodes['ev_date_'+k].input();
}
assert(nodes.ev_diligenceStatus.textContent.includes('HUMAN APPROVAL REQUIRED'));
assert(nodes.ev_portfolioRows.innerHTML.includes('<strong>NO</strong>'));
nodes.ev_op1.click();
assert.equal(nodes.ev_status_customer.value,'missing');
nodes.ev_op0.click();
assert.equal(nodes.ev_status_customer.value,'external_reported');
console.log('PASS browser controller, nonduplication, explicit transfer, safe rendering and independent opportunity diligence');
