const {test}=require('node:test');
const assert=require('node:assert/strict');
const {resolveRenderVariant}=require('../_render/render-variant');
const chart={id:'energy-transition',html:'energy-transition.html',mov:'energy-transition-alpha.mov',duration:12};
test('each treatment exports a distinct file without changing the base catalogue entry',()=>{
 const names=new Set();
 for(let i=1;i<=5;i++){
  const result=resolveRenderVariant(chart,String(i));
  assert.equal(result.variant,i);assert.equal(result.html,chart.html);
  assert.equal(result.mov,`energy-transition-v${i}-alpha.mov`);names.add(result.mov);
 }
 assert.equal(names.size,5);assert.equal(chart.variant,undefined);
});
test('invalid variants cannot reach the capture URL or output filename',()=>{
 for(const value of ['0','6','1.5','../test','1&export=','NaN','01',''])assert.throws(()=>resolveRenderVariant(chart,value));
});
test('ordinary chart exports and the default catalogue export remain unchanged',()=>{
 assert.equal(resolveRenderVariant(chart,null),chart);
 const battery={id:'battery-storage',mov:'battery.mov'};
 assert.equal(resolveRenderVariant(battery,'5'),battery);
});
