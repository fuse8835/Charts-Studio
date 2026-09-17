const {chromium}=require('playwright-core');const assert=require('node:assert/strict');const path=require('node:path');const os=require('node:os');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1200,height:750}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const base=process.env.CHART_BASE_URL||'http://localhost:8793';await page.goto(base+'/9a-energy-prosperity.html?export');await page.evaluate(()=>document.fonts.ready);
 const seek=async t=>page.evaluate(t=>document.getAnimations().forEach(a=>{a.pause();a.currentTime=t*1000}),t);
 assert.equal(await page.locator('[data-country]').count(),141);
 await seek(1.8);assert.equal(await page.locator('[data-country]').first().evaluate(e=>getComputedStyle(e).opacity),'0');
 await seek(8);assert.equal(await page.locator('[data-country]').last().evaluate(e=>getComputedStyle(e).opacity),'1');assert.equal(await page.locator('#regionText').evaluate(e=>getComputedStyle(e).opacity),'0');
 const early=await page.screenshot();await page.screenshot({path:path.join(os.tmpdir(),'9a-8.png')});
 await seek(12);assert.equal(await page.locator('#regionText').evaluate(e=>getComputedStyle(e).opacity),'1');const end=await page.screenshot();
 await seek(14);assert.ok(end.equals(await page.screenshot()),'final hold');await page.screenshot({path:path.join(os.tmpdir(),'9a-final.png')});
 await seek(8);assert.ok(early.equals(await page.screenshot()),'reverse seeking');
 await page.goto(base+'/9a-energy-prosperity.html');await page.locator('[data-seek="12000"]').click();assert.equal(await page.locator('#scrubber').inputValue(),'12000');assert.equal(await page.getByRole('button',{name:'Render .mov',exact:true}).count(),1);
 assert.deepEqual(errors,[]);console.log('PASS: 141 points, reveal, ring, holds, reverse seeking and controls');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
