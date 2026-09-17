const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'9a-energy-prosperity.html'),'utf8');
const p=vm.runInNewContext(html.match(/<script id="motion-plan">([\s\S]*?)<\/script>/)[1]+';({DATA,DURATION,TIMING,pointStart,pointX,pointY})');
test('9A preserves source snapshot, units and all in-range observations',()=>{
 const source=JSON.parse(fs.readFileSync(path.join(root,'data/9a-energy-prosperity-2023.json')));
 assert.equal(JSON.stringify(p.DATA),JSON.stringify(source));assert.equal(source.length,141);assert.equal(new Set(source.map(d=>d.code)).size,141);
 assert.ok(source.find(d=>d.code==='CAN').energy>80000,'energy already converted to kWh');
 for(const d of source){assert.ok(p.pointX(d.energy)>=130&&p.pointX(d.energy)<=1120);assert.ok(p.pointY(d.gdp)>=220&&p.pointY(d.gdp)<=600);assert.ok(((p.pointX(d.energy)-340)/125)**2+((p.pointY(d.gdp)-350)/125)**2>1,'highlighted circle contains no observations');}
});
test('9A finishes observations before circle and leaves a still editing hold',()=>{
 assert.ok(p.TIMING.ringStart>=p.pointStart(p.DATA.length-1)+p.TIMING.pointDuration+1);
 assert.ok(p.DURATION>=p.TIMING.textStart+p.TIMING.textDuration+1);
 const registry=JSON.parse(fs.readFileSync(path.join(root,'_render/charts.json')));
 assert.equal(registry.find(d=>d.id==='9a').duration,p.DURATION);assert.ok(registry.find(d=>d.id==='9b'));assert.ok(!registry.find(d=>d.id==='9'));
});
