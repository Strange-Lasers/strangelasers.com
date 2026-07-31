const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const FORCE_ANIMATION_CLASS = "force-animation";
const MOTION_SAMPLE_SELECTOR = "[data-motion-variant]";
const VISUAL_SELECTOR = ".sample-visual";
const MOTION_RENDERED_CLASS = "motion-rendered";
const STATIC_FALLBACK_ATTRIBUTE = "data-static-fallback";
const STATIC_FALLBACK_ACTIVE_CLASS =
  "static-fallback-active";
const SPEED_RANGE_SELECTOR = "[data-speed-range]";
const SPEED_NUMBER_SELECTOR = "[data-speed-number]";
const FRAME_BACK_SELECTOR = "[data-frame-back]";
const PLAY_TOGGLE_SELECTOR = "[data-play-toggle]";
const FRAME_FORWARD_SELECTOR = "[data-frame-forward]";
const FRAME_NUMBER_SELECTOR = "[data-frame-number]";
const FRAME_TOTAL_SELECTOR = "[data-frame-total]";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const MASTER_DURATION_MS = 6000;
const MOTION_INTRO_DURATION_MS = 1500;
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
const EYE_LENS_RADIUS = 47;
const EYE_DOT_RADIUS = 12;
const EYE_OCCLUSION_RADIUS = 72;

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
    className: "projected-beam projected-beam--wide-glow",
    color: "body",
    filter: "wide",
    opacity: 0.12,
    width: 88,
  }),
  Object.freeze({
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
    className: "projected-beam projected-beam--highlight",
    color: "highlight",
    opacity: 0.9,
    width: 14,
  }),
  Object.freeze({
    className: "projected-beam projected-beam--core",
    color: "core",
    opacity: 1,
    width: 3.5,
  }),
]);

const SOLID_BEAM_LAYERS = Object.freeze(
  BEAM_LAYERS.filter((layer) => !layer.filter),
);

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
let motionIntroProgress = 1;
let motionIntroStartTimestamp;
let frameNumberControl;
let playbackRate = DEFAULT_PLAYBACK_RATE;
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
      "stop-color": "#13263d",
      "stop-opacity": 0.8,
    }),
    createSvgElement("stop", {
      offset: "62%",
      "stop-color": "#07111e",
      "stop-opacity": 0.87,
    }),
    createSvgElement("stop", {
      offset: "100%",
      "stop-color": "#02060c",
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

function createBeamPaths(
  parent,
  beam,
  filterIds,
  layers = BEAM_LAYERS,
) {
  return layers.map((layer) => {
    const attributes = {
      class: layer.className,
      d: "",
      fill: "none",
      opacity: layer.opacity,
      stroke: beam[layer.color],
      "stroke-linecap": "butt",
      "stroke-linejoin": "round",
      "stroke-width": layer.width,
    };

    if (layer.filter) {
      attributes.filter = `url(#${filterIds[layer.filter]})`;
    }

    const path = createSvgElement("path", attributes);
    parent.append(path);
    return path;
  });
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
      opacity: 0.18,
      r: EYE_GLOW_RADIUS,
      stroke: BRAND_COLORS.purple.body,
      "stroke-width": 14,
    }),
    createSvgElement("circle", {
      cx: VIEWBOX_CENTER,
      cy: VIEWBOX_CENTER,
      fill: `url(#${lensGradientId})`,
      r: EYE_LENS_RADIUS,
      stroke: BRAND_COLORS.core,
      "stroke-width": 6,
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
  const basePaths = createBeamPaths(
    baseGroup,
    beam,
    filterIds,
    SOLID_BEAM_LAYERS,
  );
  const frontPaths = createBeamPaths(
    frontGroup,
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
    endpoint.setAttribute("display", "none");
  }

  baseGroup.append(startBaseEndpoint, endBaseEndpoint);
  frontGroup.append(startFrontEndpoint, endFrontEndpoint);

  return {
    baseGroup,
    basePaths,
    endBaseEndpoint,
    endFrontEndpoint,
    frontGroup,
    frontPaths,
    startBaseEndpoint,
    startFrontEndpoint,
  };
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

    const basePaths = createBeamPaths(
      baseBeam,
      beam,
      filterIds,
    );
    const frontPaths = createBeamPaths(
      frontBeam,
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
      basePaths,
      beam,
      endBaseEndpoint,
      endFrontEndpoint,
      frontPaths,
      startBaseEndpoint,
      startFrontEndpoint,
    };
  });
  const weaveReferences = sampledBeams.map(() => []);

  svg.append(
    definitions,
    baseDepth,
    baseWeaveDepth,
    createEye(filterIds, lensGradientId),
    frontDepth,
    frontWeaveDepth,
    createEyeDot(filterIds),
  );
  sample.querySelector(VISUAL_SELECTOR).append(svg);

  return {
    baseWeaveDepth,
    beamReferences,
    endpointGlowIds,
    filterIds,
    frontWeaveDepth,
    sample,
    variant,
    weaveReferences,
  };
}

