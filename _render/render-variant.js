// Only this explainer exposes numbered art directions. Never accept a path from a request.
function resolveRenderVariant(chart, requested) {
 if(chart.id!=='energy-transition'||requested==null)return chart;
 if(!/^[1-5]$/.test(requested))throw new Error('Choose a visual treatment from 1 to 5.');
 const variant=Number(requested);
 return {...chart,variant,mov:`energy-transition-v${variant}-alpha.mov`};
}
module.exports={resolveRenderVariant};
