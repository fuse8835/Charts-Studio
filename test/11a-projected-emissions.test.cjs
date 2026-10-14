const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'11a-projected-emissions.html'),'utf8');
const p=vm.runInNewContext(html.match(/<script id="motion-plan">([\s\S]*?)<\/script>/)[1]+';({DATA,DURATION,TIMING,SCEN,RESULTS,scenarioFactor})');

test('11A data matches the saved source values and every series is consistent',()=>{
 const src=JSON.parse(fs.readFileSync(path.join(root,'data/11a-source-values.json')));
 assert.deepEqual(Array.from(p.DATA.years),src.years);
 assert.deepEqual(Array.from(p.DATA.rest_of_world),src.rest_of_world);
 assert.deepEqual(Array.from(p.DATA.us),src.us);assert.deepEqual(Array.from(p.DATA.oecd_ex_us),src.oecd_ex_us);
 const n=p.DATA.years.length;assert.equal(n,12);
 for(const k of ['rest_of_world','us','oecd_ex_us'])assert.equal(p.DATA[k].length,n);
 for(let i=0;i<n;i++)for(const k of ['rest_of_world','us','oecd_ex_us'])assert.ok(p.DATA[k][i]>0&&p.DATA[k][i]<45);
 const total0=p.DATA.rest_of_world[0]+p.DATA.us[0]+p.DATA.oecd_ex_us[0];assert.ok(total0>41&&total0<43,'about 42 Gt in 2025');
});

test('11A labels derive from the data and agree with the script (88% / 12% / about 8%)',()=>{
 assert.equal(Math.round(p.RESULTS.restShare*100),88);
 assert.equal(Math.round(p.RESULTS.westShare*100),12);
 assert.equal(Math.round(p.RESULTS.reduction*100),8);
 assert.ok(Math.abs(p.RESULTS.restShare+p.RESULTS.westShare-1)<1e-9);
 for(const [need,count] of [["pct(RESULTS.restShare)",1],["pct(RESULTS.westShare)",1],["pct(RESULTS.reduction)",1]])assert.ok(html.split(need).length-1>=count,`label uses ${need}`);
 assert.ok(!/>88%</.test(html)&&!/>12%</.test(html),'88%/12% are computed, not typed in');
});

test('11A scenario takes the West to zero by 2050 and never exceeds the baseline',()=>{
 assert.equal(p.scenarioFactor(2025),1);assert.equal(p.scenarioFactor(2050),0);assert.equal(p.scenarioFactor(2100),0);
 for(let i=0;i<p.DATA.years.length;i++){assert.ok(p.SCEN.us[i]<=p.DATA.us[i]+1e-9&&p.SCEN.oecd[i]<=p.DATA.oecd_ex_us[i]+1e-9);if(p.DATA.years[i]>=2050){assert.equal(p.SCEN.us[i],0);assert.equal(p.SCEN.oecd[i],0);}}
});

test('11A reveals in the narration order and registers for render',()=>{
 const t=p.TIMING;
 assert.ok(t.restStart<t.restShare&&t.restShare<=t.usStart,'developing world first');
 assert.ok(t.usStart+t.usDur<=t.oecdStart+.01,'then the US, then the other OECD');
 assert.ok(t.oecdStart+t.oecdDur<=t.westShare);
 assert.ok(t.westShare+.6<=t.captionStart&&t.captionStart<t.morphStart&&t.ghostStart<=t.morphStart);
 assert.ok(t.morphStart+t.morphDur<=t.resultStart&&t.resultStart+.7+1<=p.DURATION,'still hold at the end');
 const e=JSON.parse(fs.readFileSync(path.join(root,'_render/charts.json'))).find(c=>c.id==='11a');
 assert.ok(e);assert.equal(e.duration,p.DURATION);assert.equal(e.html,'11a-projected-emissions.html');assert.equal(e.width,1920);assert.equal(e.height,1200);
});

test('11A draws the avoided emissions as a region whose size is the -8%',()=>{
 assert.ok(/id:'avoidedRegion'|id=\"avoidedRegion\"/.test(html)&&/avoidHatch/.test(html),'avoided region and its hatch pattern exist');
 // the region is the gap between the original and reduced totals; its area over the century is the reduction
 const yearly=(v)=>{const out=[];for(let yr=2025;yr<=2100;yr++){let i=0;while(i<p.DATA.years.length-2&&yr>p.DATA.years[i+1])i++;const t=(yr-p.DATA.years[i])/(p.DATA.years[i+1]-p.DATA.years[i]);out.push(v[i]+(v[i+1]-v[i])*t);}return out;};
 const base=yearly(p.DATA.us.map((v,i)=>v+p.DATA.oecd_ex_us[i])),scen=yearly(p.SCEN.us.map((v,i)=>v+p.SCEN.oecd[i]));
 const total=yearly(p.DATA.rest_of_world.map((v,i)=>v+p.DATA.us[i]+p.DATA.oecd_ex_us[i])).reduce((a,b)=>a+b,0);
 const gap=base.map((v,i)=>v-scen[i]);
 assert.ok(gap.every(g=>g>=-1e-9),'the reduced total is never above the original');
 assert.ok(Math.abs(gap.reduce((a,b)=>a+b,0)/total-p.RESULTS.reduction)<1e-9,'region area equals the reported reduction');
 assert.ok(gap.slice(25).reduce((a,b)=>a+b,0)>gap.slice(0,25).reduce((a,b)=>a+b,0),'most of the avoided emissions are after 2050');
});
