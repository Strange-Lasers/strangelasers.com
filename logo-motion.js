const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const PATH_COORDINATE_CACHE = Symbol("path-coordinate-cache");
const HIDDEN_DISPLAY_VALUE = "none";
const FORCE_ANIMATION_CLASS = "force-animation";
const FEATURE_DISABLED_VALUE = "off";
const EYE_COLOR_QUERY_PARAMETER = "eye-color";
const EYE_COOLDOWN_QUERY_PARAMETER = "eye-cooldown";
const FPS_QUERY_PARAMETER = "fps";
const RENDERER_QUERY_PARAMETER = "renderer";
const SVG_RENDERER_VALUE = "svg";
const WEBGL_RENDERER_VALUE = "webgl";
const WEBGL_API_NAME = "StrangeLasersWebGL";
const WEBGL_STATUS = Object.freeze({
  active: "active",
  contextLost: "context-lost",
  fallback: "fallback",
  ready: "ready",
  renderFailed: "render-failed",
  unavailable: "unavailable",
});
const MOTION_SAMPLE_SELECTOR = "[data-motion-variant]";
const VISUAL_SELECTOR = ".sample-visual";
const MOTION_RENDERED_CLASS = "motion-rendered";
const WEBGL_RENDERED_CLASS = "webgl-rendered";
const WEBGL_CANVAS_CLASS = "projected-webgl";
const STATIC_FALLBACK_ATTRIBUTE = "data-static-fallback";
const EYE_TRACKING_ACTIVE_CLASS = "eye-tracking-active";
const FPS_COUNTER_CLASS = "fps-counter";
const SPEED_RANGE_SELECTOR = "[data-speed-range]";
const SPEED_NUMBER_SELECTOR = "[data-speed-number]";
const FRAME_BACK_SELECTOR = "[data-frame-back]";
const PLAY_TOGGLE_SELECTOR = "[data-play-toggle]";
const FRAME_FORWARD_SELECTOR = "[data-frame-forward]";
const FRAME_NUMBER_SELECTOR = "[data-frame-number]";
const FRAME_TOTAL_SELECTOR = "[data-frame-total]";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const MASTER_DURATION_MS = 6000;
const MOTION_INTRO_HOLD_DURATION_MS = 1000;
const MOTION_INTRO_BLOOM_ATTACK_MS = 100;
const MOTION_INTRO_BLOOM_RELEASE_MS = 240;
const MOTION_INTRO_START_DELAY_MS =
  MOTION_INTRO_HOLD_DURATION_MS + MOTION_INTRO_BLOOM_ATTACK_MS;
const MOTION_INTRO_DURATION_MS = 1500;
const FPS_SAMPLE_DURATION_MS = 1000;
const DEFAULT_PLAYBACK_RATE = 0.5;
const ANIMATION_FRAME_RATE = 60;
const ANIMATION_FRAME_DURATION_MS = 1000 / ANIMATION_FRAME_RATE;
const ANIMATION_FRAME_COUNT = Math.round(
  MASTER_DURATION_MS / ANIMATION_FRAME_DURATION_MS,
);
const FRAME_INDEX_EPSILON = 0.0000001;
const BACKWARD_FRAME_DIRECTION = -1;
const FORWARD_FRAME_DIRECTION = 1;
const INNER_TURNS_PER_LOOP = 4;
const OUTER_TURNS_PER_LOOP = 1;
const VIEWBOX_SIZE = 512;
const VIEWBOX_CENTER = VIEWBOX_SIZE / 2;
const PERSPECTIVE_DISTANCE = 720;
const CURVE_SAMPLE_COUNT = 96;
const STATIC_PHASE = 0;
const DEPTH_CROSSING = 0;
const TAU = Math.PI * 2;
const QUARTER_TURN = Math.PI / 2;
const DEGREES_PER_RADIAN = 180 / Math.PI;
const PATH_PRECISION = 2;
const CAP_GLOW_RADIUS = 20;
const CAP_SHELL_RADIUS = 13;
const CAP_BODY_RADIUS = 11;
const CAP_FACE_RADIUS = 9;
const BEAM_SHELL_WIDTH = 40;
const CYAN_BEAM_INDEX = 0;
const PURPLE_BEAM_INDEX = 1;
const WEAVE_OVERLAY_RADIUS = BEAM_SHELL_WIDTH * 1.3;
const WEAVE_ENDPOINT_OVERLAY_RADIUS = WEAVE_OVERLAY_RADIUS;
const WEAVE_JOIN_OVERLAP = 2;
const DEPTH_ORDER_EPSILON = 0.01;
const INTERSECTION_EPSILON = 0.0001;
const INTERSECTION_MERGE_DISTANCE = 1;
const EYE_GLOW_RADIUS = 66;
const EYE_GLOW_OPACITY = 0.18;
const EYE_GLOW_STROKE_WIDTH = 14;
const EYE_LENS_RADIUS = 47;
const EYE_LENS_STROKE_WIDTH = 6;
const EYE_DOT_RADIUS = 12;
const EYE_DOT_MAX_TRAVEL_RADIUS =
  EYE_LENS_RADIUS - EYE_DOT_RADIUS - EYE_LENS_STROKE_WIDTH;
const EYE_TRACKING_TRAVEL_RATIO = 0.4;
const EYE_DOT_TRAVEL_RADIUS =
  EYE_DOT_MAX_TRAVEL_RADIUS * EYE_TRACKING_TRAVEL_RATIO;
const EYE_TRACKING_RESPONSE_RADIUS = VIEWBOX_CENTER;
const EYE_TRACKING_SMOOTHING_MS = 80;
const EYE_TRACKING_SETTLE_DISTANCE = 0.01;
const EYE_TRACKING_COOLDOWN_MS = 1400;
const EYE_CENTER_OFFSET = Object.freeze({ x: 0, y: 0 });
const EYE_OCCLUSION_RADIUS = 72;
const EYE_LENS_COLORS = Object.freeze([
  "#13263d",
  "#07111e",
  "#02060c",
]);

const motionQuery = new URLSearchParams(window.location.search);
const FEATURE_SWITCHES = Object.freeze({
  eyeColor:
    motionQuery.get(EYE_COLOR_QUERY_PARAMETER) !==
    FEATURE_DISABLED_VALUE,
  eyeCooldown:
    motionQuery.get(EYE_COOLDOWN_QUERY_PARAMETER) !==
    FEATURE_DISABLED_VALUE,
  fps: motionQuery.has(FPS_QUERY_PARAMETER),
});
const rendererPreference = motionQuery.get(
  RENDERER_QUERY_PARAMETER,
);

const FILTER_CONFIG = Object.freeze({
  tight: Object.freeze({
    blur: 6,
    extent: 45,
  }),
  wide: Object.freeze({
    blur: 18,
    extent: 60,
  }),
});

function paletteColor(property) {
  const value = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue(property)
    .trim();

  if (!value) {
    throw new Error(`Missing brand color ${property}`);
  }

  return value;
}

const BRAND_COLORS = Object.freeze({
  background: paletteColor("--laser-background"),
  core: paletteColor("--laser-core"),
  cyan: Object.freeze({
    body: paletteColor("--laser-cyan-body"),
    highlight: paletteColor("--laser-cyan-highlight"),
    side: paletteColor("--laser-cyan-side"),
  }),
  purple: Object.freeze({
    body: paletteColor("--laser-purple-body"),
    highlight: paletteColor("--laser-purple-highlight"),
    side: paletteColor("--laser-purple-side"),
  }),
});

const BEAM_LAYERS = Object.freeze([
  Object.freeze({
    bloom: Object.freeze({
      name: "wide-glow",
      opacity: 0.34,
      width: 106,
    }),
    className: "projected-beam projected-beam--wide-glow",
    color: "body",
    filter: "wide",
    opacity: 0.12,
    width: 88,
  }),
  Object.freeze({
    bloom: Object.freeze({
      name: "tight-glow",
      opacity: 0.48,
      width: 66,
    }),
    className: "projected-beam projected-beam--tight-glow",
    color: "body",
    filter: "tight",
    opacity: 0.22,
    width: 52,
  }),
  Object.freeze({
    className: "projected-beam projected-beam--shell",
    color: "side",
    opacity: 0.96,
    width: BEAM_SHELL_WIDTH,
  }),
  Object.freeze({
    className: "projected-beam projected-beam--body",
    color: "body",
    opacity: 1,
    width: 30,
  }),
  Object.freeze({
    bloom: Object.freeze({
      name: "highlight",
      opacity: 1,
      width: 24,
    }),
    className: "projected-beam projected-beam--highlight",
    color: "highlight",
    opacity: 0.9,
    width: 14,
  }),
  Object.freeze({
    bloom: Object.freeze({
      name: "core",
      opacity: 1,
      width: 9,
    }),
    className: "projected-beam projected-beam--core",
    color: "core",
    opacity: 1,
    width: 3.5,
  }),
]);

const SOLID_BEAM_LAYERS = Object.freeze(
  BEAM_LAYERS.filter((layer) => !layer.filter),
);
const ENDPOINT_LAYERS = Object.freeze([
  Object.freeze({
    color: "side",
    radius: CAP_SHELL_RADIUS,
  }),
  Object.freeze({
    color: "body",
    radius: CAP_BODY_RADIUS,
  }),
  Object.freeze({
    color: "core",
    radius: CAP_FACE_RADIUS,
  }),
]);

