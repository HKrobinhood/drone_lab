/**
 * Shared PIP Character SVG (with 5 lightweight expression moods) and
 * 6 inline STEM visual diagrams for Tutorial Village.
 *
 * Pure JS template builders (no external image files or animation libraries).
 */

export const PIP_MOODS = Object.freeze([
  'greeting',
  'explaining',
  'thinking',
  'warning',
  'celebrating'
]);

/**
 * Map coaching / tutorial state names cleanly to one of PIP's 5 expression moods.
 */
export function resolvePipMood(state) {
  switch (state) {
    case 'welcome':
    case 'greeting':
      return 'greeting';
    case 'thinking':
      return 'thinking';
    case 'warning':
    case 'flight_feedback':
      return 'warning';
    case 'ready':
    case 'success':
    case 'celebrating':
      return 'celebrating';
    case 'teaching':
    case 'explaining':
    default:
      return 'explaining';
  }
}

/**
 * Render the single unified PIP SVG robot with lightweight CSS/SVG expression support.
 */
export function renderPipRobotSvg(mood = 'explaining', sizeClass = '') {
  const safeMood = PIP_MOODS.includes(mood) ? mood : 'explaining';

  let eyesMarkup = `
    <circle cx="33" cy="40" r="4" class="pip-eye" />
    <circle cx="51" cy="40" r="4" class="pip-eye" />
  `;
  let mouthMarkup = `<rect x="33" y="55" width="18" height="4" rx="2" class="pip-mouth" />`;
  let extraMarkup = '';

  if (safeMood === 'greeting') {
    eyesMarkup = `
      <circle cx="33" cy="39" r="4.2" class="pip-eye" />
      <circle cx="51" cy="39" r="4.2" class="pip-eye" />
    `;
    mouthMarkup = `<path d="M33 54 Q42 61 51 54" class="pip-smile" />`;
    extraMarkup = `
      <g class="pip-wave-arm">
        <line x1="71" y1="45" x2="80" y2="30" class="pip-arm-stroke" />
        <circle cx="80" cy="28" r="4" class="pip-hand-dot" />
      </g>
    `;
  } else if (safeMood === 'explaining') {
    extraMarkup = `
      <g class="pip-pointer-arm">
        <line x1="71" y1="46" x2="81" y2="46" class="pip-arm-stroke" />
        <polygon points="79,42 84,46 79,50" class="pip-hand-dot" />
      </g>
    `;
  } else if (safeMood === 'thinking') {
    eyesMarkup = `
      <circle cx="33" cy="38" r="3.6" class="pip-eye" />
      <ellipse cx="51" cy="41" rx="4.2" ry="2.6" class="pip-eye" />
    `;
    mouthMarkup = `<line x1="35" y1="56" x2="49" y2="54" class="pip-smile" />`;
  } else if (safeMood === 'warning') {
    eyesMarkup = `
      <line x1="28" y1="35" x2="38" y2="38" class="pip-brow" />
      <line x1="56" y1="35" x2="46" y2="38" class="pip-brow" />
      <circle cx="33" cy="42" r="3.8" class="pip-eye" />
      <circle cx="51" cy="42" r="3.8" class="pip-eye" />
    `;
    mouthMarkup = `<path d="M34 58 Q42 53 50 58" class="pip-smile" />`;
  } else if (safeMood === 'celebrating') {
    eyesMarkup = `
      <path d="M28 41 Q33 35 38 41" class="pip-happy-eye" />
      <path d="M46 41 Q51 35 56 41" class="pip-happy-eye" />
    `;
    mouthMarkup = `<path d="M32 53 Q42 62 52 53" class="pip-smile" />`;
  }

  return `
    <svg class="pip-robot-svg pip-mood-${safeMood} ${sizeClass}" viewBox="0 0 88 84" aria-hidden="true">
      <g class="pip-float">
        <line x1="42" y1="10" x2="42" y2="20" class="pip-antenna-stem" />
        <circle cx="42" cy="8" r="5" class="pip-antenna-led" />
        <rect x="6" y="34" width="8" height="18" rx="4" class="pip-ear" />
        <rect x="70" y="34" width="8" height="18" rx="4" class="pip-ear" />
        <rect x="14" y="20" width="56" height="44" rx="14" class="pip-head" />
        <rect x="21" y="29" width="42" height="22" rx="8" class="pip-visor" />
        <g class="pip-eyes">${eyesMarkup}</g>
        ${mouthMarkup}
        ${extraMarkup}
        <ellipse cx="42" cy="73" rx="18" ry="4" class="pip-thruster" />
      </g>
    </svg>
  `.trim();
}

