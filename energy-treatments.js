(() => {
 const params=new URLSearchParams(location.search);
 const frame=document.getElementById('frame');
 window.setEnergyVariant=(value)=>{
  const variant=Number(value);
  const safe=Number.isInteger(variant)&&variant>=1&&variant<=5?variant:1;
  frame.dataset.style=safe;
  window.energyPlayer.setVariant(safe);
  document.querySelectorAll('[data-variant]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.variant)===safe)));
  document.getElementById('styleDescription').textContent=ENERGY_LAYOUTS[safe].description;
  // Read at click time by the shared render client; the export uses the same URL style.
  const renderer=document.querySelector('script[data-chart-id="energy-transition"]');
  if(renderer)renderer.dataset.renderVariant=safe;
  if(!params.has('export')){
   const url=new URL(location.href);url.searchParams.set('variant',safe);
   history.replaceState(null,'',url);
  }
  window.dispatchEvent(new Event('energy-style-change'));
 };
 document.querySelectorAll('[data-variant]').forEach(button=>button.addEventListener('click',()=>window.setEnergyVariant(button.dataset.variant)));
 // The following script tag may not be parsed yet, so initialize after parsing finishes.
 const initialize=()=>window.setEnergyVariant(params.get('variant')||1);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize);else initialize();
})();
