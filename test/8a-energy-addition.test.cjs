const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
function plan(){
 const html=fs.readFileSync(path.join(root,'8a-energy-addition.html'),'utf8');
 return vm.runInNewContext(html.match(/<script id="motion-plan">([\s\S]*?)<\/script>/)[1]+';({stateAt,DURATION,ERAS})');
}
test('each completed era and expanded axis has a full second of stillness',()=>{
 const {stateAt}=plan();
 for(const [start,end] of [[5,6],[7,8],[11,12],[13,14],[18,19],[20,21],[26,27],[28,29]]){
  assert.deepEqual(stateAt(start),stateAt(end));
  assert.deepEqual(stateAt(start+.25),stateAt(end-.25));
 }
});
test('reveals stop at narration dates and scaling never exposes future data',()=>{
 const {stateAt}=plan();
 for(const [time,year,domain] of [[5,1860,1860],[11,1900,1900],[18,1956,1960],[26,2023,2023]]){
  assert.equal(stateAt(time).year,year);assert.equal(stateAt(time).end,domain);
 }
 for(let t=0;t<=29;t+=.05){const s=stateAt(t);assert.ok(s.year<=s.end);assert.ok(s.year>=1800);}
 for(const [a,b] of [[6,7],[12,13],[19,20]]){
  assert.equal(stateAt(a).year,stateAt(b).year);
  assert.ok(stateAt(a+.5).end>stateAt(a).end);
  assert.ok(stateAt(a+.5).end<stateAt(b).end);
 }
});
test('registry duration matches the seekable timeline',()=>{
 const {DURATION}=plan();
 const entry=JSON.parse(fs.readFileSync(path.join(root,'_render/charts.json'))).find(c=>c.id==='8a');
 assert.equal(entry.duration,DURATION);assert.equal(entry.width/entry.height,1.6);
 assert.ok(fs.existsSync(path.join(root,entry.html)));
});
