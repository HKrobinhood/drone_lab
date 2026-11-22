/**
 * Project SKYGUARD — Drone Rescue Adventure (Story Mode Data, Map & Cartoon Art).
 *
 * Pure JS module (zero DOM/Canvas dependency, fully testable in Node.js).
 * Follows "Show, Don't Tell": concise English copy, expressive inline low-poly
 * cartoon SVG illustrations, and clean separation from flight physics & scoring.
 */

export const STORY_THEME = Object.freeze({
  brand: 'Project SKYGUARD',
  subtitle: 'Drone Rescue Adventure',
  flowLabel: 'Drone Academy → Rescue Missions → Final Rescue → Flight Engineer'
});

export const STORY_ACTS = Object.freeze({
  act1: {
    id: 'act1',
    mode: 'tutorial',
    label: 'Act I — Drone Academy',
    shortLabel: 'Drone Academy',
    tagline: 'Train with PIP and master Kp, Ki, and Kd controls.'
  },
  act2: {
    id: 'act2',
    mode: 'challenge',
    label: 'Act II — Rescue Missions',
    shortLabel: 'Rescue Missions',
    tagline: 'A storm is hitting the city. Tune your drone and deliver emergency aid.'
  },
  act3: {
    id: 'act3',
    mode: 'ending',
    label: 'Act III — Flight Engineer',
    shortLabel: 'Flight Engineer',
    tagline: 'Certified SKYGUARD Flight Engineer.'
  }
});

export const STORY_ENDINGS = Object.freeze({
  act1Complete: {
    badge: 'ACT I COMPLETE',
    title: 'Drone Academy Graduate!',
    line: "Training Complete! You're ready for rescue missions!",
    mood: 'celebrating'
  },
  act3Complete: {
    badge: 'SKYGUARD CERTIFIED',
    title: 'SKYGUARD Flight Engineer',
    line: "Mission accomplished! You're now a SKYGUARD Flight Engineer!",
    mood: 'celebrating'
  }
});

export const MAP_ZONES = Object.freeze([
  { id: 'drone-academy', name: 'Drone Academy', act: 1, x: 215, y: 82, accent: '#0ea5e9' },
  { id: 'rescue-base', name: 'Rescue Base', act: 2, x: 495, y: 196, accent: '#f97316' },
  { id: 'city-rooftops', name: 'City Rooftops', act: 2, x: 605, y: 86, accent: '#ec4899' },
  { id: 'cargo-station', name: 'Cargo Station', act: 2, x: 695, y: 465, accent: '#eab308' },
  { id: 'narrow-passage', name: 'Narrow Passage', act: 2, x: 805, y: 342, accent: '#8b5cf6' },
  { id: 'storm-zone', name: 'Storm Zone', act: 2, x: 915, y: 58, accent: '#38bdf8' },
  { id: 'final-rescue-site', name: 'Final Rescue Site', act: 2, x: 1012, y: 422, accent: '#ef4444' }
]);

/**
 * Complete 10-mission SKYGUARD story progression mapped 1:1 onto existing
 * Tutorial Village (4) and Challenge Levels (6) IDs.
 * Every PIP line stays <= 15 words and every Mission Card stays < 40 words.
 */