const BEAMS = Object.freeze([
  Object.freeze({
    body: BRAND_COLORS.cyan.body,
    core: BRAND_COLORS.core,
    curve: Object.freeze([
      Object.freeze({ x: 70, y: 362 }),
      Object.freeze({ x: 110, y: 84 }),
      Object.freeze({ x: 402, y: 84 }),
      Object.freeze({ x: 442, y: 362 }),
    ]),
    endCap: "round",
    highlight: BRAND_COLORS.cyan.highlight,
    id: "cyan",
    side: BRAND_COLORS.cyan.side,
    startCap: "square",
  }),
  Object.freeze({
    body: BRAND_COLORS.purple.body,
    core: BRAND_COLORS.core,
    curve: Object.freeze([
      Object.freeze({ x: 64, y: 142 }),
      Object.freeze({ x: 124, y: 426 }),
      Object.freeze({ x: 388, y: 426 }),
      Object.freeze({ x: 448, y: 142 }),
    ]),
    endCap: "square",
    highlight: BRAND_COLORS.purple.highlight,
    id: "purple",
    side: BRAND_COLORS.purple.side,
    startCap: "round",
  }),
]);

const sampledBeams = BEAMS.map((beam) => ({
  ...beam,
  points: sampleCurve(beam.curve),
}));

const motionPreference = window.matchMedia(REDUCED_MOTION_QUERY);
const renderedMarks = [];
let animationFrameId;
let animationPhase = STATIC_PHASE;
let animationPaused = false;
let eyeTrackingCooldownId;
let eyeTrackingFrameId;
let fpsCounter;
let fpsFrameCount = 0;
let fpsSampleStartTimestamp;
let motionIntroBloom = 0;
let motionIntroProgress = 1;
let motionIntroStartTimestamp;
let frameNumberControl;
let playbackRate = DEFAULT_PLAYBACK_RATE;
let previousEyeTrackingTimestamp;
let previousAnimationTimestamp;

function createSvgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NAMESPACE, name);

  for (const [attribute, value] of Object.entries(attributes)) {
    element.setAttribute(attribute, String(value));
  }

  return element;
}

function sampleCurve(curve) {
  const points = [];

  for (let index = 0; index <= CURVE_SAMPLE_COUNT; index += 1) {
    const position = index / CURVE_SAMPLE_COUNT;
    const inverse = 1 - position;
    const inverseSquared = inverse * inverse;
    const positionSquared = position * position;
    points.push({
      x:
        inverseSquared * inverse * curve[0].x +
        3 * inverseSquared * position * curve[1].x +
        3 * inverse * positionSquared * curve[2].x +
        positionSquared * position * curve[3].x,
      y:
        inverseSquared * inverse * curve[0].y +
        3 * inverseSquared * position * curve[1].y +
        3 * inverse * positionSquared * curve[2].y +
        positionSquared * position * curve[3].y,
    });
  }

  return points;
}

function createBlurFilter(definitions, id, config) {
  const filter = createSvgElement("filter", {
    height: `${100 + config.extent * 2}%`,
    id,
    width: `${100 + config.extent * 2}%`,
    x: `-${config.extent}%`,
    y: `-${config.extent}%`,
  });
  filter.append(
    createSvgElement("feGaussianBlur", {
      stdDeviation: config.blur,
    }),
  );
  definitions.append(filter);
}

function createDefinitions(prefix) {
  const definitions = createSvgElement("defs");
  const filterIds = {
    tight: `${prefix}-tight-glow`,
    wide: `${prefix}-wide-glow`,
  };
  const lensGradientId = `${prefix}-lens`;
  const occlusionGradientId = `${prefix}-occlusion-gradient`;
  const occlusionMaskId = `${prefix}-occlusion-mask`;

  createBlurFilter(
    definitions,
    filterIds.tight,
    FILTER_CONFIG.tight,
  );
  createBlurFilter(
    definitions,
    filterIds.wide,
    FILTER_CONFIG.wide,
  );

  const lensGradient = createSvgElement("radialGradient", {
    cx: "36%",
    cy: "30%",
    id: lensGradientId,
    r: "76%",
  });
  lensGradient.append(
    createSvgElement("stop", {
      offset: "0%",
      "stop-color": EYE_LENS_COLORS[0],
      "stop-opacity": 0.8,
    }),
    createSvgElement("stop", {
      offset: "62%",
      "stop-color": EYE_LENS_COLORS[1],
      "stop-opacity": 0.87,
    }),
    createSvgElement("stop", {
      offset: "100%",
      "stop-color": EYE_LENS_COLORS[2],
      "stop-opacity": 0.94,
    }),
  );
  definitions.append(lensGradient);

  const occlusionGradient = createSvgElement("radialGradient", {
    id: occlusionGradientId,
  });
  occlusionGradient.append(
    createSvgElement("stop", {
      offset: "0%",
      "stop-color": "#fff",
      "stop-opacity": 1,
    }),
    createSvgElement("stop", {
      offset: "68%",
      "stop-color": "#fff",
      "stop-opacity": 1,
    }),
    createSvgElement("stop", {
      offset: "100%",
      "stop-color": "#fff",
      "stop-opacity": 0,
    }),
  );
  const occlusionMask = createSvgElement("mask", {
    height: VIEWBOX_SIZE,
    id: occlusionMaskId,
    maskUnits: "userSpaceOnUse",
    width: VIEWBOX_SIZE,
    x: 0,
    y: 0,
  });
  occlusionMask.append(
    createSvgElement("circle", {
      cx: VIEWBOX_CENTER,
      cy: VIEWBOX_CENTER,
      fill: `url(#${occlusionGradientId})`,
      r: EYE_OCCLUSION_RADIUS,
    }),
  );
  definitions.append(occlusionGradient, occlusionMask);

  return {
    definitions,
    filterIds,
    lensGradientId,
    occlusionMaskId,
  };
}

function createEndpointGlowGradient(
  definitions,
  id,
  color,
) {
  const gradient = createSvgElement("radialGradient", {
    id,
  });
  gradient.append(
    createSvgElement("stop", {
      offset: "0%",
      "stop-color": color,
      "stop-opacity": 0.2,
    }),
    createSvgElement("stop", {
      offset: "55%",
      "stop-color": color,
      "stop-opacity": 0.1,
    }),
    createSvgElement("stop", {
      offset: "100%",
      "stop-color": color,
      "stop-opacity": 0,
    }),
  );
  definitions.append(gradient);
}

function createPathGeometry(definitions, id) {
  const path = createSvgElement("path", {
    d: "",
    id,
  });
  definitions.append(path);
  return path;
}

function createBeamLayers(
  parent,
  definitions,
  prefix,
  beam,
  filterIds,
  layers = BEAM_LAYERS,
) {
  const hasFilteredLayers = layers.some(
    (layer) => layer.filter,
  );
  const fullPath = hasFilteredLayers
    ? createPathGeometry(definitions, `${prefix}-full`)
    : undefined;
  const solidPath = createPathGeometry(
    definitions,
    `${prefix}-solid`,
  );

  for (const layer of layers) {
    const attributes = {
      class: layer.className,
      fill: "none",
      href: `#${layer.filter ? fullPath.id : solidPath.id}`,
      opacity: layer.opacity,
      stroke: beam[layer.color],
      "stroke-linecap": "butt",
      "stroke-linejoin": "round",
      "stroke-width": layer.width,
    };

    if (layer.filter) {
      attributes.filter = `url(#${filterIds[layer.filter]})`;
    }

    parent.append(createSvgElement("use", attributes));
  }

  return {
    fullPath,
    solidPath,
  };
}

function createCapShape(kind, radius, attributes) {
  if (kind === "round") {
    return createSvgElement("circle", {
      ...attributes,
      cx: 0,
      cy: 0,
      r: radius,
    });
  }

  return createSvgElement("rect", {
    ...attributes,
    height: radius * 2,
    rx: Math.max(1, radius * 0.16),
    width: radius * 2,
    x: -radius,
    y: -radius,
  });
}

function createEndpoint(kind, beam, glowGradientId) {
  const endpoint = createSvgElement("g", {
    class: "projected-endpoint",
  });
  endpoint.append(
    createSvgElement("circle", {
      fill: `url(#${glowGradientId})`,
      r: CAP_GLOW_RADIUS,
    }),
    createCapShape(kind, CAP_SHELL_RADIUS, {
      fill: beam.side,
    }),
    createCapShape(kind, CAP_BODY_RADIUS, {
      fill: beam.body,
    }),
    createCapShape(kind, CAP_FACE_RADIUS, {
      fill: beam.core,
    }),
  );
  return endpoint;
}

function createEye(filterIds, lensGradientId) {
  const eye = createSvgElement("g", {
    class: "projected-eye",
  });
  eye.append(
    createSvgElement("circle", {
      cx: VIEWBOX_CENTER,
      cy: VIEWBOX_CENTER,
      fill: "none",
      filter: `url(#${filterIds.wide})`,
      opacity: EYE_GLOW_OPACITY,
      r: EYE_GLOW_RADIUS,
      stroke: BRAND_COLORS.purple.body,
      "stroke-width": EYE_GLOW_STROKE_WIDTH,
    }),
    createSvgElement("circle", {
      cx: VIEWBOX_CENTER,
      cy: VIEWBOX_CENTER,
      fill: `url(#${lensGradientId})`,
      r: EYE_LENS_RADIUS,
      stroke: BRAND_COLORS.core,
      "stroke-width": EYE_LENS_STROKE_WIDTH,
    }),
  );
  return eye;
}

