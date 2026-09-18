const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
function plan(file,expr){const s=fs.readFileSync(path.join(root,file),'utf8');return vm.runInNewContext(s.match(/<script id="motion-plan">([\s\S]*?)<\/script>/)[1]+';('+expr+')');}
test('10A keeps all exact source labels/values and narration order',()=>{
 const p=plan('10a-african-priorities.html','{DATA,TIMING,FOCUS,DURATION,barStart}');
 assert.equal(JSON.stringify(p.DATA),JSON.stringify(JSON.parse(fs.readFileSync(path.join(root,'data/10a-source-values.json')))));
 assert.equal(p.DATA.length,34);assert.equal(p.DATA[30].label,'Climate change');assert.equal(p.DATA[30].value,.6);assert.equal(p.DATA[0].value,32.1);
 assert.equal(p.FOCUS.map(f=>f.label).join('|'),'Unemployment|Management of the economy|Health|Electricity|Education');
 assert.ok(p.barStart(33)+p.TIMING.barDuration+1<p.FOCUS[0].start);assert.ok(p.FOCUS.at(-1).start+1.25<p.TIMING.highlightStart);
});
test('10B preserves 12 annual stacks, adds emissions after adaptation settles',()=>{
 const p=plan('10b-climate-foreign-aid.html','{DATA,TIMING,DURATION,segmentStart}');
 assert.equal(JSON.stringify(p.DATA),JSON.stringify(JSON.parse(fs.readFileSync(path.join(root,'data/10b-source-values.json')))));
 assert.equal(p.DATA.length,12);assert.equal(p.DATA[0].year,2012);assert.equal(p.DATA.at(-1).year,2023);
 assert.ok(p.DATA.every(d=>d.adaptation>0&&d.emissions>0&&d.adaptation+d.emissions<2500));
 assert.ok(Math.abs(p.DATA.at(-1).adaptation-96.48/164.88*2500)<.00001);
 assert.ok(p.segmentStart(11,'adaptation')+p.TIMING.barDuration+1<=p.TIMING.emissionsStart);
 assert.ok(p.segmentStart(11,'emissions')+p.TIMING.barDuration+1<p.DURATION);
});
test('both chart exports have matching durations and readable canvas sizes',()=>{
 const r=JSON.parse(fs.readFileSync(path.join(root,'_render/charts.json')));
 for(const id of ['10a','10b']){const e=r.find(c=>c.id===id);assert.ok(e);const p=plan(e.html,'{DURATION}');assert.equal(e.duration,p.DURATION);assert.equal(e.width,1920);assert.equal(e.height,id==='10a'?1920:1200);}
});