export const STORY_MISSIONS = Object.freeze([
  {
    id: 'tutorial-1',
    act: 1,
    mode: 'tutorial',
    order: 1,
    code: 'T1',
    badgeLabel: 'ACT I · LESSON 01',
    storyTitle: 'T1 — First Takeoff',
    shortLabel: 'First Takeoff',
    zoneId: 'drone-academy',
    zoneName: 'Drone Academy',
    mapCoords: { x: 95, y: 365 },
    pipMood: 'happy',
    pipLine: "Welcome to Drone Academy! Let's lift off and practice WASD controls.",
    objective: 'Climb into the blue zone and hover steadily.',
    conditions: [
      { icon: '☀️', label: 'Calm Air' },
      { icon: '⚖️', label: '1.2 kg Drone' },
      { icon: '🎮', label: 'WASD + Thrust' }
    ],
    sceneTheme: 'academy-sunny'
  },
  {
    id: 'tutorial-2',
    act: 1,
    mode: 'tutorial',
    order: 2,
    code: 'T2',
    badgeLabel: 'ACT I · LESSON 02',
    storyTitle: 'T2 — The Slow Drone',
    shortLabel: 'The Slow Drone',
    zoneId: 'drone-academy',
    zoneName: 'Drone Academy',
    mapCoords: { x: 185, y: 242 },
    pipMood: 'curious',
    pipLine: 'This trainer feels sluggish! Boost Kp to speed up its response.',
    objective: 'Raise Kp and fly smoothly into the right zone.',
    conditions: [
      { icon: '⚡', label: 'Low Kp Start' },
      { icon: '☀️', label: 'Calm Air' },
      { icon: '➡️', label: 'Horizontal Track' }
    ],
    sceneTheme: 'academy-track'
  },
  {
    id: 'tutorial-3',
    act: 1,
    mode: 'tutorial',
    order: 3,
    code: 'T3',
    badgeLabel: 'ACT I · LESSON 03',
    storyTitle: 'T3 — The Drifting Drone',
    shortLabel: 'Drifting Drone',
    zoneId: 'drone-academy',
    zoneName: 'Drone Academy',
    mapCoords: { x: 282, y: 342 },
    pipMood: 'worried',
    pipLine: 'Crosswind is pushing us off course! Tune Ki to cancel drift.',
    objective: 'Increase Ki to counter steady wind and hold center.',
    conditions: [
      { icon: '💨', label: '+4.8 N Wind' },
      { icon: '🔧', label: 'Zero Ki Start' },
      { icon: '🎯', label: '0.8 m Target' }
    ],
    sceneTheme: 'academy-wind'
  },
  {
    id: 'tutorial-4',
    act: 1,
    mode: 'tutorial',
    order: 4,
    code: 'T4',
    badgeLabel: 'ACT I · LESSON 04',
    storyTitle: 'T4 — The Unstable Drone',
    shortLabel: 'Unstable Drone',
    zoneId: 'drone-academy',
    zoneName: 'Drone Academy',
    mapCoords: { x: 372, y: 204 },
    pipMood: 'encouraging',
    pipLine: 'Too bouncy! Add Kd damping to brake smoothly without overshooting.',
    objective: 'Raise Kd to calm oscillations and stop inside target.',
    conditions: [
      { icon: '🛑', label: 'Low Kd Start' },
      { icon: '☀️', label: 'Calm Air' },
      { icon: '🎯', label: 'Smooth Braking' }
    ],
    sceneTheme: 'academy-finish'
  },
  {
    id: 'level-1',
    act: 2,
    mode: 'challenge',
    order: 1,
    code: 'M1',
    badgeLabel: 'MISSION 01 · RESCUE BASE',
    storyTitle: 'MISSION 01 — Launch the Mission',
    shortLabel: 'Launch Mission',
    zoneId: 'rescue-base',
    zoneName: 'Rescue Base',
    mapCoords: { x: 495, y: 292 },
    pipMood: 'happy',
    pipLine: 'Storm alert! Take off fast and reach the rescue rally point.',
    objective: 'Fly briskly to the rally zone and hold steady.',
    conditions: [
      { icon: '⚡', label: 'Speed Priority' },
      { icon: '🎯', label: 'Wide Rally Zone' },
      { icon: '☀️', label: 'Calm Air' }
    ],
    sceneTheme: 'rescue-base'
  },
  {
    id: 'level-2',
    act: 2,
    mode: 'challenge',
    order: 2,
    code: 'M2',
    badgeLabel: 'MISSION 02 · CITY ROOFTOPS',
    storyTitle: 'MISSION 02 — Rooftop Delivery',
    shortLabel: 'Rooftop Delivery',
    zoneId: 'city-rooftops',
    zoneName: 'City Rooftops',
    mapCoords: { x: 605, y: 174 },
    pipMood: 'encouraging',
    pipLine: 'Medical supplies ready! Clear the roof wall and brake softly.',
    objective: 'Clear the rooftop barrier and stop cleanly on target.',
    conditions: [
      { icon: '🏢', label: 'Roof Barrier' },
      { icon: '🛑', label: 'Precision Brake' },
      { icon: '☀️', label: 'Calm Air' }
    ],
    sceneTheme: 'city-rooftops'
  },
  {
    id: 'level-3',
    act: 2,
    mode: 'challenge',
    order: 3,
    code: 'M3',
    badgeLabel: 'MISSION 03 · CARGO STATION',
    storyTitle: 'MISSION 03 — Heavy Supplies',
    shortLabel: 'Heavy Supplies',
    zoneId: 'cargo-station',
    zoneName: 'Cargo Station',
    mapCoords: { x: 695, y: 368 },
    pipMood: 'worried',
    pipLine: "These supplies are heavy! Let's tune lift and save battery.",
    objective: 'Deliver heavy cargo over the ridge before battery runs out.',
    conditions: [
      { icon: '📦', label: 'Heavy Payload' },
      { icon: '⚡', label: 'Limited Thrust' },
      { icon: '🔋', label: '3200 J Battery' }
    ],
    sceneTheme: 'cargo-station'
  },
  {
    id: 'level-4',
    act: 2,
    mode: 'challenge',
    order: 4,
    code: 'M4',
    badgeLabel: 'MISSION 04 · NARROW PASSAGE',
    storyTitle: 'MISSION 04 — Through the City',
    shortLabel: 'Through City',
    zoneId: 'narrow-passage',
    zoneName: 'Narrow Passage',
    mapCoords: { x: 805, y: 236 },
    pipMood: 'curious',
    pipLine: 'Tight city gap ahead! Keep damping firm through every gate.',
    objective: 'Thread all three narrow building passages without collisions.',
    conditions: [
      { icon: '🏙️', label: '3 Tight Gaps' },
      { icon: '⚖️', label: '1.4 kg Pod' },
      { icon: '☀️', label: 'Calm Air' }
    ],
    sceneTheme: 'narrow-passage'
  },
  {
    id: 'level-5',
    act: 2,
    mode: 'challenge',
    order: 5,
    code: 'M5',
    badgeLabel: 'MISSION 05 · STORM ZONE',
    storyTitle: 'MISSION 05 — Storm Front',
    shortLabel: 'Storm Front',
    zoneId: 'storm-zone',
    zoneName: 'Storm Zone',
    mapCoords: { x: 915, y: 146 },
    pipMood: 'worried',
    pipLine: 'The storm is here! Lock onto target against fierce gusts.',
    objective: 'Hold steady in the target zone through wind gusts.',
    conditions: [
      { icon: '🌧️', label: 'Strong Gusts' },
      { icon: '🔋', label: '2800 J Battery' },
      { icon: '🎯', label: 'Tight 0.8 m Zone' }
    ],
    sceneTheme: 'storm-zone'
  },
  {
    id: 'level-6',
    act: 2,
    mode: 'challenge',
    order: 6,
    code: 'M6',
    badgeLabel: 'MISSION 06 · FINAL RESCUE SITE',
    storyTitle: 'MISSION 06 — Final Rescue',
    shortLabel: 'Final Rescue',
    zoneId: 'final-rescue-site',
    zoneName: 'Final Rescue Site',
    mapCoords: { x: 1018, y: 312 },
    pipMood: 'encouraging',
    pipLine: 'Final rescue call! Pass both rings and land softly on pad.',
    objective: 'Fly through two rings in storm gusts and land softly.',
    conditions: [
      { icon: '📦', label: 'Rescue Cargo' },
      { icon: '⛈️', label: 'Storm Gusts' },
      { icon: '🛬', label: '2 Rings + Helipad' }
    ],
    sceneTheme: 'final-rescue'
  }
]);

