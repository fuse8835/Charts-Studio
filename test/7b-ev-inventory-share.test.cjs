const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'7b-ev-inventory-share.html'),'utf8');
const p=vm.runInNewContext(html.match(/<script id="motion-plan">([\s\S]*?)<\/script>/)[1]+';({DATA,DURATION,TIMING})');

test('7B data matches the saved traced values and has the shape of the reference',()=>{
 const src=JSON.parse(fs.readFileSync(path.join(root,'data/7b-source-values.json')));
 assert.deepEqual(Array.from(p.DATA.years),src.years);assert.deepEqual(Array.from(p.DATA.with_regulation),src.with_regulation);assert.deepEqual(Array.from(p.DATA.without_regulation),src.without_regulation);
 assert.equal(p.DATA.years.length,25);assert.equal(p.DATA.years[0],2026);assert.equal(p.DATA.years[24],2050);
 const w=p.DATA.with_regulation,wo=p.DATA.without_regulation;
 assert.equal(w[0],wo[0],'both lines start at the same point');
 for(let i=1;i<25;i++){assert.ok(w[i]>=w[i-1]&&wo[i]>=wo[i-1],'both rise');assert.ok(w[i]>=wo[i],'with regulation is never below without');}
 assert.ok(Math.abs(w[24]-46)<1,'with regulation ends near 46%');assert.ok(Math.abs(wo[24]-18)<1,'without regulation ends near 18%');
 assert.ok(Math.max(...w)<=50,'fits the 0-50% axis');
});

test('7B draws with regulation, then without, and registers for render',()=>{
 const t=p.TIMING;
 assert.ok(t.withStart<t.withEnd&&t.withEnd<=t.withoutStart,'with regulation completes before the second line starts');
 assert.ok(Math.abs(t.withStart+t.withDur-t.withEnd)<.5&&Math.abs(t.withoutStart+t.withoutDur-t.withoutEnd)<.5);
 assert.ok(t.withoutEnd+t.markerDur+1<=p.DURATION,'still hold at the end');
 const e=JSON.parse(fs.readFileSync(path.join(root,'_render/charts.json'))).find(c=>c.id==='7b');
 assert.ok(e);assert.equal(e.duration,p.DURATION);assert.equal(e.html,'7b-ev-inventory-share.html');
 assert.ok(!/linearGradient/.test(html.split('<script')[0].replace(/<style[\s\S]*?<\/style>/,'').split('</svg>')[0].split('id="chartDefs"')[1]||''),'no gradient fills under the lines');
});
