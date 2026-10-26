// WealthOS dashboard release checks. Dependency-free Node.js tests.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const checks=[
['authenticated application shell',/id="appPanel" class="hidden"/],
['MFA challenge',/id="mfaChallengePanel"/],
['Capital Intelligence panel',/id="capitalPanel"/],
['research-only banner',/LIVE CAPITAL LOCKED/],
['capital-input inflation',/id="wf"/],
['capital output',/id="wn"/],
['validation UI',/id="wealthError"/],
['client-side calculator',/function wealthCalc\(\)/],
];
for(const [name,re] of checks){assert.match(html,re,name);console.log('PASS '+name);}
assert(!/service_role|sb_secret_/.test(html),'No privileged keys in public frontend');
const scriptTag=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].at(-1);
assert(scriptTag,'module script exists');
const source=scriptTag[1].replace(/^import\s+.*?;\s*$/gm,'');
new vm.Script(source,{filename:'wealthos-dashboard-module.js'});
console.log('PASS JavaScript syntax');
// Test financial equations independently of DOM using the exact recurrence.
function calc({liquid=0,equity=0,debt=0,c=0,s=0,r=0,g=0,y=1,inf=4}){
 const mr=(1+r/100)**(1/12)-1,mg=(1+g/100)**(1/12)-1,n=y*12;
 for(let i=1;i<=n;i++){liquid=liquid*(1+mr)+c+s;equity*=1+mg;}
 const net=liquid+equity-debt;
 const annuity=Math.abs(mr)<1e-12?n:((1+mr)**n-1)/mr;
 return {net,real:net/((1+inf/100)**y),needed:Math.max(0,(1e9-(net-c*annuity))/annuity)};
}
const near=(a,b)=>assert(Math.abs(a-b)<1e-5,`${a} vs ${b}`);
near(calc({liquid:100,c:10,r:0}).net,220);
near(calc({liquid:1000,debt:700}).net,300);
near(calc({equity:1000,s:100}).net,2200);
near(calc({liquid:1000,r:-20}).net,800);
near(calc({liquid:100,inf:0}).real,100);
assert(calc({}).needed>0);
console.log('PASS financial arithmetic sanity checks');

// Execute the actual dashboard calculator against a minimal DOM stub.
// This catches broken input IDs, event wiring, and integration regressions.
const ids=['wl','we','wd','wc','wb','wr','wg','wy','wf','wn','wi','wx','wq','wt','wealthError','wealthExport'];
const defaults={wl:'100',we:'0',wd:'0',wc:'10',wb:'0',wr:'0',wg:'0',wy:'1',wf:'0'};
const nodes=Object.fromEntries(ids.map(id=>[id,{
  value: defaults[id] ?? '', textContent:'', innerHTML:'',
  addEventListener(event,callback){this[event]=callback;}
}]));
const from=source.indexOf("const WIDS=");
const to=source.indexOf("$('refresh').onclick=loadDashboard;",from);
assert(from>=0 && to>from,'Capital calculator can be extracted from dashboard module');
const ctx=vm.createContext({document:{getElementById:id=>nodes[id]},console});
vm.runInContext('const $=id=>document.getElementById(id);\n'+source.slice(from,to),ctx);
assert.equal(nodes.wn.textContent,'M220','Actual dashboard zero-rate cash recurrence');
assert.equal(nodes.wi.textContent,'M220','Actual dashboard inflation setting');
assert.equal(nodes.wx.textContent,'M999,999,780','Gap calculation');
nodes.wd.value='70';nodes.wd.input();
assert.equal(nodes.wn.textContent,'M150','Debt subtraction on user input');
nodes.wr.value='-100';nodes.wr.input();
assert.notEqual(nodes.wealthError.textContent,'','Rate validation is enforced');
assert.equal(nodes.wn.textContent,'—','Invalid inputs clear stale outputs');
nodes.wr.value='0';nodes.wd.value='0';nodes.wl.value='1e308';nodes.wc.value='1e308';nodes.wy.value='100';nodes.wr.input();
assert.notEqual(nodes.wealthError.textContent,'','Overflow must not be displayed as projected wealth');
assert.equal(nodes.wn.textContent,'—','Overflow clears projected wealth');
console.log('PASS actual browser calculator DOM integration');
