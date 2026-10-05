# Charts Studio contributor instructions

## Required design reference for future builds

Kevin approved the Style Sampler on October 5, 2026 as the default design standard for **all new charts and explainers**, and for requested restyles.

Before designing or implementing a new build:

1. Read [style-sampler-guide.md](style-sampler-guide.md).
2. Inspect the relevant example in [style-sampler.html](style-sampler.html), available from both local landing-page menus. Use [8a-energy-addition.html](8a-energy-addition.html) for the original approved gradient implementation.
3. Carry the shared canvas, Rajdhani typography, palette, bright-to-dark translucent gradients, thin coloured edges, subtle inner shadows and restrained organic waves into the appropriate marks. For unlisted chart types, follow the guide’s extension rules.
4. Preserve honest encoding and readability. Use colour plus labels or shapes; keep bars zero-based, bubble sizes proportional by area, and heatmap colours sequential. Reduce or omit decorative texture on small marks, uncertainty bands and intensity scales.
5. Follow the motion guidance: establish context, reveal data, then interpretation; preserve narration holds and deterministic seeking. An area gradient follows the highest currently revealed point, not the final peak. Sources belong at bottom right; navigation and controls stay out of exports.

Explicit user instructions override this reference. The sampler and written guide supersede conflicting visual rules in older style documents. Do not restyle existing charts unless requested. Sample values are illustrative, not source data for future charts.

Keep the sampler and its written guide consistent when the user approves changes to the design standard. Preserve unrelated local work and review the diff before publishing.
