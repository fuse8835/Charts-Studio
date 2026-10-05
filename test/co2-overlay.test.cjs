const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const vm=require('node:vm');
const {EventEmitter}=require('node:events');

const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'_render/server.js'),'utf8');

function load(home,pageFactory){
 const renderDir=path.join(home,'checkout','_render');fs.mkdirSync(renderDir,{recursive:true});
 const state={ffmpegArgs:null,viewport:null,url:null};
 const context={__dirname:renderDir,process:{env:{}},console:{log(){}},URL,
  require(name){
   if(name==='os')return {homedir:()=>home};
   if(name==='http')return {createServer:()=>({listen(){}})};
   if(name==='playwright-core')return {chromium:{launch:async()=>({newPage:async(o)=>{state.viewport=o.viewport;return pageFactory(state);},close:async()=>{}})}};
   if(name==='child_process')return {spawn(command,args){
    state.ffmpegArgs=args;fs.writeFileSync(args.at(-1),'encoded-video');
    const child=new EventEmitter();queueMicrotask(()=>child.emit('close',0));return child;
   }};
   return require(name);
  }
 };
 vm.runInNewContext(source,context);
 return {context,state};
}

test('co2-overlay is registered as an explainer and its files exist',()=>{
 const charts=JSON.parse(fs.readFileSync(path.join(root,'_render/charts.json'),'utf8'));
 const entry=charts.find(c=>c.id==='co2-overlay');
 assert.ok(entry,'charts.json entry');
 assert.ok(fs.existsSync(path.join(root,entry.html)),'html exists');
 assert.ok(fs.existsSync(path.join(root,'vendor/three/three.module.min.js')),'vendored three.js');
 assert.ok(fs.existsSync(path.join(root,'vendor/three/three.core.min.js')),'vendored three core');
 assert.match(fs.readFileSync(path.join(root,'explainers.html'),'utf8'),/INCLUDE_IDS = new Set\([^)]*'co2-overlay'/);
 assert.match(fs.readFileSync(path.join(root,'index.html'),'utf8'),/EXCLUDE_IDS = new Set\([^)]*'co2-overlay'/);
});

test('a seek-hook page renders exactly duration x fps frames at the requested size, with no hold',async()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'co2-hook-'));
 try{
  const seeks=[];let shots=0;
  const {context,state}=load(home,(st)=>({
   goto:async(url)=>{st.url=url;},
   // the hook-detection call has no argument; per-frame seeks pass the time in ms
   evaluate:async(fn,arg)=>{if(arg===undefined)return true;seeks.push(arg);},
   screenshot:async({path:file})=>{shots++;fs.writeFileSync(file,Buffer.alloc(2048));},
  }));
  const messages=[];
  const opts=context.parseRenderOpts(new URLSearchParams('duration=2&fps=24&w=1280&h=720&name=My%20Test!&cfg=abc'));
  await context.renderChart({id:'hook',html:'hook.html',mov:'hook.mov',duration:10},(message,done)=>messages.push({message,done}),opts);
  assert.equal(shots,48);
  assert.equal(seeks.length,48);
  assert.equal(seeks[0],0);
  assert.ok(Math.abs(seeks[47]-47*1000/24)<1e-9,'last seek is the last frame, not clamped to the end');
  assert.equal(state.viewport.width,1280);
  assert.equal(state.viewport.height,720);
  assert.match(state.url,/hook\.html\?export&cfg=abc$/);
  const expected=path.join(home,'Desktop','Charts-Studio','mytest-alpha.mov');
  assert.equal(state.ffmpegArgs.at(-1),expected);
  assert.equal(state.ffmpegArgs[state.ffmpegArgs.indexOf('-r')+1],'24');
  assert.equal(messages.at(-1).done,true);
 }finally{fs.rmSync(home,{recursive:true,force:true});}
});

test('render options are clamped and sanitised; absent options change nothing',()=>{
 const {context}=load(fs.mkdtempSync(path.join(os.tmpdir(),'co2-opts-')),()=>({}));
 const p=(q)=>context.parseRenderOpts(new URLSearchParams(q));
 const bad=p('duration=99999&fps=17&w=1&h=99999&name=../../etc/passwd');
 assert.equal(bad.duration,180);
 assert.equal(bad.fps,undefined);
 assert.equal(bad.width,320);
 assert.equal(bad.height,7680);
 assert.equal(bad.name,'etcpasswd');
 const none=p('id=5a');
 assert.deepEqual(JSON.parse(JSON.stringify(none)),{});
});