function createEyeDot(filterIds) {
  const dot = createSvgElement("g", {
    class: "projected-eye-dot",
  });
  dot.append(
    createSvgElement("circle", {
      cx: VIEWBOX_CENTER,
      cy: VIEWBOX_CENTER,
      fill: BRAND_COLORS.core,
      filter: `url(#${filterIds.tight})`,
      opacity: 0.14,
      r: EYE_DOT_RADIUS * 1.65,
    }),
    createSvgElement("circle", {
      cx: VIEWBOX_CENTER,
      cy: VIEWBOX_CENTER,
      fill: BRAND_COLORS.core,
      r: EYE_DOT_RADIUS,
    }),
  );
  return dot;
}

function createWeaveReference(
  beam,
  definitions,
  prefix,
  filterIds,
  endpointGlowId,
) {
  const baseGroup = createSvgElement("g", {
    class: `projected-weave projected-weave--base projected-weave--${beam.id}`,
    display: "none",
  });
  const frontGroup = createSvgElement("g", {
    class: `projected-weave projected-weave--front projected-weave--${beam.id}`,
    display: "none",
  });
  const baseGeometry = createBeamLayers(
    baseGroup,
    definitions,
    `${prefix}-base`,
    beam,
    filterIds,
    SOLID_BEAM_LAYERS,
  );
  const frontGeometry = createBeamLayers(
    frontGroup,
    definitions,
    `${prefix}-front`,
    beam,
    filterIds,
    SOLID_BEAM_LAYERS,
  );
  const startBaseEndpoint = createEndpoint(
    beam.startCap,
    beam,
    endpointGlowId,
  );
  const endBaseEndpoint = createEndpoint(
    beam.endCap,
    beam,
    endpointGlowId,
  );
  const startFrontEndpoint = createEndpoint(
    beam.startCap,
    beam,
    endpointGlowId,
  );
  const endFrontEndpoint = createEndpoint(
    beam.endCap,
    beam,
    endpointGlowId,
  );

  for (const endpoint of [
    startBaseEndpoint,
    endBaseEndpoint,
    startFrontEndpoint,
    endFrontEndpoint,
  ]) {
    endpoint.setAttribute("display", HIDDEN_DISPLAY_VALUE);
  }

  baseGroup.append(startBaseEndpoint, endBaseEndpoint);
  frontGroup.append(startFrontEndpoint, endFrontEndpoint);

  return {
    baseGeometry,
    baseGroup,
    endBaseEndpoint,
    endFrontEndpoint,
    frontGeometry,
    frontGroup,
    startBaseEndpoint,
    startFrontEndpoint,
  };
}

function deactivateWebglSample(
  sample,
  status = WEBGL_STATUS.fallback,
) {
  sample.classList.remove(WEBGL_RENDERED_CLASS);
  sample.dataset.motionRenderer = SVG_RENDERER_VALUE;
  sample.dataset.webglStatus = status;
}

function webglRendererConfig(sample) {
  return {
    beams: BEAMS.map((beam) => ({
      endCap: beam.endCap,
      startCap: beam.startCap,
    })),
    colors: BRAND_COLORS,
    endpoint: {
      glowRadius: CAP_GLOW_RADIUS,
      layers: ENDPOINT_LAYERS,
    },
    eye: {
      glowBlur: FILTER_CONFIG.wide.blur,
      glowOpacity: EYE_GLOW_OPACITY,
      glowRadius: EYE_GLOW_RADIUS,
      glowStrokeWidth: EYE_GLOW_STROKE_WIDTH,
      lensColors: EYE_LENS_COLORS,
      lensRadius: EYE_LENS_RADIUS,
      lensStrokeWidth: EYE_LENS_STROKE_WIDTH,
      occlusionRadius: EYE_OCCLUSION_RADIUS,
    },
    filters: FILTER_CONFIG,
    layers: BEAM_LAYERS,
    onContextLost: () => {
      deactivateWebglSample(
        sample,
        WEBGL_STATUS.contextLost,
      );
    },
    onRenderError: (error) => {
      deactivateWebglSample(
        sample,
        WEBGL_STATUS.renderFailed,
      );
      console.warn("WebGL renderer failed", error);
    },
    viewboxSize: VIEWBOX_SIZE,
  };
}

function createWebglRenderer(canvas, sample) {
  if (rendererPreference === SVG_RENDERER_VALUE) {
    return undefined;
  }

  const api = window[WEBGL_API_NAME];

  if (!api) {
    return undefined;
  }

  return api.create(canvas, webglRendererConfig(sample));
}

function createProjectedMark(sample, index) {
  const variant = sample.dataset.motionVariant;
  const prefix = `projected-${index}-${variant}`;
  const svg = createSvgElement("svg", {
    "aria-hidden": "true",
    class: "mark projected-mark",
    focusable: "false",
    viewBox: `0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`,
  });
  const {
    definitions,
    filterIds,
    lensGradientId,
    occlusionMaskId,
  } = createDefinitions(prefix);
  const endpointGlowIds = Object.fromEntries(
    sampledBeams.map((beam) => {
      const id = `${prefix}-${beam.id}-endpoint-glow`;
      createEndpointGlowGradient(
        definitions,
        id,
        beam.body,
      );
      return [beam.id, id];
    }),
  );
  const baseDepth = createSvgElement("g", {
    class: "projected-depth projected-depth--base",
  });
  const frontDepth = createSvgElement("g", {
    class: "projected-depth projected-depth--front",
    mask: `url(#${occlusionMaskId})`,
  });
  const baseWeaveDepth = createSvgElement("g", {
    class: "projected-weave-depth projected-weave-depth--base",
  });
  const frontWeaveDepth = createSvgElement("g", {
    class: "projected-weave-depth projected-weave-depth--front",
    mask: `url(#${occlusionMaskId})`,
  });
  const beamReferences = sampledBeams.map((beam) => {
    const baseBeam = createSvgElement("g", {
      class: `projected-beam-group projected-beam-group--${beam.id}`,
    });
    const frontBeam = createSvgElement("g", {
      class: `projected-beam-group projected-beam-group--${beam.id}`,
    });

    const baseGeometry = createBeamLayers(
      baseBeam,
      definitions,
      `${prefix}-${beam.id}-base`,
      beam,
      filterIds,
    );
    const frontGeometry = createBeamLayers(
      frontBeam,
      definitions,
      `${prefix}-${beam.id}-front`,
      beam,
      filterIds,
    );
    const startBaseEndpoint = createEndpoint(
      beam.startCap,
      beam,
      endpointGlowIds[beam.id],
    );
    const endBaseEndpoint = createEndpoint(
      beam.endCap,
      beam,
      endpointGlowIds[beam.id],
    );
    const startFrontEndpoint = createEndpoint(
      beam.startCap,
      beam,
      endpointGlowIds[beam.id],
    );
    const endFrontEndpoint = createEndpoint(
      beam.endCap,
      beam,
      endpointGlowIds[beam.id],
    );
    baseBeam.append(
      startBaseEndpoint,
      endBaseEndpoint,
    );
    frontBeam.append(
      startFrontEndpoint,
      endFrontEndpoint,
    );
    baseDepth.append(baseBeam);
    frontDepth.append(frontBeam);

    return {
      baseGeometry,
      beam,
      endBaseEndpoint,
      endFrontEndpoint,
      frontGeometry,
      startBaseEndpoint,
      startFrontEndpoint,
    };
  });
  const weaveReferences = sampledBeams.map(() => []);
  const eyeDot = createEyeDot(filterIds);

  svg.append(
    definitions,
    baseDepth,
    baseWeaveDepth,
    createEye(filterIds, lensGradientId),
    frontDepth,
    frontWeaveDepth,
    eyeDot,
  );
  const canvas = document.createElement("canvas");
  canvas.className = WEBGL_CANVAS_CLASS;
  canvas.setAttribute("aria-hidden", "true");
  const visual = sample.querySelector(VISUAL_SELECTOR);
  visual.append(canvas, svg);
  const webglRenderer = createWebglRenderer(canvas, sample);

  if (webglRenderer) {
    sample.dataset.motionRenderer = SVG_RENDERER_VALUE;
    sample.dataset.webglStatus = WEBGL_STATUS.ready;
  } else {
    canvas.remove();
    deactivateWebglSample(sample, WEBGL_STATUS.unavailable);
  }

  return {
    baseWeaveDepth,
    beamReferences,
    currentEyeOffset: EYE_CENTER_OFFSET,
    definitions,
    endpointGlowIds,
    eyeDot,
    filterIds,
    frontWeaveDepth,
    prefix,
    sample,
    svg,
    targetEyeOffset: EYE_CENTER_OFFSET,
    variant,
    webglActive: false,
    webglRenderer,
    weaveOrder: [],
    weaveReferences,
  };
}

