/**
 * Visual themes. Each world picks one; textures are generated per theme in BootScene.
 * Colours are plain CSS strings for canvas drawing, numbers for Phaser tints.
 */
export const THEMES = {
  forest: {
    sky: ['#07110d', '#1d3a2a'],
    moon: [220, 255, 210],
    far: '#11281c',
    near: '#09150f',
    silhouette: 'trees',
    tile: {
      pattern: 'speck', base: '#151a17', inner: '#1a221c', speckA: '#223026', speckB: '#0e130f',
      side: '#283a2e', bottom: '#0a0d0b', top: '#477f39', topLine: '#8fd66a', topDetail: '#2e5a28',
    },
    motes: [0x9be37a, 0xe4ff9a],
    accent: 0x8fd66a,
  },
  ruins: {
    sky: ['#100a06', '#3d2816'],
    moon: [255, 220, 170],
    far: '#2a1c12',
    near: '#150e09',
    silhouette: 'columns',
    tile: {
      pattern: 'brick', base: '#241c15', inner: '#2e241b', speckA: '#3a2e22', speckB: '#18120d',
      side: '#46372a', bottom: '#120d09', top: '#8a6a40', topLine: '#e8bf7a', topDetail: '#5a4329',
    },
    motes: [0xffa04a, 0xffe0a0],
    accent: 0xffb35c,
  },
  castle: {
    sky: ['#0c060e', '#43142a'],
    moon: [255, 150, 160],
    far: '#26121e',
    near: '#13080f',
    silhouette: 'towers',
    tile: {
      pattern: 'brick', base: '#1e1b25', inner: '#262230', speckA: '#2f2a3b', speckB: '#14121a',
      side: '#3b3549', bottom: '#0c0b10', top: '#5f587a', topLine: '#cdc5ee', topDetail: '#3f3a55',
    },
    motes: [0xff5a7a, 0xcbb8ff],
    accent: 0xff5a7a,
  },
  crystal: {
    sky: ['#040a16', '#0e3552'],
    moon: [190, 240, 255],
    far: '#0b2436',
    near: '#05121c',
    silhouette: 'crystals',
    tile: {
      pattern: 'crystal', base: '#111a28', inner: '#152236', speckA: '#1f3a55', speckB: '#0b121c',
      side: '#24496a', bottom: '#070c14', top: '#2f8fb5', topLine: '#a6f3ff', topDetail: '#1d5f7d',
    },
    motes: [0x5fd3ff, 0xc7f7ff],
    accent: 0x5fd3ff,
  },
  void: {
    sky: ['#020103', '#1d0629'],
    moon: [255, 130, 240],
    far: '#15061f',
    near: '#08020d',
    silhouette: 'islands',
    tile: {
      pattern: 'void', base: '#0d0912', inner: '#120c19', speckA: '#2a1238', speckB: '#07050a',
      side: '#3a1650', bottom: '#050307', top: '#8a3cc0', topLine: '#ff86f2', topDetail: '#4c1d6b',
    },
    motes: [0xff7af0, 0x8c6cf0],
    accent: 0xff7af0,
  },
};

/**
 * Stage 3 atmosphere palettes (used by gfx/themeTextures.js and systems/Atmosphere.js).
 * sky: gradient stops top->bottom. far/mid/near: silhouette colours, *Rim: rim light,
 * haze: mist colour at silhouette bases, fog: tint of drifting fog bands, glowA/glowB:
 * environment light colours, shaft: light-ray tint, grade: colour cast, ambient: particle kind.
 */
const ATMO = {
  forest: {
    title: 'Forgotten Forest',
    sky: ['#02070b', '#071820', '#10303a', '#1b4646'],
    stars: 70,
    moon: { x: 720, y: 112, r: 40, color: '#eafcff', halo: 0x8feeff },
    far: '#173a40', farRim: '#4a9aa0', mid: '#0c2328', midRim: '#3a9aa8', near: '#040b0d', nearRim: '#1d5560',
    haze: '#2f6a6a', fog: 0x8fd0c8, fogAlpha: [0.3, 0.2, 0.08],
    glowA: 0x5ff6ff, glowB: 0xb57bff, shaft: 0xc8f8ff, grade: 0x2aa0b0, vignette: 0x01070a,
    ambient: 'fireflies', ceil: true,
  },
  ruins: {
    title: 'Underground Ruins',
    sky: ['#040201', '#120905', '#22140b', '#301d10'],
    stars: 0,
    opening: { x: 300, color: 0xffc078 },
    far: '#2e1d12', farRim: '#8a5428', mid: '#1c1009', midRim: '#b0682c', near: '#0a0503', nearRim: '#64391a',
    haze: '#4c2c15', fog: 0xc89058, fogAlpha: [0.26, 0.18, 0.08],
    glowA: 0xff9a3a, glowB: 0x5fd3ff, shaft: 0xffc890, grade: 0xff8a3a, vignette: 0x060201,
    ambient: 'embers', ceil: true,
  },
  castle: {
    title: 'Shadow Castle',
    sky: ['#030107', '#14051a', '#3a0c2c', '#621a34'],
    stars: 50,
    moon: { x: 700, y: 140, r: 60, color: '#ff5a66', halo: 0xff3a55 },
    far: '#2c0f26', farRim: '#c04060', mid: '#170818', midRim: '#a03a78', near: '#060208', nearRim: '#5e2054',
    haze: '#4e1a3c', fog: 0xa06090, fogAlpha: [0.26, 0.16, 0.07],
    glowA: 0xff4a6a, glowB: 0xb57bff, shaft: 0xff8aa0, grade: 0xc02050, vignette: 0x050106,
    windows: ['#ff5a9a', '#7fdcff', '#b57bff', '#ffb060'],
    ambient: 'rain', ceil: false,
  },
  crystal: {
    title: 'Crystal Caverns',
    sky: ['#010309', '#031224', '#072a44', '#0b3a58'],
    stars: 0,
    far: '#0d2c48', farRim: '#4ab0e0', mid: '#081d33', midRim: '#6fe0ff', near: '#030a14', nearRim: '#2a80b8',
    haze: '#165884', fog: 0x60c0f0, fogAlpha: [0.24, 0.16, 0.07],
    glowA: 0x5ff0ff, glowB: 0xa070ff, shaft: 0x9fefff, grade: 0x2080c0, vignette: 0x01040b,
    ambient: 'sparkles', ceil: true,
  },
  void: {
    title: 'The Void',
    sky: ['#010003', '#0a0214', '#1c0632', '#2c0a44'],
    stars: 200,
    eclipse: { x: 480, y: 126, r: 38, color: 0xff6af0 },
    far: '#200c34', farRim: '#a058ff', mid: '#13061f', midRim: '#d66aff', near: '#060109', nearRim: '#7a30c0',
    haze: '#3c1264', fog: 0xa070f0, fogAlpha: [0.22, 0.15, 0.07],
    glowA: 0xff6af0, glowB: 0x6ae8ff, shaft: 0xd8a0ff, grade: 0x8030c0, vignette: 0x030006,
    ambient: 'void', ceil: false,
  },
};
Object.entries(ATMO).forEach(([k, a]) => (THEMES[k].atmo = a));

export const THEME_KEYS = Object.keys(THEMES);
