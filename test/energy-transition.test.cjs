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
test('fossil sources establish a row before moving into the left column', () => {
  const {tracks} = plan();
  const moves = ['oil','gas','coal'].map(id => tracks.find(t => t.target === '#' + id && t.name === 'reposition'));
  const starts = moves.map(t => t.frames[0].transform);
  assert.equal(new Set(starts).size, 3);
  assert.ok(starts.every(s => s.includes('420px')));
  assert.ok(moves.every(t => t.options.delay >= 3000));
  assert.ok(moves.every(t => t.frames.at(-1).transform.includes('155px')));
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
    assert.ok(track.frames.at(-1).opacity>0 && track.frames.at(-1).opacity<0.6);
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
