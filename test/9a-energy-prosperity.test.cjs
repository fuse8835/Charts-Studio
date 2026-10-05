const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'9a-energy-prosperity.html'),'utf8');
const p=vm.runInNewContext(html.match(/<script id="motion-plan">([\s\S]*?)<\/script>/)[1]+';({DATA,DURATION,TIMING,pointStart,pointX,pointY,dotRadius})');
const RING={cx:315,cy:326,r:106};
test('9A preserves the 2024 source snapshot, units and all in-range observations',()=>{
 const source=JSON.parse(fs.readFileSync(path.join(root,'data/9a-energy-prosperity-2024.json')));
 assert.equal(JSON.stringify(p.DATA),JSON.stringify(source));assert.equal(source.length,188);assert.equal(new Set(source.map(d=>d.code)).size,188);
 assert.ok(source.find(d=>d.code==='CAN').energy>80000,'energy already converted to kWh');
 assert.ok(source.every(d=>d.energy>0&&d.gdp>0&&d.population>0),'every dot has positive energy, GDP and population (needed for log axes and sizing)');
 for(let i=1;i<source.length;i++)assert.ok(source[i].energy>=source[i-1].energy,'sorted by energy so the reveal runs left to right');
 for(const d of source){assert.ok(p.pointX(d.energy)>=130&&p.pointX(d.energy)<=1120);assert.ok(p.pointY(d.gdp)>=220&&p.pointY(d.gdp)<=600);
  const clearance=Math.hypot(p.pointX(d.energy)-RING.cx,p.pointY(d.gdp)-RING.cy)-p.dotRadius(d.population)-RING.r;assert.ok(clearance>0,`highlighted circle touches ${d.name}`);}
});
test('9A dot area follows population, not whether a country is labelled',()=>{
 const by=c=>p.DATA.find(d=>d.code===c);
 assert.ok(p.dotRadius(by('CHN').population)>p.dotRadius(by('USA').population));
 assert.ok(p.dotRadius(by('USA').population)>p.dotRadius(by('CAN').population));
 assert.ok(p.dotRadius(by('CAN').population)>=p.dotRadius(by('NOR').population));
 assert.equal(p.dotRadius(1),4.2,'minimum radius');assert.equal(p.dotRadius(1e10),32,'maximum radius');
 for(const code of ['NOR','USA','CAN','DEU','JPN','MEX','CHN','BRA','ZAF','IND','BGD','NGA','ETH'])assert.ok(by(code),`labelled country ${code} present`);
});
test('9A finishes observations before circle and leaves a still editing hold',()=>{
 assert.ok(p.TIMING.ringStart>=p.pointStart(p.DATA.length-1)+p.TIMING.pointDuration+1);
 assert.ok(p.TIMING.fillStart>=p.TIMING.ringStart+p.TIMING.ringDuration);
 assert.ok(p.TIMING.textStart>=p.TIMING.fillStart+p.TIMING.fillDuration);
 assert.ok(p.DURATION>=p.TIMING.textStart+p.TIMING.textDuration+1);
 const registry=JSON.parse(fs.readFileSync(path.join(root,'_render/charts.json')));
 assert.equal(registry.find(d=>d.id==='9a').duration,p.DURATION);assert.ok(registry.find(d=>d.id==='9b'));assert.ok(!registry.find(d=>d.id==='9'));
});
