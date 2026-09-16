const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const vm=require('node:vm');
const {EventEmitter}=require('node:events');
test('renders into Desktop/Charts-Studio and reports the full saved path',async()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'chart-output-'));
 const renderDir=path.join(home,'checkout','_render');fs.mkdirSync(renderDir,{recursive:true});
 const messages=[];let encodedPath;
 const page={goto:async()=>{},evaluate:async()=>{},screenshot:async({path:file})=>fs.writeFileSync(file,Buffer.alloc(2048))};
 const source=fs.readFileSync(path.join(__dirname,'../_render/server.js'),'utf8');
 const context={__dirname:renderDir,process:{env:{}},console:{log(){}},URL,
  require(name){
   if(name==='os')return {homedir:()=>home};
   if(name==='http')return {createServer:()=>({listen(){}})};
   if(name==='playwright-core')return {chromium:{launch:async()=>({newPage:async()=>page,close:async()=>{}})}};
   if(name==='child_process')return {spawn(command,args){
    encodedPath=args.at(-1);fs.writeFileSync(encodedPath,'encoded-video');
    const child=new EventEmitter();queueMicrotask(()=>child.emit('close',0));return child;
   }};
   return require(name);
  }
 };
 try{
  vm.runInNewContext(source,context);
  await context.renderChart({id:'sample',html:'sample.html',mov:'sample.mov',duration:0},(message,done)=>messages.push({message,done}));
  const expected=path.join(home,'Desktop','Charts-Studio','sample.mov');
  assert.equal(encodedPath,expected);
  assert.ok(fs.existsSync(expected));
  assert.equal(messages.at(-1).message,`Done -- saved to ${expected}`);
  assert.equal(messages.at(-1).done,true);
 }finally{fs.rmSync(home,{recursive:true,force:true});}
});