export const STEM_VISUAL_AIDS = Object.freeze({
  'gravity-thrust': {
    id: 'gravity-thrust',
    title: 'Gravity vs. Rotor Thrust',
    renderSvg: () => `
      <svg class="stem-diagram-svg" viewBox="0 0 280 120" role="img" aria-label="Drone thrust upward vs gravity downward">
        <rect x="2" y="2" width="276" height="116" rx="10" fill="#0b1220" stroke="#1e293b" />
        <!-- Upward Thrust Arrow -->
        <line x1="92" y1="54" x2="92" y2="18" stroke="#38bdf8" stroke-width="3.5" stroke-linecap="round" />
        <polygon points="92,10 85,22 99,22" fill="#38bdf8" />
        <text x="108" y="25" fill="#7dd3fc" font-size="11" font-weight="700">Thrust (Up)</text>
        <text x="108" y="39" fill="#94a3b8" font-size="9.5">T &gt; m·g to climb</text>
        <!-- Drone -->
        <ellipse cx="68" cy="54" rx="16" ry="3.5" fill="#7dd3fc" opacity="0.85" />
        <ellipse cx="116" cy="54" rx="16" ry="3.5" fill="#7dd3fc" opacity="0.85" />
        <line x1="64" y1="60" x2="120" y2="60" stroke="#e2e8f0" stroke-width="3.5" stroke-linecap="round" />
        <rect x="81" y="55" width="22" height="10" rx="4" fill="#38bdf8" />
        <!-- Downward Gravity Arrow -->
        <line x1="92" y1="68" x2="92" y2="100" stroke="#f97316" stroke-width="3.5" stroke-linecap="round" />
        <polygon points="92,108 85,96 99,96" fill="#f97316" />
        <text x="108" y="96" fill="#fdba74" font-size="11" font-weight="700">Gravity (Down)</text>
        <text x="108" y="109" fill="#94a3b8" font-size="9.5">11.8 N on 1.20 kg</text>
      </svg>
    `
  },

  'wasd-controls': {
    id: 'wasd-controls',
    title: 'WASD Reference Control',
    renderSvg: () => `
      <svg class="stem-diagram-svg" viewBox="0 0 280 120" role="img" aria-label="WASD keys move target direction arrows">
        <rect x="2" y="2" width="276" height="116" rx="10" fill="#0b1220" stroke="#1e293b" />
        <!-- W/A/S/D keys -->
        <rect x="58" y="20" width="28" height="26" rx="5" fill="#1e293b" stroke="#38bdf8" stroke-width="1.6" />
        <text x="72" y="37" text-anchor="middle" fill="#f8fafc" font-size="12" font-weight="800">W</text>
        <rect x="24" y="52" width="28" height="26" rx="5" fill="#1e293b" stroke="#38bdf8" stroke-width="1.6" />
        <text x="38" y="69" text-anchor="middle" fill="#f8fafc" font-size="12" font-weight="800">A</text>
        <rect x="58" y="52" width="28" height="26" rx="5" fill="#1e293b" stroke="#38bdf8" stroke-width="1.6" />
        <text x="72" y="69" text-anchor="middle" fill="#f8fafc" font-size="12" font-weight="800">S</text>
        <rect x="92" y="52" width="28" height="26" rx="5" fill="#1e293b" stroke="#38bdf8" stroke-width="1.6" />
        <text x="106" y="69" text-anchor="middle" fill="#f8fafc" font-size="12" font-weight="800">D</text>
        <text x="72" y="99" text-anchor="middle" fill="#94a3b8" font-size="9.5">Moves yellow REF</text>
        <!-- Direction Cross & Drone -->
        <line x1="205" y1="22" x2="205" y2="96" stroke="#334155" stroke-width="1.5" stroke-dasharray="3 3" />
        <line x1="162" y1="59" x2="248" y2="59" stroke="#334155" stroke-width="1.5" stroke-dasharray="3 3" />
        <polygon points="205,15 200,25 210,25" fill="#4ade80" />
        <polygon points="205,103 200,93 210,93" fill="#fb923c" />
        <polygon points="154,59 164,54 164,64" fill="#38bdf8" />
        <polygon points="256,59 246,54 246,64" fill="#38bdf8" />
        <circle cx="205" cy="59" r="9" fill="#eab308" opacity="0.25" stroke="#eab308" stroke-width="1.8" />
        <circle cx="205" cy="59" r="3" fill="#eab308" />
        <text x="205" y="113" text-anchor="middle" fill="#fde047" font-size="9">Up / Down / Left / Right</text>
      </svg>
    `
  },

  'kp-response': {
    id: 'kp-response',
    title: 'Kp — Proportional Response',
    renderSvg: () => `
      <svg class="stem-diagram-svg" viewBox="0 0 280 120" role="img" aria-label="Low Kp slow curve vs High Kp fast curve">
        <rect x="2" y="2" width="276" height="116" rx="10" fill="#0b1220" stroke="#1e293b" />
        <!-- Target Line -->
        <line x1="22" y1="36" x2="258" y2="36" stroke="#eab308" stroke-width="1.5" stroke-dasharray="5 4" />
        <text x="24" y="28" fill="#fde047" font-size="9.5" font-weight="700">Target (REF)</text>
        <!-- Low Kp: Slow Response -->
        <path d="M 22 96 Q 115 92 254 44" fill="none" stroke="#fb923c" stroke-width="2.6" />
        <!-- High Kp: Faster Response / Possible Overshoot -->
        <path d="M 22 96 C 62 94, 72 20, 108 24 C 132 27, 145 40, 175 36 L 254 36" fill="none" stroke="#38bdf8" stroke-width="2.8" />
        <text x="135" y="75" fill="#fdba74" font-size="9.5" font-weight="600">Low Kp: Slow Response</text>
        <text x="112" y="19" fill="#7dd3fc" font-size="9.2" font-weight="600">High Kp: Fast / Possible Overshoot</text>
        <text x="22" y="110" fill="#64748b" font-size="9">Time &rarr;</text>
      </svg>
    `
  },

  'ki-integral': {
    id: 'ki-integral',
    title: 'Ki — Integral Wind Correction',
    renderSvg: () => `
      <svg class="stem-diagram-svg" viewBox="0 0 280 120" role="img" aria-label="Ki turns persistent error into error correction">
        <rect x="2" y="2" width="276" height="116" rx="10" fill="#0b1220" stroke="#1e293b" />
        <!-- 3-step boxes -->
        <rect x="12" y="20" width="76" height="62" rx="7" fill="#1e293b" stroke="#fb923c" />
        <text x="50" y="37" text-anchor="middle" fill="#fdba74" font-size="9.5" font-weight="700">1. Persistent</text>
        <text x="50" y="49" text-anchor="middle" fill="#fdba74" font-size="9.5" font-weight="700">Error</text>
        <text x="50" y="69" text-anchor="middle" fill="#94a3b8" font-size="8.5">Wind drift gap</text>

        <text x="95" y="54" text-anchor="middle" fill="#38bdf8" font-size="13" font-weight="700">&rarr;</text>

        <rect x="102" y="20" width="78" height="62" rx="7" fill="#1e293b" stroke="#38bdf8" />
        <text x="141" y="37" text-anchor="middle" fill="#7dd3fc" font-size="9.5" font-weight="700">2. Error</text>
        <text x="141" y="49" text-anchor="middle" fill="#7dd3fc" font-size="9.5" font-weight="700">Accumulation</text>
        <path d="M112 72 Q141 56 170 62 L170 72 Z" fill="#38bdf8" opacity="0.35" />

        <text x="187" y="54" text-anchor="middle" fill="#4ade80" font-size="13" font-weight="700">&rarr;</text>

        <rect x="194" y="20" width="74" height="62" rx="7" fill="#1e293b" stroke="#4ade80" />
        <text x="231" y="37" text-anchor="middle" fill="#86efac" font-size="9.5" font-weight="700">3. Error</text>
        <text x="231" y="49" text-anchor="middle" fill="#86efac" font-size="9.5" font-weight="700">Correction</text>
        <circle cx="231" cy="67" r="4" fill="#4ade80" />

        <text x="140" y="103" text-anchor="middle" fill="#cbd5e1" font-size="9.5">Ki sums error over time to cancel steady wind</text>
      </svg>
    `
  },

  'kd-damping': {
    id: 'kd-damping',
    title: 'Kd — Damping & Smooth Stopping',
    renderSvg: () => `
      <svg class="stem-diagram-svg" viewBox="0 0 280 120" role="img" aria-label="Kd damping eliminates overshoot for smooth stopping">
        <rect x="2" y="2" width="276" height="116" rx="10" fill="#0b1220" stroke="#1e293b" />
        <!-- Target line -->
        <line x1="20" y1="44" x2="260" y2="44" stroke="#eab308" stroke-width="1.5" stroke-dasharray="5 4" />
        <!-- Low Kd: Overshoot + Oscillation -->
        <path d="M 20 98 C 52 96, 62 12, 92 16 C 118 20, 126 68, 152 64 C 175 60, 185 32, 212 38 C 230 42, 244 48, 258 44"
              fill="none" stroke="#fb923c" stroke-width="2.2" stroke-dasharray="5 3" />
        <!-- Good Kd: Damping + Smooth Stopping -->
        <path d="M 20 98 C 58 94, 86 44, 144 44 L 258 44"
              fill="none" stroke="#4ade80" stroke-width="3" />
        <text x="86" y="14" fill="#fdba74" font-size="9.5" font-weight="700">Low Kd: Overshoot</text>
        <text x="128" y="84" fill="#86efac" font-size="9.5" font-weight="700">Good Kd: Damping &amp; Smooth Stopping</text>
      </svg>
    `
  },

  'pid-loop-steps': {
    id: 'pid-loop-steps',
    title: 'PID Tuning Workflow',
    renderSvg: () => `
      <svg class="stem-diagram-svg" viewBox="0 0 280 120" role="img" aria-label="1 Adjust PID, 2 Start Flight, 3 Fly with WASD, 4 Check Results, 5 Tune Again">
        <rect x="2" y="2" width="276" height="116" rx="10" fill="#0b1220" stroke="#1e293b" />
        <!-- Top row steps 1 -> 2 -> 3 -->
        <rect x="14" y="16" width="76" height="32" rx="6" fill="#1e293b" stroke="#38bdf8" />
        <text x="52" y="35" text-anchor="middle" fill="#e0f2fe" font-size="9.5" font-weight="700">1. Adjust PID</text>
        <text x="97" y="35" text-anchor="middle" fill="#38bdf8" font-size="12">&rarr;</text>
        <rect x="104" y="16" width="76" height="32" rx="6" fill="#1e293b" stroke="#38bdf8" />
        <text x="142" y="35" text-anchor="middle" fill="#e0f2fe" font-size="9.5" font-weight="700">2. Start Flight</text>
        <text x="187" y="35" text-anchor="middle" fill="#38bdf8" font-size="12">&rarr;</text>
        <rect x="194" y="16" width="72" height="32" rx="6" fill="#1e293b" stroke="#38bdf8" />
        <text x="230" y="35" text-anchor="middle" fill="#e0f2fe" font-size="9.5" font-weight="700">3. Fly WASD</text>

        <!-- Down arrow -->
        <text x="230" y="63" text-anchor="middle" fill="#38bdf8" font-size="12">&darr;</text>

        <!-- Bottom row steps 5 <- 4 -->
        <rect x="150" y="70" width="116" height="32" rx="6" fill="#1e293b" stroke="#4ade80" />
        <text x="208" y="89" text-anchor="middle" fill="#bbf7d0" font-size="9.5" font-weight="700">4. Check Results</text>
        <text x="139" y="89" text-anchor="middle" fill="#4ade80" font-size="12">&larr;</text>
        <rect x="14" y="70" width="114" height="32" rx="6" fill="#1e293b" stroke="#eab308" />
        <text x="71" y="89" text-anchor="middle" fill="#fef08a" font-size="9.5" font-weight="700">5. Tune Again</text>
        <!-- Loop back arrow -->
        <text x="52" y="63" text-anchor="middle" fill="#eab308" font-size="12">&uarr;</text>
      </svg>
    `
  }
});

export function getStemVisualAid(visualId) {
  return STEM_VISUAL_AIDS[visualId] || null;
}
