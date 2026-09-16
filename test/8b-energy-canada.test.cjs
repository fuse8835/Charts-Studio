const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
function chart(){const html=fs.readFileSync(path.join(root,'8b-energy-canada.html'),'utf8');return {html,...vm.runInNewContext(html.match(/<script id="motion-plan">([\s\S]*?)<\/script>/)[1]+';({stateAt,DURATION,ERAS})')};}
test('8B reveals all years in one stage with fixed axes and a final hold',()=>{
 const {stateAt,DURATION,ERAS}=chart();assert.equal(ERAS.length,1);
 assert.equal(stateAt(0).year,1965);assert.equal(stateAt(2).year,1965);
 assert.equal(stateAt(5.5).year,1994.5);assert.equal(stateAt(9).year,2024);
 assert.deepEqual(stateAt(9),stateAt(DURATION));
 for(let t=0;t<=DURATION;t+=.1){assert.equal(stateAt(t).end,2024);assert.equal(stateAt(t).max,4500);}
});
test('8B uses the existing category colours and has a matching render registration',()=>{
 const {html,DURATION}=chart();
 for(const [label,color] of [['Biofuels','#07669e'],['Hydro','#0f875f'],['Nuclear','#ffb21c'],['Gas','#e30063'],['Coal','#d45463'],['Oil','#a51b91'],['Solar, wind and other renewables','#04ffba']]){
  assert.ok(html.includes(`['${label}','${color}'`),label);
 }
 const entry=JSON.parse(fs.readFileSync(path.join(root,'_render/charts.json'))).find(c=>c.id==='8b');
 assert.equal(entry.html,'8b-energy-canada.html');assert.equal(entry.duration,DURATION);
 assert.equal(entry.width/entry.height,1.6);
});
