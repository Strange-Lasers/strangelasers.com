# Strange Lasers brand source

## Locked identity

- Mark: Oculus with aligned Counterflow geometry
- Rendering: Laser Corona
- Primary palette: Abyss
- Alternate palette: Moon Crimson

Laser Corona combines a narrow white-hot core, a colored beam body, and a restrained outer bloom. The centered gradients have matching endpoint colors, and the geometry uses no directional shadows. The primary cyan and purple values are shared with the animated logo through [`palette.css`](../palette.css).

## Production assets

The generic SVG filenames at the project root are the normal defaults and use the primary Abyss palette. The square PNGs in this directory are rendered at 1024 by 1024 pixels for avatar use.

| Palette | Horizontal SVG | Square SVG | Square PNG |
|---|---|---|---|
| Primary alias | [logo.svg](../logo.svg) | [mark.svg](../mark.svg) | [mark.png](mark.png) |
| Abyss | [logo-abyss.svg](logo-abyss.svg) | [mark-abyss.svg](mark-abyss.svg) | [mark-abyss.png](mark-abyss.png) |
| Moon Crimson | [logo-moon-crimson.svg](logo-moon-crimson.svg) | [mark-moon-crimson.svg](mark-moon-crimson.svg) | [mark-moon-crimson.png](mark-moon-crimson.png) |

The generator also produces the standalone primary [wordmark](../wordmark.svg) and the transparent [homepage fallback](../mark-transparent.svg).

## Geometry

Every production asset uses the same horizontally aligned Counterflow paths:

```text
M70 362C110 84 402 84 442 362
M64 142C124 426 388 426 448 142
```

The circle-to-square direction of one beam opposes the square-to-circle direction of the other.

## Generation

Run `node brand/generate-final-assets.mjs` from the project root to rebuild every production SVG, the square avatar PNGs, and the site icons. The generator reads the primary palette from [`palette.css`](../palette.css), reads the locked Counterflow source geometry from the flat archive, and uses `rsvg-convert` to render the PNGs.

## Archive

The `archive/` directory contains the palette, endpoint, and rendering explorations in one flat directory. Filenames beginning with `round1_`, `round2_`, or `round3_` identify the three rendering-style passes. Historical generator scripts may refer to the directory layout used during their exploration.
