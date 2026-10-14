const {chromium}=require('playwright-core');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1400,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const base=process.env.CHART_BASE_URL||'http://localhost:8793';
 const charts=await (await fetch(base+'/api/charts')).json();
 const byId=(a,b)=>a.id.localeCompare(b.id,undefined,{numeric:true,sensitivity:'base'});
 const ordered=charts.filter(c=>!c.explainer).sort(byId).concat(charts.filter(c=>c.explainer).sort(byId));
 const nav=async(html)=>{await page.goto(base+'/'+html);await page.locator('.studio-navigation select option').first().waitFor({state:'attached'});await page.waitForFunction(()=>document.querySelector('.studio-navigation select option')&&!/Loading/.test(document.querySelector('.studio-navigation select').textContent));
  return page.evaluate(()=>({sel:document.querySelector('.studio-navigation select').value,options:document.querySelectorAll('.studio-navigation option').length,prev:document.querySelector('[data-nav=prev]').getAttribute('href'),next:document.querySelector('[data-nav=next]').getAttribute('href'),prevOff:document.querySelector('[data-nav=prev]').getAttribute('aria-disabled'),nextOff:document.querySelector('[data-nav=next]').getAttribute('aria-disabled'),prevText:document.querySelector('[data-nav=prev] span').textContent,nextText:document.querySelector('[data-nav=next] span').textContent}));};
 // every chart page that has the review tooling gets the navigation, in registry order
 for(const c of ordered.filter(c=>c.id!=='co2-overlay')){
  const i=ordered.indexOf(c),n=await nav(c.html);
  assert.equal(n.sel,c.html,`${c.id}: dropdown shows the current chart`);assert.equal(n.options,ordered.length,`${c.id}: dropdown lists every chart`);
  assert.equal(n.prev,i>0?ordered[i-1].html:null,`${c.id}: previous link`);assert.equal(n.next,i<ordered.length-1?ordered[i+1].html:null,`${c.id}: next link`);
  if(i===0)assert.equal(n.prevOff,'true');
 }
 // clicking next goes to the next chart; the dropdown jumps anywhere; export captures have no navigation
 await nav('9b-electricity-prices.html');await page.locator('[data-nav=next]').click();await page.waitForURL('**/10a-african-priorities.html');
 await nav('9b-electricity-prices.html');await page.locator('.studio-navigation select').selectOption('3a-burned-area.html');await page.waitForURL('**/3a-burned-area.html');
 await page.goto(base+'/3a-burned-area.html?export');assert.equal(await page.locator('.studio-navigation').count(),0,'no navigation in an export capture');
 assert.deepEqual(errors,[]);console.log(`PASS nav: arrows and dropdown on ${ordered.length-1} chart pages, click-through, jump, hidden in export`);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