function eyeOffsetForPointer(mark, clientX, clientY) {
  const bounds = mark.svg.getBoundingClientRect();

  if (bounds.width === 0 || bounds.height === 0) {
    return { x: 0, y: 0 };
  }

  const localDeltaX =
    (clientX - bounds.left - bounds.width / 2) *
    (VIEWBOX_SIZE / bounds.width);
  const localDeltaY =
    (clientY - bounds.top - bounds.height / 2) *
    (VIEWBOX_SIZE / bounds.height);
  const responseScale =
    EYE_DOT_TRAVEL_RADIUS / EYE_TRACKING_RESPONSE_RADIUS;
  const targetX = localDeltaX * responseScale;
  const targetY = localDeltaY * responseScale;
  const targetDistance = Math.hypot(targetX, targetY);
  const travelScale =
    targetDistance > EYE_DOT_TRAVEL_RADIUS
      ? EYE_DOT_TRAVEL_RADIUS / targetDistance
      : 1;

  return {
    x: targetX * travelScale,
    y: targetY * travelScale,
  };
}

function trackEyes(pointerEvent) {
  for (const mark of renderedMarks) {
    if (FEATURE_SWITCHES.eyeColor) {
      mark.eyeDot.classList.add(EYE_TRACKING_ACTIVE_CLASS);
    }
    mark.targetEyeOffset = eyeOffsetForPointer(
      mark,
      pointerEvent.clientX,
      pointerEvent.clientY,
    );
  }

  if (FEATURE_SWITCHES.eyeCooldown) {
    scheduleEyeTrackingCooldown();
  }
  startEyeTrackingTransition();
}

function trackTouchEyes(touchEvent) {
  const touch = touchEvent.touches[0];

  if (!touch) {
    return;
  }

  trackEyes(touch);
}

function deactivateEyeTracking() {
  eyeTrackingCooldownId = undefined;

  for (const mark of renderedMarks) {
    mark.eyeDot.classList.remove(EYE_TRACKING_ACTIVE_CLASS);
    mark.targetEyeOffset = EYE_CENTER_OFFSET;
  }

  startEyeTrackingTransition();
}

function scheduleEyeTrackingCooldown() {
  if (eyeTrackingCooldownId !== undefined) {
    window.clearTimeout(eyeTrackingCooldownId);
  }

  eyeTrackingCooldownId = window.setTimeout(
    deactivateEyeTracking,
    EYE_TRACKING_COOLDOWN_MS,
  );
}

function positionEyeDot(mark) {
  const { x, y } = mark.currentEyeOffset;

  mark.eyeDot.setAttribute(
    "transform",
    `translate(${formatCoordinate(x)} ${formatCoordinate(y)})`,
  );
}

function easeEyeTracking(timestamp) {
  const elapsed = Math.max(
    timestamp - previousEyeTrackingTimestamp,
    0,
  );
  const progress =
    1 - Math.exp(-elapsed / EYE_TRACKING_SMOOTHING_MS);
  let unsettled = false;

  for (const mark of renderedMarks) {
    const nextOffset = {
      x:
        mark.currentEyeOffset.x +
        (mark.targetEyeOffset.x - mark.currentEyeOffset.x) *
          progress,
      y:
        mark.currentEyeOffset.y +
        (mark.targetEyeOffset.y - mark.currentEyeOffset.y) *
          progress,
    };
    const remainingDistance = Math.hypot(
      mark.targetEyeOffset.x - nextOffset.x,
      mark.targetEyeOffset.y - nextOffset.y,
    );

    if (remainingDistance <= EYE_TRACKING_SETTLE_DISTANCE) {
      mark.currentEyeOffset = mark.targetEyeOffset;
    } else {
      mark.currentEyeOffset = nextOffset;
      unsettled = true;
    }

    positionEyeDot(mark);
  }

  if (unsettled) {
    previousEyeTrackingTimestamp = timestamp;
    eyeTrackingFrameId = window.requestAnimationFrame(
      easeEyeTracking,
    );
    return;
  }

  previousEyeTrackingTimestamp = undefined;
  eyeTrackingFrameId = undefined;
}

function startEyeTrackingTransition() {
  if (eyeTrackingFrameId !== undefined) {
    return;
  }

  previousEyeTrackingTimestamp = performance.now();
  eyeTrackingFrameId = window.requestAnimationFrame(
    easeEyeTracking,
  );
}

function setupEyeTracking() {
  const listenerOptions = { passive: true };
  window.addEventListener(
    "pointerdown",
    trackEyes,
    listenerOptions,
  );
  window.addEventListener(
    "pointermove",
    trackEyes,
    listenerOptions,
  );
  window.addEventListener(
    "touchstart",
    trackTouchEyes,
    listenerOptions,
  );
  window.addEventListener(
    "touchmove",
    trackTouchEyes,
    listenerOptions,
  );
}

function weaveReferenceFor(mark, beamIndex, referenceIndex) {
  const references = mark.weaveReferences[beamIndex];

  while (references.length <= referenceIndex) {
    const beam = mark.beamReferences[beamIndex].beam;
    const reference = createWeaveReference(
      beam,
      mark.definitions,
      `${mark.prefix}-${beam.id}-weave-${references.length}`,
      mark.filterIds,
      mark.endpointGlowIds[beam.id],
    );
    references.push(reference);
  }

  return references[referenceIndex];
}

function innerAngleFor(
  variant,
  beamIndex,
  baseAngle,
  introProgress,
) {
  if (variant === "gimbal" && beamIndex === 1) {
    return baseAngle + QUARTER_TURN * introProgress;
  }

  if (variant === "counter" && beamIndex === 1) {
    return -baseAngle;
  }

  return baseAngle;
}

function projectPoint(point, innerAngle, outerAngle) {
  const centeredX = point.x - VIEWBOX_CENTER;
  const centeredY = point.y - VIEWBOX_CENTER;
  const innerCosine = Math.cos(innerAngle);
  const innerSine = Math.sin(innerAngle);
  const outerCosine = Math.cos(outerAngle);
  const outerSine = Math.sin(outerAngle);
  const rotatedX = centeredX * innerCosine;
  const rotatedDepth = -centeredX * innerSine;
  const outerX =
    rotatedX * outerCosine - centeredY * outerSine;
  const outerY =
    rotatedX * outerSine + centeredY * outerCosine;
  const scale =
    PERSPECTIVE_DISTANCE /
    (PERSPECTIVE_DISTANCE - rotatedDepth);

  return {
    scale,
    x: VIEWBOX_CENTER + outerX * scale,
    y: VIEWBOX_CENTER + outerY * scale,
    z: rotatedDepth,
  };
}

function interpolateCrossing(first, second) {
  const distance = first.z - second.z;
  const ratio = distance === 0 ? 0.5 : first.z / distance;

  return {
    scale: first.scale + (second.scale - first.scale) * ratio,
    x: first.x + (second.x - first.x) * ratio,
    y: first.y + (second.y - first.y) * ratio,
    z: DEPTH_CROSSING,
  };
}

function isFront(point) {
  return point.z >= DEPTH_CROSSING;
}

function splitByDepth(points) {
  const segments = {
    back: [],
    front: [],
  };
  let currentSide = isFront(points[0]) ? "front" : "back";
  let currentSegment = [points[0]];

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const nextSide = isFront(current) ? "front" : "back";

    if (nextSide === currentSide) {
      currentSegment.push(current);
      continue;
    }

    const crossing = interpolateCrossing(previous, current);
    currentSegment.push(crossing);
    segments[currentSide].push(currentSegment);
    currentSegment = [crossing, current];
    currentSide = nextSide;
  }

  segments[currentSide].push(currentSegment);
  return segments;
}

function interpolatePoint(first, second, ratio) {
  return {
    scale: first.scale + (second.scale - first.scale) * ratio,
    x: first.x + (second.x - first.x) * ratio,
    y: first.y + (second.y - first.y) * ratio,
    z: first.z + (second.z - first.z) * ratio,
  };
}

function projectedSegmentIntersection(
  firstStart,
  firstEnd,
  secondStart,
  secondEnd,
) {
  if (
    Math.max(firstStart.x, firstEnd.x) + INTERSECTION_EPSILON <
      Math.min(secondStart.x, secondEnd.x) ||
    Math.max(secondStart.x, secondEnd.x) +
      INTERSECTION_EPSILON <
      Math.min(firstStart.x, firstEnd.x) ||
    Math.max(firstStart.y, firstEnd.y) + INTERSECTION_EPSILON <
      Math.min(secondStart.y, secondEnd.y) ||
    Math.max(secondStart.y, secondEnd.y) +
      INTERSECTION_EPSILON <
      Math.min(firstStart.y, firstEnd.y)
  ) {
    return undefined;
  }

  const firstX = firstEnd.x - firstStart.x;
  const firstY = firstEnd.y - firstStart.y;
  const secondX = secondEnd.x - secondStart.x;
  const secondY = secondEnd.y - secondStart.y;
  const denominator =
    firstX * secondY - firstY * secondX;

  if (Math.abs(denominator) < INTERSECTION_EPSILON) {
    return undefined;
  }

  const offsetX = secondStart.x - firstStart.x;
  const offsetY = secondStart.y - firstStart.y;
  const firstRatio =
    (offsetX * secondY - offsetY * secondX) /
    denominator;
  const secondRatio =
    (offsetX * firstY - offsetY * firstX) /
    denominator;

  if (
    firstRatio < -INTERSECTION_EPSILON ||
    firstRatio > 1 + INTERSECTION_EPSILON ||
    secondRatio < -INTERSECTION_EPSILON ||
    secondRatio > 1 + INTERSECTION_EPSILON
  ) {
    return undefined;
  }

  const boundedFirstRatio = Math.min(
    1,
    Math.max(0, firstRatio),
  );
  const boundedSecondRatio = Math.min(
    1,
    Math.max(0, secondRatio),
  );
  const firstPoint = interpolatePoint(
    firstStart,
    firstEnd,
    boundedFirstRatio,
  );
  const secondPoint = interpolatePoint(
    secondStart,
    secondEnd,
    boundedSecondRatio,
  );

  return {
    firstPoint,
    firstRatio: boundedFirstRatio,
    secondPoint,
    secondRatio: boundedSecondRatio,
    x: (firstPoint.x + secondPoint.x) / 2,
    y: (firstPoint.y + secondPoint.y) / 2,
  };
}

