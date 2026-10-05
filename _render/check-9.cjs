const {chromium}=require('playwright-core');const assert=require('node:assert/strict');const os=require('node:os');const path=require('node:path');
const base=process.env.CHART_BASE_URL||'http://localhost:8793';
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
const page=await browser.newPage({viewport:{width:1200,height:750}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(base+'/9b-electricity-prices.html?export');await page.evaluate(()=>document.fonts.ready);
async function seek(t){await page.evaluate(t=>document.getAnimations().forEach(a=>{a.pause();a.currentTime=t*1000}),t);}
for(const t of [2.3,6.4,9,11,12.85]){await seek(t);await page.screenshot({path:path.join(os.tmpdir(),`9-${t}.png`),omitBackground:true});}
const scaleY=sel=>page.locator(sel).evaluate(e=>{const m=getComputedStyle(e).transform.match(/matrix\(([^)]+)\)/);return m?parseFloat(m[1].split(',')[3]):1;});
await seek(2.3);assert.ok(await scaleY('[data-province="CA"]')>0,'Canada has started growing');assert.equal(await scaleY('[data-province="BC"]'),0,'BC has not started yet');
await seek(6.4);assert.equal(await scaleY('[data-province="NL"]'),1,'all provinces are fully grown before the dotted line');
assert.equal(await page.locator('[data-province="CA"] rect').first().evaluate(e=>e.getAttribute('stroke')),'#e30063','Canada is red');
await seek(6.4);assert.equal(await page.locator('#referenceWipe').evaluate(e=>parseFloat(getComputedStyle(e).width)),0);
await seek(9);assert.equal(await page.locator('.bar-highlight').first().evaluate(e=>getComputedStyle(e).opacity),'0');
await seek(11);assert.equal(await page.locator('.bar-highlight').count(),2);
for(const label of ['MB','QC'])assert.equal(await page.locator(`[data-label="${label}"] text`).evaluate(e=>getComputedStyle(e).fill),'rgb(255, 178, 28)');
const final=await page.screenshot();await seek(12.85);assert.ok(final.equals(await page.screenshot()),'completed highlight holds still');
await seek(3);const first=await page.screenshot();await seek(12.85);await seek(3);assert.ok(first.equals(await page.screenshot()),'reverse seek deterministic');
await page.goto(base+'/');await page.locator('.card').last().waitFor();assert.equal(await page.locator('a[href="/9b-electricity-prices.html"]').count(),1);
await page.goto(base+'/9b-electricity-prices.html');await page.locator('[data-seek="10600"]').click();assert.equal(await page.locator('#scrubber').inputValue(),'10600');await page.locator('#replayBtn').click();assert.equal(await page.getByRole('button',{name:'Render .mov',exact:true}).count(),1);
assert.deepEqual(errors,[]);console.log('PASS: Canada-first reveal, reference timing, MB/QC highlights, still hold, seeking, menu and controls');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
