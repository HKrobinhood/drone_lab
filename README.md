# Drone Lab — PID Flight Challenge

An interactive STEM educational HTML5 game for learning **PID Control in Drone Flight** through hands-on parameter tuning (`Kp`, `Ki`, `Kd`) and manual `WASD` flight control.

## STEM Focus

- **STEM Topic**: PID Control in Drone Flight
- **STEM Activity**: Tune the PID Controller and Fly Your Drone
- **Core Control Loop**:
  `Keyboard Input (WASD)` → `Reference Position` → `PID Controller (Kp, Ki, Kd)` → `Thrust & Pitch` → `2D Drone Dynamics` → `Sensor Feedback`

## Project Structure

```text
Drone_lab/
├── index.html          # Main application views (Start, Mode Selection, Level Selection)
├── styles/
│   └── main.css        # Responsive STEM lab styling and mode differentiation
├── src/
│   ├── main.js         # View navigation, UI rendering, and event handling
│   ├── levels.js       # Tutorial Village (4) and Challenge Levels (6) catalog
│   └── storage.js      # localStorage persistence for stars and unlocks
├── tests/
│   └── m0.test.mjs     # Automated tests for Milestone 0
├── AGENTS.md           # Long-term engineering rules (Chinese)
├── development.md      # Milestone plan, checklists, and progress log (Chinese)
└── README.md
```

## Running Locally

Because the app uses native ES Modules (`<script type="module">`), serve the directory with any static HTTP server:

```bash
python3 -m http.server 8080
```

Then open [http://localhost:8080](http://localhost:8080) in your browser.

## Running Automated Tests

Requires Node.js v20+:

```bash
node --test tests/*.test.mjs
```

## Milestones

- **M0**: Project Initialization, English Start Screen, Mode Selection, Level Entry Framework *(Current)*
- **M1**: PID Physics, 2D Drone Dynamics, WASD Controls & Flight Test Playground
- **M2**: Tutorial Village (4 interactive lessons)
- **M3**: Challenge Levels (6 missions)
- **M4**: 3-Star Scoring & Progress Persistence
- **M5**: PID Diagnostics, Tuning Feedback & Trajectory Comparison
- **M6**: Polish, Mobile Layout & GitHub Pages Deployment
# drone_lab
