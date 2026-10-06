const {chromium}=require('playwright-core');const assert=require('node:assert/strict');const path=require('node:path');const os=require('node:os');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1200,height:750}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const base=process.env.CHART_BASE_URL||'http://localhost:8793';await page.goto(base+'/9a-energy-prosperity.html?export');await page.evaluate(()=>document.fonts.ready);
 const seek=async t=>page.evaluate(t=>document.getAnimations().forEach(a=>{a.pause();a.currentTime=t*1000}),t);
 assert.equal(await page.locator('[data-country]').count(),188);
 await seek(1.8);assert.equal(await page.locator('[data-country]').first().evaluate(e=>getComputedStyle(e).opacity),'0');
 await seek(8);assert.equal(await page.locator('[data-country]').last().evaluate(e=>getComputedStyle(e).opacity),'1');assert.equal(await page.locator('#regionText').evaluate(e=>getComputedStyle(e).opacity),'0');
 const early=await page.screenshot();await page.screenshot({path:path.join(os.tmpdir(),'9a-8.png')});
 await seek(9.9);assert.equal(await page.locator('#regionFill').evaluate(e=>getComputedStyle(e).opacity),'0');assert.equal(await page.locator('#regionRing').evaluate(e=>parseFloat(getComputedStyle(e).strokeDashoffset)),0);
 const circles=await page.evaluate(()=>{const g=id=>{const e=document.getElementById(id);return [e.getAttribute('cx'),e.getAttribute('cy'),e.getAttribute('r')].join(',')};const ring=g('regionRing');const clip=document.querySelector('#regionClip circle');return {ring,fill:g('regionFill'),clip:[clip.getAttribute('cx'),clip.getAttribute('cy'),clip.getAttribute('r')].join(','),shadow:[...document.querySelectorAll('#regionTexture circle')].map(c=>[c.getAttribute('cx'),c.getAttribute('cy'),c.getAttribute('r')].join(','))};});
 assert.equal(circles.fill,circles.ring,'fill matches ring');assert.equal(circles.clip,circles.ring,'clip matches ring');assert.ok(circles.shadow.length===3&&circles.shadow.every(c=>c===circles.ring),'inner shadow rings sit exactly on the highlight circle');
 await seek(12);assert.equal(await page.locator('#regionText').evaluate(e=>getComputedStyle(e).opacity),'1');const end=await page.screenshot();
 await seek(14);assert.ok(end.equals(await page.screenshot()),'final hold');await page.screenshot({path:path.join(os.tmpdir(),'9a-final.png')});
 await seek(8);assert.ok(early.equals(await page.screenshot()),'reverse seeking');
 await page.goto(base+'/9a-energy-prosperity.html');await page.locator('[data-seek="12000"]').click();assert.equal(await page.locator('#scrubber').inputValue(),'12000');assert.equal(await page.getByRole('button',{name:'Render .mov',exact:true}).count(),1);
 assert.deepEqual(errors,[]);console.log('PASS: 188 points, reveal, ring, holds, reverse seeking and controls');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