function projectedPathIntersections(firstPoints, secondPoints) {
  const intersections = [];

  for (
    let firstIndex = 0;
    firstIndex < firstPoints.length - 1;
    firstIndex += 1
  ) {
    for (
      let secondIndex = 0;
      secondIndex < secondPoints.length - 1;
      secondIndex += 1
    ) {
      const intersection = projectedSegmentIntersection(
        firstPoints[firstIndex],
        firstPoints[firstIndex + 1],
        secondPoints[secondIndex],
        secondPoints[secondIndex + 1],
      );

      if (!intersection) {
        continue;
      }

      const duplicate = intersections.some(
        (existing) =>
          Math.hypot(
            existing.x - intersection.x,
            existing.y - intersection.y,
          ) < INTERSECTION_MERGE_DISTANCE,
      );

      if (!duplicate) {
        intersections.push({
          ...intersection,
          firstIndex,
          secondIndex,
        });
      }
    }
  }

  return intersections;
}

function cumulativePathLengths(points) {
  const lengths = [0];

  for (let index = 1; index < points.length; index += 1) {
    lengths.push(
      lengths[index - 1] +
        Math.hypot(
          points[index].x - points[index - 1].x,
          points[index].y - points[index - 1].y,
        ),
    );
  }

  return lengths;
}

function nearestPointOnPath(point, points, pathLengths) {
  let nearest;

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const segmentX = end.x - start.x;
    const segmentY = end.y - start.y;
    const lengthSquared =
      segmentX * segmentX + segmentY * segmentY;
    const ratio =
      lengthSquared === 0
        ? 0
        : Math.min(
            1,
            Math.max(
              0,
              ((point.x - start.x) * segmentX +
                (point.y - start.y) * segmentY) /
                lengthSquared,
            ),
          );
    const projected = interpolatePoint(start, end, ratio);
    const distance = Math.hypot(
      projected.x - point.x,
      projected.y - point.y,
    );

    if (!nearest || distance < nearest.distance) {
      nearest = {
        distance,
        pathDistance:
          pathLengths[index] +
          Math.sqrt(lengthSquared) * ratio,
        point: projected,
      };
    }
  }

  return nearest;
}

function mergeDistanceIntervals(intervals, totalLength) {
  const sorted = intervals
    .map((interval) => ({
      end: Math.min(totalLength, interval.end),
      start: Math.max(0, interval.start),
    }))
    .filter((interval) => interval.end > interval.start)
    .sort((first, second) => first.start - second.start);
  const merged = [];

  for (const interval of sorted) {
    const previous = merged[merged.length - 1];

    if (!previous || interval.start > previous.end) {
      merged.push({ ...interval });
      continue;
    }

    previous.end = Math.max(previous.end, interval.end);
  }

  return merged;
}

function pointAtPathDistance(points, pathLengths, distance) {
  if (distance <= 0) {
    return points[0];
  }

  const totalLength = pathLengths[pathLengths.length - 1];

  if (distance >= totalLength) {
    return points[points.length - 1];
  }

  let index = 1;

  while (pathLengths[index] < distance) {
    index += 1;
  }

  const segmentLength =
    pathLengths[index] - pathLengths[index - 1];
  const ratio =
    segmentLength === 0
      ? 0
      : (distance - pathLengths[index - 1]) /
        segmentLength;
  return interpolatePoint(
    points[index - 1],
    points[index],
    ratio,
  );
}

function pathSegmentsForIntervals(
  points,
  pathLengths,
  intervals,
) {
  return intervals.map((interval) => {
    const segment = [
      pointAtPathDistance(
        points,
        pathLengths,
        interval.start,
      ),
    ];

    for (
      let index = 1;
      index < points.length - 1;
      index += 1
    ) {
      if (
        pathLengths[index] > interval.start &&
        pathLengths[index] < interval.end
      ) {
        segment.push(points[index]);
      }
    }

    segment.push(
      pointAtPathDistance(
        points,
        pathLengths,
        interval.end,
      ),
    );
    return segment;
  });
}

function complementDistanceIntervals(intervals, totalLength) {
  const complement = [];
  let start = 0;

  for (const interval of intervals) {
    if (interval.start > start) {
      complement.push({
        end: interval.start,
        start,
      });
    }

    start = interval.end;
  }

  if (start < totalLength) {
    complement.push({
      end: totalLength,
      start,
    });
  }

  return complement;
}

function frontSegmentsFor(segments) {
  return segments.flatMap(
    (segment) => splitByDepth(segment).front,
  );
}

function pathDistanceForCrossing(
  crossing,
  beamIndex,
  pathLengths,
) {
  const pointIndex =
    beamIndex === CYAN_BEAM_INDEX
      ? crossing.firstIndex
      : crossing.secondIndex;
  const ratio =
    beamIndex === CYAN_BEAM_INDEX
      ? crossing.firstRatio
      : crossing.secondRatio;
  const segmentLength =
    pathLengths[pointIndex + 1] -
    pathLengths[pointIndex];

  return (
    pathLengths[pointIndex] +
    segmentLength * ratio
  );
}

function createBeamWeavePlan(
  points,
  pathLengths,
  overlayContacts,
) {
  const totalLength =
    pathLengths[pathLengths.length - 1];
  const overlayRangeStart =
    CAP_SHELL_RADIUS * points[0].scale;
  const overlayRangeEnd =
    totalLength -
    CAP_SHELL_RADIUS * points[points.length - 1].scale;
  const protectedOverlayContacts = overlayContacts
    .map((contact) => ({
      ...contact,
      end: Math.min(contact.end, overlayRangeEnd),
      start: Math.max(contact.start, overlayRangeStart),
    }))
    .filter((contact) => contact.end > contact.start);
  const mergedOverlayIntervals = mergeDistanceIntervals(
    protectedOverlayContacts,
    totalLength,
  );
  const baseIntervals = complementDistanceIntervals(
    mergedOverlayIntervals,
    totalLength,
  );
  const baseSegments = pathSegmentsForIntervals(
    points,
    pathLengths,
    baseIntervals,
  );
  const overlays = protectedOverlayContacts.map((contact) => {
    const expandedIntervals = mergeDistanceIntervals(
      [
        {
          end: Math.min(
            contact.end + WEAVE_JOIN_OVERLAP,
            overlayRangeEnd,
          ),
          start: Math.max(
            contact.start - WEAVE_JOIN_OVERLAP,
            overlayRangeStart,
          ),
        },
      ],
      totalLength,
    );
    const segments = pathSegmentsForIntervals(
      points,
      pathLengths,
      expandedIntervals,
    );

    return {
      ...contact,
      frontSegments: frontSegmentsFor(segments),
      segments,
    };
  });

  return {
    baseSegments,
    frontBaseSegments: frontSegmentsFor(baseSegments),
    overlays,
  };
}

function constrainedOverlayContacts(
  contacts,
  beamIndex,
) {
  const overlayContacts = contacts.filter(
    (contact) => contact.frontBeamIndex === beamIndex,
  );
  const opposingContacts = contacts.filter(
    (contact) => contact.frontBeamIndex !== beamIndex,
  );

  return overlayContacts.map((contact) => {
    let start = contact.pathDistance - contact.radius;
    let end = contact.pathDistance + contact.radius;

    for (const opposing of opposingContacts) {
      const midpoint =
        (contact.pathDistance + opposing.pathDistance) / 2;

      if (opposing.pathDistance < contact.pathDistance) {
        start = Math.max(start, midpoint);
      } else if (
        opposing.pathDistance > contact.pathDistance
      ) {
        end = Math.min(end, midpoint);
      }
    }

    return {
      ...contact,
      end,
      start,
    };
  });
}

