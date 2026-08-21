/**
 * One palette, designed as a lighting environment rather than as a set of
 * tokens.
 *
 * The artefact is metal, so it has no colour of its own and shows whatever
 * surrounds it. That makes the light the primary design decision and the
 * swatches secondary. It is also why the site carries a single theme now: a
 * mirror cannot be lit well for two grounds at once, and the compromise
 * environment was exactly why the glyph used to read as a black silhouette
 * instead of as polished metal.
 *
 * It is deliberately no longer a perfect mirror. At roughness 0.115 the flat
 * faces returned one constant environment sample and one needle-thin specular
 * lobe — a white shape with a blown spot in it and nothing in between. The
 * shading numbers now live with the meshes (ContinuousWorld, FracturedTwo)
 * because they differ per surface: faces are damped, walls are lifted.
 *
 * The ground is deliberately not pure black. On #000 the fog, the floor and
 * the object's own shadow side all collapse into the same nothing, and the
 * glyph loses its volume.
 */
export const SCENE = {
  /** Deepest value — fog and the far end of the room. */
  void: "#06080C",
  /** The ground everything sits on. */
  background: "#0A0E14",
  depth: "#080B10",
  surface: "#141922",
  architecture: "#232A36",

  /** What the mirror is made to show. */
  chrome: "#B6C0CC",
  chromeSide: "#68727F",
  chromeSecondary: "#98A3B0",
  chromeHighlight: "#F2F5F8",
  chromeShadow: "#3B4450",
  raw: "#1B2029",
  fracture: "#06080C",
  crackLight: "#E6ECF3",

  /* Lights. The key is cool and wide, the fill is dimmer and warmer so the
     shadow side never goes fully blue, and the rear rim separates the glyph
     from the fog behind it. */
  ambient: "#7E8896",
  key: "#EEF3F8",
  fill: "#7E8A99",
  rear: "#C9D4E0",

  /* The reflection set. Broad soft planes give the glyph a gradient across its
     faces; the two narrow strips are the specular edges that draw its
     silhouette. Narrow strips alone — the previous arrangement — leave black
     between them, which is what a mirror faithfully reproduces. */
  reflectionSky: "#DCE6F2",
  reflectionFloor: "#2A323E",
  reflectionEdge: "#FFFFFF",
  reflectionSide: "#93A1B2",
  reflectionWarm: "#FFB489",

  ambientIntensity: 0.42,
  keyIntensity: 2.2,
  fillIntensity: 1.35,
  rearIntensity: 1.7,
  exposure: 0.94,
} as const;

export type ScenePalette = typeof SCENE;

/* The procedural "chrome response" gradient used to be multiplied into the
   artefact as both a colour map and a roughness map. It was invisible while
   the scene was flat-lit, but once the environment started doing real work it
   showed up as vertical corrugation running across the glyph — ribbing on
   what is supposed to be a polished surface. A mirror does not need a texture
   telling it how to look; it needs something worth reflecting. */
