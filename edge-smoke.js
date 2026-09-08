(() => {
  "use strict";

  const API_NAME = "StrangeLasersSmoke";
  const CANVAS_SELECTOR = "[data-edge-smoke]";
  const TUNER_SELECTOR = "[data-smoke-tuner]";
  const TUNER_RESET_SELECTOR = "[data-visual-tuner-reset]";
  const ROTATION_SPEED_NUMBER_SELECTOR = "[data-speed-number]";
  const VISIBLE_CLASS = "edge-smoke--visible";
  const FORCE_ANIMATION_CLASS = "force-animation";
  const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
  const SMOKE_QUERY_PARAMETER = "smoke";
  const TUNING_QUERY_PARAMETER = "tune";
  const ROTATION_SPEED_QUERY_PARAMETER = "rotationSpeed";
  const FEATURE_DISABLED_VALUE = "off";
  const FEATURE_FORCED_VALUE = "on";
  const QUERY_FORCED_REASON = "query-forced";
  const TUNER_DRAG_THRESHOLD_PX = 4;
  const TUNER_VIEWPORT_MARGIN_PX = 12;
  const TARGET_SMOKE_FRAME_RATE = 30;
  const SMOKE_FRAME_DURATION_MS = 1000 / TARGET_SMOKE_FRAME_RATE;
  const ACTIVE_SAMPLE_DURATION_MS = 2400;
  const EARLY_HEALTH_CHECK_DURATION_MS = 400;
  const MAX_SAMPLED_FRAME_INTERVAL_MS = 250;
  const MIN_EARLY_HEALTH_SAMPLE_COUNT = 12;
  const MIN_CRITICAL_FRAME_RATE = 45;
  const FRAME_REFERENCE_PERCENTILE = 0.2;
  const FRAME_MEDIAN_PERCENTILE = 0.5;
  const FRAME_P95_PERCENTILE = 0.95;
  const GPU_MEDIAN_PERCENTILE = 0.5;
  const GPU_P90_PERCENTILE = 0.9;
  const FRAME_DROP_INTERVAL_RATIO = 1.5;
  const CRITICAL_MEDIAN_INTERVAL_RATIO = 2;
  const CRITICAL_P95_INTERVAL_RATIO = 4;
  const CRITICAL_DROPPED_RATIO = 0.25;
  const RENDER_SCALE = 0.4;
  const MAX_RENDER_DPR = 2;
  const MAX_RENDER_PIXEL_COUNT = 460000;
  const MAX_PENDING_GPU_QUERIES = 4;
  const DEFAULT_SMOKE_PARTICLE_COUNT = 256;
  const DEFAULT_SMOKE_REACH = 5;
  const MIN_DRIFTED_DENSITY = 0.001;
  const MAX_INWARD_REACH = 1000;
  const MIN_TUNING_MULTIPLIER = 0.01;
  const MAX_TUNING_MULTIPLIER = 100;
  const TUNING_MULTIPLIER_STEP = 0.01;
  const TUNING_INPUT_RANGE = Object.freeze({
    maximum: 1000,
    midpoint: 500,
    minimum: 0,
    step: 1,
  });
  const MILLISECONDS_PER_SECOND = 1000;
  const NANOSECONDS_PER_MILLISECOND = 1000000;
  const DATA_NUMBER_PRECISION = 2;
  const TUNING_CONTROLS = Object.freeze([
    Object.freeze({
      defaultValue: DEFAULT_SMOKE_PARTICLE_COUNT,
      display: "integer",
      key: "particles",
      label: "Cloud count",
      maximum: 4096,
      minimum: 8,
      parameter: "smokePuffs",
      step: 1,
    }),
    Object.freeze({
      defaultValue: 2,
      display: "multiplier",
      key: "edgeDensity",
      label: "Edge density",
      maximum: MAX_TUNING_MULTIPLIER,
      minimum: MIN_TUNING_MULTIPLIER,
      parameter: "smokeEdge",
      step: TUNING_MULTIPLIER_STEP,
    }),
    Object.freeze({
      defaultValue: 2.8,
      display: "multiplier",
      key: "farSmoke",
      label: "Drifted density",
      maximum: MAX_TUNING_MULTIPLIER,
      minimum: MIN_DRIFTED_DENSITY,
      parameter: "smokeFar",
      step: 0.001,
    }),
    Object.freeze({
      defaultValue: 1.35,
      display: "multiplier",
      key: "opacity",
      label: "Puff opacity",
      maximum: MAX_TUNING_MULTIPLIER,
      minimum: MIN_TUNING_MULTIPLIER,
      parameter: "smokeOpacity",
      step: TUNING_MULTIPLIER_STEP,
    }),
    Object.freeze({
      defaultValue: 1.1,
      display: "multiplier",
      key: "brightness",
      label: "Brightness",
      maximum: MAX_TUNING_MULTIPLIER,
      minimum: MIN_TUNING_MULTIPLIER,
      parameter: "smokeBrightness",
      step: TUNING_MULTIPLIER_STEP,
    }),
    Object.freeze({
      defaultValue: 1.4,
      display: "multiplier",
      key: "puffScale",
      label: "Puff size",
      maximum: MAX_TUNING_MULTIPLIER,
      minimum: MIN_TUNING_MULTIPLIER,
      parameter: "smokeSize",
      step: TUNING_MULTIPLIER_STEP,
    }),
    Object.freeze({
      defaultValue: DEFAULT_SMOKE_REACH,
      display: "multiplier",
      key: "reach",
      label: "Inward reach",
      maximum: MAX_INWARD_REACH,
      minimum: MIN_TUNING_MULTIPLIER,
      parameter: "smokeReach",
      step: TUNING_MULTIPLIER_STEP,
    }),
    Object.freeze({
      defaultValue: 0.7,
      display: "multiplier",
      key: "speed",
      label: "Drift speed",
      maximum: MAX_TUNING_MULTIPLIER,
      minimum: MIN_TUNING_MULTIPLIER,
      parameter: "smokeSpeed",
      step: TUNING_MULTIPLIER_STEP,
    }),
    Object.freeze({
      defaultValue: 1.4,
      display: "multiplier",
      key: "breakup",
      label: "Breakup",
      maximum: MAX_TUNING_MULTIPLIER,
      minimum: 0,
      parameter: "smokeBreakup",
      step: TUNING_MULTIPLIER_STEP,
    }),
    Object.freeze({
      defaultValue: 1.3,
      display: "multiplier",
      key: "softness",
      label: "Softness",
      maximum: MAX_TUNING_MULTIPLIER,
      minimum: MIN_TUNING_MULTIPLIER,
      parameter: "smokeSoftness",
      step: TUNING_MULTIPLIER_STEP,
    }),
    Object.freeze({
      defaultValue: 0.12,
      display: "percent",
      key: "tint",
      label: "Laser tint",
      maximum: 1,
      minimum: 0,
      parameter: "smokeTint",
      step: 0.01,
    }),
  ]);
  const CONTEXT_OPTIONS = Object.freeze({
    alpha: true,
    antialias: false,
    depth: false,
    failIfMajorPerformanceCaveat: true,
    powerPreference: "high-performance",
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
    stencil: false,
  });
  const STATUS = Object.freeze({
    active: "active",
    disabled: "disabled",
    reducedMotion: "reduced-motion",
    unavailable: "unavailable",
    waiting: "waiting",
  });

  const SMOKE_VERTEX_SHADER = `#version 300 es
    precision highp float;

    uniform vec3 u_cyan;
    uniform vec3 u_purple;
    uniform vec2 u_resolution;
    uniform float u_time;
    uniform float u_edge_density;
    uniform float u_far_smoke;
    uniform float u_opacity;
    uniform float u_particle_count;
    uniform float u_puff_scale;
    uniform float u_reach;
    uniform float u_speed;
    uniform float u_tint;

    flat out float v_density;
    flat out float v_reach_effect;
    flat out float v_seed;
    flat out float v_sparse_wisp;
    flat out float v_wisp_stretch;
    out float v_alpha;
    out vec2 v_local_position;
    out float v_phase;
    out vec3 v_color;

    const float SPARSE_WISP_DENSITY_END = 0.5;
    const float SPARSE_WISP_DENSITY_START = 0.1;
    const float DRIFT_DENSITY_END = 0.22;
    const float DRIFT_DENSITY_START = 0.03;

    float random_value(float value) {
      return fract(sin(value * 91.3458 + 13.427) * 47453.5453);
    }

    void main() {
      float particle = float(gl_InstanceID);
      int corner_index = gl_VertexID;
      vec2 corner;

      if (corner_index == 0) {
        corner = vec2(-1.0, -1.0);
      } else if (corner_index == 1) {
        corner = vec2(1.0, -1.0);
      } else if (corner_index == 2) {
        corner = vec2(-1.0, 1.0);
      } else {
        corner = vec2(1.0, 1.0);
      }

      float seed = random_value(particle + 0.37);
      float second_seed = random_value(particle + 17.91);
      float third_seed = random_value(particle + 47.23);
      float fourth_seed = fract(
        (particle + 0.5) * 0.61803398875
      );
      float lifetime = mix(9.0, 15.0, second_seed);
      float smoke_time = u_time * u_speed;
      float phase = fract(smoke_time / lifetime + seed);
      float short_side = min(u_resolution.x, u_resolution.y);
      float perimeter = 2.0 * (u_resolution.x + u_resolution.y);
      float cell = perimeter / max(u_particle_count, 1.0);
      float edge_position = mod(
        (particle + mix(0.18, 0.82, third_seed)) * cell,
        perimeter
      );
      vec2 source;
      vec2 inward;
      vec2 tangent;

      if (edge_position < u_resolution.x) {
        source = vec2(edge_position, 0.0);
        inward = vec2(0.0, 1.0);
        tangent = vec2(1.0, 0.0);
      } else if (edge_position < u_resolution.x + u_resolution.y) {
        float distance = edge_position - u_resolution.x;
        source = vec2(u_resolution.x, distance);
        inward = vec2(-1.0, 0.0);
        tangent = vec2(0.0, 1.0);
      } else if (edge_position < 2.0 * u_resolution.x + u_resolution.y) {
        float distance = edge_position - u_resolution.x - u_resolution.y;
        source = vec2(u_resolution.x - distance, u_resolution.y);
        inward = vec2(0.0, -1.0);
        tangent = vec2(-1.0, 0.0);
      } else {
        float distance = edge_position - 2.0 * u_resolution.x - u_resolution.y;
        source = vec2(0.0, u_resolution.y - distance);
        inward = vec2(1.0, 0.0);
        tangent = vec2(0.0, -1.0);
      }

      float drift_retention = clamp(u_far_smoke, 0.0, 1.0);
      float drift_survival = step(
        1.0 - drift_retention,
        fourth_seed
      );
      float drift_progress = smoothstep(
        DRIFT_DENSITY_START,
        DRIFT_DENSITY_END,
        phase
      );
      float drift_density = u_far_smoke < 1.0
        ? drift_survival *
          min(
            1.0 /
              max(
                drift_retention,
                ${MIN_DRIFTED_DENSITY.toFixed(3)}
              ),
            100.0
          )
        : u_far_smoke;
      float reach_scale = pow(
        max(u_reach / ${DEFAULT_SMOKE_REACH.toFixed(1)}, 0.0001),
        0.32
      );
      float effective_reach_scale = mix(
        1.0,
        reach_scale,
        drift_survival
      );
      float reach_extension = clamp(
        log(
          max(u_reach / ${DEFAULT_SMOKE_REACH.toFixed(1)}, 1.0)
        ) /
          log(
            ${MAX_INWARD_REACH.toFixed(1)} /
              ${DEFAULT_SMOKE_REACH.toFixed(1)}
          ),
        0.0,
        1.0
      );
      float reach_effect =
        reach_extension *
        drift_survival;
      float coverage_diameter = cell * 2.5;
      float maximum_diameter = short_side * 3.0;
      float initial_diameter = min(
        max(
          coverage_diameter,
          short_side * mix(0.055, 0.085, second_seed) * u_puff_scale
        ),
        maximum_diameter
      );
      float base_final_diameter = min(
        max(
          coverage_diameter,
          short_side *
            mix(0.17, 0.27, third_seed) *
            u_puff_scale *
            1.3
        ),
        maximum_diameter
      );
      float final_diameter = min(
        base_final_diameter * effective_reach_scale,
        maximum_diameter
      );
      final_diameter = max(initial_diameter, final_diameter);
      base_final_diameter = max(
        initial_diameter,
        base_final_diameter
      );
      float expansion = sqrt(phase);
      float cloud_diameter = mix(
        initial_diameter,
        final_diameter,
        expansion
      );
      float base_cloud_diameter = mix(
        initial_diameter,
        base_final_diameter,
        expansion
      );
      float outside_distance =
        initial_diameter * mix(0.24, 0.34, third_seed);
      float inward_travel = min(
        cloud_diameter *
          0.22 *
          min(1.0, 0.625 * effective_reach_scale) *
          phase,
        outside_distance * 0.9
      );
      float inward_distance =
        -outside_distance + inward_travel;
      float tangent_diameter = mix(
        cloud_diameter,
        base_cloud_diameter,
        reach_effect
      );
      float lateral_distance = tangent_diameter * (
        (third_seed - 0.5) * 0.12 * phase +
        sin(smoke_time * mix(0.11, 0.19, seed) + seed * 19.0) * 0.025
      );
      vec2 cloud_position =
        source + inward * inward_distance + tangent * lateral_distance;
      vec2 vertex_position =
        cloud_position +
        inward * corner.y * cloud_diameter * 0.5 +
        tangent * corner.x * tangent_diameter * 0.5;
      vec2 clip_position =
        vertex_position / u_resolution * 2.0 - 1.0;
      float fade_in = smoothstep(0.0, 0.07, phase);
      float fade_out = 1.0 - smoothstep(0.58, 1.0, phase);
      float color_progress = fract(seed * 1.73 + third_seed * 0.41);
      vec3 tint = mix(u_purple, u_cyan, color_progress);

      gl_Position = vec4(clip_position, 0.0, 1.0);
      v_density = mix(
        u_edge_density,
        drift_density,
        drift_progress
      );
      v_reach_effect = reach_effect;
      v_seed = seed;
      v_sparse_wisp =
        drift_survival *
        (
          1.0 -
          smoothstep(
            SPARSE_WISP_DENSITY_START,
            SPARSE_WISP_DENSITY_END,
            drift_retention
          )
        );
      v_local_position = corner;
      v_phase = phase;
      v_wisp_stretch = cloud_diameter /
        max(tangent_diameter, 1.0);
      v_alpha =
        mix(0.034, 0.068, second_seed) *
        fade_in *
        fade_out *
        u_opacity;
      v_color = mix(vec3(0.42, 0.46, 0.53), tint, u_tint);
    }
  `;

  const SMOKE_FRAGMENT_SHADER = `#version 300 es
    precision highp float;

    flat in float v_density;
    flat in float v_reach_effect;
    flat in float v_seed;
    flat in float v_sparse_wisp;
    flat in float v_wisp_stretch;
    in float v_alpha;
    in vec2 v_local_position;
    in float v_phase;
    in vec3 v_color;

    uniform float u_breakup;
    uniform float u_brightness;
    uniform float u_particle_count;
    uniform float u_puff_scale;
    uniform vec2 u_resolution;
    uniform float u_softness;
    uniform float u_time;

    out vec4 output_color;

    const float DEFAULT_PARTICLE_COUNT = ${DEFAULT_SMOKE_PARTICLE_COUNT}.0;
    const float HIGH_CROWDING_DENSITY_MAXIMUM = 1.7;
    const float HIGH_CROWDING_DENSITY_MINIMUM = 0.16;
    const float MAX_CROWDING_RATIO = 16.0;
    const float PARTICLE_NORMALIZATION_EXPONENT = 0.65;
    const float SPARSE_WISP_ALPHA_MAXIMUM = 0.04;
    const float WISP_TAIL_DECAY = 3.6;
    const float WISP_TAPER_END = 0.06;
    const float WISP_TAPER_START = 0.62;

    float random_value(vec2 position) {
      vec3 value = fract(vec3(position.xyx) * 0.1031);
      value += dot(value, value.yzx + 33.33);
      return fract((value.x + value.y) * value.z);
    }

    float value_noise(vec2 position) {
      vec2 cell = floor(position);
      vec2 local = fract(position);
      vec2 curve = local * local * (3.0 - 2.0 * local);
      float lower = mix(
        random_value(cell),
        random_value(cell + vec2(1.0, 0.0)),
        curve.x
      );
      float upper = mix(
        random_value(cell + vec2(0.0, 1.0)),
        random_value(cell + vec2(1.0, 1.0)),
        curve.x
      );
      return mix(lower, upper, curve.y);
    }

    void main() {
      vec2 position = v_local_position;
      vec2 noise_position = vec2(
        position.x,
        position.y * mix(1.0, v_wisp_stretch, v_reach_effect)
      );
      vec2 seed_offset = vec2(v_seed * 37.1, v_seed * 19.7);
      float broad_noise = value_noise(
        noise_position * 2.15 +
          seed_offset +
          vec2(v_phase * 0.31, -v_phase * 0.19)
      );
      float fine_noise = value_noise(
        noise_position * 4.7 -
          seed_offset.yx +
          vec2(-v_phase * 0.23, v_phase * 0.27)
      );
      float breakup = 1.0 - exp(-max(u_breakup, 0.0) * 1.9);
      vec2 distortion = vec2(
        broad_noise - 0.5,
        fine_noise - 0.5
      ) * 0.18 * breakup;
      float radius = length(position + distortion);
      float irregular_radius =
        0.86 + (broad_noise - 0.5) * 0.2 * breakup;
      float softness_progress = clamp(
        (
          log(max(u_softness, ${MIN_TUNING_MULTIPLIER.toFixed(1)})) /
            log(${MAX_TUNING_MULTIPLIER.toFixed(1)}) +
          1.0
        ) * 0.5,
        0.0,
        1.0
      );
      float envelope_start = mix(0.42, 0.12, softness_progress);
      float envelope =
        1.0 - smoothstep(envelope_start, irregular_radius, radius);
      float sprite_envelope =
        1.0 - smoothstep(0.92, 0.995, length(position));
      envelope *= sprite_envelope;
      float billow = smoothstep(
        0.25,
        0.76,
        broad_noise * 0.68 + fine_noise * 0.32
      );
      float noisy_body =
        mix(0.28, 1.0, billow) * mix(0.72, 1.0, fine_noise);
      float body = mix(0.72, noisy_body, breakup);
      body *= mix(
        1.0,
        mix(0.58, 1.05, fine_noise),
        smoothstep(0.72, 1.0, breakup)
      );
      float particle_normalization = pow(
        min(
          1.0,
          DEFAULT_PARTICLE_COUNT / max(u_particle_count, 1.0)
        ),
        PARTICLE_NORMALIZATION_EXPONENT
      );
      float size_normalization = min(
        1.0,
        inversesqrt(max(u_puff_scale, 1.0))
      );
      float overlap_scale = particle_normalization * size_normalization;
      float crowding = clamp(
        log(
          max(u_particle_count / DEFAULT_PARTICLE_COUNT, 1.0)
        ) / log(MAX_CROWDING_RATIO),
        0.0,
        1.0
      );
      float coherent_density = 1.0;

      if (crowding > 0.0) {
        float short_side = min(u_resolution.x, u_resolution.y);
        vec2 screen_position = gl_FragCoord.xy / short_side;
        vec2 field_drift = vec2(u_time * 0.006, -u_time * 0.004);
        float macro_field = value_noise(
          screen_position * 4.2 + field_drift
        );
        float detail_field = value_noise(
          screen_position * 11.7 -
            field_drift * 1.7 +
            vec2(7.3, 11.9)
        );
        float coherent_field = smoothstep(
          0.22,
          0.8,
          macro_field * 0.66 + detail_field * 0.34
        );
        coherent_density = mix(
          1.0,
          mix(
            HIGH_CROWDING_DENSITY_MINIMUM,
            HIGH_CROWDING_DENSITY_MAXIMUM,
            coherent_field
          ),
          crowding
        );
      }
      coherent_density = mix(
        coherent_density,
        1.0,
        v_sparse_wisp
      );
      float inward_progress = max(position.y, 0.0);
      float tapered_width = mix(
        WISP_TAPER_START,
        WISP_TAPER_END,
        smoothstep(0.0, 1.0, inward_progress)
      );
      float center_offset =
        (broad_noise - 0.5) * 0.58 * inward_progress;
      float cross_envelope =
        1.0 -
        smoothstep(
          tapered_width * 0.52,
          tapered_width,
          abs(position.x + center_offset)
        );
      float wisp_texture = smoothstep(
        0.5,
        0.78,
        broad_noise * 0.52 + fine_noise * 0.48
      );
      float extended_shape = mix(
        1.0,
        cross_envelope * wisp_texture,
        v_reach_effect
      );
      float tail_fade = mix(
        1.0,
        exp(-inward_progress * WISP_TAIL_DECAY),
        v_reach_effect
      );
      float alpha =
        v_alpha *
        envelope *
        body *
        overlap_scale *
        v_density *
        coherent_density *
        extended_shape *
        tail_fade;
      alpha = min(
        alpha,
        mix(1.0, SPARSE_WISP_ALPHA_MAXIMUM, v_sparse_wisp)
      );

      if (alpha < 0.0008 * overlap_scale) {
        discard;
      }

      vec3 color =
        v_color * u_brightness * mix(0.72, 1.03, broad_noise);
      output_color = vec4(color * alpha, alpha);
    }
  `;

  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      return shader;
    }

    const message = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Edge smoke shader compilation failed: ${message}`);
  }

  function createProgram(gl) {
    const vertexShader = createShader(
      gl,
      gl.VERTEX_SHADER,
      SMOKE_VERTEX_SHADER,
    );
    const fragmentShader = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      SMOKE_FRAGMENT_SHADER,
    );
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
      return program;
    }

    const message = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Edge smoke program linking failed: ${message}`);
  }

  function parseHexColor(value) {
    const match = /^#([0-9a-f]{6})$/i.exec(value);

    if (!match) {
      throw new Error(`Unsupported edge smoke color ${value}`);
    }

    const integer = Number.parseInt(match[1], 16);
    return [
      ((integer >> 16) & 255) / 255,
      ((integer >> 8) & 255) / 255,
      (integer & 255) / 255,
    ];
  }

  function paletteColor(property) {
    const value = window
      .getComputedStyle(document.documentElement)
      .getPropertyValue(property)
      .trim();

    if (!value) {
      throw new Error(`Missing edge smoke color ${property}`);
    }

    return parseHexColor(value);
  }

  function tuningPrecision(step) {
    const decimal = String(step).split(".")[1];
    return decimal ? decimal.length : 0;
  }

  function normalizedTuningValue(control, candidate) {
    const parsed = Number.parseFloat(candidate);
    const value = Number.isFinite(parsed)
      ? parsed
      : control.defaultValue;
    const clamped = Math.min(
      control.maximum,
      Math.max(control.minimum, value),
    );
    const stepped =
      control.minimum +
      Math.round(
        (clamped - control.minimum) / control.step,
      ) *
        control.step;
    return Number(
      stepped.toFixed(tuningPrecision(control.step)),
    );
  }

  function interpolatedTuningValue(start, end, progress) {
    if (start > 0 && end > 0) {
      return start * Math.pow(end / start, progress);
    }

    return start + (end - start) * progress;
  }

  function tuningInterpolationProgress(start, end, value) {
    if (start > 0 && end > 0) {
      return Math.log(value / start) / Math.log(end / start);
    }

    return (value - start) / (end - start);
  }

  function tuningValueFromInput(control, candidate) {
    const inputValue = Math.min(
      TUNING_INPUT_RANGE.maximum,
      Math.max(
        TUNING_INPUT_RANGE.minimum,
        Number.parseFloat(candidate),
      ),
    );
    let value;

    if (inputValue <= TUNING_INPUT_RANGE.midpoint) {
      const progress =
        (inputValue - TUNING_INPUT_RANGE.minimum) /
        (TUNING_INPUT_RANGE.midpoint - TUNING_INPUT_RANGE.minimum);
      value = interpolatedTuningValue(
        control.minimum,
        control.defaultValue,
        progress,
      );
    } else {
      const progress =
        (inputValue - TUNING_INPUT_RANGE.midpoint) /
        (TUNING_INPUT_RANGE.maximum - TUNING_INPUT_RANGE.midpoint);
      value = interpolatedTuningValue(
        control.defaultValue,
        control.maximum,
        progress,
      );
    }

    return normalizedTuningValue(control, value);
  }

  function tuningInputValue(control, candidate) {
    const value = normalizedTuningValue(control, candidate);
    let inputValue;

    if (value <= control.defaultValue) {
      const progress = tuningInterpolationProgress(
        control.minimum,
        control.defaultValue,
        value,
      );
      inputValue =
        TUNING_INPUT_RANGE.minimum +
        progress *
          (TUNING_INPUT_RANGE.midpoint - TUNING_INPUT_RANGE.minimum);
    } else {
      const progress = tuningInterpolationProgress(
        control.defaultValue,
        control.maximum,
        value,
      );
      inputValue =
        TUNING_INPUT_RANGE.midpoint +
        progress *
          (TUNING_INPUT_RANGE.maximum - TUNING_INPUT_RANGE.midpoint);
    }

    return Math.round(inputValue);
  }

  function tuningFromParameters(parameters) {
    return Object.fromEntries(
      TUNING_CONTROLS.map((control) => [
        control.key,
        normalizedTuningValue(
          control,
          parameters.get(control.parameter),
        ),
      ]),
    );
  }

  function tuningValueForQuery(control, value) {
    return value.toFixed(tuningPrecision(control.step));
  }

  function tuningValueForDisplay(control, value) {
    if (control.display === "integer") {
      return String(Math.round(value));
    }

    if (control.display === "percent") {
      return `${Math.round(value * 100)}%`;
    }

    return `${value.toFixed(2)}x`;
  }

  function tuningEditorScale(control) {
    return control.display === "percent" ? 100 : 1;
  }

  function tuningValueForEditor(control, value) {
    const scale = tuningEditorScale(control);
    const step = control.step * scale;
    return (value * scale).toFixed(tuningPrecision(step));
  }

  function tuningValueFromEditor(control, candidate) {
    const parsed = Number.parseFloat(candidate);

    if (!Number.isFinite(parsed)) {
      return undefined;
    }

    return normalizedTuningValue(
      control,
      parsed / tuningEditorScale(control),
    );
  }

  function tuningEditorUnit(control) {
    if (control.display === "multiplier") {
      return "x";
    }

    return control.display === "percent" ? "%" : "";
  }

  function publicTuning(settings) {
    return Object.fromEntries(
      TUNING_CONTROLS.map((control) => [
        control.key,
        settings[control.key],
      ]),
    );
  }

  function updateTuningUrl(settings, includeDefaults, reviewReady) {
    const url = new URL(window.location.href);
    url.searchParams.set(TUNING_QUERY_PARAMETER, FEATURE_FORCED_VALUE);

    if (reviewReady) {
      url.searchParams.set("animate", "");
      url.searchParams.set("fps", "");
      url.searchParams.set("renderer", "webgl");
    }

    for (const control of TUNING_CONTROLS) {
      const value = settings[control.key];

      if (
        !includeDefaults &&
        value === control.defaultValue
      ) {
        url.searchParams.delete(control.parameter);
      } else {
        url.searchParams.set(
          control.parameter,
          tuningValueForQuery(control, value),
        );
      }
    }

    if (includeDefaults) {
      const rotationSpeed = Number.parseFloat(
        document.querySelector(
          ROTATION_SPEED_NUMBER_SELECTOR,
        )?.value,
      );

      if (Number.isFinite(rotationSpeed)) {
        url.searchParams.set(
          ROTATION_SPEED_QUERY_PARAMETER,
          rotationSpeed.toFixed(2),
        );
      }
    }

    window.history.replaceState(
      window.history.state,
      "",
      url,
    );
  }

  class SmokeTuningPanel {
    constructor(settings) {
      this.settings = settings;
      this.root = document.querySelector(TUNER_SELECTOR);

      if (!this.root) {
        return;
      }

      this.body = this.root.querySelector(
        "[data-smoke-tuner-body]",
      );
      this.controls = this.root.querySelector(
        "[data-smoke-tuner-controls]",
      );
      this.status = this.root.querySelector(
        "[data-smoke-tuner-status]",
      );
      this.collapseButton = this.root.querySelector(
        "[data-smoke-tuner-collapse]",
      );
      this.dragHandle = this.root.querySelector(
        "[data-smoke-tuner-drag-handle]",
      );
      this.copyButton = this.root.querySelector(
        "[data-smoke-tuner-copy]",
      );
      this.resetButton = this.root.querySelector(
        TUNER_RESET_SELECTOR,
      );
      this.inputs = new Map();
      this.dragState = undefined;
      this.suppressHeaderClick = false;
      this.expandedHeight = undefined;
      this.onDragStart = this.startDragging.bind(this);
      this.onDrag = this.drag.bind(this);
      this.onDragEnd = this.stopDragging.bind(this);
      this.onHeaderClick = this.handleHeaderClick.bind(this);
      this.onViewportResize = () => this.constrainPosition();
      this.buildControls();
      this.collapseButton.addEventListener(
        "click",
        () => this.toggleCollapsed(),
      );
      this.copyButton.addEventListener("click", () => {
        this.copyLink();
      });
      this.resetButton.addEventListener(
        "click",
        () => this.reset(),
      );
      this.dragHandle.addEventListener(
        "pointerdown",
        this.onDragStart,
      );
      window.addEventListener(
        "pointermove",
        this.onDrag,
      );
      window.addEventListener(
        "pointerup",
        this.onDragEnd,
      );
      window.addEventListener(
        "pointercancel",
        this.onDragEnd,
      );
      this.dragHandle.addEventListener(
        "click",
        this.onHeaderClick,
        true,
      );
      window.addEventListener("resize", this.onViewportResize);
      this.root.hidden = false;
      this.resizeObserver = new ResizeObserver(() => {
        this.constrainPosition();
      });
      this.resizeObserver.observe(this.root);
      window.requestAnimationFrame(() => {
        this.constrainPosition();
      });
      updateTuningUrl(this.settings, false, false);
    }

    buildControls() {
      for (const control of TUNING_CONTROLS) {
        const controlElement = document.createElement("div");
        const heading = document.createElement("span");
        const name = document.createElement("label");
        const valueEditor = document.createElement("span");
        const valueInput = document.createElement("input");
        const unit = document.createElement("span");
        const rangeInput = document.createElement("input");
        const inputId = `smoke-tuner-${control.key}`;
        const currentValue = this.settings[control.key];

        controlElement.className = "smoke-tuner__control";
        heading.className = "smoke-tuner__control-heading";
        name.htmlFor = inputId;
        name.textContent = control.label;
        valueEditor.className = "smoke-tuner__value-editor";
        valueInput.className = "smoke-tuner__value-input";
        valueInput.type = "number";
        valueInput.inputMode =
          control.display === "integer" ? "numeric" : "decimal";
        valueInput.min = tuningValueForEditor(
          control,
          control.minimum,
        );
        valueInput.max = tuningValueForEditor(
          control,
          control.maximum,
        );
        valueInput.step = tuningValueForEditor(
          control,
          control.step,
        );
        valueInput.value = tuningValueForEditor(
          control,
          currentValue,
        );
        valueInput.setAttribute(
          "aria-label",
          `${control.label} exact value`,
        );
        unit.className = "smoke-tuner__value-unit";
        unit.textContent = tuningEditorUnit(control);
        rangeInput.id = inputId;
        rangeInput.type = "range";
        rangeInput.min = String(TUNING_INPUT_RANGE.minimum);
        rangeInput.max = String(TUNING_INPUT_RANGE.maximum);
        rangeInput.step = String(TUNING_INPUT_RANGE.step);
        rangeInput.value = String(
          tuningInputValue(
            control,
            currentValue,
          ),
        );
        rangeInput.setAttribute("aria-label", control.label);
        rangeInput.setAttribute(
          "aria-valuetext",
          tuningValueForDisplay(
            control,
            currentValue,
          ),
        );
        valueEditor.append(valueInput);

        if (unit.textContent) {
          valueEditor.append(unit);
        }

        heading.append(name, valueEditor);
        controlElement.append(heading, rangeInput);
        this.controls.append(controlElement);
        this.inputs.set(control.key, {
          rangeInput,
          valueInput,
        });

        const applyValue = (value) => {
          this.settings[control.key] = value;
          rangeInput.setAttribute(
            "aria-valuetext",
            tuningValueForDisplay(control, value),
          );
          this.status.textContent = "";
          updateTuningUrl(this.settings, false, false);
        };

        rangeInput.addEventListener("input", () => {
          const value = tuningValueFromInput(
            control,
            rangeInput.value,
          );
          applyValue(value);
          valueInput.value = tuningValueForEditor(
            control,
            value,
          );
        });

        const applyEditorValue = (canonicalize) => {
          const value = tuningValueFromEditor(
            control,
            valueInput.value,
          );

          if (value === undefined) {
            if (canonicalize) {
              valueInput.value = tuningValueForEditor(
                control,
                this.settings[control.key],
              );
            }
            return;
          }

          applyValue(value);
          rangeInput.value = String(
            tuningInputValue(control, value),
          );

          if (canonicalize) {
            valueInput.value = tuningValueForEditor(
              control,
              value,
            );
          }
        };

        valueInput.addEventListener("input", () => {
          applyEditorValue(false);
        });
        valueInput.addEventListener("change", () => {
          applyEditorValue(true);
        });
      }
    }

    constrainPosition(left, top) {
      const bounds = this.root.getBoundingClientRect();

      if (bounds.width === 0 || bounds.height === 0) {
        return;
      }

      const maximumLeft = Math.max(
        TUNER_VIEWPORT_MARGIN_PX,
        document.documentElement.clientWidth -
          bounds.width -
          TUNER_VIEWPORT_MARGIN_PX,
      );
      const maximumTop = Math.max(
        TUNER_VIEWPORT_MARGIN_PX,
        document.documentElement.clientHeight -
          bounds.height -
          TUNER_VIEWPORT_MARGIN_PX,
      );
      const nextLeft = Math.min(
        Math.max(
          left ?? bounds.left,
          TUNER_VIEWPORT_MARGIN_PX,
        ),
        maximumLeft,
      );
      const nextTop = Math.min(
        Math.max(
          top ?? bounds.top,
          TUNER_VIEWPORT_MARGIN_PX,
        ),
        maximumTop,
      );

      this.root.style.left = `${nextLeft}px`;
      this.root.style.top = `${nextTop}px`;
      this.root.style.right = "auto";
    }

    startDragging(event) {
      if (event.button !== 0) {
        return;
      }

      const bounds = this.root.getBoundingClientRect();
      this.dragState = {
        active: false,
        initialX: event.clientX,
        initialY: event.clientY,
        offsetX: event.clientX - bounds.left,
        offsetY: event.clientY - bounds.top,
        pointerId: event.pointerId,
      };
    }

    drag(event) {
      if (
        !this.dragState ||
        event.pointerId !== this.dragState.pointerId
      ) {
        return;
      }

      if (!this.dragState.active) {
        const horizontalDistance =
          event.clientX - this.dragState.initialX;
        const verticalDistance =
          event.clientY - this.dragState.initialY;

        if (
          Math.hypot(horizontalDistance, verticalDistance) <
          TUNER_DRAG_THRESHOLD_PX
        ) {
          return;
        }

        this.dragState.active = true;
        this.root.classList.add("smoke-tuner--dragging");
        this.dragHandle.setPointerCapture(event.pointerId);
      }

      this.constrainPosition(
        event.clientX - this.dragState.offsetX,
        event.clientY - this.dragState.offsetY,
      );
      event.preventDefault();
    }

    stopDragging(event) {
      if (
        !this.dragState ||
        event.pointerId !== this.dragState.pointerId
      ) {
        return;
      }

      const dragged = this.dragState.active;

      if (this.dragHandle.hasPointerCapture(event.pointerId)) {
        this.dragHandle.releasePointerCapture(event.pointerId);
      }

      this.dragState = undefined;
      this.root.classList.remove("smoke-tuner--dragging");

      if (dragged) {
        this.suppressHeaderClick = true;
        window.setTimeout(() => {
          this.suppressHeaderClick = false;
        });
      }
    }

    handleHeaderClick(event) {
      if (!this.suppressHeaderClick) {
        return;
      }

      this.suppressHeaderClick = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    }

    toggleCollapsed() {
      const collapsed = !this.body.hidden;

      if (collapsed) {
        this.expandedHeight =
          this.root.getBoundingClientRect().height;
        this.root.style.height = "auto";
      } else if (this.expandedHeight !== undefined) {
        this.root.style.height = `${this.expandedHeight}px`;
      }

      this.body.hidden = collapsed;
      this.collapseButton.textContent = collapsed ? "Show" : "Hide";
      this.collapseButton.setAttribute(
        "aria-expanded",
        String(!collapsed),
      );
      window.requestAnimationFrame(() => {
        this.constrainPosition();
      });
    }

    reset() {
      for (const control of TUNING_CONTROLS) {
        const value = control.defaultValue;
        const elements = this.inputs.get(control.key);
        this.settings[control.key] = value;
        elements.rangeInput.value = String(
          tuningInputValue(control, value),
        );
        elements.valueInput.value = tuningValueForEditor(
          control,
          value,
        );
        elements.rangeInput.setAttribute(
          "aria-valuetext",
          tuningValueForDisplay(control, value),
        );
      }

      updateTuningUrl(this.settings, false, false);
      this.status.textContent = "Defaults restored";
    }

    async copyLink() {
      updateTuningUrl(this.settings, true, true);

      try {
        await navigator.clipboard.writeText(window.location.href);
        this.status.textContent = "Tuning link copied";
      } catch {
        this.status.textContent =
          "The tuning link is ready in the address bar";
      }
    }
  }

  function percentile(sortedValues, progress) {
    if (sortedValues.length === 0) {
      return undefined;
    }

    const position = (sortedValues.length - 1) * progress;
    const lowerIndex = Math.floor(position);
    const upperIndex = Math.ceil(position);
    const remainder = position - lowerIndex;
    return (
      sortedValues[lowerIndex] +
      (sortedValues[upperIndex] - sortedValues[lowerIndex]) * remainder
    );
  }

  function frameStats(samples) {
    if (samples.length === 0) {
      return undefined;
    }

    const sorted = [...samples].sort((first, second) => first - second);
    const referenceInterval = percentile(
      sorted,
      FRAME_REFERENCE_PERCENTILE,
    );
    const medianInterval = percentile(
      sorted,
      FRAME_MEDIAN_PERCENTILE,
    );
    const p95Interval = percentile(sorted, FRAME_P95_PERCENTILE);
    const droppedFrames = samples.filter(
      (interval) =>
        interval > referenceInterval * FRAME_DROP_INTERVAL_RATIO,
    ).length;

    return {
      droppedRatio: droppedFrames / samples.length,
      fps: MILLISECONDS_PER_SECOND / medianInterval,
      medianInterval,
      p95Interval,
      referenceInterval,
      sampleCount: samples.length,
    };
  }

  function durationStats(samples) {
    if (samples.length === 0) {
      return undefined;
    }

    const sorted = [...samples].sort((first, second) => first - second);
    return {
      median: percentile(sorted, GPU_MEDIAN_PERCENTILE),
      p90: percentile(sorted, GPU_P90_PERCENTILE),
      sampleCount: samples.length,
    };
  }

  function rounded(value) {
    if (value === undefined) {
      return undefined;
    }

    return Number(value.toFixed(DATA_NUMBER_PRECISION));
  }

  function publicFrameStats(stats) {
    if (!stats) {
      return undefined;
    }

    return {
      droppedRatio: rounded(stats.droppedRatio),
      fps: rounded(stats.fps),
      medianInterval: rounded(stats.medianInterval),
      p95Interval: rounded(stats.p95Interval),
      referenceInterval: rounded(stats.referenceInterval),
      sampleCount: stats.sampleCount,
    };
  }

  function publicDurationStats(stats) {
    if (!stats) {
      return undefined;
    }

    return {
      median: rounded(stats.median),
      p90: rounded(stats.p90),
      sampleCount: stats.sampleCount,
    };
  }

  class SmokeRenderer {
    constructor(canvas, gl, onContextLost, tuning) {
      this.canvas = canvas;
      this.gl = gl;
      this.tuning = tuning;
      this.available = true;
      this.resizePending = true;
      this.renderWidth = 0;
      this.renderHeight = 0;
      this.gpuTimer = gl.getExtension(
        "EXT_disjoint_timer_query_webgl2",
      );
      this.gpuSamples = [];
      this.pendingGpuQueries = [];
      this.program = createProgram(gl);
      this.vertexArray = gl.createVertexArray();
      this.uniforms = {
        breakup: gl.getUniformLocation(this.program, "u_breakup"),
        brightness: gl.getUniformLocation(
          this.program,
          "u_brightness",
        ),
        cyan: gl.getUniformLocation(this.program, "u_cyan"),
        edgeDensity: gl.getUniformLocation(
          this.program,
          "u_edge_density",
        ),
        farSmoke: gl.getUniformLocation(
          this.program,
          "u_far_smoke",
        ),
        opacity: gl.getUniformLocation(this.program, "u_opacity"),
        particleCount: gl.getUniformLocation(
          this.program,
          "u_particle_count",
        ),
        puffScale: gl.getUniformLocation(
          this.program,
          "u_puff_scale",
        ),
        purple: gl.getUniformLocation(this.program, "u_purple"),
        reach: gl.getUniformLocation(this.program, "u_reach"),
        resolution: gl.getUniformLocation(
          this.program,
          "u_resolution",
        ),
        softness: gl.getUniformLocation(
          this.program,
          "u_softness",
        ),
        speed: gl.getUniformLocation(this.program, "u_speed"),
        time: gl.getUniformLocation(this.program, "u_time"),
        tint: gl.getUniformLocation(this.program, "u_tint"),
      };
      this.colors = {
        cyan: paletteColor("--laser-cyan-body"),
        purple: paletteColor("--laser-purple-body"),
      };
      this.onContextLost = () => {
        this.available = false;
        onContextLost();
      };
      canvas.addEventListener(
        "webglcontextlost",
        this.onContextLost,
      );
      gl.clearColor(0, 0, 0, 0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.disable(gl.DEPTH_TEST);
    }

    markResizePending() {
      this.resizePending = true;
    }

    resize() {
      this.resizePending = false;
      const bounds = this.canvas.getBoundingClientRect();

      if (bounds.width === 0 || bounds.height === 0) {
        return false;
      }

      const dpr = Math.min(
        window.devicePixelRatio || 1,
        MAX_RENDER_DPR,
      );
      const baseScale = RENDER_SCALE * dpr;
      const baseWidth = Math.max(
        1,
        Math.round(bounds.width * baseScale),
      );
      const baseHeight = Math.max(
        1,
        Math.round(bounds.height * baseScale),
      );
      const areaScale = Math.min(
        1,
        Math.sqrt(
          MAX_RENDER_PIXEL_COUNT / (baseWidth * baseHeight),
        ),
      );
      const width = Math.max(
        1,
        Math.round(baseWidth * areaScale),
      );
      const height = Math.max(
        1,
        Math.round(baseHeight * areaScale),
      );

      if (
        width === this.renderWidth &&
        height === this.renderHeight
      ) {
        return true;
      }

      this.renderWidth = width;
      this.renderHeight = height;
      this.canvas.width = width;
      this.canvas.height = height;
      this.canvas.dataset.smokeRenderSize = `${width}x${height}`;
      return true;
    }

    clearGpuQueries() {
      for (const query of this.pendingGpuQueries) {
        this.gl.deleteQuery(query);
      }

      this.pendingGpuQueries = [];
    }

    pollGpuQueries() {
      if (!this.gpuTimer || this.pendingGpuQueries.length === 0) {
        return;
      }

      const { gl } = this;

      if (gl.getParameter(this.gpuTimer.GPU_DISJOINT_EXT)) {
        this.clearGpuQueries();
        return;
      }

      while (this.pendingGpuQueries.length > 0) {
        const query = this.pendingGpuQueries[0];
        const available = gl.getQueryParameter(
          query,
          gl.QUERY_RESULT_AVAILABLE,
        );

        if (!available) {
          break;
        }

        const nanoseconds = gl.getQueryParameter(
          query,
          gl.QUERY_RESULT,
        );
        this.gpuSamples.push(
          nanoseconds / NANOSECONDS_PER_MILLISECOND,
        );
        gl.deleteQuery(query);
        this.pendingGpuQueries.shift();
      }
    }

    takeGpuSamples() {
      this.pollGpuQueries();
      const samples = this.gpuSamples;
      this.gpuSamples = [];
      return samples;
    }

    render(timeSeconds) {
      if (!this.available) {
        return false;
      }

      if (this.resizePending && !this.resize()) {
        return false;
      }

      const { gl } = this;
      this.pollGpuQueries();
      let timerQuery;

      if (
        this.gpuTimer &&
        this.pendingGpuQueries.length < MAX_PENDING_GPU_QUERIES
      ) {
        timerQuery = gl.createQuery();
        gl.beginQuery(this.gpuTimer.TIME_ELAPSED_EXT, timerQuery);
      }

      gl.viewport(0, 0, this.renderWidth, this.renderHeight);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(this.program);
      gl.bindVertexArray(this.vertexArray);
      gl.uniform1f(
        this.uniforms.breakup,
        this.tuning.breakup,
      );
      gl.uniform1f(
        this.uniforms.brightness,
        this.tuning.brightness,
      );
      gl.uniform3fv(this.uniforms.cyan, this.colors.cyan);
      gl.uniform1f(
        this.uniforms.edgeDensity,
        this.tuning.edgeDensity,
      );
      gl.uniform1f(
        this.uniforms.farSmoke,
        this.tuning.farSmoke,
      );
      gl.uniform1f(
        this.uniforms.opacity,
        this.tuning.opacity,
      );
      gl.uniform1f(
        this.uniforms.particleCount,
        this.tuning.particles,
      );
      gl.uniform1f(
        this.uniforms.puffScale,
        this.tuning.puffScale,
      );
      gl.uniform3fv(this.uniforms.purple, this.colors.purple);
      gl.uniform1f(this.uniforms.reach, this.tuning.reach);
      gl.uniform2f(
        this.uniforms.resolution,
        this.renderWidth,
        this.renderHeight,
      );
      gl.uniform1f(
        this.uniforms.softness,
        this.tuning.softness,
      );
      gl.uniform1f(this.uniforms.speed, this.tuning.speed);
      gl.uniform1f(this.uniforms.time, timeSeconds);
      gl.uniform1f(this.uniforms.tint, this.tuning.tint);
      gl.drawArraysInstanced(
        gl.TRIANGLE_STRIP,
        0,
        4,
        this.tuning.particles,
      );
      gl.bindVertexArray(null);

      if (timerQuery) {
        gl.endQuery(this.gpuTimer.TIME_ELAPSED_EXT);
        this.pendingGpuQueries.push(timerQuery);
      }

      return true;
    }

    stats() {
      return {
        available: this.available,
        drawCount: this.tuning.particles,
        gpuTimerSupported: Boolean(this.gpuTimer),
        particleCount: this.tuning.particles,
        renderHeight: this.renderHeight,
        renderWidth: this.renderWidth,
      };
    }
  }

  class AdaptiveSmoke {
    constructor(canvas) {
      this.canvas = canvas;
      this.motionPreference = window.matchMedia(
        REDUCED_MOTION_QUERY,
      );
      this.parameters = new URLSearchParams(
        window.location.search,
      );
      this.queryValue = this.parameters.get(
        SMOKE_QUERY_PARAMETER,
      );
      this.tuningEnabled = this.parameters.has(
        TUNING_QUERY_PARAMETER,
      );
      this.tuning = tuningFromParameters(this.parameters);
      this.forced = this.queryValue === FEATURE_FORCED_VALUE;
      this.queryDisabled =
        this.queryValue === FEATURE_DISABLED_VALUE;
      this.tuningPanel = undefined;
      this.renderer = undefined;
      this.frameId = undefined;
      this.previousFrameTimestamp = undefined;
      this.sampleStartTimestamp = undefined;
      this.nextHealthCheckTimestamp = undefined;
      this.smokeStartTimestamp = undefined;
      this.lastSmokeRenderTimestamp = undefined;
      this.frameSamples = [];
      this.activeStats = undefined;
      this.gpuStats = undefined;
      this.blocked = false;
      this.terminal = false;
      this.state = STATUS.waiting;
      this.reason = "startup";
      this.onTick = this.tick.bind(this);
      this.onResize = this.handleResize.bind(this);
      this.onVisibilityChange =
        this.handleVisibilityChange.bind(this);
      this.onMotionPreferenceChange =
        this.handleMotionPreferenceChange.bind(this);
    }

    start() {
      if (this.tuningEnabled) {
        this.tuningPanel = new SmokeTuningPanel(this.tuning);
      }

      if (this.queryDisabled) {
        this.terminal = true;
        this.setStatus(STATUS.disabled, "query-disabled");
        return;
      }

      window.addEventListener("resize", this.onResize);
      document.addEventListener(
        "visibilitychange",
        this.onVisibilityChange,
      );
      this.motionPreference.addEventListener(
        "change",
        this.onMotionPreferenceChange,
      );
      this.syncEnvironment("immediate-start");
    }

    motionAllowed() {
      return (
        document.documentElement.classList.contains(
          FORCE_ANIMATION_CLASS,
        ) || !this.motionPreference.matches
      );
    }

    ensureRenderer() {
      if (this.renderer) {
        return true;
      }

      const gl = this.canvas.getContext(
        "webgl2",
        CONTEXT_OPTIONS,
      );

      if (!gl) {
        this.terminal = true;
        this.setStatus(STATUS.unavailable, "webgl2-unavailable");
        return false;
      }

      try {
        this.renderer = new SmokeRenderer(
          this.canvas,
          gl,
          () => {
            this.disable("context-lost", true);
          },
          this.tuning,
        );
        return true;
      } catch (error) {
        this.terminal = true;
        this.setStatus(
          STATUS.unavailable,
          "renderer-initialization-failed",
        );
        console.warn("Edge smoke renderer initialization failed", error);
        return false;
      }
    }

    syncEnvironment(reason) {
      this.cancelFrame();
      this.hide();

      if (this.terminal) {
        return;
      }

      if (!this.motionAllowed()) {
        this.setStatus(STATUS.reducedMotion, "motion-preference");
        return;
      }

      if (document.visibilityState === "hidden") {
        this.setStatus(STATUS.waiting, "document-hidden");
        return;
      }

      if (!this.ensureRenderer()) {
        return;
      }

      this.blocked = false;
      this.resetMeasurements();
      this.activate(
        performance.now(),
        this.forced ? QUERY_FORCED_REASON : reason,
      );
      this.requestFrame();
    }

    resetMeasurements() {
      this.previousFrameTimestamp = undefined;
      this.sampleStartTimestamp = undefined;
      this.nextHealthCheckTimestamp = undefined;
      this.smokeStartTimestamp = undefined;
      this.lastSmokeRenderTimestamp = undefined;
      this.frameSamples = [];
      this.activeStats = undefined;
      this.gpuStats = undefined;
      this.renderer?.takeGpuSamples();
    }

    handleResize() {
      this.renderer?.markResizePending();

      if (
        this.terminal ||
        this.queryDisabled ||
        !this.motionAllowed() ||
        document.visibilityState === "hidden"
      ) {
        return;
      }

      if (this.state === STATUS.active) {
        this.previousFrameTimestamp = undefined;
        this.beginSample(performance.now(), "viewport-changed");
        this.lastSmokeRenderTimestamp = undefined;
        this.requestFrame();
      }
    }

    handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        this.cancelFrame();
        this.hide();
        this.setStatus(STATUS.waiting, "document-hidden");
        return;
      }

      this.syncEnvironment("document-visible");
    }

    handleMotionPreferenceChange() {
      this.syncEnvironment("motion-preference-changed");
    }

    requestFrame() {
      if (
        this.frameId !== undefined ||
        this.blocked ||
        this.terminal ||
        !this.motionAllowed() ||
        document.visibilityState === "hidden"
      ) {
        return;
      }

      this.frameId = window.requestAnimationFrame(this.onTick);
    }

    cancelFrame() {
      if (this.frameId === undefined) {
        return;
      }

      window.cancelAnimationFrame(this.frameId);
      this.frameId = undefined;
    }

    recordFrame(timestamp) {
      if (this.previousFrameTimestamp === undefined) {
        this.previousFrameTimestamp = timestamp;
        return;
      }

      const interval = timestamp - this.previousFrameTimestamp;
      this.previousFrameTimestamp = timestamp;

      if (
        interval <= 0 ||
        this.state !== STATUS.active
      ) {
        return;
      }

      this.frameSamples.push(
        Math.min(interval, MAX_SAMPLED_FRAME_INTERVAL_MS),
      );
    }

    beginSample(timestamp, reason) {
      this.frameSamples = [];
      this.sampleStartTimestamp = timestamp;
      this.nextHealthCheckTimestamp =
        timestamp + EARLY_HEALTH_CHECK_DURATION_MS;
      this.renderer.takeGpuSamples();
      this.setStatus(STATUS.active, reason);
    }

    cadenceCriticallyDegraded(stats) {
      if (!stats) {
        return false;
      }

      return (
        stats.fps < MIN_CRITICAL_FRAME_RATE ||
        stats.medianInterval >
          stats.referenceInterval *
            CRITICAL_MEDIAN_INTERVAL_RATIO ||
        (stats.p95Interval >
          stats.referenceInterval *
            CRITICAL_P95_INTERVAL_RATIO &&
          stats.droppedRatio > CRITICAL_DROPPED_RATIO)
      );
    }

    earlyCadenceFailure(timestamp) {
      if (
        this.forced ||
        this.frameSamples.length <
          MIN_EARLY_HEALTH_SAMPLE_COUNT ||
        timestamp < this.nextHealthCheckTimestamp
      ) {
        return undefined;
      }

      this.nextHealthCheckTimestamp =
        timestamp + EARLY_HEALTH_CHECK_DURATION_MS;
      const stats = frameStats(this.frameSamples);
      return this.cadenceCriticallyDegraded(stats)
        ? stats
        : undefined;
    }

    setFrameData(prefix, stats) {
      if (!stats) {
        return;
      }

      this.canvas.dataset[`${prefix}Fps`] = String(
        rounded(stats.fps),
      );
      this.canvas.dataset[`${prefix}DroppedRatio`] = String(
        rounded(stats.droppedRatio),
      );
    }

    setGpuData(stats) {
      if (!stats) {
        return;
      }

      this.canvas.dataset.smokeGpuMs = String(
        rounded(stats.median),
      );
    }

    activate(timestamp, reason) {
      if (this.smokeStartTimestamp === undefined) {
        this.smokeStartTimestamp = timestamp;
      }

      this.beginSample(timestamp, reason);
      this.renderSmoke(timestamp);

      if (this.blocked || this.terminal) {
        return;
      }

      this.show();
    }

    evaluateActiveWindow(timestamp) {
      this.renderer.pollGpuQueries();
      this.activeStats = frameStats(this.frameSamples);
      this.gpuStats = durationStats(
        this.renderer.takeGpuSamples(),
      );
      this.setFrameData("smokeActive", this.activeStats);
      this.setGpuData(this.gpuStats);

      if (this.forced) {
        this.beginSample(timestamp, QUERY_FORCED_REASON);
        return;
      }

      if (this.cadenceCriticallyDegraded(this.activeStats)) {
        this.disable("critical-frame-rate", false);
        return;
      }

      this.beginSample(timestamp, "frame-rate-healthy");
    }

    renderSmoke(timestamp) {
      if (!this.renderer) {
        return;
      }

      if (this.lastSmokeRenderTimestamp !== undefined) {
        const elapsed = timestamp - this.lastSmokeRenderTimestamp;

        if (elapsed < SMOKE_FRAME_DURATION_MS) {
          return;
        }

        const completedIntervals = Math.max(
          1,
          Math.floor(elapsed / SMOKE_FRAME_DURATION_MS),
        );
        this.lastSmokeRenderTimestamp +=
          completedIntervals * SMOKE_FRAME_DURATION_MS;
      } else {
        this.lastSmokeRenderTimestamp = timestamp;
      }

      const timeSeconds =
        (timestamp - this.smokeStartTimestamp) /
        MILLISECONDS_PER_SECOND;

      try {
        this.renderer.render(timeSeconds);
      } catch (error) {
        console.warn("Edge smoke rendering failed", error);
        this.disable("render-failed", true);
      }
    }

    tick(timestamp) {
      this.frameId = undefined;

      if (
        this.blocked ||
        this.terminal ||
        !this.motionAllowed() ||
        document.visibilityState === "hidden"
      ) {
        return;
      }

      this.renderer.pollGpuQueries();
      this.recordFrame(timestamp);

      if (this.state === STATUS.active) {
        this.renderSmoke(timestamp);
        const earlyStats = this.earlyCadenceFailure(timestamp);

        if (earlyStats) {
          this.activeStats = earlyStats;
          this.gpuStats = durationStats(
            this.renderer.takeGpuSamples(),
          );
          this.setFrameData("smokeActive", this.activeStats);
          this.setGpuData(this.gpuStats);
          this.disable("critical-frame-rate", false);
          return;
        }

        if (
          timestamp - this.sampleStartTimestamp >=
          ACTIVE_SAMPLE_DURATION_MS
        ) {
          this.evaluateActiveWindow(timestamp);
        }
      }

      this.requestFrame();
    }

    show() {
      this.canvas.classList.add(VISIBLE_CLASS);
    }

    hide() {
      this.canvas.classList.remove(VISIBLE_CLASS);
    }

    disable(reason, terminal) {
      this.cancelFrame();
      this.hide();
      this.blocked = !terminal;
      this.terminal = terminal;
      this.setStatus(STATUS.disabled, reason);
    }

    setStatus(status, reason) {
      this.state = status;
      this.reason = reason;
      this.canvas.dataset.smokeStatus = status;
      this.canvas.dataset.smokeReason = reason;
    }

    stats() {
      return {
        active: this.state === STATUS.active,
        current: publicFrameStats(this.activeStats),
        forced: this.forced,
        gpu: publicDurationStats(this.gpuStats),
        mode: this.queryDisabled
          ? FEATURE_DISABLED_VALUE
          : this.forced
            ? FEATURE_FORCED_VALUE
            : "adaptive",
        reason: this.reason,
        renderer: this.renderer?.stats(),
        status: this.state,
        tunerVisible: this.tuningEnabled,
        tuning: publicTuning(this.tuning),
      };
    }
  }

  const canvas = document.querySelector(CANVAS_SELECTOR);

  if (!canvas) {
    return;
  }

  const smoke = new AdaptiveSmoke(canvas);
  window[API_NAME] = Object.freeze({
    stats: () => smoke.stats(),
  });
  smoke.start();
})();
