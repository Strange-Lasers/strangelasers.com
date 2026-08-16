(() => {
  "use strict";

  const API_NAME = "StrangeLasersWebGL";
  const CONTEXT_OPTIONS = Object.freeze({
    alpha: true,
    antialias: true,
    depth: false,
    failIfMajorPerformanceCaveat: true,
    powerPreference: "high-performance",
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
    stencil: false,
  });
  const MAX_RENDER_DPR = 2.5;
  const MAX_RENDER_SIZE = 2048;
  const GLOW_RENDER_SCALE = 0.5;
  const GLOW_TEXTURE_PADDING = 112;
  const GAUSSIAN_VISIBLE_EXTENT = 4;
  const DUAL_BLUR_REFERENCE_RADIUS = 1.5;
  const MAX_BLUR_LEVELS = 5;
  const MAX_MITER_SCALE = 1.1;
  const MIN_MITER_DOT = 0.25;
  const ROUND_JOIN_DOT_THRESHOLD = 0.8;
  const ROUND_JOIN_SEGMENTS = 12;
  const TAU = Math.PI * 2;
  const OCCLUSION_OPAQUE_RATIO = 0.68;
  const SHAPE_MODE = Object.freeze({
    circle: 0,
    endpointGlow: 2,
    eyeGlow: 3,
    lens: 4,
    ring: 5,
    roundedRectangle: 1,
  });

  const STROKE_VERTEX_SHADER = `#version 300 es
    layout(location = 0) in vec2 a_center;
    layout(location = 1) in vec2 a_normal;

    uniform float u_half_width;
    uniform float u_render_padding;
    uniform float u_render_size;

    out vec2 v_view_position;

    void main() {
      vec2 position = a_center + a_normal * u_half_width;
      vec2 clip = vec2(
        (position.x + u_render_padding) / u_render_size * 2.0 - 1.0,
        1.0 - (position.y + u_render_padding) / u_render_size * 2.0
      );
      v_view_position = position;
      gl_Position = vec4(clip, 0.0, 1.0);
    }
  `;

  const STROKE_FRAGMENT_SHADER = `#version 300 es
    precision highp float;

    uniform vec4 u_color;
    uniform float u_occlusion;
    uniform float u_occlusion_radius;
    uniform float u_viewbox_center;

    in vec2 v_view_position;
    out vec4 output_color;

    float occlusion_mask() {
      float distance_from_center = distance(
        v_view_position,
        vec2(u_viewbox_center)
      );
      float mask = 1.0 - smoothstep(
        u_occlusion_radius * ${OCCLUSION_OPAQUE_RATIO},
        u_occlusion_radius,
        distance_from_center
      );
      return mix(1.0, mask, u_occlusion);
    }

    void main() {
      float alpha = u_color.a * occlusion_mask();
      output_color = vec4(u_color.rgb * alpha, alpha);
    }
  `;

  const MASK_FRAGMENT_SHADER = `#version 300 es
    precision highp float;

    out vec4 output_color;

    void main() {
      output_color = vec4(1.0);
    }
  `;

  const QUAD_VERTEX_SHADER = `#version 300 es
    layout(location = 0) in vec2 a_position;

    out vec2 v_uv;

    void main() {
      v_uv = a_position * 0.5 + 0.5;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  const BLUR_FRAGMENT_SHADER = `#version 300 es
    precision highp float;

    uniform sampler2D u_texture;
    uniform vec2 u_source_texel_size;
    uniform int u_upsample;

    in vec2 v_uv;
    out vec4 output_color;

    void main() {
      vec2 texel = u_source_texel_size;

      if (u_upsample == 0) {
        vec4 color = texture(u_texture, v_uv) * 4.0;
        color += texture(u_texture, v_uv + texel * vec2(-1.0, -1.0));
        color += texture(u_texture, v_uv + texel * vec2(1.0, -1.0));
        color += texture(u_texture, v_uv + texel * vec2(-1.0, 1.0));
        color += texture(u_texture, v_uv + texel * vec2(1.0, 1.0));
        output_color = color * 0.125;
        return;
      }

      vec4 color = vec4(0.0);
      color += texture(u_texture, v_uv + texel * vec2(-1.0, -1.0));
      color += texture(u_texture, v_uv + texel * vec2(0.0, -2.0)) * 2.0;
      color += texture(u_texture, v_uv + texel * vec2(1.0, -1.0));
      color += texture(u_texture, v_uv + texel * vec2(-2.0, 0.0)) * 2.0;
      color += texture(u_texture, v_uv + texel * vec2(2.0, 0.0)) * 2.0;
      color += texture(u_texture, v_uv + texel * vec2(-1.0, 1.0));
      color += texture(u_texture, v_uv + texel * vec2(0.0, 2.0)) * 2.0;
      color += texture(u_texture, v_uv + texel * vec2(1.0, 1.0));
      output_color = color / 12.0;
    }
  `;

  const GLOW_FRAGMENT_SHADER = `#version 300 es
    precision highp float;

    uniform vec4 u_channel;
    uniform vec3 u_color;
    uniform float u_occlusion;
    uniform float u_occlusion_radius;
    uniform sampler2D u_tight_texture;
    uniform float u_tight_opacity;
    uniform float u_texture_padding;
    uniform float u_texture_size;
    uniform float u_viewbox_size;
    uniform sampler2D u_wide_texture;
    uniform float u_wide_opacity;

    in vec2 v_uv;
    out vec4 output_color;

    float occlusion_mask() {
      vec2 view_position = vec2(
        v_uv.x,
        1.0 - v_uv.y
      ) * u_viewbox_size;
      float distance_from_center = distance(
        view_position,
        vec2(u_viewbox_size * 0.5)
      );
      float mask = 1.0 - smoothstep(
        u_occlusion_radius * ${OCCLUSION_OPAQUE_RATIO},
        u_occlusion_radius,
        distance_from_center
      );
      return mix(1.0, mask, u_occlusion);
    }

    void main() {
      vec2 view_position = vec2(
        v_uv.x,
        1.0 - v_uv.y
      ) * u_viewbox_size;
      vec2 texture_position = vec2(
        view_position.x + u_texture_padding,
        u_texture_size -
          (view_position.y + u_texture_padding)
      ) / u_texture_size;
      float wide_source = dot(
        texture(u_wide_texture, texture_position),
        u_channel
      );
      float tight_source = dot(
        texture(u_tight_texture, texture_position),
        u_channel
      );
      float mask = occlusion_mask();
      float wide_alpha = wide_source * u_wide_opacity * mask;
      float tight_alpha = tight_source * u_tight_opacity * mask;
      vec3 wide_color = u_color * wide_alpha;
      vec3 tight_color = u_color * tight_alpha;
      vec3 color = tight_color + wide_color * (1.0 - tight_color);
      float alpha = tight_alpha + wide_alpha * (1.0 - tight_alpha);
      output_color = vec4(color, alpha);
    }
  `;

  const SHAPE_VERTEX_SHADER = `#version 300 es
    layout(location = 0) in vec2 a_position;

    uniform vec2 u_center;
    uniform vec2 u_half_size;
    uniform float u_rotation;
    uniform float u_scale;
    uniform float u_viewbox_size;

    out vec2 v_local_position;
    out vec2 v_view_position;

    void main() {
      float cosine = cos(u_rotation);
      float sine = sin(u_rotation);
      mat2 rotation = mat2(cosine, sine, -sine, cosine);
      vec2 local_position = a_position * u_half_size;
      vec2 position = u_center + rotation * local_position * u_scale;
      vec2 clip = vec2(
        position.x / u_viewbox_size * 2.0 - 1.0,
        1.0 - position.y / u_viewbox_size * 2.0
      );
      v_local_position = local_position;
      v_view_position = position;
      gl_Position = vec4(clip, 0.0, 1.0);
    }
  `;

  const SHAPE_FRAGMENT_SHADER = `#version 300 es
    precision highp float;

    uniform float u_blur;
    uniform vec4 u_color;
    uniform float u_corner_radius;
    uniform vec3 u_gradient_color_0;
    uniform vec3 u_gradient_color_1;
    uniform vec3 u_gradient_color_2;
    uniform vec2 u_half_size;
    uniform int u_mode;
    uniform float u_occlusion;
    uniform float u_occlusion_radius;
    uniform float u_radius;
    uniform float u_stroke_width;
    uniform float u_viewbox_center;

    in vec2 v_local_position;
    in vec2 v_view_position;
    out vec4 output_color;

    float coverage(float distance_from_edge) {
      float antialias_width = max(fwidth(distance_from_edge), 0.35);
      return 1.0 - smoothstep(
        -antialias_width,
        antialias_width,
        distance_from_edge
      );
    }

    float occlusion_mask() {
      float distance_from_center = distance(
        v_view_position,
        vec2(u_viewbox_center)
      );
      float mask = 1.0 - smoothstep(
        u_occlusion_radius * ${OCCLUSION_OPAQUE_RATIO},
        u_occlusion_radius,
        distance_from_center
      );
      return mix(1.0, mask, u_occlusion);
    }

    float rounded_rectangle_distance() {
      vec2 offset = abs(v_local_position) -
        (u_half_size - vec2(u_corner_radius));
      return length(max(offset, 0.0)) +
        min(max(offset.x, offset.y), 0.0) -
        u_corner_radius;
    }

    vec4 premultiplied(vec3 color, float alpha) {
      return vec4(color * alpha, alpha);
    }

    void main() {
      float mask = occlusion_mask();

      if (u_mode == ${SHAPE_MODE.circle}) {
        float alpha = coverage(
          length(v_local_position) - u_radius
        ) * u_color.a * mask;
        output_color = premultiplied(u_color.rgb, alpha);
        return;
      }

      if (u_mode == ${SHAPE_MODE.roundedRectangle}) {
        float alpha = coverage(
          rounded_rectangle_distance()
        ) * u_color.a * mask;
        output_color = premultiplied(u_color.rgb, alpha);
        return;
      }

      if (u_mode == ${SHAPE_MODE.endpointGlow}) {
        float progress = length(v_local_position) / u_radius;
        float alpha = progress <= 0.55
          ? mix(0.2, 0.1, progress / 0.55)
          : mix(0.1, 0.0, (progress - 0.55) / 0.45);
        alpha *= coverage(progress - 1.0) * mask;
        output_color = premultiplied(u_color.rgb, alpha);
        return;
      }

      if (u_mode == ${SHAPE_MODE.eyeGlow}) {
        float source_distance = max(
          abs(length(v_local_position) - u_radius) -
            u_stroke_width * 0.5,
          0.0
        );
        float normalized_distance = source_distance / u_blur;
        float alpha = u_color.a * exp(
          -0.5 * normalized_distance * normalized_distance
        );
        output_color = premultiplied(u_color.rgb, alpha);
        return;
      }

      if (u_mode == ${SHAPE_MODE.lens}) {
        float circle = coverage(
          length(v_local_position) - u_radius
        );
        vec2 gradient_position =
          v_local_position / (u_radius * 2.0) + 0.5;
        float progress = distance(
          gradient_position,
          vec2(0.36, 0.30)
        ) / 0.76;
        vec3 color;
        float alpha;

        if (progress <= 0.62) {
          float local_progress = progress / 0.62;
          color = mix(
            u_gradient_color_0,
            u_gradient_color_1,
            local_progress
          );
          alpha = mix(0.8, 0.87, local_progress);
        } else {
          float local_progress = min(
            (progress - 0.62) / 0.38,
            1.0
          );
          color = mix(
            u_gradient_color_1,
            u_gradient_color_2,
            local_progress
          );
          alpha = mix(0.87, 0.94, local_progress);
        }

        output_color = premultiplied(
          color,
          alpha * circle
        );
        return;
      }

      float ring_distance = abs(
        length(v_local_position) - u_radius
      ) - u_stroke_width * 0.5;
      float alpha = coverage(ring_distance) *
        u_color.a * mask;
      output_color = premultiplied(u_color.rgb, alpha);
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
    throw new Error(`WebGL shader compilation failed: ${message}`);
  }

  function createProgram(gl, vertexSource, fragmentSource) {
    const vertexShader = createShader(
      gl,
      gl.VERTEX_SHADER,
      vertexSource,
    );
    const fragmentShader = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      fragmentSource,
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
    throw new Error(`WebGL program linking failed: ${message}`);
  }

  function uniformLocations(gl, program, names) {
    return Object.fromEntries(
      names.map((name) => [
        name,
        gl.getUniformLocation(program, name),
      ]),
    );
  }

  function parseHexColor(value) {
    const match = /^#([0-9a-f]{6})$/i.exec(value);

    if (!match) {
      throw new Error(`Unsupported WebGL color ${value}`);
    }

    const integer = Number.parseInt(match[1], 16);
    return [
      ((integer >> 16) & 255) / 255,
      ((integer >> 8) & 255) / 255,
      (integer & 255) / 255,
    ];
  }

  function normalizeVector(x, y) {
    const length = Math.hypot(x, y);

    if (length === 0) {
      return { x: 0, y: 1 };
    }

    return {
      x: x / length,
      y: y / length,
    };
  }

  function segmentNormal(first, second) {
    const direction = normalizeVector(
      second.x - first.x,
      second.y - first.y,
    );
    return {
      x: -direction.y,
      y: direction.x,
    };
  }

  function pointNormals(points) {
    const segmentNormals = [];

    for (let index = 0; index < points.length - 1; index += 1) {
      segmentNormals.push(
        segmentNormal(points[index], points[index + 1]),
      );
    }

    return points.map((point, index) => {
      if (index === 0) {
        return segmentNormals[0];
      }

      if (index === points.length - 1) {
        return segmentNormals.at(-1);
      }

      const previous = segmentNormals[index - 1];
      const next = segmentNormals[index];
      const normalDot = previous.x * next.x + previous.y * next.y;

      if (normalDot <= ROUND_JOIN_DOT_THRESHOLD) {
        return next;
      }

      const miter = normalizeVector(
        previous.x + next.x,
        previous.y + next.y,
      );
      const dot = miter.x * next.x + miter.y * next.y;
      const scale = Math.min(
        MAX_MITER_SCALE,
        1 / Math.max(dot, MIN_MITER_DOT),
      );
      return {
        x: miter.x * scale,
        y: miter.y * scale,
      };
    });
  }

  function pushStrokeVertex(values, point, normal, side) {
    values.push(
      point.x,
      point.y,
      normal.x * side,
      normal.y * side,
    );
  }

  function pushRoundJoin(values, point) {
    for (let index = 0; index < ROUND_JOIN_SEGMENTS; index += 1) {
      const firstAngle = TAU * index / ROUND_JOIN_SEGMENTS;
      const secondAngle =
        TAU * (index + 1) / ROUND_JOIN_SEGMENTS;
      pushStrokeVertex(values, point, { x: 0, y: 0 }, 1);
      pushStrokeVertex(
        values,
        point,
        { x: Math.cos(firstAngle), y: Math.sin(firstAngle) },
        1,
      );
      pushStrokeVertex(
        values,
        point,
        { x: Math.cos(secondAngle), y: Math.sin(secondAngle) },
        1,
      );
    }
  }

  function splitAtSharpTurns(points) {
    const segments = [];
    const roundJoins = [];
    let segment = [points[0]];

    for (let index = 1; index < points.length - 1; index += 1) {
      const point = points[index];
      segment.push(point);
      const previous = normalizeVector(
        point.x - points[index - 1].x,
        point.y - points[index - 1].y,
      );
      const next = normalizeVector(
        points[index + 1].x - point.x,
        points[index + 1].y - point.y,
      );
      const directionDot =
        previous.x * next.x + previous.y * next.y;

      if (directionDot <= ROUND_JOIN_DOT_THRESHOLD) {
        segments.push(segment);
        roundJoins.push(point);
        segment = [point];
      }
    }

    segment.push(points.at(-1));
    segments.push(segment);
    return { roundJoins, segments };
  }

  function strokeGeometry(segments) {
    const values = [];

    for (const points of segments) {
      if (points.length < 2) {
        continue;
      }

      const split = splitAtSharpTurns(points);

      for (const splitPoints of split.segments) {
        const normals = pointNormals(splitPoints);

        for (
          let index = 0;
          index < splitPoints.length - 1;
          index += 1
        ) {
          const first = splitPoints[index];
          const second = splitPoints[index + 1];
          const firstNormal = normals[index];
          const secondNormal = normals[index + 1];
          pushStrokeVertex(values, first, firstNormal, 1);
          pushStrokeVertex(values, first, firstNormal, -1);
          pushStrokeVertex(values, second, secondNormal, 1);
          pushStrokeVertex(values, first, firstNormal, -1);
          pushStrokeVertex(values, second, secondNormal, -1);
          pushStrokeVertex(values, second, secondNormal, 1);
        }
      }

      for (const point of split.roundJoins) {
        pushRoundJoin(values, point);
      }
    }

    return new Float32Array(values);
  }

  function resolvedLayer(layer, bloom) {
    if (!layer.bloom) {
      return layer;
    }

    return {
      ...layer,
      opacity:
        layer.opacity +
        (layer.bloom.opacity - layer.opacity) * bloom,
      width:
        layer.width +
        (layer.bloom.width - layer.width) * bloom,
    };
  }

  function colorWithOpacity(color, opacity) {
    return [color[0], color[1], color[2], opacity];
  }

  class LaserRenderer {
    constructor(canvas, config, gl) {
      this.canvas = canvas;
      this.config = config;
      this.gl = gl;
      this.available = true;
      this.renderWidth = 0;
      this.renderHeight = 0;
      this.glowWidth = 0;
      this.glowHeight = 0;
      this.resizePending = true;
      this.drawCalls = 0;
      this.colors = this.createColors(config);
      this.programs = this.createPrograms();
      this.createBuffers();
      this.targets = undefined;
      this.onResize = () => {
        this.resizePending = true;
      };
      this.onContextLost = () => {
        this.available = false;
        this.config.onContextLost?.();
      };
      canvas.addEventListener(
        "webglcontextlost",
        this.onContextLost,
      );
      window.addEventListener("resize", this.onResize);
      this.resizeObserver = new ResizeObserver(this.onResize);
      this.resizeObserver.observe(canvas);
      this.resize();
    }

    createColors(config) {
      return {
        core: parseHexColor(config.colors.core),
        cyan: {
          body: parseHexColor(config.colors.cyan.body),
          highlight: parseHexColor(
            config.colors.cyan.highlight,
          ),
          side: parseHexColor(config.colors.cyan.side),
        },
        lens: config.eye.lensColors.map(parseHexColor),
        purple: {
          body: parseHexColor(config.colors.purple.body),
          highlight: parseHexColor(
            config.colors.purple.highlight,
          ),
          side: parseHexColor(config.colors.purple.side),
        },
      };
    }

    createPrograms() {
      const { gl } = this;
      const stroke = createProgram(
        gl,
        STROKE_VERTEX_SHADER,
        STROKE_FRAGMENT_SHADER,
      );
      const mask = createProgram(
        gl,
        STROKE_VERTEX_SHADER,
        MASK_FRAGMENT_SHADER,
      );
      const blur = createProgram(
        gl,
        QUAD_VERTEX_SHADER,
        BLUR_FRAGMENT_SHADER,
      );
      const glow = createProgram(
        gl,
        QUAD_VERTEX_SHADER,
        GLOW_FRAGMENT_SHADER,
      );
      const shape = createProgram(
        gl,
        SHAPE_VERTEX_SHADER,
        SHAPE_FRAGMENT_SHADER,
      );

      return {
        blur: {
          program: blur,
          uniforms: uniformLocations(gl, blur, [
            "u_source_texel_size",
            "u_texture",
            "u_upsample",
          ]),
        },
        glow: {
          program: glow,
          uniforms: uniformLocations(gl, glow, [
            "u_channel",
            "u_color",
            "u_occlusion",
            "u_occlusion_radius",
            "u_tight_opacity",
            "u_tight_texture",
            "u_texture_padding",
            "u_texture_size",
            "u_viewbox_size",
            "u_wide_opacity",
            "u_wide_texture",
          ]),
        },
        mask: {
          program: mask,
          uniforms: uniformLocations(gl, mask, [
            "u_half_width",
            "u_render_padding",
            "u_render_size",
          ]),
        },
        shape: {
          program: shape,
          uniforms: uniformLocations(gl, shape, [
            "u_blur",
            "u_center",
            "u_color",
            "u_corner_radius",
            "u_gradient_color_0",
            "u_gradient_color_1",
            "u_gradient_color_2",
            "u_half_size",
            "u_mode",
            "u_occlusion",
            "u_occlusion_radius",
            "u_radius",
            "u_rotation",
            "u_scale",
            "u_stroke_width",
            "u_viewbox_center",
            "u_viewbox_size",
          ]),
        },
        stroke: {
          program: stroke,
          uniforms: uniformLocations(gl, stroke, [
            "u_color",
            "u_half_width",
            "u_occlusion",
            "u_occlusion_radius",
            "u_render_padding",
            "u_render_size",
            "u_viewbox_center",
          ]),
        },
      };
    }

    createBuffers() {
      const { gl } = this;
      this.strokeBuffer = gl.createBuffer();
      this.strokeVertexArray = gl.createVertexArray();
      gl.bindVertexArray(this.strokeVertexArray);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.strokeBuffer);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(
        0,
        2,
        gl.FLOAT,
        false,
        Float32Array.BYTES_PER_ELEMENT * 4,
        0,
      );
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(
        1,
        2,
        gl.FLOAT,
        false,
        Float32Array.BYTES_PER_ELEMENT * 4,
        Float32Array.BYTES_PER_ELEMENT * 2,
      );

      this.quadBuffer = gl.createBuffer();
      this.quadVertexArray = gl.createVertexArray();
      gl.bindVertexArray(this.quadVertexArray);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([
          -1, -1,
          1, -1,
          -1, 1,
          -1, 1,
          1, -1,
          1, 1,
        ]),
        gl.STATIC_DRAW,
      );
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(
        0,
        2,
        gl.FLOAT,
        false,
        0,
        0,
      );
      gl.bindVertexArray(null);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    createTarget(width, height) {
      const { gl } = this;
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MIN_FILTER,
        gl.LINEAR,
      );
      gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MAG_FILTER,
        gl.LINEAR,
      );
      gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_WRAP_S,
        gl.CLAMP_TO_EDGE,
      );
      gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_WRAP_T,
        gl.CLAMP_TO_EDGE,
      );
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA8,
        width,
        height,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null,
      );
      const framebuffer = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        texture,
        0,
      );

      if (
        gl.checkFramebufferStatus(gl.FRAMEBUFFER) !==
        gl.FRAMEBUFFER_COMPLETE
      ) {
        throw new Error("WebGL glow framebuffer is incomplete");
      }

      return { framebuffer, height, texture, width };
    }

    deleteTargets() {
      if (!this.targets) {
        return;
      }

      const { gl } = this;

      const targets = [
        this.targets.source,
        this.targets.tight,
        this.targets.wide,
        ...this.targets.levels,
      ];

      for (const target of targets) {
        gl.deleteFramebuffer(target.framebuffer);
        gl.deleteTexture(target.texture);
      }

      this.targets = undefined;
    }

    allocateTargets() {
      this.deleteTargets();
      this.targets = {
        source: this.createTarget(
          this.glowWidth,
          this.glowHeight,
        ),
        tight: this.createTarget(
          this.glowWidth,
          this.glowHeight,
        ),
        wide: this.createTarget(
          this.glowWidth,
          this.glowHeight,
        ),
        levels: Array.from(
          { length: MAX_BLUR_LEVELS },
          (_, index) => this.createTarget(
            Math.max(1, this.glowWidth >> (index + 1)),
            Math.max(1, this.glowHeight >> (index + 1)),
          ),
        ),
      };
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    }

    resize() {
      if (!this.available) {
        return;
      }

      this.resizePending = false;

      const bounds = this.canvas.getBoundingClientRect();

      if (bounds.width === 0 || bounds.height === 0) {
        return;
      }

      const dpr = Math.min(
        window.devicePixelRatio || 1,
        MAX_RENDER_DPR,
      );
      const width = Math.min(
        Math.max(1, Math.round(bounds.width * dpr)),
        MAX_RENDER_SIZE,
      );
      const height = Math.min(
        Math.max(1, Math.round(bounds.height * dpr)),
        MAX_RENDER_SIZE,
      );

      if (
        width === this.renderWidth &&
        height === this.renderHeight
      ) {
        return;
      }

      this.renderWidth = width;
      this.renderHeight = height;
      const glowTextureRatio =
        (this.config.viewboxSize + GLOW_TEXTURE_PADDING * 2) /
        this.config.viewboxSize;
      this.glowWidth = Math.max(
        1,
        Math.round(
          width * GLOW_RENDER_SCALE * glowTextureRatio,
        ),
      );
      this.glowHeight = Math.max(
        1,
        Math.round(
          height * GLOW_RENDER_SCALE * glowTextureRatio,
        ),
      );
      this.canvas.width = width;
      this.canvas.height = height;
      this.allocateTargets();
    }

    useNormalBlend() {
      const { gl } = this;
      gl.enable(gl.BLEND);
      gl.blendEquation(gl.FUNC_ADD);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    }

    useScreenBlend() {
      const { gl } = this;
      gl.enable(gl.BLEND);
      gl.blendEquation(gl.FUNC_ADD);
      gl.blendFuncSeparate(
        gl.ONE,
        gl.ONE_MINUS_SRC_COLOR,
        gl.ONE,
        gl.ONE_MINUS_SRC_ALPHA,
      );
    }

    bindStrokeGeometry(geometry) {
      const { gl } = this;
      gl.bindVertexArray(this.strokeVertexArray);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.strokeBuffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        geometry,
        gl.DYNAMIC_DRAW,
      );
      this.boundStrokeVertexCount = geometry.length / 4;
    }

    drawBoundMask(width) {
      if (this.boundStrokeVertexCount === 0) {
        return;
      }

      const { gl } = this;
      const { program, uniforms } = this.programs.mask;
      gl.useProgram(program);
      gl.uniform1f(uniforms.u_half_width, width * 0.5);
      gl.uniform1f(
        uniforms.u_render_padding,
        GLOW_TEXTURE_PADDING,
      );
      gl.uniform1f(
        uniforms.u_render_size,
        this.config.viewboxSize + GLOW_TEXTURE_PADDING * 2,
      );
      gl.drawArrays(
        gl.TRIANGLES,
        0,
        this.boundStrokeVertexCount,
      );
      this.drawCalls += 1;
    }

    drawBoundStroke(width, color, opacity, occlusion) {
      if (this.boundStrokeVertexCount === 0) {
        return;
      }

      const { gl } = this;
      const { program, uniforms } = this.programs.stroke;
      gl.useProgram(program);
      gl.uniform4fv(
        uniforms.u_color,
        colorWithOpacity(color, opacity),
      );
      gl.uniform1f(uniforms.u_half_width, width * 0.5);
      gl.uniform1f(uniforms.u_occlusion, occlusion ? 1 : 0);
      gl.uniform1f(
        uniforms.u_occlusion_radius,
        this.config.eye.occlusionRadius,
      );
      gl.uniform1f(
        uniforms.u_viewbox_center,
        this.config.viewboxSize * 0.5,
      );
      gl.uniform1f(
        uniforms.u_render_padding,
        0,
      );
      gl.uniform1f(
        uniforms.u_render_size,
        this.config.viewboxSize,
      );
      gl.drawArrays(
        gl.TRIANGLES,
        0,
        this.boundStrokeVertexCount,
      );
      this.drawCalls += 1;
    }

    drawBeamGeometry(
      geometry,
      beamIndex,
      layers,
      occlusion,
      weave = false,
    ) {
      if (geometry.length === 0) {
        return;
      }

      const beamColors = beamIndex === 0
        ? this.colors.cyan
        : this.colors.purple;
      this.bindStrokeGeometry(geometry);
      this.useNormalBlend();

      for (const layer of layers) {
        let opacity = layer.opacity;

        if (
          weave &&
          layer.className.includes("--shell")
        ) {
          opacity = 1;
        }

        const color = layer.color === "core"
          ? this.colors.core
          : beamColors[layer.color];
        this.drawBoundStroke(
          layer.width,
          color,
          opacity,
          occlusion,
        );
      }
    }

    renderMask(geometries, width) {
      const { gl } = this;
      gl.bindFramebuffer(
        gl.FRAMEBUFFER,
        this.targets.source.framebuffer,
      );
      gl.viewport(0, 0, this.glowWidth, this.glowHeight);
      gl.disable(gl.BLEND);
      gl.colorMask(true, true, true, true);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      for (const [beamIndex, geometry] of geometries.entries()) {
        const baseChannel = beamIndex;
        const frontChannel = beamIndex + 2;
        const baseMask = [false, false, false, false];
        baseMask[baseChannel] = true;
        gl.colorMask(...baseMask);
        this.bindStrokeGeometry(geometry.fullGlow);
        this.drawBoundMask(width);
        const frontMask = [false, false, false, false];
        frontMask[frontChannel] = true;
        gl.colorMask(...frontMask);
        this.bindStrokeGeometry(geometry.frontGlow);
        this.drawBoundMask(width);
      }

      gl.colorMask(true, true, true, true);
    }

    blur(source, target, upsample) {
      const { gl } = this;
      const { program, uniforms } = this.programs.blur;
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
      gl.viewport(0, 0, target.width, target.height);
      gl.disable(gl.BLEND);
      gl.useProgram(program);
      gl.bindVertexArray(this.quadVertexArray);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, source.texture);
      gl.uniform1i(uniforms.u_texture, 0);
      gl.uniform2f(
        uniforms.u_source_texel_size,
        1 / source.width,
        1 / source.height,
      );
      gl.uniform1i(uniforms.u_upsample, upsample ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      this.drawCalls += 1;
    }

    blurLevelCount(sigma) {
      const textureScale =
        this.glowWidth /
        (this.config.viewboxSize + GLOW_TEXTURE_PADDING * 2);
      const sigmaPixels = sigma * textureScale;
      return Math.min(
        MAX_BLUR_LEVELS,
        Math.max(
          1,
          Math.round(
            Math.log2(
              sigmaPixels / DUAL_BLUR_REFERENCE_RADIUS,
            ),
          ),
        ),
      );
    }

    dualBlur(target, sigma) {
      const levelCount = this.blurLevelCount(sigma);
      let source = this.targets.source;

      for (let index = 0; index < levelCount; index += 1) {
        const level = this.targets.levels[index];
        this.blur(source, level, false);
        source = level;
      }

      for (let index = levelCount - 2; index >= 0; index -= 1) {
        const level = this.targets.levels[index];
        this.blur(source, level, true);
        source = level;
      }

      this.blur(source, target, true);
    }

    renderBlurredGlow(geometries, layer, target) {
      this.renderMask(geometries, layer.width);
      this.dualBlur(target, layer.blur);
    }

    compositeGlow(
      channelIndex,
      color,
      tightOpacity,
      wideOpacity,
      occlusion,
    ) {
      const { gl } = this;
      const { program, uniforms } = this.programs.glow;
      const channel = [0, 0, 0, 0];
      channel[channelIndex] = 1;
      this.useScreenBlend();
      gl.useProgram(program);
      gl.bindVertexArray(this.quadVertexArray);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(
        gl.TEXTURE_2D,
        this.targets.wide.texture,
      );
      gl.uniform1i(uniforms.u_wide_texture, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(
        gl.TEXTURE_2D,
        this.targets.tight.texture,
      );
      gl.uniform1i(uniforms.u_tight_texture, 1);
      gl.uniform1f(
        uniforms.u_texture_padding,
        GLOW_TEXTURE_PADDING,
      );
      gl.uniform1f(
        uniforms.u_texture_size,
        this.config.viewboxSize + GLOW_TEXTURE_PADDING * 2,
      );
      gl.uniform4fv(uniforms.u_channel, channel);
      gl.uniform3fv(uniforms.u_color, color);
      gl.uniform1f(uniforms.u_tight_opacity, tightOpacity);
      gl.uniform1f(uniforms.u_wide_opacity, wideOpacity);
      gl.uniform1f(uniforms.u_occlusion, occlusion ? 1 : 0);
      gl.uniform1f(
        uniforms.u_occlusion_radius,
        this.config.eye.occlusionRadius,
      );
      gl.uniform1f(
        uniforms.u_viewbox_size,
        this.config.viewboxSize,
      );
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      this.drawCalls += 1;
    }

    drawShape({
      blur = 0,
      center,
      color,
      cornerRadius = 0,
      halfSize,
      mode,
      occlusion = false,
      radius = 0,
      rotation = 0,
      scale = 1,
      screen = false,
      strokeWidth = 0,
    }) {
      const { gl } = this;
      const { program, uniforms } = this.programs.shape;
      if (screen) {
        this.useScreenBlend();
      } else {
        this.useNormalBlend();
      }
      gl.useProgram(program);
      gl.bindVertexArray(this.quadVertexArray);
      gl.uniform1f(uniforms.u_blur, blur);
      gl.uniform2f(uniforms.u_center, center.x, center.y);
      gl.uniform4fv(uniforms.u_color, color);
      gl.uniform1f(uniforms.u_corner_radius, cornerRadius);
      gl.uniform3fv(
        uniforms.u_gradient_color_0,
        this.colors.lens[0],
      );
      gl.uniform3fv(
        uniforms.u_gradient_color_1,
        this.colors.lens[1],
      );
      gl.uniform3fv(
        uniforms.u_gradient_color_2,
        this.colors.lens[2],
      );
      gl.uniform2f(
        uniforms.u_half_size,
        halfSize.x,
        halfSize.y,
      );
      gl.uniform1i(uniforms.u_mode, mode);
      gl.uniform1f(uniforms.u_occlusion, occlusion ? 1 : 0);
      gl.uniform1f(
        uniforms.u_occlusion_radius,
        this.config.eye.occlusionRadius,
      );
      gl.uniform1f(uniforms.u_radius, radius);
      gl.uniform1f(uniforms.u_rotation, rotation);
      gl.uniform1f(uniforms.u_scale, scale);
      gl.uniform1f(uniforms.u_stroke_width, strokeWidth);
      gl.uniform1f(
        uniforms.u_viewbox_center,
        this.config.viewboxSize * 0.5,
      );
      gl.uniform1f(
        uniforms.u_viewbox_size,
        this.config.viewboxSize,
      );
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      this.drawCalls += 1;
    }

    drawEndpoint(
      beamIndex,
      endpointIndex,
      point,
      rotation,
      occlusion,
    ) {
      const beam = this.config.beams[beamIndex];
      const beamColors = beamIndex === 0
        ? this.colors.cyan
        : this.colors.purple;
      const kind = endpointIndex === 0
        ? beam.startCap
        : beam.endCap;
      const center = { x: point.x, y: point.y };
      const glowRadius = this.config.endpoint.glowRadius;
      this.drawShape({
        center,
        color: [...beamColors.body, 1],
        halfSize: { x: glowRadius, y: glowRadius },
        mode: SHAPE_MODE.endpointGlow,
        occlusion,
        radius: glowRadius,
        rotation,
        scale: point.scale,
      });

      for (const layer of this.config.endpoint.layers) {
        const color = layer.color === "core"
          ? this.colors.core
          : beamColors[layer.color];
        const shapeMode = kind === "round"
          ? SHAPE_MODE.circle
          : SHAPE_MODE.roundedRectangle;
        this.drawShape({
          center,
          color: [...color, 1],
          cornerRadius: layer.radius * 0.16,
          halfSize: {
            x: layer.radius,
            y: layer.radius,
          },
          mode: shapeMode,
          occlusion,
          radius: layer.radius,
          rotation,
          scale: point.scale,
        });
      }
    }

    drawEye() {
      const center = {
        x: this.config.viewboxSize * 0.5,
        y: this.config.viewboxSize * 0.5,
      };
      const eye = this.config.eye;
      const glowExtent =
        eye.glowRadius +
        eye.glowStrokeWidth * 0.5 +
        eye.glowBlur * GAUSSIAN_VISIBLE_EXTENT;
      this.drawShape({
        blur: eye.glowBlur,
        center,
        color: [
          ...this.colors.purple.body,
          eye.glowOpacity,
        ],
        halfSize: { x: glowExtent, y: glowExtent },
        mode: SHAPE_MODE.eyeGlow,
        radius: eye.glowRadius,
        screen: true,
        strokeWidth: eye.glowStrokeWidth,
      });
      this.drawShape({
        center,
        color: [0, 0, 0, 1],
        halfSize: {
          x: eye.lensRadius,
          y: eye.lensRadius,
        },
        mode: SHAPE_MODE.lens,
        radius: eye.lensRadius,
      });
      const ringExtent =
        eye.lensRadius + eye.lensStrokeWidth * 0.5 + 1;
      this.drawShape({
        center,
        color: [...this.colors.core, 1],
        halfSize: { x: ringExtent, y: ringExtent },
        mode: SHAPE_MODE.ring,
        radius: eye.lensRadius,
        strokeWidth: eye.lensStrokeWidth,
      });
    }

    drawBeamGlows(
      beamIndex,
      wideLayer,
      tightLayer,
      front,
    ) {
      const beamColors = beamIndex === 0
        ? this.colors.cyan
        : this.colors.purple;
      const channelIndex = beamIndex + (front ? 2 : 0);
      this.compositeGlow(
        channelIndex,
        beamColors.body,
        tightLayer.opacity,
        wideLayer.opacity,
        front,
      );
    }

    drawRegularEndpoint(
      scene,
      movedEndpoints,
      beamIndex,
      endpointIndex,
      front,
    ) {
      const key = `${beamIndex}:${endpointIndex}`;

      if (movedEndpoints.has(key)) {
        return;
      }

      const beam = scene.beams[beamIndex];
      const point = endpointIndex === 0
        ? beam.projectedPoints[0]
        : beam.projectedPoints.at(-1);

      if (front && point.z < 0) {
        return;
      }

      this.drawEndpoint(
        beamIndex,
        endpointIndex,
        point,
        scene.outerAngle,
        front,
      );
    }

    drawOverlayEndpoint(scene, overlay, front) {
      if (overlay.endpointIndex === undefined) {
        return;
      }

      const beam = scene.beams[overlay.beamIndex];
      const point = overlay.endpointIndex === 0
        ? beam.projectedPoints[0]
        : beam.projectedPoints.at(-1);

      if (front && point.z < 0) {
        return;
      }

      this.drawEndpoint(
        overlay.beamIndex,
        overlay.endpointIndex,
        point,
        scene.outerAngle,
        front,
      );
    }

    render(scene) {
      if (!this.available) {
        return false;
      }

      if (this.resizePending) {
        this.resize();
      }

      if (!this.targets) {
        return false;
      }

      try {
        const { gl } = this;
        this.drawCalls = 0;
        const layers = this.config.layers.map((layer) =>
          resolvedLayer(layer, scene.bloom),
        );
        const wideLayer = layers.find(
          (layer) => layer.filter === "wide",
        );
        const tightLayer = layers.find(
          (layer) => layer.filter === "tight",
        );
        const solidLayers = layers.filter(
          (layer) => !layer.filter,
        );
        const geometries = scene.beams.map((beam) => ({
          baseSolid: strokeGeometry(beam.baseSolidSegments),
          frontGlow: strokeGeometry(beam.frontGlowSegments),
          frontSolid: strokeGeometry(beam.frontSolidSegments),
          fullGlow: strokeGeometry([
            beam.projectedPoints,
          ]),
        }));
        const overlayGeometries = scene.overlays.map(
          (overlay) => ({
            base: strokeGeometry(overlay.segments),
            front: strokeGeometry(overlay.frontSegments),
          }),
        );
        this.renderBlurredGlow(
          geometries,
          {
            ...wideLayer,
            blur: this.config.filters.wide.blur,
          },
          this.targets.wide,
        );
        this.renderBlurredGlow(
          geometries,
          {
            ...tightLayer,
            blur: this.config.filters.tight.blur,
          },
          this.targets.tight,
        );
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, this.renderWidth, this.renderHeight);
        gl.colorMask(true, true, true, true);
        gl.disable(gl.DEPTH_TEST);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        const movedEndpoints = new Set(
          scene.overlays
            .filter(
              (overlay) =>
                overlay.endpointIndex !== undefined,
            )
            .map(
              (overlay) =>
                `${overlay.beamIndex}:${overlay.endpointIndex}`,
            ),
        );

        for (let beamIndex = 0; beamIndex < 2; beamIndex += 1) {
          this.drawBeamGlows(
            beamIndex,
            wideLayer,
            tightLayer,
            false,
          );
          this.drawBeamGeometry(
            geometries[beamIndex].baseSolid,
            beamIndex,
            solidLayers,
            false,
          );
          this.drawRegularEndpoint(
            scene,
            movedEndpoints,
            beamIndex,
            0,
            false,
          );
          this.drawRegularEndpoint(
            scene,
            movedEndpoints,
            beamIndex,
            1,
            false,
          );
        }

        scene.overlays.forEach((overlay, index) => {
          this.drawBeamGeometry(
            overlayGeometries[index].base,
            overlay.beamIndex,
            solidLayers,
            false,
            true,
          );
          this.drawOverlayEndpoint(scene, overlay, false);
        });
        this.drawEye();

        for (let beamIndex = 0; beamIndex < 2; beamIndex += 1) {
          this.drawBeamGlows(
            beamIndex,
            wideLayer,
            tightLayer,
            true,
          );
          this.drawBeamGeometry(
            geometries[beamIndex].frontSolid,
            beamIndex,
            solidLayers,
            true,
          );
          this.drawRegularEndpoint(
            scene,
            movedEndpoints,
            beamIndex,
            0,
            true,
          );
          this.drawRegularEndpoint(
            scene,
            movedEndpoints,
            beamIndex,
            1,
            true,
          );
        }

        scene.overlays.forEach((overlay, index) => {
          this.drawBeamGeometry(
            overlayGeometries[index].front,
            overlay.beamIndex,
            solidLayers,
            true,
            true,
          );
          this.drawOverlayEndpoint(scene, overlay, true);
        });
        gl.bindVertexArray(null);
        this.lastFrameStats = {
          drawCalls: this.drawCalls,
          glowHeight: this.glowHeight,
          glowWidth: this.glowWidth,
          renderHeight: this.renderHeight,
          renderWidth: this.renderWidth,
        };
        return true;
      } catch (error) {
        this.available = false;
        this.config.onRenderError?.(error);
        return false;
      }
    }

    stats() {
      return {
        available: this.available,
        ...(this.lastFrameStats || {}),
      };
    }

    destroy() {
      const { gl } = this;
      this.available = false;
      this.resizeObserver.disconnect();
      window.removeEventListener("resize", this.onResize);
      this.canvas.removeEventListener(
        "webglcontextlost",
        this.onContextLost,
      );
      this.deleteTargets();
      gl.deleteBuffer(this.strokeBuffer);
      gl.deleteBuffer(this.quadBuffer);
      gl.deleteVertexArray(this.strokeVertexArray);
      gl.deleteVertexArray(this.quadVertexArray);

      for (const { program } of Object.values(this.programs)) {
        gl.deleteProgram(program);
      }
    }
  }

  function create(canvas, config) {
    const gl = canvas.getContext("webgl2", CONTEXT_OPTIONS);

    if (!gl) {
      return undefined;
    }

    try {
      return new LaserRenderer(canvas, config, gl);
    } catch (error) {
      console.warn("WebGL renderer initialization failed", error);
      return undefined;
    }
  }

  window[API_NAME] = Object.freeze({ create });
})();
