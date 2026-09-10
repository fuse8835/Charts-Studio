// ---------------------------------------------------------------------------
// ES3-only ExtendScript runtime. No arrow functions, no let/const, no
// template literals, no classes, no destructuring/spread — everything is
// "var" + "function" so this runs inside After Effects' ExtendScript engine.
// The CHART object above this block carries every number this runtime
// needs; this file only knows how to turn that data into AE layers.
// ---------------------------------------------------------------------------

function isKeyframeArray(arr) {
  return arr && arr.length > 0 && typeof arr[0] === 'object' && arr[0].t !== undefined;
}

function justificationFor(name) {
  if (name === 'center') return ParagraphJustification.CENTER_JUSTIFY;
  if (name === 'right') return ParagraphJustification.RIGHT_JUSTIFY;
  return ParagraphJustification.LEFT_JUSTIFY;
}

// Rajdhani has no Regular (400) weight — the family only ships Light(300),
// Medium(500), SemiBold(600), Bold(700). Every spec's fontWeight is one of
// those (pulled from the source chart's own CSS), so map it to the matching
// installed style name rather than guessing "Regular" as a fallback.
var RAJDHANI_STYLE_BY_WEIGHT = { 300: 'Light', 500: 'Medium', 600: 'SemiBold', 700: 'Bold' };

function setFont(td, weight) {
  var style = RAJDHANI_STYLE_BY_WEIGHT[weight] || 'Medium';
  try {
    td.fontFamily = 'Rajdhani';
    td.fontStyle = style;
    return;
  } catch (eFontFamily) {
    // fontFamily/fontStyle isn't settable on this AE version's TextDocument
    // — fall through to the legacy `font` property, which needs an exact
    // PostScript name (not the family display name) to resolve.
  }
  var psNames = ['Rajdhani-' + style, 'Rajdhani-Medium', 'Rajdhani'];
  for (var i = 0; i < psNames.length; i++) {
    try {
      td.font = psNames[i];
      return;
    } catch (eFont) {
      // try the next PostScript name candidate
    }
  }
  // Nothing resolved on this machine; AE keeps its own default font and
  // the hand-tune pass in After Effects should reapply Rajdhani manually.
}

// -- generic transform helpers ----------------------------------------------

function applyOpacitySpec(layer, kfs) {
  if (!kfs) return;
  var opacityProp = layer.property('Opacity');
  for (var i = 0; i < kfs.length; i++) {
    opacityProp.setValueAtTime(kfs[i].t, kfs[i].v);
  }
}

function applyScaleSpec(layer, kfs) {
  if (!kfs) return;
  var scaleProp = layer.property('Scale');
  for (var i = 0; i < kfs.length; i++) {
    scaleProp.setValueAtTime(kfs[i].t, [kfs[i].v, kfs[i].v]);
  }
}

function applyFastBlurSpec(layer, kfs) {
  if (!kfs) return;
  var effect = null;
  try {
    effect = layer.property('Effects').addProperty('ADBE Fast Blur 2');
  } catch (e1) {
    try {
      effect = layer.property('Effects').addProperty('ADBE Fast Blur');
    } catch (e2) {
      return; // effect unavailable on this AE install/version — skip quietly
    }
  }
  try {
    var blurriness = effect.property(1); // "Blurriness" — first visible param on both variants
    for (var i = 0; i < kfs.length; i++) {
      blurriness.setValueAtTime(kfs[i].t, kfs[i].v);
    }
  } catch (e3) {
    // best-effort only; not critical to the export
  }
}

/** Position handling covers three shapes coming from CHART.layers[n]:
 *   - spec.position is a plain [x,y]                -> static position
 *   - spec.position is [{t,v:[x,y]}, ...]            -> keyframed position
 *   - spec.positionOffset is [{t,v:[dx,dy]}, ...]     -> offset added to a
 *     base position (spec.position if present, else [0,0] for null layers) */
function applyPositionSpec(layer, spec) {
  var posProp = layer.property('Position');
  var hasKfPosition = spec.position && isKeyframeArray(spec.position);
  var base = spec.position && !hasKfPosition ? spec.position : [0, 0];

  if (hasKfPosition) {
    for (var i = 0; i < spec.position.length; i++) {
      posProp.setValueAtTime(spec.position[i].t, spec.position[i].v);
    }
    return;
  }

  if (spec.positionOffset) {
    for (var j = 0; j < spec.positionOffset.length; j++) {
      var off = spec.positionOffset[j].v;
      posProp.setValueAtTime(spec.positionOffset[j].t, [base[0] + off[0], base[1] + off[1]]);
    }
    return;
  }

  if (spec.position) {
    posProp.setValue(spec.position);
  }
}