const MISSION_MAP = new Map(STORY_MISSIONS.map((m) => [m.id, m]));

export function getStoryMission(levelId) {
  return MISSION_MAP.get(levelId) || null;
}

export function getAllStoryMissions() {
  return STORY_MISSIONS;
}

export function getStoryMissionsByMode(mode) {
  if (mode === 'all') return STORY_MISSIONS;
  return STORY_MISSIONS.filter((m) => m.mode === mode);
}

/**
 * Determine which unlocked node should get the gentle "active frontier" pulse on the map.
 */
export function getRecommendedCurrentNodeId(progress, mode = 'all') {
  const list = getStoryMissionsByMode(mode);
  const unlocked = (id) => Boolean(progress?.unlocked?.[id]);
  const completed = (id) => Boolean(progress?.completed?.[id]) || Number(progress?.stars?.[id] || 0) > 0;

  const firstUnfinished = list.find((m) => unlocked(m.id) && !completed(m.id));
  if (firstUnfinished) return firstUnfinished.id;

  const lastUnlocked = [...list].reverse().find((m) => unlocked(m.id));
  return lastUnlocked ? lastUnlocked.id : list[0]?.id || 'tutorial-1';
}

/**
 * Count default visible English words on a Mission Card (excluding emoji icons)
 * to verify our Show-Don't-Tell < 40 words rule.
 */
