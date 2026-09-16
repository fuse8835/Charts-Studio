const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
const path=require('node:path');
const os=require('node:os');
const base=process.env.CHART_BASE_URL || 'http://localhost:8793';
(async()=>{
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1200,height:750}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(base+'/8a-energy-addition.html?export');await page.evaluate(()=>document.fonts.ready);
assert.equal(await page.locator('#dataScale polygon').count(),9,'source polygons must be present');
async function seek(t){await page.evaluate(t=>document.getAnimations().forEach(a=>{a.pause();a.currentTime=t*1000;}),t);}
for(const t of [5,7,11,18,20,26,28]){await seek(t);await page.screenshot({path:path.join(os.tmpdir(),`8a-${t}.png`),omitBackground:true});}
// Check actual rendered gradient bounds, including backward and mid-reveal seeks.
for(const t of [5,9.5,11,16,18,24,26,5]){
 await seek(t);
 const errors=await page.evaluate(t=>{
  const x=170.51+841*(stateAt(t).year-1800)/223;
  return [...document.querySelectorAll('[data-gradient-color]')].map(rect=>{
   const edges=[...document.querySelectorAll('.energy-top-edge')]
    .filter(e=>e.getAttribute('stroke')===rect.dataset.gradientColor)
    .map(e=>[...e.points].map(p=>[p.x,p.y]));
   return Math.abs(parseFloat(getComputedStyle(rect).y)-visiblePeak(edges,x));
  });
 },t);
 assert.ok(errors.every(e=>e<.02),`gradient bounds must follow the revealed peak at ${t}s: ${errors}`);
}
for(const [a,b] of [[5,5.95],[7,7.95],[11,11.95],[13,13.95],[18,18.95],[20,20.95],[26,26.95],[28,28.95]]){await seek(a);const first=await page.screenshot();await seek(b);assert.ok(first.equals(await page.screenshot()),`hold ${a}-${b} must be pixel-identical`);}
await seek(5);const first=await page.screenshot();await seek(26);await seek(5);assert.ok(first.equals(await page.screenshot()),'backward seeking is deterministic');
await page.goto(base+'/');await page.locator('.card').last().waitFor();assert.equal(await page.locator('a[href="/8a-energy-addition.html"]').count(),1);
await page.goto(base+'/8a-energy-addition.html');await page.locator('[data-seek="18000"]').click();assert.equal(await page.locator('#scrubber').inputValue(),'18000');await page.locator('#replayBtn').click();
assert.equal(await page.getByRole('button',{name:'Render .mov',exact:true}).count(),1);
assert.deepEqual(errors,[]);
console.log('PASS: still holds, backward seeking, landing page, era jumps, replay, and no browser errors');await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