function createWeavePlan(firstPoints, secondPoints) {
  const pointsByBeam = [firstPoints, secondPoints];
  const pathLengthsByBeam = pointsByBeam.map(
    cumulativePathLengths,
  );
  const totalLengths = pathLengthsByBeam.map(
    (pathLengths) => pathLengths[pathLengths.length - 1],
  );
  const contactsByBeam = pointsByBeam.map(() => []);
  const crossings = projectedPathIntersections(
    firstPoints,
    secondPoints,
  );
  let contactOrder = 0;

  for (const crossing of crossings) {
    const frontBeamIndex =
      crossing.firstPoint.z >
      crossing.secondPoint.z + DEPTH_ORDER_EPSILON
        ? CYAN_BEAM_INDEX
        : PURPLE_BEAM_INDEX;
    const foregroundPoint =
      frontBeamIndex === CYAN_BEAM_INDEX
        ? crossing.firstPoint
        : crossing.secondPoint;

    for (const beamIndex of [
      CYAN_BEAM_INDEX,
      PURPLE_BEAM_INDEX,
    ]) {
      contactsByBeam[beamIndex].push({
        endpointIndex: undefined,
        foregroundDepth: foregroundPoint.z,
        frontBeamIndex,
        order: contactOrder,
        pathDistance: pathDistanceForCrossing(
          crossing,
          beamIndex,
          pathLengthsByBeam[beamIndex],
        ),
        radius: WEAVE_OVERLAY_RADIUS,
      });
    }

    contactOrder += 1;
  }

  pointsByBeam.forEach((points, beamIndex) => {
    const opposingBeamIndex =
      beamIndex === CYAN_BEAM_INDEX
        ? PURPLE_BEAM_INDEX
        : CYAN_BEAM_INDEX;
    const opposingPoints = pointsByBeam[opposingBeamIndex];
    const opposingPathLengths =
      pathLengthsByBeam[opposingBeamIndex];
    const endpointIndexes = [0, points.length - 1];

    endpointIndexes.forEach((pointIndex, endpointIndex) => {
      const endpoint = points[pointIndex];
      const nearest = nearestPointOnPath(
        endpoint,
        opposingPoints,
        opposingPathLengths,
      );
      const overlapDistance =
        BEAM_SHELL_WIDTH / 2 +
        CAP_SHELL_RADIUS * endpoint.scale;

      if (nearest.distance > overlapDistance) {
        return;
      }

      const endpointIsInFront =
        endpoint.z >
        nearest.point.z + DEPTH_ORDER_EPSILON;
      const frontBeamIndex = endpointIsInFront
        ? beamIndex
        : opposingBeamIndex;
      const foregroundDepth = endpointIsInFront
        ? endpoint.z
        : nearest.point.z;
      const endpointPathDistance =
        endpointIndex === 0
          ? 0
          : totalLengths[beamIndex];

      contactsByBeam[beamIndex].push({
        endpointIndex: endpointIsInFront
          ? endpointIndex
          : undefined,
        foregroundDepth,
        frontBeamIndex,
        order: contactOrder,
        pathDistance: endpointPathDistance,
        radius: WEAVE_ENDPOINT_OVERLAY_RADIUS,
      });
      contactsByBeam[opposingBeamIndex].push({
        endpointIndex: endpointIsInFront
          ? endpointIndex
          : undefined,
        foregroundDepth,
        frontBeamIndex,
        order: contactOrder,
        pathDistance: nearest.pathDistance,
        radius: WEAVE_ENDPOINT_OVERLAY_RADIUS,
      });

      contactOrder += 1;
    });
  });

  return {
    beams: pointsByBeam.map((points, beamIndex) =>
      createBeamWeavePlan(
        points,
        pathLengthsByBeam[beamIndex],
        constrainedOverlayContacts(
          contactsByBeam[beamIndex],
          beamIndex,
        ),
      ),
    ),
  };
}

function formatCoordinate(value) {
  return Number(value.toFixed(PATH_PRECISION));
}

function pathCoordinateFor(point) {
  if (point[PATH_COORDINATE_CACHE] === undefined) {
    point[PATH_COORDINATE_CACHE] =
      `${formatCoordinate(point.x)} ${formatCoordinate(point.y)}`;
  }

  return point[PATH_COORDINATE_CACHE];
}

function pathDataFor(segments) {
  let data = "";

  for (const segment of segments) {
    if (segment.length <= 1) {
      continue;
    }

    data += `M${pathCoordinateFor(segment[0])}`;

    for (let index = 1; index < segment.length; index += 1) {
      data += `L${pathCoordinateFor(segment[index])}`;
    }
  }

  return data;
}

function updatePath(path, data) {
  if (path) {
    path.setAttribute("d", data);
  }
}

function updatePaths(geometry, data) {
  updatePath(geometry.solidPath, data);
}

function updateLayeredPaths(geometry, fullData, solidData) {
  updatePath(geometry.fullPath, fullData);
  updatePath(geometry.solidPath, solidData);
}

function showElement(element) {
  if (element.hasAttribute("display")) {
    element.removeAttribute("display");
  }
}

function hideElement(element) {
  if (
    element.getAttribute("display") !== HIDDEN_DISPLAY_VALUE
  ) {
    element.setAttribute("display", HIDDEN_DISPLAY_VALUE);
  }
}

function positionEndpoint(endpoint, point, outerAngle) {
  showElement(endpoint);
  endpoint.setAttribute(
    "transform",
    [
      `translate(${formatCoordinate(point.x)} ${formatCoordinate(point.y)})`,
      `rotate(${formatCoordinate(outerAngle * DEGREES_PER_RADIAN)})`,
      `scale(${formatCoordinate(point.scale)})`,
    ].join(" "),
  );
}

function updateFrontEndpoint(endpoint, point, outerAngle) {
  if (!isFront(point)) {
    hideEndpoint(endpoint);
    return;
  }

  positionEndpoint(endpoint, point, outerAngle);
}

function hideEndpoint(endpoint) {
  hideElement(endpoint);
}

function hideWeaveReference(reference) {
  hideElement(reference.baseGroup);
  hideElement(reference.frontGroup);
  hideEndpoint(reference.startBaseEndpoint);
  hideEndpoint(reference.startFrontEndpoint);
  hideEndpoint(reference.endBaseEndpoint);
  hideEndpoint(reference.endFrontEndpoint);
}

function showWeaveReference(reference) {
  showElement(reference.baseGroup);
  showElement(reference.frontGroup);
}

function hideInactiveWeaveEndpoints(reference, endpointIndex) {
  if (endpointIndex !== 0) {
    hideEndpoint(reference.startBaseEndpoint);
    hideEndpoint(reference.startFrontEndpoint);
  }

  if (endpointIndex !== 1) {
    hideEndpoint(reference.endBaseEndpoint);
    hideEndpoint(reference.endFrontEndpoint);
  }
}

function orderWeaveReferences(mark, references) {
  if (
    references.length === mark.weaveOrder.length &&
    references.every(
      (reference, index) => reference === mark.weaveOrder[index],
    )
  ) {
    return;
  }

  for (const reference of references) {
    mark.baseWeaveDepth.append(reference.baseGroup);
    mark.frontWeaveDepth.append(reference.frontGroup);
  }

  mark.weaveOrder = references;
}

function moveEndpointToWeave(
  beamReference,
  weaveReference,
  endpointIndex,
  point,
  outerAngle,
) {
  const isStart = endpointIndex === 0;
  const baseEndpoint = isStart
    ? beamReference.startBaseEndpoint
    : beamReference.endBaseEndpoint;
  const frontEndpoint = isStart
    ? beamReference.startFrontEndpoint
    : beamReference.endFrontEndpoint;
  const baseWeaveEndpoint = isStart
    ? weaveReference.startBaseEndpoint
    : weaveReference.endBaseEndpoint;
  const frontWeaveEndpoint = isStart
    ? weaveReference.startFrontEndpoint
    : weaveReference.endFrontEndpoint;
  hideEndpoint(baseEndpoint);
  hideEndpoint(frontEndpoint);
  positionEndpoint(baseWeaveEndpoint, point, outerAngle);
  updateFrontEndpoint(
    frontWeaveEndpoint,
    point,
    outerAngle,
  );
}

function updateIntroBloom(mark, bloom) {
  if (mark.introBloom === bloom) {
    return;
  }

  mark.introBloom = bloom;

  for (const layer of BEAM_LAYERS) {
    if (!layer.bloom) {
      continue;
    }

    const opacity =
      layer.opacity +
      (layer.bloom.opacity - layer.opacity) * bloom;
    const width =
      layer.width +
      (layer.bloom.width - layer.width) * bloom;
    mark.svg.style.setProperty(
      `--beam-${layer.bloom.name}-opacity`,
      formatCoordinate(opacity),
    );
    mark.svg.style.setProperty(
      `--beam-${layer.bloom.name}-width`,
      `${formatCoordinate(width)}px`,
    );
  }
}

function setWebglActive(mark, active) {
  const previousStatus = mark.sample.dataset.webglStatus;

  if (mark.webglActive === active) {
    return;
  }

  mark.webglActive = active;
  mark.sample.classList.toggle(WEBGL_RENDERED_CLASS, active);
  mark.sample.dataset.motionRenderer = active
    ? WEBGL_RENDERER_VALUE
    : SVG_RENDERER_VALUE;

  if (active) {
    mark.sample.dataset.webglStatus = WEBGL_STATUS.active;
  } else if (
    mark.webglRenderer &&
    previousStatus === WEBGL_STATUS.active
  ) {
    mark.sample.dataset.webglStatus = WEBGL_STATUS.ready;
  }
}

function webglRequested(mark, introProgress) {
  if (!mark.webglRenderer) {
    return false;
  }

  return (
    rendererPreference === WEBGL_RENDERER_VALUE ||
    introProgress >= 1
  );
}

function renderWebglMark(
  mark,
  projections,
  weavePlan,
  overlays,
  outerAngle,
  introBloom,
) {
  const rendered = mark.webglRenderer.render({
    beams: projections.map((projection, beamIndex) => ({
      baseSolidSegments:
        weavePlan.beams[beamIndex].baseSegments,
      frontGlowSegments: projection.frontSegments,
      frontSolidSegments:
        weavePlan.beams[beamIndex].frontBaseSegments,
      projectedPoints: projection.projectedPoints,
    })),
    bloom: introBloom,
    outerAngle,
    overlays,
  });

  if (rendered) {
    setWebglActive(mark, true);
    return true;
  }

  const failureStatus = [
    WEBGL_STATUS.contextLost,
    WEBGL_STATUS.renderFailed,
  ].includes(mark.sample.dataset.webglStatus)
    ? mark.sample.dataset.webglStatus
    : WEBGL_STATUS.fallback;
  const renderer = mark.webglRenderer;
  setWebglActive(mark, false);
  mark.webglRenderer = undefined;
  renderer.destroy();
  deactivateWebglSample(mark.sample, failureStatus);
  return false;
}