function weaveReferenceFor(mark, beamIndex, referenceIndex) {
  const references = mark.weaveReferences[beamIndex];

  while (references.length <= referenceIndex) {
    const beam = mark.beamReferences[beamIndex].beam;
    const reference = createWeaveReference(
      beam,
      mark.filterIds,
      mark.endpointGlowIds[beam.id],
    );
    references.push(reference);
    mark.baseWeaveDepth.append(reference.baseGroup);
    mark.frontWeaveDepth.append(reference.frontGroup);
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

function pathDataFor(segments) {
  return segments
    .filter((segment) => segment.length > 1)
    .map((segment) =>
      segment
        .map((point, index) => {
          const command = index === 0 ? "M" : "L";
          return `${command}${formatCoordinate(point.x)} ${formatCoordinate(point.y)}`;
        })
        .join(""),
    )
    .join("");
}

function updatePaths(paths, data) {
  for (const path of paths) {
    path.setAttribute("d", data);
  }
}

function updateLayeredPaths(paths, fullData, solidData) {
  paths.forEach((path, index) => {
    path.setAttribute(
      "d",
      BEAM_LAYERS[index].filter ? fullData : solidData,
    );
  });
}

function positionEndpoint(endpoint, point, outerAngle) {
  endpoint.removeAttribute("display");
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
    endpoint.setAttribute("display", "none");
    return;
  }

  endpoint.removeAttribute("display");
  positionEndpoint(endpoint, point, outerAngle);
}

function hideEndpoint(endpoint) {
  endpoint.setAttribute("display", "none");
}

function hideWeaveReference(reference) {
  reference.baseGroup.setAttribute("display", "none");
  reference.frontGroup.setAttribute("display", "none");
  hideEndpoint(reference.startBaseEndpoint);
  hideEndpoint(reference.startFrontEndpoint);
  hideEndpoint(reference.endBaseEndpoint);
  hideEndpoint(reference.endFrontEndpoint);
}

function showWeaveReference(reference) {
  reference.baseGroup.removeAttribute("display");
  reference.frontGroup.removeAttribute("display");
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

function updateMark(mark, phase, introProgress) {
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
      const baseData = pathDataFor([projectedPoints]);
      const frontData = pathDataFor(segments.front);

      return {
        baseData,
        frontData,
        projectedPoints,
        reference,
      };
    },
  );
  const weavePlan = createWeavePlan(
    projections[0].projectedPoints,
    projections[1].projectedPoints,
  );
  const weaveData = weavePlan.beams.map((beamPlan) => ({
    baseSolidData: pathDataFor(beamPlan.baseSegments),
    frontSolidData: pathDataFor(
      beamPlan.frontBaseSegments,
    ),
  }));

  for (const references of mark.weaveReferences) {
    for (const reference of references) {
      hideWeaveReference(reference);
    }
  }

  projections.forEach((projection, beamIndex) => {
    const {
      baseData,
      frontData,
      projectedPoints,
      reference,
    } = projection;
    const beamWeaveData = weaveData[beamIndex];

    updateLayeredPaths(
      reference.basePaths,
      baseData,
      beamWeaveData.baseSolidData,
    );
    updateLayeredPaths(
      reference.frontPaths,
      frontData,
      beamWeaveData.frontSolidData,
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
    updatePaths(
      weaveReference.basePaths,
      pathDataFor(overlay.segments),
    );
    updatePaths(
      weaveReference.frontPaths,
      pathDataFor(overlay.frontSegments),
    );
    mark.baseWeaveDepth.append(weaveReference.baseGroup);
    mark.frontWeaveDepth.append(weaveReference.frontGroup);

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
}

function renderPhase(phase, introProgress = 1) {
  for (const mark of renderedMarks) {
    updateMark(mark, phase, introProgress);
  }

  syncFrameNumber(phase);
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

  advanceAnimation(timestamp);
  updateMotionIntro(timestamp);
  renderPhase(animationPhase, motionIntroProgress);
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

function updateMotionIntro(timestamp) {
  if (
    motionIntroProgress >= 1 ||
    motionIntroStartTimestamp === undefined
  ) {
    return;
  }

  const elapsed = timestamp - motionIntroStartTimestamp;
  const progress = Math.min(
    elapsed / MOTION_INTRO_DURATION_MS,
    1,
  );
  motionIntroProgress = smootherStep(progress);

  if (progress === 1) {
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
  const hasStaticFallback = renderedMarks.some((mark) =>
    mark.sample.hasAttribute(STATIC_FALLBACK_ATTRIBUTE),
  );
  motionIntroProgress =
    motionAllowed && hasStaticFallback ? 0 : 1;
  motionIntroStartTimestamp = undefined;
  renderPhase(animationPhase, motionIntroProgress);

  for (const mark of renderedMarks) {
    mark.sample.classList.toggle(
      STATIC_FALLBACK_ACTIVE_CLASS,
      mark.sample.hasAttribute(
        STATIC_FALLBACK_ATTRIBUTE,
      ) && !motionAllowed,
    );
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
renderMotionMarks();
