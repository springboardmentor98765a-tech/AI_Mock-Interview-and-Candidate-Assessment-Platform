const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
async function scenario(answer){
 const listeners=[];let requests=0,cleared=0,confirmations=0;
 const sandbox={console,document:{getElementById:()=>null,querySelector:()=>({addEventListener:(event,fn,capture)=>listeners.push({fn,capture})})},localStorage:{getItem:()=> 'token',removeItem:()=>cleared++},window:{confirm:()=>{confirmations++;return answer},location:{href:'candidate.html'}},fetch:async()=>{requests++;return {ok:true}}};
 vm.createContext(sandbox);vm.runInContext(fs.readFileSync(__dirname+'/auth-common.js','utf8'),sandbox);
 sandbox.wireLogoutButton('#logoutBtn');
 // Reproduce the legacy bubbling handler which previously redirected on click.
 listeners.push({capture:false,fn:()=>{sandbox.window.location.href='index.html'}});
 let stopped=false;
 for(const listener of listeners.sort((a,b)=>Number(b.capture)-Number(a.capture))){if(stopped)break;listener.fn({preventDefault(){},stopImmediatePropagation(){stopped=true}})}
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(confirmations,1);assert.equal(requests,answer?1:0);assert.equal(cleared,answer?2:0);assert.equal(sandbox.window.location.href,answer?'index.html':'candidate.html');
}
(async()=>{await scenario(false);await scenario(true);console.log('Logout cancel/confirm regression checks passed')})().catch(e=>{console.error(e);process.exit(1)});
