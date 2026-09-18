const {chromium}=require('playwright-core'),assert=require('node:assert/strict'),path=require('node:path'),os=require('node:os');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 for(const [id,file,duration,height] of [['10a','10a-african-priorities.html',22,750],['10b','10b-climate-foreign-aid.html',12.5,750]]){
 const page=await browser.newPage({viewport:{width:1200,height}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto((process.env.CHART_BASE_URL||'http://localhost:23861')+'/'+file+'?export');await page.evaluate(()=>document.fonts.ready);
 const seek=async t=>page.evaluate(t=>document.getAnimations().forEach(a=>{a.pause();a.currentTime=t*1000}),t);
 await seek(1.5);const early=await page.screenshot();
 if(id==='10a'){
 assert.equal(await page.locator('[data-priority]').count(),34);await seek(7);assert.equal(await page.locator('#calloutFill').evaluate(e=>getComputedStyle(e).opacity),'0');
 await seek(20);assert.equal(await page.locator('#calloutFill').evaluate(e=>getComputedStyle(e).opacity),'1');
 }else{
 assert.equal(await page.locator('[data-series]').count(),24);await seek(5);assert.ok(await page.locator('[data-series="emissions"]').first().evaluate(e=>getComputedStyle(e).transform.includes('1, 0, 0, 0')));await page.screenshot({path:path.join(os.tmpdir(),'10b-adaptation.png')});await seek(10);
 }
 const settled=await page.screenshot();await seek(duration);assert.ok(settled.equals(await page.screenshot()),'final hold '+id);await page.screenshot({path:path.join(os.tmpdir(),id+'-final.png')});
 await seek(1.5);assert.ok(early.equals(await page.screenshot()),'reverse seeking '+id);assert.deepEqual(errors,[]);
 await page.goto((process.env.CHART_BASE_URL||'http://localhost:23861')+'/'+file);assert.equal(await page.getByRole('button',{name:'Render .mov',exact:true}).count(),1);await page.locator('[data-seek]').last().click();assert.ok(Number(await page.locator('#scrubber').inputValue())>0);
 await page.close();console.log('PASS '+id+': data marks, sequence, holds, reverse seeking, render and scrub controls');
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
