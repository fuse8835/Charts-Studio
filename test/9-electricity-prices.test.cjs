const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
function plan(){const s=fs.readFileSync(path.join(root,'9-electricity-prices.html'),'utf8');return vm.runInNewContext(s.match(/<script id="motion-plan">([\s\S]*?)<\/script>/)[1]+';({DATA,DURATION,TIMING,barStart})');}
test('Canada finishes before provincial bars; inflation and highlights follow',()=>{
 const {DATA,DURATION,TIMING:t,barStart}=plan();assert.equal(DATA[0].label,'CA');
 assert.ok(barStart(1)>=barStart(0)+t.barDuration+1);
 assert.ok(t.lineStart>=barStart(DATA.length-1)+t.barDuration);
 assert.ok(t.highlightStart>=t.calloutStart+t.calloutDuration);
 assert.ok(DURATION>=t.highlightStart+t.highlightDuration+1);
 assert.deepEqual(Array.from(DATA.filter(d=>d.highlight),d=>d.label),['MB','QC']);
});
test('all eleven source bars and render registration are present',()=>{
 const {DATA,DURATION}=plan();assert.equal(DATA.length,11);assert.ok(DATA.every(d=>d.value>0 && d.value<200));
 const entry=JSON.parse(fs.readFileSync(path.join(root,'_render/charts.json'))).find(c=>c.id==='9');
 assert.equal(entry.duration,DURATION);assert.equal(entry.html,'9-electricity-prices.html');
});