function updateMark(mark, phase, introProgress, introBloom) {
  updateIntroBloom(mark, introBloom);
  const baseInnerAngle =
    phase * TAU * INNER_TURNS_PER_LOOP;
  const outerAngle =
    phase * TAU * OUTER_TURNS_PER_LOOP;
  const projections = mark.beamReferences.map(
    (reference, beamIndex) => {
      const innerAngle = innerAngleFor(
        mark.variant,
        beamIndex,
        baseInnerAngle,
        mark.sample.hasAttribute(
          STATIC_FALLBACK_ATTRIBUTE,
        )
          ? introProgress
          : 1,
      );
      const projectedPoints = reference.beam.points.map(
        (point) =>
          projectPoint(point, innerAngle, outerAngle),
      );
      const segments = splitByDepth(projectedPoints);

      return {
        frontSegments: segments.front,
        projectedPoints,
        reference,
      };
    },
  );
  const weavePlan = createWeavePlan(
    projections[0].projectedPoints,
    projections[1].projectedPoints,
  );
  const overlays = weavePlan.beams
    .flatMap((beamPlan, beamIndex) =>
      beamPlan.overlays.map((overlay) => ({
        ...overlay,
        beamIndex,
      })),
    )
    .sort(
      (first, second) =>
        first.foregroundDepth - second.foregroundDepth ||
        first.beamIndex - second.beamIndex ||
        first.order - second.order,
    );

  if (
    webglRequested(mark, introProgress) &&
    renderWebglMark(
      mark,
      projections,
      weavePlan,
      overlays,
      outerAngle,
      introBloom,
    )
  ) {
    return;
  }

  setWebglActive(mark, false);

  projections.forEach((projection, beamIndex) => {
    const {
      frontSegments,
      projectedPoints,
      reference,
    } = projection;
    const beamWeavePlan = weavePlan.beams[beamIndex];

    updateLayeredPaths(
      reference.baseGeometry,
      pathDataFor([projectedPoints]),
      pathDataFor(beamWeavePlan.baseSegments),
    );
    updateLayeredPaths(
      reference.frontGeometry,
      pathDataFor(frontSegments),
      pathDataFor(beamWeavePlan.frontBaseSegments),
    );

    positionEndpoint(
      reference.startBaseEndpoint,
      projectedPoints[0],
      outerAngle,
    );
    positionEndpoint(
      reference.endBaseEndpoint,
      projectedPoints[projectedPoints.length - 1],
      outerAngle,
    );
    updateFrontEndpoint(
      reference.startFrontEndpoint,
      projectedPoints[0],
      outerAngle,
    );
    updateFrontEndpoint(
      reference.endFrontEndpoint,
      projectedPoints[projectedPoints.length - 1],
      outerAngle,
    );
  });

  const overlayReferencesUsed = sampledBeams.map(() => 0);
  const weaveOrder = [];

  for (const overlay of overlays) {
    const referenceIndex =
      overlayReferencesUsed[overlay.beamIndex];
    const weaveReference = weaveReferenceFor(
      mark,
      overlay.beamIndex,
      referenceIndex,
    );
    overlayReferencesUsed[overlay.beamIndex] += 1;
    showWeaveReference(weaveReference);
    hideInactiveWeaveEndpoints(
      weaveReference,
      overlay.endpointIndex,
    );
    updatePaths(
      weaveReference.baseGeometry,
      pathDataFor(overlay.segments),
    );
    updatePaths(
      weaveReference.frontGeometry,
      pathDataFor(overlay.frontSegments),
    );
    weaveOrder.push(weaveReference);

    if (overlay.endpointIndex === undefined) {
      continue;
    }

    const projection = projections[overlay.beamIndex];
    const pointIndex =
      overlay.endpointIndex === 0
        ? 0
        : projection.projectedPoints.length - 1;
    moveEndpointToWeave(
      projection.reference,
      weaveReference,
      overlay.endpointIndex,
      projection.projectedPoints[pointIndex],
      outerAngle,
    );
  }

  mark.weaveReferences.forEach((references, beamIndex) => {
    for (
      let index = overlayReferencesUsed[beamIndex];
      index < references.length;
      index += 1
    ) {
      hideWeaveReference(references[index]);
    }
  });
  orderWeaveReferences(mark, weaveOrder);
}

function renderPhase(
  phase,
  introProgress = 1,
  introBloom = 0,
) {
  for (const mark of renderedMarks) {
    updateMark(mark, phase, introProgress, introBloom);
  }

  syncFrameNumber(phase);
}

function updateFpsCounter(timestamp) {
  if (!fpsCounter) {
    return;
  }

  if (fpsSampleStartTimestamp === undefined) {
    fpsSampleStartTimestamp = timestamp;
    fpsFrameCount = 0;
    return;
  }

  fpsFrameCount += 1;
  const elapsed = timestamp - fpsSampleStartTimestamp;

  if (elapsed < FPS_SAMPLE_DURATION_MS) {
    return;
  }

  const framesPerSecond = Math.round(
    (fpsFrameCount * 1000) / elapsed,
  );
  fpsCounter.textContent = `FPS: ${framesPerSecond}`;
  fpsFrameCount = 0;
  fpsSampleStartTimestamp = timestamp;
}

function resetFpsCounter(running) {
  if (!fpsCounter) {
    return;
  }

  fpsFrameCount = 0;
  fpsSampleStartTimestamp = undefined;
  fpsCounter.textContent = running ? "FPS: ..." : "FPS: idle";
}

function animationAllowed() {
  return (
    document.documentElement.classList.contains(
      FORCE_ANIMATION_CLASS,
    ) || !motionPreference.matches
  );
}

function advanceAnimation(timestamp) {
  if (previousAnimationTimestamp === undefined) {
    previousAnimationTimestamp = timestamp;
    return;
  }

  const elapsed = timestamp - previousAnimationTimestamp;
  animationPhase =
    (animationPhase +
      (elapsed / MASTER_DURATION_MS) * playbackRate) %
    1;
  previousAnimationTimestamp = timestamp;
}

function animate(timestamp) {
  if (
    motionIntroProgress < 1 &&
    motionIntroStartTimestamp === undefined
  ) {
    motionIntroStartTimestamp = timestamp;
  }

  if (motionIntroWaiting(timestamp)) {
    previousAnimationTimestamp = undefined;
  } else {
    advanceAnimation(timestamp);
  }
  updateMotionIntro(timestamp);
  renderPhase(
    animationPhase,
    motionIntroProgress,
    motionIntroBloom,
  );
  updateFpsCounter(timestamp);
  animationFrameId = window.requestAnimationFrame(animate);
}

function cancelScheduledAnimationFrame() {
  if (animationFrameId === undefined) {
    return;
  }

  window.cancelAnimationFrame(animationFrameId);
  animationFrameId = undefined;
}

function startAnimationLoop() {
  if (
    animationFrameId !== undefined ||
    animationPaused ||
    !animationAllowed()
  ) {
    return;
  }

  previousAnimationTimestamp = undefined;
  animationFrameId = window.requestAnimationFrame(animate);
}

function smootherStep(progress) {
  return (
    progress *
    progress *
    progress *
    (progress * (progress * 6 - 15) + 10)
  );
}

function motionIntroWaiting(timestamp) {
  return (
    motionIntroProgress < 1 &&
    motionIntroStartTimestamp !== undefined &&
    timestamp - motionIntroStartTimestamp <
      MOTION_INTRO_START_DELAY_MS
  );
}

function introBloomForElapsed(elapsed) {
  const bloomElapsed =
    elapsed - MOTION_INTRO_HOLD_DURATION_MS;

  if (bloomElapsed <= 0) {
    return 0;
  }

  if (bloomElapsed < MOTION_INTRO_BLOOM_ATTACK_MS) {
    return smootherStep(
      bloomElapsed / MOTION_INTRO_BLOOM_ATTACK_MS,
    );
  }

  const releaseElapsed =
    bloomElapsed - MOTION_INTRO_BLOOM_ATTACK_MS;

  if (releaseElapsed >= MOTION_INTRO_BLOOM_RELEASE_MS) {
    return 0;
  }

  return (
    1 -
    smootherStep(
      releaseElapsed / MOTION_INTRO_BLOOM_RELEASE_MS,
    )
  );
}

function updateMotionIntro(timestamp) {
  if (
    motionIntroProgress >= 1 ||
    motionIntroStartTimestamp === undefined
  ) {
    return;
  }

  const introElapsed = timestamp - motionIntroStartTimestamp;
  motionIntroBloom = introBloomForElapsed(introElapsed);
  const elapsed = Math.max(
    introElapsed - MOTION_INTRO_START_DELAY_MS,
    0,
  );
  const progress = Math.min(
    elapsed / MOTION_INTRO_DURATION_MS,
    1,
  );
  motionIntroProgress = smootherStep(progress);

  if (progress === 1) {
    motionIntroBloom = 0;
    motionIntroStartTimestamp = undefined;
  }
}