function applyPopIn(layer, popIn) {
  var t0 = popIn.t0;
  var dur = popIn.dur;
  var scaleProp = layer.property('Scale');
  var opacityProp = layer.property('Opacity');
  scaleProp.setValueAtTime(t0, [0, 0]);
  opacityProp.setValueAtTime(t0, 0);
  scaleProp.setValueAtTime(t0 + dur * 0.7, [135, 135]);
  opacityProp.setValueAtTime(t0 + dur * 0.7, 100);
  scaleProp.setValueAtTime(t0 + dur, [100, 100]);
  opacityProp.setValueAtTime(t0 + dur, 100);
}

// -- layer builders -----------------------------------------------------

function createSolidLayer(comp, spec) {
  var sl = comp.layers.addSolid(spec.color, spec.name, comp.width, comp.height, 1, comp.duration);
  applyOpacitySpec(sl, spec.opacity);
  return sl;
}

function createNullLayer(comp, spec) {
  var nl = comp.layers.addNull(comp.duration);
  nl.name = spec.name;
  nl.property('Position').setValue([0, 0]);
  return nl;
}

function applyNullAnim(target, spec) {
  if (!target) return;
  applyOpacitySpec(target, spec.opacity);
  applyScaleSpec(target, spec.scale);
  applyPositionSpec(target, { positionOffset: spec.positionOffset });
  applyFastBlurSpec(target, spec.fastBlur);
}

function buildShapeObject(pathSpec) {
  var shape = new Shape();
  shape.vertices = pathSpec.vertices;
  shape.inTangents = pathSpec.inTangents;
  shape.outTangents = pathSpec.outTangents;
  shape.closed = !!pathSpec.closed;
  return shape;
}

function createShapeLayer(comp, spec) {
  var sl = comp.layers.addShape();
  sl.name = spec.name;

  var rootVectors = sl.property('ADBE Root Vectors Group');
  var group = rootVectors.addProperty('ADBE Vector Group');
  var groupContents = group.property('ADBE Vectors Group');

  var ringSpec = spec.ellipse || spec.ellipseRing;
  if (ringSpec) {
    var ellipse = groupContents.addProperty('ADBE Vector Shape - Ellipse');
    ellipse.property('ADBE Vector Ellipse Size').setValue([ringSpec.r * 2, ringSpec.r * 2]);
    ellipse.property('ADBE Vector Ellipse Position').setValue([0, 0]);
  } else if (spec.path) {
    var pathGroup = groupContents.addProperty('ADBE Vector Shape - Group');
    var pathProp = pathGroup.property('ADBE Vector Shape');
    pathProp.setValue(buildShapeObject(spec.path));
  }

  if (spec.fill) {
    var fillProp = groupContents.addProperty('ADBE Vector Graphic - Fill');
    fillProp.property('ADBE Vector Fill Color').setValue(spec.fill.color);
    fillProp.property('ADBE Vector Fill Opacity').setValue(spec.fill.opacity);
  }

  if (spec.stroke) {
    var strokeProp = groupContents.addProperty('ADBE Vector Graphic - Stroke');
    strokeProp.property('ADBE Vector Stroke Color').setValue(spec.stroke.color);
    strokeProp.property('ADBE Vector Stroke Width').setValue(spec.stroke.width);
    strokeProp.property('ADBE Vector Stroke Opacity').setValue(spec.stroke.opacity);
    if (spec.stroke.cap === 'round') {
      try {
        strokeProp.property('ADBE Vector Stroke Line Cap').setValue(LineCapType.ROUND);
      } catch (eCap) {
        // non-fatal styling detail
      }
    }
  }

  if (spec.trimPath) {
    var trim = groupContents.addProperty('ADBE Vector Filter - Trim');
    var trimEnd = trim.property('ADBE Vector Trim End');
    trimEnd.setValueAtTime(spec.trimPath.t0, spec.trimPath.from);
    trimEnd.setValueAtTime(spec.trimPath.t1, spec.trimPath.to);
  }

  if (spec.maskRect) {
    var mr = spec.maskRect;
    var mask = sl.Masks.addProperty('ADBE Mask Atom');
    var startShape = new Shape();
    startShape.vertices = [[mr.x0, mr.yTop], [mr.x1, mr.yTop], [mr.x1, mr.yBottom], [mr.x0, mr.yBottom]];
    startShape.closed = true;
    var endShape = new Shape();
    endShape.vertices = [[mr.x0, mr.yTop], [mr.x1End, mr.yTop], [mr.x1End, mr.yBottom], [mr.x0, mr.yBottom]];
    endShape.closed = true;
    mask.maskShape.setValueAtTime(mr.t0, startShape);
    mask.maskShape.setValueAtTime(mr.t1, endShape);
  }

  applyPositionSpec(sl, spec);
  if (spec.rotation !== undefined) sl.property('Rotation').setValue(spec.rotation);
  applyOpacitySpec(sl, spec.opacity);
  if (spec.popIn) applyPopIn(sl, spec.popIn);

  return sl;
}

