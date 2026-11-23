# Drone Lab — PID Flight Challenge

An interactive STEM educational HTML5 game for learning **PID Control in Drone Flight** through hands-on parameter tuning (`Kp`, `Ki`, `Kd`) and manual `WASD` flight control.

🎮 **Live Web Version**: [https://hkrobinhood.github.io/drone_lab/](https://hkrobinhood.github.io/drone_lab/)  
📦 **Repository**: [https://github.com/HKrobinhood/drone_lab](https://github.com/HKrobinhood/drone_lab)

---

## STEM Educational Focus

- **STEM Topic**: PID Control in Drone Flight
- **STEM Activity**: Tune PID to control a drone.
- **Branches of STEM**:
  - **Engineering (Primary)**: Closed-loop feedback control, damping, saturation, anti-windup, and trade-offs between speed, stability, precision, and energy consumption.
  - **Technology**: Interactive flight simulations, real-time sensor feedback telemetry, and dynamic algorithm visualization.
- **Learning Outcomes**:
  By the end of this game, players will be able to:
  1. **Identify** how Kp, Ki, and Kd influence drone flight behaviour.
  2. **Apply** PID tuning to achieve stable flight across different challenges.
  3. **Analyse** overshoot, oscillation, and slow response using flight feedback.
  4. **Optimise** PID parameters to achieve at least two stars in three challenge levels.

---

## Core Control Architecture

The player **never** directly sets the drone's position or velocity with the keyboard. Instead, the keys move a dynamic **Reference Target (REF / Ghost Drone)**, and a real 2D position PID controller calculates the necessary control acceleration:

```text
Keyboard (WASD)
      │
      ▼
Reference Generator (X_ref, Z_ref)
      │
      ▼
PID Controller (Kp, Ki, Kd) ──► Anti-Windup & Output Clamping
      │
      ▼
Desired Acceleration ──► Thrust (T) & Tilt Angle (θ)
      │
      ▼
2D Drone Dynamics (dt = 1/120s, Gravity, Drag, Wind, Payload, Battery Drain)
      │
      ▼
Sensor Telemetry (Actual Position, Velocity, Power)
      │
      └───► Feedback Loop into PID Controller
```

---

## Game Modes & Progression

### 1. Tutorial Village (4 Progressive Lessons)
- **Tutorial 1 — Flight Control Basics**: Learn gravity vs. thrust, explore `Low`, `High`, and `Recommended` `Kp` zones, run a simulated Test Bench curve, unlock flight, and fly into the target zone with WASD.
- **Tutorial 2 — Proportional Control (`Kp`)**: Overcome steady altitude drop and learn how proportional response speeds up ascension.
- **Tutorial 3 — Integral Control (`Ki`)**: Eliminate steady-state error caused by persistent crosswinds and understand integral accumulation and anti-windup.
- **Tutorial 4 — Derivative Control (`Kd`)**: Tame violent overshoot and oscillations through velocity damping and smooth braking.

### 2. Challenge Levels (6 Tactical Missions)
- **Level 1 — Express Hover**: Fast response and tight settling time within a 3-second hold window.
- **Level 2 — Surgical Braking**: Precision platform landing avoiding hard ground collisions.
- **Level 3 — Heavy Cargo Run**: Heavy payload, reduced thrust-to-weight ratio, control saturation, and rotor energy battery budget.
- **Level 4 — Narrow Corridor Sprint**: Speed vs. precision trade-off threading tight obstacles.
- **Level 5 — Storm Hold**: Unsteady crosswinds and randomized wind gusts requiring balanced integral and derivative gains.
- **Level 6 — Final Rescue Mission**: Comprehensive test combining sequential ring gates, heavy load, turbulent gusts, and limited battery capacity.

---

## Key Features

- **Real Closed-Loop Physics**: Fixed 120 Hz integration step (`dt = 1/120 s`), anti-windup clamping, derivative filtering on measured velocity to prevent setpoint kick, and non-linear rotor power dissipation ($P(t) = P_0 + k_{ind} T^{1.5} + k_{slew}|\dot{T}|$).
- **Rotary PID Tuning Garage**: Pure SVG + Pointer Events rotary knobs supporting drag, mouse wheel, +/- step buttons, and direct numeric input.
- **Isolated PID Test Bench**: Run deterministic 6.5-second step and wind disturbance experiments before takeoff; compare Before/After waveforms and honest physical metrics (Overshoot, Settling Time, Steady-State Error).
- **PIP — Your PID Flight Coach**: Lightweight animated SVG robot offering real-time in-flight status badges and grounded post-flight advice.
- **Minimal Results Screen & Animated Star Showcase**: Centered 3-star reveal animation, prominent action buttons right below the stars, concise PIP debrief, and a collapsible **Detailed Flight Report** containing 9 telemetry metrics, strategy radar chart, route fit analysis, and time-series plots.
- **Progress Persistence**: LocalStorage persistence tracking unlocked levels, highest stars earned, and best-performing PID configurations.

---

## Technology Stack

- **Frontend**: Pure Vanilla HTML5, CSS3, ES Modules (`<script type="module">`), and Canvas 2D rendering.
- **Zero Dependencies**: No React, Vue, Angular, Three.js, or external UI libraries. 100% self-contained code.
- **Testing**: Native Node.js test runner (`node:test` + `node:assert/strict`).
- **CI/CD & Deployment**: GitHub Actions automated testing and deployment to GitHub Pages.

---

## Project Structure

```text
Drone_lab/
├── index.html              # Single-page multi-view layout (Start, Mode, Levels, Flight, Result)
├── styles/
│   └── main.css            # Responsive layout, animations, knob styling, and results hierarchy
├── src/
│   ├── main.js             # View router, UI orchestration, and event binding
│   ├── levels.js           # Metadata and level definitions for Tutorials and Challenges
│   ├── pid.js              # Pure PID controller (P, I, D, anti-windup, velocity derivative)
│   ├── physics.js          # 2D quadrotor dynamics, aerodynamics, energy, and ground collision
│   ├── simulation.js       # Fixed-step 120Hz loop, reference generator, and telemetry recorder
│   ├── renderer.js         # Canvas 2D side-view rendering (drone, target, ghost drone, trails)
│   ├── scenes.js           # Scene barriers, rings, wind fields, and mission completion conditions
│   ├── scoring.js          # 1–3 star evaluation, path fit metric, and rating breakdown
│   ├── coach.js            # Virtual PIP flight coach rules and diagnostic recommendations
│   ├── feedback.js         # Telemetry diagnostics (overshoot, oscillation, lag, steady-state)
│   ├── tutorial_guide.js   # Interactive spotlight guides and instructional steps
│   ├── visual_aids.js      # Inline SVG diagrams, PIP expressions, and parameter explainers
│   ├── pid_knob.js         # Pure SVG rotary knobs with multi-input event synchronization
│   ├── test_bench.js       # Pre-flight PID test bench, experiment runner, and curve comparison
│   └── storage.js          # localStorage progress, star records, and unlock management
├── tests/                  # 37 suites, 93 automated unit & integration tests
├── .github/workflows/
│   └── deploy.yml          # Automated CI test & GitHub Pages deployment workflow
├── AGENTS.md               # Long-term engineering rules (Chinese)
├── development.md          # Milestone roadmap, checklists, and progress log (Chinese)
└── README.md
```

---

## Running Locally

Because the project uses standard ES Modules, it can be served using any local HTTP server:

```bash
# Python 3
python3 -m http.server 8080

# Or Node.js npx
npx serve .
```

Then navigate to `http://localhost:8080` in your web browser.

---

## Running Automated Tests

Requires Node.js v20+:

```bash
# Syntax verification
node --check src/*.js

# Full automated test suite
node --test tests/*.test.mjs
```

---

## GitHub Pages Deployment

This repository is configured to deploy automatically via GitHub Actions:

1. Push commits to the `main` branch.
2. The GitHub Action in `.github/workflows/deploy.yml` runs the full test suite and deploys to GitHub Pages.
3. In GitHub repository settings (`Settings -> Pages`):
   - Under **Build and deployment**, select **Source: GitHub Actions**.
4. The live application will be accessible at:  
   **[https://hkrobinhood.github.io/drone_lab/](https://hkrobinhood.github.io/drone_lab/)**
