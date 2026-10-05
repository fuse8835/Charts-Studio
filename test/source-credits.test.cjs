const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const charts=JSON.parse(fs.readFileSync(path.join(root,'_render/charts.json'),'utf8'));

// The standard source credit (set 2026-09-25): 27px at 1920 wide, white, bottom right. HTML notes use
// clamp(17px,1.7cqw,27px); credits drawn as SVG text use 17 viewBox units (= 27px at 1920 wide).
for(const c of charts){
 if(c.id==='co2-overlay')continue;
 test(`${c.id}: any source credit uses the standard size and white`,()=>{
  const html=fs.readFileSync(path.join(root,c.html),'utf8');
  const htmlNotes=html.match(/<div class="source-note">[^<]*<\/div>/g)||[];
  if(htmlNotes.length){
   const rule=html.match(/\.source-note\s*\{[^}]*\}/);
   assert.ok(rule,`${c.html}: .source-note rule`);
   assert.match(rule[0],/font-size:\s*clamp\(17px,\s*1\.7cqw,\s*27px\)/,`${c.html}: HTML source note size`);
   assert.match(rule[0],/color:\s*var\(--paper-050\)/,`${c.html}: HTML source note colour`);
  }
  const svgNotes=html.match(/<text[^>]*>\s*Sources?:[^<]*<\/text>/g)||[];
  for(const t of svgNotes){
   assert.match(t,/font-size:\s*17px/,`${c.html}: SVG source size -> ${t}`);
   assert.match(t,/fill:\s*#f8fbff/i,`${c.html}: SVG source colour -> ${t}`);
   assert.match(t,/text-anchor="end"/,`${c.html}: SVG source is right-aligned`);
  }
 });
}