function syncPlayToggle() {
  const control = document.querySelector(
    PLAY_TOGGLE_SELECTOR,
  );

  if (!control) {
    return;
  }

  const running = animationFrameId !== undefined;
  control.textContent = running ? "Pause" : "Play";
  control.setAttribute(
    "aria-label",
    running ? "Pause animation" : "Start animation",
  );
}

function pauseAnimation() {
  if (animationFrameId !== undefined) {
    advanceAnimation(performance.now());
  }

  cancelScheduledAnimationFrame();
  animationPaused = true;
  previousAnimationTimestamp = undefined;
  resetFpsCounter(false);
  renderPhase(animationPhase);
  syncPlayToggle();
}

function playAnimation() {
  animationPaused = false;
  previousAnimationTimestamp = undefined;
  renderPhase(animationPhase);

  if (
    animationFrameId === undefined &&
    animationAllowed()
  ) {
    animationFrameId = window.requestAnimationFrame(animate);
  }

  resetFpsCounter(animationFrameId !== undefined);
  syncPlayToggle();
}

function wrapPhase(phase) {
  return ((phase % 1) + 1) % 1;
}

function wrapFrameNumber(frameNumber) {
  return (
    ((frameNumber - 1) % ANIMATION_FRAME_COUNT +
      ANIMATION_FRAME_COUNT) %
      ANIMATION_FRAME_COUNT +
    1
  );
}

function frameNumberForPhase(phase) {
  return wrapFrameNumber(
    Math.floor(
      wrapPhase(phase) * ANIMATION_FRAME_COUNT +
        FRAME_INDEX_EPSILON,
    ) + 1,
  );
}

function phaseForFrameNumber(frameNumber) {
  return (
    (wrapFrameNumber(frameNumber) - 1) /
    ANIMATION_FRAME_COUNT
  );
}

function syncFrameNumber(phase = animationPhase) {
  if (!frameNumberControl) {
    return;
  }

  const value = String(frameNumberForPhase(phase));

  if (frameNumberControl.value !== value) {
    frameNumberControl.value = value;
  }
}

function jumpToFrame(frameNumber) {
  pauseAnimation();
  animationPhase = phaseForFrameNumber(frameNumber);
  renderPhase(animationPhase);
}

function stepAnimation(direction) {
  jumpToFrame(
    frameNumberForPhase(animationPhase) + direction,
  );
}

function updateMotion() {
  cancelScheduledAnimationFrame();
  animationPhase = STATIC_PHASE;
  previousAnimationTimestamp = undefined;
  const motionAllowed = animationAllowed();
  resetFpsCounter(!animationPaused && motionAllowed);
  const hasStaticFallback = renderedMarks.some((mark) =>
    mark.sample.hasAttribute(STATIC_FALLBACK_ATTRIBUTE),
  );
  motionIntroProgress = hasStaticFallback ? 0 : 1;
  motionIntroBloom = 0;
  motionIntroStartTimestamp = undefined;
  renderPhase(
    animationPhase,
    motionIntroProgress,
    motionIntroBloom,
  );

  for (const mark of renderedMarks) {
    mark.sample.classList.add(MOTION_RENDERED_CLASS);
  }

  if (!animationPaused && motionAllowed) {
    startAnimationLoop();
  }

  syncPlayToggle();
}

function controlNumber(control, property) {
  return Number.parseFloat(control[property]);
}

function controlDataNumber(control, property) {
  return Number.parseFloat(control.dataset[property]);
}

function normalizePlaybackRate(value, control) {
  const minimum = controlNumber(control, "min");
  const maximum = controlNumber(control, "max");
  const step = controlNumber(control, "step");
  const bounded = Math.min(maximum, Math.max(minimum, value));
  const stepped =
    minimum + Math.round((bounded - minimum) / step) * step;
  return Number(stepped.toFixed(10));
}

function interpolateExponentially(start, end, progress) {
  return start * (end / start) ** progress;
}

function exponentialProgress(start, end, value) {
  return Math.log(value / start) / Math.log(end / start);
}

function playbackRateForSlider(control) {
  const minimumPosition = controlNumber(control, "min");
  const maximumPosition = controlNumber(control, "max");
  const middlePosition =
    (minimumPosition + maximumPosition) / 2;
  const position = controlNumber(control, "value");
  const minimumRate = controlDataNumber(control, "rateMin");
  const middleRate = controlDataNumber(control, "rateMid");
  const maximumRate = controlDataNumber(control, "rateMax");

  if (position <= middlePosition) {
    const progress =
      (position - minimumPosition) /
      (middlePosition - minimumPosition);
    return interpolateExponentially(
      minimumRate,
      middleRate,
      progress,
    );
  }

  const progress =
    (position - middlePosition) /
    (maximumPosition - middlePosition);
  return interpolateExponentially(
    middleRate,
    maximumRate,
    progress,
  );
}

function sliderPositionForPlaybackRate(value, control) {
  const minimumPosition = controlNumber(control, "min");
  const maximumPosition = controlNumber(control, "max");
  const middlePosition =
    (minimumPosition + maximumPosition) / 2;
  const minimumRate = controlDataNumber(control, "rateMin");
  const middleRate = controlDataNumber(control, "rateMid");
  const maximumRate = controlDataNumber(control, "rateMax");

  if (value <= middleRate) {
    const progress = exponentialProgress(
      minimumRate,
      middleRate,
      value,
    );
    return (
      minimumPosition +
      (middlePosition - minimumPosition) * progress
    );
  }

  const progress = exponentialProgress(
    middleRate,
    maximumRate,
    value,
  );
  return (
    middlePosition +
    (maximumPosition - middlePosition) * progress
  );
}

function setupSpeedControls() {
  const range = document.querySelector(SPEED_RANGE_SELECTOR);
  const number = document.querySelector(SPEED_NUMBER_SELECTOR);

  if (!range || !number) {
    return;
  }

  const setPlaybackRate = (value) => {
    const normalized = normalizePlaybackRate(value, number);

    if (animationFrameId !== undefined) {
      advanceAnimation(performance.now());
    }

    playbackRate = normalized;
    range.value = String(
      sliderPositionForPlaybackRate(normalized, range),
    );
    range.setAttribute(
      "aria-valuetext",
      `${normalized.toFixed(2)}x`,
    );
    number.value = normalized.toFixed(2);
  };

  range.addEventListener("input", () => {
    setPlaybackRate(playbackRateForSlider(range));
  });
  number.addEventListener("input", () => {
    const value = controlNumber(number, "value");

    if (number.validity.valid && Number.isFinite(value)) {
      setPlaybackRate(value);
    }
  });
  number.addEventListener("change", () => {
    const value = controlNumber(number, "value");
    setPlaybackRate(
      Number.isFinite(value) ? value : DEFAULT_PLAYBACK_RATE,
    );
  });
  setPlaybackRate(controlNumber(number, "value"));
}

function setupTransportControls() {
  const frameBack = document.querySelector(
    FRAME_BACK_SELECTOR,
  );
  const playToggle = document.querySelector(
    PLAY_TOGGLE_SELECTOR,
  );
  const frameForward = document.querySelector(
    FRAME_FORWARD_SELECTOR,
  );

  if (!frameBack || !playToggle || !frameForward) {
    return;
  }

  frameBack.addEventListener("click", () => {
    stepAnimation(BACKWARD_FRAME_DIRECTION);
  });
  playToggle.addEventListener("click", () => {
    if (animationFrameId === undefined) {
      playAnimation();
      return;
    }

    pauseAnimation();
  });
  frameForward.addEventListener("click", () => {
    stepAnimation(FORWARD_FRAME_DIRECTION);
  });
  syncPlayToggle();
}

function setupFrameCounter() {
  frameNumberControl = document.querySelector(
    FRAME_NUMBER_SELECTOR,
  );
  const frameTotal = document.querySelector(
    FRAME_TOTAL_SELECTOR,
  );

  if (!frameNumberControl || !frameTotal) {
    frameNumberControl = undefined;
    return;
  }

  frameNumberControl.max = String(ANIMATION_FRAME_COUNT);
  frameTotal.textContent = String(ANIMATION_FRAME_COUNT);
  frameNumberControl.addEventListener("input", () => {
    const value = controlNumber(
      frameNumberControl,
      "value",
    );

    if (
      frameNumberControl.validity.valid &&
      Number.isFinite(value)
    ) {
      jumpToFrame(value);
    }
  });
  frameNumberControl.addEventListener("change", () => {
    const value = controlNumber(
      frameNumberControl,
      "value",
    );
    jumpToFrame(
      Number.isFinite(value)
        ? Math.round(value)
        : frameNumberForPhase(animationPhase),
    );
  });
  syncFrameNumber();
}

function setupFpsCounter() {
  if (!FEATURE_SWITCHES.fps) {
    return;
  }

  fpsCounter = document.createElement("div");
  fpsCounter.className = FPS_COUNTER_CLASS;
  fpsCounter.setAttribute("aria-hidden", "true");
  fpsCounter.textContent = "FPS: idle";
  document.body.append(fpsCounter);
}

function renderMotionMarks() {
  for (const [index, sample] of [
    ...document.querySelectorAll(MOTION_SAMPLE_SELECTOR),
  ].entries()) {
    renderedMarks.push(createProjectedMark(sample, index));
  }

  updateMotion();
}

motionPreference.addEventListener("change", updateMotion);
setupSpeedControls();
setupTransportControls();
setupFrameCounter();
setupFpsCounter();
renderMotionMarks();
setupEyeTracking();