export function countMissionCardWords(mission) {
  if (!mission) return 0;
  const parts = [
    mission.storyTitle,
    mission.pipLine,
    mission.objective,
    ...(mission.conditions || []).map((c) => c.label)
  ];
  return parts
    .join(' ')
    .replace(/[—–·]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

/**
 * Decorative Flight Canvas themes (strictly separated from collision/physics geometry).
 * Palettes are calibrated so bright cyan/yellow flight overlays and amber-framed
 * foreground obstacles remain high-contrast and unmistakable.
 */
export const SCENE_THEMES = Object.freeze({
  'academy-sunny': {
    id: 'academy-sunny',
    label: 'Drone Academy',
    skyTop: '#0b4f8c',
    skyMid: '#1976b8',
    skyBottom: '#3c9dd0',
    groundFill: '#1c5d47',
    groundTop: '#34d399',
    gridColor: 'rgba(224, 242, 254, 0.14)',
    backdropType: 'academy',
    clouds: true,
    rain: false,
    windStreaks: false,
    searchlight: false
  },
  'academy-track': {
    id: 'academy-track',
    label: 'Academy Track',
    skyTop: '#0c528f',
    skyMid: '#1d7fc2',
    skyBottom: '#4aaae0',
    groundFill: '#1e6149',
    groundTop: '#4ade80',
    gridColor: 'rgba(224, 242, 254, 0.14)',
    backdropType: 'academy',
    clouds: true,
    rain: false,
    windStreaks: false,
    searchlight: false
  },
  'academy-wind': {
    id: 'academy-wind',
    label: 'Academy Wind Range',
    skyTop: '#164e78',
    skyMid: '#256c9c',
    skyBottom: '#5c9ec4',
    groundFill: '#1f5946',
    groundTop: '#34d399',
    gridColor: 'rgba(224, 242, 254, 0.14)',
    backdropType: 'academy-wind',
    clouds: true,
    rain: false,
    windStreaks: true,
    searchlight: false
  },
  'academy-finish': {
    id: 'academy-finish',
    label: 'Academy Graduation Field',
    skyTop: '#0f4c85',
    skyMid: '#2178ba',
    skyBottom: '#57b0dc',
    groundFill: '#1c5d47',
    groundTop: '#4ade80',
    gridColor: 'rgba(224, 242, 254, 0.14)',
    backdropType: 'academy',
    clouds: true,
    rain: false,
    windStreaks: false,
    searchlight: false
  },
  'rescue-base': {
    id: 'rescue-base',
    label: 'SKYGUARD Rescue Base',
    skyTop: '#133a6b',
    skyMid: '#1e5b96',
    skyBottom: '#3e84bd',
    groundFill: '#29394d',
    groundTop: '#38bdf8',
    gridColor: 'rgba(186, 230, 253, 0.14)',
    backdropType: 'rescue-base',
    clouds: true,
    rain: false,
    windStreaks: false,
    searchlight: false
  },
  'city-rooftops': {
    id: 'city-rooftops',
    label: 'City Rooftops',
    skyTop: '#1d3666',
    skyMid: '#31548e',
    skyBottom: '#5c7fb0',
    groundFill: '#2c364c',
    groundTop: '#94a3b8',
    gridColor: 'rgba(203, 213, 225, 0.14)',
    backdropType: 'city-rooftops',
    clouds: true,
    rain: false,
    windStreaks: false,
    searchlight: false
  },
  'cargo-station': {
    id: 'cargo-station',
    label: 'Cargo Station',
    skyTop: '#243554',
    skyMid: '#3f516d',
    skyBottom: '#6c6876',
    groundFill: '#333b48',
    groundTop: '#f59e0b',
    gridColor: 'rgba(226, 232, 240, 0.13)',
    backdropType: 'cargo-station',
    clouds: true,
    rain: false,
    windStreaks: false,
    searchlight: false
  },
  'narrow-passage': {
    id: 'narrow-passage',
    label: 'Narrow City Passage',
    skyTop: '#172245',
    skyMid: '#2a3869',
    skyBottom: '#4e5484',
    groundFill: '#232c40',
    groundTop: '#64748b',
    gridColor: 'rgba(199, 210, 254, 0.13)',
    backdropType: 'narrow-passage',
    clouds: false,
    rain: false,
    windStreaks: false,
    searchlight: false
  },
  'storm-zone': {
    id: 'storm-zone',
    label: 'Storm Front',
    skyTop: '#0f1c33',
    skyMid: '#1e304c',
    skyBottom: '#334a66',
    groundFill: '#1e2a3b',
    groundTop: '#60a5fa',
    gridColor: 'rgba(148, 163, 184, 0.14)',
    backdropType: 'storm-zone',
    clouds: true,
    rain: true,
    windStreaks: true,
    searchlight: false
  },
  'final-rescue': {
    id: 'final-rescue',
    label: 'Final Rescue Site',
    skyTop: '#0b1528',
    skyMid: '#182842',
    skyBottom: '#2a3f5c',
    groundFill: '#1b2636',
    groundTop: '#f97316',
    gridColor: 'rgba(148, 163, 184, 0.14)',
    backdropType: 'final-rescue',
    clouds: true,
    rain: true,
    windStreaks: true,
    searchlight: true
  }
});

export function getSceneThemeConfig(levelId) {
  const mission = getStoryMission(levelId);
  if (mission && SCENE_THEMES[mission.sceneTheme]) {
    return SCENE_THEMES[mission.sceneTheme];
  }
  return {
    id: 'default',
    label: 'Flight Arena',
    skyTop: '#0f172a',
    skyMid: '#16243b',
    skyBottom: '#1e293b',
    groundFill: '#1e293b',
    groundTop: '#334155',
    gridColor: 'rgba(148, 163, 184, 0.14)',
    backdropType: 'default',
    clouds: false,
    rain: false,
    windStreaks: false,
    searchlight: false
  };
}

/**
 * Render the Overcooked-inspired low-poly cartoon SKYGUARD Mission Map SVG backdrop.
 * Node coordinates align 1:1 with STORY_MISSIONS[].mapCoords in viewBox 0 0 1120 520.
 */
export function renderMissionMapBackdropSvg(progress = {}) {
  const isUnlocked = (id) => Boolean(progress?.unlocked?.[id]);
  const isDone = (id) => Boolean(progress?.completed?.[id]) || Number(progress?.stars?.[id] || 0) > 0;

  // Build connecting path segments with progression state & directional arrows
  const segments = [];
  for (let i = 0; i < STORY_MISSIONS.length - 1; i++) {
    const a = STORY_MISSIONS[i];
    const b = STORY_MISSIONS[i + 1];
    const ax = a.mapCoords.x;
    const ay = a.mapCoords.y;
    const bx = b.mapCoords.x;
    const by = b.mapCoords.y;
    const mx = (ax + bx) * 0.5;
    const my = (ay + by) * 0.5 - (i % 2 === 0 ? 22 : -18);
    const doneSeg = isDone(a.id) && isUnlocked(b.id);
    const activeSeg = isUnlocked(a.id) && isUnlocked(b.id);
    const stroke = doneSeg ? '#22c55e' : activeSeg ? '#facc15' : '#94a3b8';
    const dash = doneSeg ? '' : 'stroke-dasharray="10 8"';
    const angle = (Math.atan2(by - my, bx - mx) * 180) / Math.PI;
    const arrowX = 0.25 * ax + 0.5 * mx + 0.25 * bx;
    const arrowY = 0.25 * ay + 0.5 * my + 0.25 * by;

    segments.push(`
      <path d="M ${ax} ${ay} Q ${mx} ${my} ${bx} ${by}" fill="none" stroke="rgba(15,23,42,0.28)" stroke-width="14" stroke-linecap="round" />
      <path d="M ${ax} ${ay} Q ${mx} ${my} ${bx} ${by}" fill="none" stroke="#fffbeb" stroke-width="9" stroke-linecap="round" opacity="${activeSeg ? '0.92' : '0.45'}" />
      <path d="M ${ax} ${ay} Q ${mx} ${my} ${bx} ${by}" fill="none" stroke="${stroke}" stroke-width="4.5" stroke-linecap="round" ${dash} />
      <g transform="translate(${arrowX.toFixed(1)}, ${arrowY.toFixed(1)}) rotate(${angle.toFixed(1)})">
        <polygon points="8,0 -5,-5.5 -2.5,0 -5,5.5" fill="${doneSeg ? '#15803d' : activeSeg ? '#d97706' : '#64748b'}" stroke="#ffffff" stroke-width="1.2" />
      </g>
    `);
  }

  const zoneLabels = MAP_ZONES.map((z) => {
    const w = Math.max(106, z.name.length * 7.6 + 22);
    const lx = z.x - w * 0.5;
    return `
      <g class="map-zone-sign" data-zone="${z.id}">
        <rect x="${lx.toFixed(1)}" y="${(z.y - 14).toFixed(1)}" width="${w.toFixed(1)}" height="24" rx="12" fill="rgba(15, 23, 42, 0.84)" stroke="${z.accent}" stroke-width="2" />
        <text x="${z.x}" y="${z.y + 2}" text-anchor="middle" fill="#f8fafc" font-size="11.5" font-weight="800" font-family="sans-serif">${z.name}</text>
      </g>
    `;
  }).join('');

  return `
    <svg class="mission-map-svg" viewBox="0 0 1120 520" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <linearGradient id="map-water-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#38bdf8" />
          <stop offset="55%" stop-color="#22a6e0" />
          <stop offset="100%" stop-color="#1e4e8c" />
        </linearGradient>
        <linearGradient id="map-academy-land" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#86efac" />
          <stop offset="100%" stop-color="#4ade80" />
        </linearGradient>
        <linearGradient id="map-city-land" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fde68a" />
          <stop offset="52%" stop-color="#fcd34d" />
          <stop offset="100%" stop-color="#94a3b8" />
        </linearGradient>
        <linearGradient id="map-storm-land" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#475569" />
          <stop offset="100%" stop-color="#1e293b" />
        </linearGradient>
      </defs>

      <!-- Stylized Cartoon Ocean & Waves -->
      <rect width="1120" height="520" rx="22" fill="url(#map-water-grad)" />
      <g stroke="rgba(255,255,255,0.22)" stroke-width="2.5" fill="none" stroke-linecap="round">
        <path d="M 38 78 Q 62 70 86 78 T 134 78" />
        <path d="M 412 462 Q 438 454 464 462 T 516 462" />
        <path d="M 760 72 Q 785 64 810 72" />
        <path d="M 1030 475 Q 1055 467 1080 475" />
      </g>

      <!-- ISLAND 1 (LEFT): ACT I — DRONE ACADEMY MEADOW -->
      <polygon points="36,155 152,96 320,104 416,174 405,365 316,454 106,452 30,362" fill="#22c55e" opacity="0.45" transform="translate(0, 10)" />
      <polygon points="36,155 152,96 320,104 416,174 405,365 316,454 106,452 30,362" fill="url(#map-academy-land)" stroke="#ffffff" stroke-width="4" stroke-linejoin="round" />
      <!-- Low-poly Grass Facets -->
      <polygon points="36,155 152,96 205,212 85,260" fill="#a7f3d0" opacity="0.45" />
      <polygon points="205,212 320,104 416,174 335,280" fill="#34d399" opacity="0.32" />
      <polygon points="106,452 240,348 316,454" fill="#22c55e" opacity="0.3" />

      <!-- Academy Hangar, Trees & Windsock -->
      <g transform="translate(62, 146)">
        <polygon points="0,34 38,8 76,34" fill="#ef4444" stroke="#ffffff" stroke-width="2" />
        <rect x="8" y="34" width="60" height="34" rx="4" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2" />
        <rect x="24" y="46" width="28" height="22" rx="3" fill="#0284c7" />
        <text x="38" y="29" text-anchor="middle" fill="#ffffff" font-size="8.5" font-weight="900" font-family="sans-serif">LAB</text>
      </g>
      <g fill="#16a34a">
        <polygon points="62,424 76,396 90,424" />
        <polygon points="344,148 358,118 372,148" />
        <polygon points="364,405 376,380 388,405" />
        <polygon points="122,124 134,100 146,124" fill="#15803d" />
      </g>
      <!-- Windsock near T3 -->
      <g transform="translate(242, 272)">
        <line x1="0" y1="0" x2="0" y2="30" stroke="#475569" stroke-width="3" stroke-linecap="round" />
        <polygon points="1,2 26,6 26,14 1,15" fill="#f97316" />
        <rect x="9" y="4" width="6" height="10" fill="#ffffff" />
      </g>

      <!-- SKYGUARD Suspension Bridge Connecting Academy to Rescue City -->
      <g>
        <rect x="392" y="228" width="96" height="22" rx="6" fill="#f97316" stroke="#ffffff" stroke-width="3" />
        <line x1="408" y1="228" x2="408" y2="210" stroke="#ffffff" stroke-width="3" />
        <line x1="468" y1="228" x2="468" y2="210" stroke="#ffffff" stroke-width="3" />
        <path d="M 392 228 Q 408 212 438 228 Q 468 212 486 228" fill="none" stroke="#fef08a" stroke-width="2.5" />
      </g>

      <!-- ISLAND 2 (CENTER TO RIGHT): ACT II — RESCUE CITY & STORM PENINSULA -->
      <polygon points="452,186 588,92 848,88 1068,124 1094,358 996,462 630,468 446,374" fill="#0f172a" opacity="0.28" transform="translate(0, 10)" />
      <polygon points="452,186 588,92 848,88 866,464 630,468 446,374" fill="url(#map-city-land)" stroke="#ffffff" stroke-width="4" stroke-linejoin="round" />
      <!-- Storm Peninsula Overlay on Right -->
      <polygon points="844,88 1068,124 1094,358 996,462 846,464 818,284" fill="url(#map-storm-land)" stroke="#ffffff" stroke-width="4" stroke-linejoin="round" />
      <polygon points="452,186 588,92 640,218 485,260" fill="#fef3c7" opacity="0.52" />
      <polygon points="630,468 740,342 846,464" fill="#f59e0b" opacity="0.25" />

      <!-- Rescue Base HQ Landmark (near L1) -->
      <g transform="translate(464, 344)">
        <rect x="0" y="10" width="54" height="32" rx="6" fill="#0284c7" stroke="#ffffff" stroke-width="2" />
        <circle cx="27" cy="26" r="11" fill="#ffffff" />
        <text x="27" y="30.5" text-anchor="middle" fill="#0284c7" font-size="13" font-weight="900" font-family="sans-serif">H</text>
        <line x1="48" y1="10" x2="48" y2="-10" stroke="#e2e8f0" stroke-width="3" />
        <circle cx="48" cy="-12" r="4.5" fill="#ef4444" />
      </g>

      <!-- City Rooftops Low-Poly Towers (near L2) -->
      <g transform="translate(550, 102)">
        <rect x="0" y="20" width="26" height="44" rx="3" fill="#ec4899" stroke="#ffffff" stroke-width="2" />
        <rect x="28" y="6" width="32" height="58" rx="3" fill="#3b82f6" stroke="#ffffff" stroke-width="2" />
        <rect x="62" y="24" width="26" height="40" rx="3" fill="#14b8a6" stroke="#ffffff" stroke-width="2" />
        <rect x="38" y="16" width="12" height="12" rx="2" fill="#ffffff" />
        <path d="M 44 18 V 26 M 40 22 H 48" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" />
      </g>

      <!-- Cargo Station Crane & Crates (near L3) -->
      <g transform="translate(604, 386)">
        <rect x="0" y="22" width="28" height="20" rx="3" fill="#f97316" stroke="#ffffff" stroke-width="1.8" />
        <rect x="30" y="22" width="28" height="20" rx="3" fill="#0ea5e9" stroke="#ffffff" stroke-width="1.8" />
        <rect x="14" y="4" width="28" height="18" rx="3" fill="#eab308" stroke="#ffffff" stroke-width="1.8" />
        <path d="M 64 42 L 64 2 L 94 2" fill="none" stroke="#facc15" stroke-width="4" stroke-linecap="round" />
        <line x1="88" y1="2" x2="88" y2="16" stroke="#475569" stroke-width="2" />
      </g>

      <!-- Narrow Passage Twin Skyscrapers (near L4) -->
      <g transform="translate(756, 152)">
        <rect x="0" y="8" width="24" height="54" rx="3" fill="#6366f1" stroke="#ffffff" stroke-width="2" />
        <rect x="52" y="2" width="26" height="60" rx="3" fill="#8b5cf6" stroke="#ffffff" stroke-width="2" />
        <g fill="#fef08a">
          <rect x="6" y="16" width="5" height="6" rx="1" /><rect x="14" y="16" width="5" height="6" rx="1" />
          <rect x="6" y="28" width="5" height="6" rx="1" /><rect x="14" y="28" width="5" height="6" rx="1" />
          <rect x="58" y="12" width="5" height="6" rx="1" /><rect x="66" y="12" width="5" height="6" rx="1" />
          <rect x="58" y="24" width="5" height="6" rx="1" /><rect x="66" y="24" width="5" height="6" rx="1" />
        </g>
      </g>

      <!-- Storm Zone Clouds, Lightning & Rain (near L5) -->
      <g transform="translate(888, 76)">
        <ellipse cx="48" cy="24" rx="44" ry="18" fill="#334155" stroke="#94a3b8" stroke-width="2" />
        <circle cx="28" cy="18" r="16" fill="#475569" />
        <circle cx="58" cy="14" r="19" fill="#334155" />
        <polygon points="56,30 48,46 56,46 50,62 66,42 58,42" fill="#fde047" />
        <g stroke="#7dd3fc" stroke-width="2" stroke-linecap="round" opacity="0.85">
          <line x1="22" y1="42" x2="16" y2="54" />
          <line x1="36" y1="44" x2="30" y2="56" />
          <line x1="76" y1="40" x2="70" y2="52" />
        </g>
      </g>

      <!-- Final Rescue Site Beacon Lighthouse & Helipad (near L6) -->
      <g transform="translate(1022, 206)">
        <polygon points="24,18 -46,-18 -46,24" fill="rgba(250, 204, 21, 0.24)" />
        <polygon points="16,66 22,20 34,20 40,66" fill="#f8fafc" stroke="#ef4444" stroke-width="2.5" />
        <rect x="19" y="34" width="18" height="10" fill="#ef4444" />
        <circle cx="28" cy="16" r="9" fill="#fde047" stroke="#f97316" stroke-width="2" />
      </g>

      <!-- Connecting Adventure Route & Directional Arrows -->
      <g class="map-route-layer">${segments.join('')}</g>

      <!-- Zone Nameplate Signs -->
      <g class="map-zone-signs">${zoneLabels}</g>
    </svg>
  `.trim();
}

/**
 * Render a lightweight cartoon scene illustration SVG for the Mission Card (viewBox 320x132).
 */
export function renderMissionCardIllustrationSvg(levelId) {
  const m = getStoryMission(levelId) || STORY_MISSIONS[0];
  const theme = m.sceneTheme;

  const droneMarkup = (dx, dy, tilt = 0, cargo = false) => `
    <g transform="translate(${dx}, ${dy}) rotate(${tilt})">
      ${cargo ? `<line x1="0" y1="8" x2="0" y2="20" stroke="#94a3b8" stroke-width="2" /><rect x="-11" y="18" width="22" height="15" rx="3" fill="#f97316" stroke="#ffffff" stroke-width="1.8" /><path d="M-4 25.5 H4 M0 21.5 V29.5" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" />` : ''}
      <ellipse cx="-20" cy="-10" rx="13" ry="3.2" fill="#bae6fd" />
      <ellipse cx="20" cy="-10" rx="13" ry="3.2" fill="#bae6fd" />
      <line x1="-22" y1="-4" x2="22" y2="-4" stroke="#1e293b" stroke-width="4" stroke-linecap="round" />
      <rect x="-14" y="-8" width="28" height="14" rx="6" fill="#ffffff" stroke="#0284c7" stroke-width="2.2" />
      <rect x="-8" y="-5" width="16" height="8" rx="3" fill="#0f172a" />
      <circle cx="-3" cy="-1" r="2" fill="#38bdf8" />
      <circle cx="3" cy="-1" r="2" fill="#7dd3fc" />
    </g>
  `;

  if (theme.startsWith('academy')) {
    const isWind = theme === 'academy-wind';
    const isBouncy = theme === 'academy-finish';
    return `
      <svg class="mission-card-art-svg" viewBox="0 0 320 132" role="img" aria-label="${m.storyTitle} cartoon scene">
        <defs>
          <linearGradient id="mc-sky-${m.id}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#0ea5e9" />
            <stop offset="100%" stop-color="#bae6fd" />
          </linearGradient>
        </defs>
        <rect width="320" height="132" rx="14" fill="url(#mc-sky-${m.id})" />
        <ellipse cx="64" cy="28" rx="28" ry="10" fill="rgba(255,255,255,0.8)" />
        <ellipse cx="256" cy="24" rx="32" ry="10" fill="rgba(255,255,255,0.75)" />
        <path d="M0 98 Q160 80 320 98 L320 132 L0 132 Z" fill="#4ade80" />
        <polygon points="22,102 48,74 74,102" fill="#ef4444" stroke="#ffffff" stroke-width="2" />
        <rect x="28" y="102" width="40" height="22" fill="#ffffff" />
        <circle cx="244" cy="54" r="22" fill="rgba(56,189,248,0.22)" stroke="#0284c7" stroke-width="2.5" stroke-dasharray="6 4" />
        ${
          isWind
            ? `<g stroke="#f97316" stroke-width="2.5" stroke-linecap="round"><line x1="16" y1="48" x2="72" y2="48" /><line x1="28" y1="62" x2="88" y2="62" /><polygon points="78,48 68,43 68,53" fill="#f97316" /><polygon points="94,62 84,57 84,67" fill="#f97316" /></g>`
            : isBouncy
              ? `<path d="M 88 84 C 122 24, 152 104, 184 42 C 204 20, 224 64, 244 54" fill="none" stroke="#f97316" stroke-width="2.6" stroke-dasharray="5 4" />`
              : `<path d="M 86 90 Q 158 40 244 54" fill="none" stroke="#fde047" stroke-width="2.6" stroke-dasharray="6 4" />`
        }
        ${droneMarkup(146, 56, isWind ? -14 : 6, false)}
      </svg>
    `.trim();
  }

  if (theme === 'rescue-base') {
    return `
      <svg class="mission-card-art-svg" viewBox="0 0 320 132" role="img" aria-label="Rescue Base cartoon scene">
        <rect width="320" height="132" rx="14" fill="#1d6fa5" />
        <rect y="94" width="320" height="38" fill="#334155" />
        <rect x="20" y="56" width="76" height="42" rx="6" fill="#f8fafc" stroke="#0284c7" stroke-width="2.5" />
        <rect x="34" y="68" width="48" height="16" rx="4" fill="#ef4444" />
        <text x="58" y="80" text-anchor="middle" fill="#ffffff" font-size="9.5" font-weight="900" font-family="sans-serif">SKYGUARD</text>
        <circle cx="246" cy="48" r="24" fill="rgba(56,189,248,0.22)" stroke="#38bdf8" stroke-width="2.5" stroke-dasharray="6 4" />
        <path d="M 88 86 Q 156 36 246 48" fill="none" stroke="#fde047" stroke-width="2.6" stroke-dasharray="6 4" />
        ${droneMarkup(148, 52, 10, false)}
      </svg>
    `.trim();
  }

  if (theme === 'city-rooftops') {
    return `
      <svg class="mission-card-art-svg" viewBox="0 0 320 132" role="img" aria-label="City Rooftops delivery cartoon scene">
        <rect width="320" height="132" rx="14" fill="#2563eb" />
        <rect x="18" y="72" width="58" height="60" rx="4" fill="#38bdf8" stroke="#ffffff" stroke-width="2" />
        <rect x="134" y="62" width="38" height="70" rx="4" fill="#f59e0b" stroke="#ffffff" stroke-width="2" />
        <rect x="220" y="70" width="80" height="62" rx="4" fill="#ec4899" stroke="#ffffff" stroke-width="2" />
        <circle cx="260" cy="44" r="19" fill="rgba(74,222,128,0.24)" stroke="#4ade80" stroke-width="2.5" stroke-dasharray="5 4" />
        <rect x="249" y="80" width="22" height="22" rx="5" fill="#ffffff" />
        <path d="M260 85 V97 M254 91 H266" stroke="#ef4444" stroke-width="3" stroke-linecap="round" />
        ${droneMarkup(152, 34, 8, true)}
      </svg>
    `.trim();
  }

  if (theme === 'cargo-station') {
    return `
      <svg class="mission-card-art-svg" viewBox="0 0 320 132" role="img" aria-label="Heavy Supplies cargo station scene">
        <rect width="320" height="132" rx="14" fill="#3b4f73" />
        <rect y="98" width="320" height="34" fill="#475569" />
        <rect x="22" y="76" width="42" height="26" rx="4" fill="#f97316" stroke="#ffffff" stroke-width="2" />
        <rect x="68" y="76" width="42" height="26" rx="4" fill="#0ea5e9" stroke="#ffffff" stroke-width="2" />
        <path d="M 150 102 L 150 28 L 210 28" fill="none" stroke="#facc15" stroke-width="5" stroke-linecap="round" />
        <circle cx="256" cy="54" r="20" fill="rgba(56,189,248,0.2)" stroke="#38bdf8" stroke-width="2.5" stroke-dasharray="5 4" />
        ${droneMarkup(132, 46, 6, true)}
      </svg>
    `.trim();
  }

  if (theme === 'narrow-passage') {
    return `
      <svg class="mission-card-art-svg" viewBox="0 0 320 132" role="img" aria-label="Narrow city building passage scene">
        <rect width="320" height="132" rx="14" fill="#1e2959" />
        <rect x="78" y="0" width="26" height="44" fill="#6366f1" stroke="#f59e0b" stroke-width="2" />
        <rect x="78" y="78" width="26" height="54" fill="#6366f1" stroke="#f59e0b" stroke-width="2" />
        <rect x="164" y="0" width="26" height="58" fill="#8b5cf6" stroke="#f59e0b" stroke-width="2" />
        <rect x="164" y="92" width="26" height="40" fill="#8b5cf6" stroke="#f59e0b" stroke-width="2" />
        <rect x="234" y="0" width="26" height="38" fill="#6366f1" stroke="#f59e0b" stroke-width="2" />
        <rect x="234" y="74" width="26" height="58" fill="#6366f1" stroke="#f59e0b" stroke-width="2" />
        <path d="M 30 64 Q 90 60 176 74 T 288 54" fill="none" stroke="#fde047" stroke-width="2.4" stroke-dasharray="5 4" />
        ${droneMarkup(128, 64, 10, false)}
      </svg>
    `.trim();
  }

  if (theme === 'storm-zone') {
    return `
      <svg class="mission-card-art-svg" viewBox="0 0 320 132" role="img" aria-label="Storm Front heavy wind and rain scene">
        <rect width="320" height="132" rx="14" fill="#17253d" />
        <ellipse cx="90" cy="22" rx="64" ry="20" fill="#334155" />
        <ellipse cx="220" cy="18" rx="74" ry="22" fill="#475569" />
        <polygon points="212,26 202,48 212,48 204,68 224,44 214,44" fill="#fde047" />
        <g stroke="#7dd3fc" stroke-width="2" stroke-linecap="round" opacity="0.72">
          <line x1="34" y1="42" x2="20" y2="74" /><line x1="88" y1="38" x2="74" y2="70" />
          <line x1="158" y1="44" x2="144" y2="76" /><line x1="274" y1="40" x2="260" y2="72" />
        </g>
        <g stroke="#fb923c" stroke-width="2.5" stroke-linecap="round">
          <line x1="18" y1="88" x2="86" y2="88" />
          <polygon points="94,88 82,82 82,94" fill="#fb923c" />
        </g>
        <circle cx="256" cy="68" r="20" fill="rgba(56,189,248,0.22)" stroke="#38bdf8" stroke-width="2.5" stroke-dasharray="5 4" />
        ${droneMarkup(144, 62, -16, false)}
      </svg>
    `.trim();
  }

  // Final Rescue
  return `
    <svg class="mission-card-art-svg" viewBox="0 0 320 132" role="img" aria-label="Final Rescue mission in storm with beacon and helipad">
      <rect width="320" height="132" rx="14" fill="#0f1d34" />
      <polygon points="264,34 80,0 80,58" fill="rgba(250, 204, 21, 0.16)" />
      <ellipse cx="88" cy="20" rx="62" ry="18" fill="#334155" />
      <g stroke="#7dd3fc" stroke-width="1.8" stroke-linecap="round" opacity="0.65">
        <line x1="36" y1="36" x2="24" y2="66" /><line x1="120" y1="34" x2="108" y2="64" /><line x1="202" y1="32" x2="190" y2="62" />
      </g>
      <!-- Rescue Ring -->
      <ellipse cx="152" cy="54" rx="12" ry="26" fill="none" stroke="#facc15" stroke-width="4" />
      <!-- Helipad -->
      <rect x="234" y="96" width="64" height="12" rx="4" fill="#0ea5e9" stroke="#ffffff" stroke-width="2" />
      <rect x="242" y="108" width="48" height="24" fill="#334155" />
      <text x="266" y="90" text-anchor="middle" fill="#fde047" font-size="11" font-weight="900" font-family="sans-serif">RESCUE PAD</text>
      ${droneMarkup(92, 54, 12, true)}
    </svg>
  `.trim();
}

/**
 * Render the Act III SKYGUARD Flight Engineer official vector certificate badge.
 */
export function renderFlightEngineerBadgeSvg() {
  return `
    <svg class="skyguard-cert-badge-svg" viewBox="0 0 180 120" role="img" aria-label="SKYGUARD Flight Engineer Certified Badge">
      <defs>
        <linearGradient id="sg-badge-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fef08a" />
          <stop offset="50%" stop-color="#facc15" />
          <stop offset="100%" stop-color="#d97706" />
        </linearGradient>
        <linearGradient id="sg-badge-shield" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#0284c7" />
          <stop offset="100%" stop-color="#1d4ed8" />
        </linearGradient>
      </defs>
      <!-- Golden Wings -->
      <path d="M58 50 L14 32 L26 52 L16 62 L58 68 Z" fill="url(#sg-badge-gold)" stroke="#fffbeb" stroke-width="2" stroke-linejoin="round" />
      <path d="M122 50 L166 32 L154 52 L164 62 L122 68 Z" fill="url(#sg-badge-gold)" stroke="#fffbeb" stroke-width="2" stroke-linejoin="round" />
      <!-- Shield Crest -->
      <path d="M90 12 L130 28 V64 C130 88 112 104 90 112 C68 104 50 88 50 64 V28 Z" fill="url(#sg-badge-shield)" stroke="url(#sg-badge-gold)" stroke-width="4.5" stroke-linejoin="round" />
      <!-- Mini Drone Silhouette -->
      <ellipse cx="74" cy="48" rx="10" ry="2.6" fill="#7dd3fc" />
      <ellipse cx="106" cy="48" rx="10" ry="2.6" fill="#7dd3fc" />
      <line x1="72" y1="54" x2="108" y2="54" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" />
      <rect x="81" y="50" width="18" height="10" rx="4" fill="#38bdf8" stroke="#ffffff" stroke-width="1.6" />
      <!-- 3 Stars -->
      <polygon points="72,74 74.2,79 79.5,79.5 75.5,83 76.8,88 72,85.2 67.2,88 68.5,83 64.5,79.5 69.8,79" fill="#fde047" />
      <polygon points="90,69 92.8,75.5 99.8,76 94.5,80.5 96.2,87.5 90,83.8 83.8,87.5 85.5,80.5 80.2,76 87.2,75.5" fill="#fef08a" />
      <polygon points="108,74 110.2,79 115.5,79.5 111.5,83 112.8,88 108,85.2 103.2,88 104.5,83 100.5,79.5 105.8,79" fill="#fde047" />
      <!-- Ribbon -->
      <rect x="44" y="92" width="92" height="20" rx="10" fill="#f97316" stroke="#fef08a" stroke-width="2" />
      <text x="90" y="105.5" text-anchor="middle" fill="#ffffff" font-size="9.5" font-weight="900" font-family="sans-serif" letter-spacing="0.06em">SKYGUARD PRO</text>
    </svg>
  `.trim();
}
