const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
function plan() {
  const html = fs.readFileSync(path.join(root, 'energy-transition.html'), 'utf8');
  const script = html.match(/<script id="motion-plan">([\s\S]*?)<\/script>/)[1];
  return vm.runInNewContext(script + '; ({tracks: buildEnergyTracks(), duration: ENERGY_DURATION})');
}
test('fossil sources establish a row before compressing into the left panel', () => {
  const {tracks} = plan();
  const moves = ['oil','gas','coal'].map(id => tracks.find(t => t.target === '#' + id && t.name === 'reposition'));
  const starts = moves.map(t => t.frames[0].transform);
  assert.equal(new Set(starts).size, 3);
  assert.ok(starts.every(s => s.includes('420px')));
  assert.ok(moves.every(t => t.options.delay >= 3000));
  assert.ok(moves.every(t => t.frames.at(-1).transform.includes('420px')));
  assert.ok(moves.every(t => Number(t.frames.at(-1).transform.match(/translate\((\d+)/)[1]) < 650));
  assert.equal(new Set(moves.map(t => t.frames.at(-1).transform)).size, 3);
});
test('renewables appear only after fossil relocation and finish within export duration', () => {
  const {tracks,duration} = plan();
  const moves = tracks.filter(t => t.name === 'reposition');
  const end = Math.max(...moves.map(t => t.options.delay+t.options.duration));
  for (const name of ['#wind','#solar']) {
    const entry = tracks.find(t => t.target === name && t.name === 'reveal');
    assert.ok(entry.options.delay >= end);
    assert.equal(entry.frames[0].opacity, 0);
    assert.equal(entry.frames.at(-1).opacity, 1);
  }
  assert.ok(tracks.every(t => t.options.delay+t.options.duration <= duration));
  assert.ok(tracks.every(t => t.options.fill === 'both'));
});
test('replacement dims fossils while preserving identifiable outlines', () => {
  const {tracks} = plan();
  for(const id of ['oil','gas','coal']) {
    const track=tracks.find(t=>t.target==='#'+id+' .source-body' && t.name==='deplete');
    assert.equal(track.frames[0].opacity,1);
    assert.ok(track.frames.at(-1).opacity>0 && track.frames.at(-1).opacity<0.9);
  }
});
test('registered on Explainers and omitted from Charts with matching export duration', () => {
  const {duration} = plan();
  const charts=JSON.parse(fs.readFileSync(path.join(root,'_render/charts.json')));
  const entry=charts.find(c=>c.id==='energy-transition');
  assert.ok(entry);
  assert.equal(entry.duration*1000,duration);
  assert.equal(entry.width/entry.height,1.6);
  for(const file of ['explainers.html','index.html']) {
    const html=fs.readFileSync(path.join(root,file),'utf8');
    assert.match(html,/new Set\(\[[^\]]*'energy-transition'/);
  }
});

test('panel opens before renewables arrive and remains rounded during compression', () => {
  const {tracks}=plan();
  const panel=tracks.find(t=>t.target==='#fossilPanel');
  assert.equal(panel.frames[0].width,'1108px');
  assert.equal(panel.frames.at(-1).width,'610px');
  const open=tracks.find(t=>t.target==='#renewablePanel');
  const wind=tracks.find(t=>t.target==='#wind');
  assert.ok(open.options.delay+open.options.duration<=wind.options.delay);
});