function createTextLayer(comp, spec) {
  var initialText = spec.text !== undefined ? spec.text : (spec.textKeyframes ? spec.textKeyframes[0].v : '');
  // boxText can't be turned on after the fact — AE only creates paragraph
  // (box) text via LayerCollection.addBoxText() at creation time; trying to
  // set .boxText = true on a point-text layer's TextDocument later throws
  // "readOnly attribute". Point text keeps using addText() as before.
  var tl = spec.box ? comp.layers.addBoxText(spec.box, initialText) : comp.layers.addText(initialText);
  tl.name = spec.name;

  if (spec.box) {
    // addBoxText() defaults the layer's Anchor Point to the box's own
    // center, not its top-left corner — so a Position spec written assuming
    // "position = top-left of the box" (as every other layer in this file
    // assumes) lands the box way off from where it was meant to sit. Anchor
    // at [0,0] so Position maps directly to the box's top-left corner.
    tl.property('Anchor Point').setValue([0, 0]);
  }

  // Mutate the layer-associated TextDocument (textProp.value), not a fresh
  // new TextDocument() — an unassociated document fails "not associated
  // with a layer" on setValue() for every layer, not just box-text ones.
  var textProp = tl.property('Source Text');
  var td = textProp.value;
  setFont(td, spec.fontWeight);
  td.fontSize = spec.fontSize;
  // Freshly-created text (box text especially) defaults to 0 leading in
  // AE's scripting API, which stacks every wrapped line exactly on top of
  // the last one instead of spacing them out. Always set it explicitly.
  td.leading = spec.fontSize * 1.2;
  td.applyFill = true;
  td.fillColor = spec.color;
  td.justification = justificationFor(spec.justification || 'left');
  if (spec.box) {
    td.boxTextPos = [0, 0];
    td.boxTextSize = spec.box;
  }
  textProp.setValue(td);

  if (spec.textKeyframes) {
    for (var i = 0; i < spec.textKeyframes.length; i++) {
      var tdk = textProp.value;
      tdk.text = String(spec.textKeyframes[i].v);
      textProp.setValueAtTime(spec.textKeyframes[i].t, tdk);
    }
  }

  applyPositionSpec(tl, spec);
  if (spec.rotation !== undefined) tl.property('Rotation').setValue(spec.rotation);
  applyOpacitySpec(tl, spec.opacity);

  return tl;
}

// -- main ---------------------------------------------------------------

function main() {
  var meta = CHART.meta;
  var comp = app.project.items.addComp(meta.compName, meta.width, meta.height, 1, meta.durationSeconds, meta.frameRate);

  var layerById = {};
  var errors = [];
  var created = 0;

  for (var i = 0; i < CHART.layers.length; i++) {
    var spec = CHART.layers[i];
    try {
      if (spec.kind === 'solid') {
        createSolidLayer(comp, spec);
        created++;
      } else if (spec.kind === 'null') {
        var nl = createNullLayer(comp, spec);
        layerById[spec.id] = nl;
        created++;
      } else if (spec.kind === 'nullAnim') {
        applyNullAnim(layerById[spec.targetId], spec);
      } else if (spec.kind === 'shape') {
        var sl = createShapeLayer(comp, spec);
        if (spec.parent && layerById[spec.parent]) sl.parent = layerById[spec.parent];
        created++;
      } else if (spec.kind === 'text') {
        var tl = createTextLayer(comp, spec);
        if (spec.parent && layerById[spec.parent]) tl.parent = layerById[spec.parent];
        created++;
      }
    } catch (e) {
      errors.push('[' + i + '] ' + (spec.name || spec.kind) + ': ' + e.toString());
    }
  }

  var msg = 'Cooling Curve AE export\n' + created + ' layer(s) created in "' + meta.compName + '".';
  if (errors.length > 0) {
    msg += '\n\n' + errors.length + ' issue(s) (these layers were skipped — see README troubleshooting):\n' + errors.join('\n');
  } else {
    msg += '\n\nNo errors. Remember: easing is linear/EasyEase approximations — hand-tune curves, add motion blur / glows, and time-remap as needed.';
  }
  alert(msg);
}

app.beginUndoGroup('Build Cooling Curve comp from generator');
try {
  main();
} finally {
  app.endUndoGroup();
}
