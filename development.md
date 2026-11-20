# development.md — Drone Lab — PID Flight Challenge 开发计划与进度

---

## 一、项目目标

开发并发布 **Drone Lab — PID Flight Challenge** —— 一款基于 HTML5 Canvas 2D 与真实二维 PID 控制算法的 STEM 教育网页游戏，部署于 GitHub Pages。玩家通过调节 `Kp`、`Ki`、`Kd` 并使用 `WASD` 控制无人机参考位置，完成 4 个新手教学关卡与 6 个正式飞行挑战。

---

## 二、核心游戏机制

1. **真实闭环控制流**：
   `WASD Input` → `Reference Position (X_ref, Z_ref)` → `PID-X / PID-Z` → `Desired Acceleration -> Thrust (T) & Pitch (theta)` → `2D Drone Physics (dt = 1/120s)` → `Actual Position & Velocity` → `Sensor Feedback` → `PID Controller`
2. **双模式导航**：
   - **Start Screen**：展示 STEM Topic、STEM Activity、Learning Objectives、How It Works 与 `Start Game` 按钮。
   - **Mode Selection**：清晰区分 **Tutorial Village**（新手推荐）与 **Challenge Levels**，展示解锁与历史最高星级。
   - **Level Selection**：展示关卡名称、难度、学习重点、最高星级与锁定状态。
   - **Flight Screen**（M1 起逐步解锁）：二维侧视角 Canvas + PID 调参面板 + 实时遥测。
   - **Result Screen**（M4 起完整接入）：星级评分、飞行指标与诊断调参建议（M5 深化）。

---

## 三、完整里程碑规划

| 里程碑 | 名称 | 核心目标 | 状态 |
| :--- | :--- | :--- | :--- |
| **M0** | Project Initialization | 初始化 Git 仓库、工程文档、英文首页、Mode Selection、关卡入口框架 | **已完成** |
| **M1** | PID Physics and Flight Feel | 2D 无人机物理、PID-X/Z、WASD 手动控制、Flight Test Playground、自动化测试与**人工手感验收** | **已验收通过** |
| **M2** | Tutorial Village | 4 个交互式教学关卡（Take Off, Kp, Ki, Kd）及实时教学反馈 | **已完成** |
| **M3** | Challenge Levels | 6 个正式挑战关卡、障碍物、检查点、圆环穿越、风扰与碰撞检测 | **已完成** |
| **M3.1** | Challenge Physics & Pre-flight Tuning | 起飞前调参界面、关卡差异化动力学（质量/载荷/推力限幅/阵风）、Heavy Cargo 重构、重试参数保留与 M4 指标接口 | **已完成** |
| **M3.2** | Progressive PID Tuning & Virtual Flight Instructor | 关卡教学递进重构、每关零初始调参、虚拟教练 PIP 实时诊断与组合建议、离线参数扫描标定、手感度强化 | **已完成** |
| **M4** | Scoring and Progress | 1~3 星评分算法（含 REF 与实际路线拟合度指标）、Result Screen、localStorage 进度与最高星级存档 | **已完成** |
| **M4.1** | Tutorial & Challenge UI Alignment | 统一新手村与正式关核心界面/状态流、统一 PIP 教练与配置驱动交互式 Spotlight 引导、Tutorial 1 十步 UI+WASD 教学 | **已完成** |
| **M5** | PID Diagnostics | 飞行遥测记录、过冲/振荡/滞后/稳态误差/抗饱和诊断、调参建议与轨迹对比 | 待开始 |
| **M6** | Polish and Deployment | UI 打磨、移动端自适应、难度微调、GitHub Actions & GitHub Pages 部署 | 待开始 |

---

## 四、任务 Checklist

### M0 — Project Initialization
- [x] 检查工作目录与 Git 环境，初始化 Git 仓库（`main` 分支）
- [x] 创建 `AGENTS.md`（中文长期开发规则）
- [x] 创建 `development.md`（中文开发计划与进度）
- [x] 创建 `README.md` 与 `.gitignore`
- [x] 搭建 HTML / CSS / ES Modules 基础结构
- [x] 实现全英文 Start Screen（标题、无人机主题视觉、STEM Topic、STEM Activity、Learning Objectives、How It Works、Start Game）
- [x] 实现 Mode Selection 页面（Tutorial Village 与 Challenge Levels 视觉区分、返回首页、解锁状态、最高星级、首次游玩推荐）
- [x] 建立 Tutorial Village（4 关）与 Challenge Levels（6 关）入口卡片框架
- [x] 规划 PID / Physics / Simulation 模块接口与 M1 飞行手感验收标准
- [x] 编写并运行 M0 自动化测试
- [x] 创建 M0 独立 Git Commit：`chore(m0): initialize PID drone game and start screen`

### M1 — PID Physics and Flight Feel（已人工验收通过）
- [x] 实现 `src/pid.js`（真实位置式 P/I/D、抗积分饱和、输出限幅、测量速度微分 `-Kd * v`、Reset）
- [x] 实现 `src/physics.js`（2D 无人机动力学：重力、推力限幅、倾角限幅、惯性、风扰、地面碰撞）
- [x] 实现 `src/input.js`（WASD / R / P 键盘状态、窗口失焦/暂停防卡键）
- [x] 实现 `src/simulation.js`（固定步长 `dt = 1/120` s 积分器、参考位置生成器、帧率防跳变）
- [x] 实现 `src/renderer.js`（Canvas 2D 侧视角无人机、推力/倾角视觉反馈、地面、边界、轨迹、测试目标区）
- [x] 提供独立 **Flight Test Playground** 入口与 PID 滑块面板（Kp / Ki / Kd / Reset PID / Pause / Restart）
- [x] 编写并运行 M1 全部 8 项自动化测试（Test 1 ~ Test 8）
- [x] **停止推进并提交用户人工手感验收**

### M2 — Tutorial Village
- [x] Tutorial 1 — Take Off（Gravity and Thrust）
- [x] Tutorial 2 — Proportional Control（Proportional Gain Kp）
- [x] Tutorial 3 — Integral Control（Integral Gain Ki）
- [x] Tutorial 4 — Derivative Control（Derivative Gain Kd）
- [x] 教学目标提示、失败反馈与建议调参提示

### M3 — Challenge Levels
- [x] Level 1 — Stable Hover（目标区 3 秒稳定悬停与计时重置）
- [x] Level 2 — Precision Landing（小型平台精准降落与硬着陆判定）
- [x] Level 3 — Ring Flight（按顺序真实穿越圆环检测）
- [x] Level 4 — Narrow Corridor（狭窄障碍通道）
- [x] Level 5 — Wind Challenge（持续横风 + 短时阵风）
- [x] Level 6 — Final Rescue Mission（综合任务）
- [x] 碰撞、越界、超时判定与关卡解锁逻辑

### M3.1 — Challenge Physics & Pre-flight Tuning
- [x] 为所有正式关卡增加独立 **Pre-flight Tuning** 界面（显示任务描述、无人机质量、载荷、风况、最大推力、目标与 `Kp/Ki/Kd` 调参面板）
- [x] 扩展关卡配置字段（`droneMass`, `payloadMass`, `maxThrust`, `maxTilt`, `windForce`, `windGust`, `initialPID`, `targetTolerance`, `velocityTolerance`, `timeLimit`）并接入真实动力学模型
- [x] 重构 L3 为 **Heavy Cargo**（载荷重量、推重比下降与控制饱和），保留双圆环穿越机制于 L6
- [x] 实现重试/返回调参界面时保留上一轮 PID 参数与试飞表现对比
- [x] 为 M4 三星评分预留 8 项飞行指标接口（`getFlightMetrics()`）
- [x] 完成 M3.1 全部 10 项物理、可玩性与可重复性自动化测试

### M3.2 — Progressive PID Tuning & Virtual Flight Instructor
- [x] 重构 L1–L6 递进教学关系（Basic Hover `Kp` → Smooth Braking `Kd` → Heavy Cargo 质量/饱和 → Precision Corridor 权衡 → Wind Disturbance `Ki` → Final Rescue 综合调参）
- [x] 关卡介绍展示 `Previous Knowledge`、`New Challenge`、`Learning Objective`、`Flight Conditions`、`Mission Goal`
- [x] 每次进入/重进正式关卡初始化 `Kp=0, Ki=0, Kd=0`；同关 `Retry` 保留参数；`Reset PID` 清零
- [x] 新增独立纯逻辑教练模块 `src/coach.js` 与动画 SVG 机器人 **PIP — Your PID Flight Coach**（支持 Welcome / Teaching / Warning / Ready / Flight Feedback / Success 六态、单参数与组合异常检测、无风关不误报 `Ki=0`、非阻塞 `Start Flight`）
- [x] 提供离线参数扫描标定脚本 `scripts/calibrate_levels.mjs` 并标定每关 `recommendedPID` 有效区间与联合耦合校验
- [x] 滑块旁显示 `Low / Recommended / High` 区域提示而不直接暴露精确区间数字
- [x] 失败弹窗接入 `"What went wrong?"` 遥测反馈与可选只读历史通关 PID 参考
- [x] 通过 M3.2 全部 15 项回归与手感差异自动化测试

### M4 — Scoring and Progress
- [x] 实现 `src/scoring.js`（1~3 星评价、各关卡阈值与 `REF` vs 实际路线拟合度 `computePathFit`）
- [x] 扩展 `src/simulation.js` 记录 `refTrail`、`settlingTime`、`flightSmoothness`、`pathFitScore` 与 `pathDeviation`
- [x] 完善 Result Screen（`#view-result`：Mission Complete/Failed、1~3 星展示、路线拟合对比小图、2★/3★ 明细、Retry/Pre-flight/Next/Back）
- [x] 接入 `localStorage` 历史最高星级与最佳参考 PID 存档（不覆盖高星级、不自动填入挑战滑块）

### M4.1 — Tutorial & Challenge UI Alignment
- **原有不一致问题**：
  - Tutorial 原直接跳过 `#view-preflight` 进入飞行页，玩家在新手村看不到 Mission Briefing、Drone Specifications 与 PIP Coach 卡片。
  - 飞行页曾分别存在 `#tutorial-guide-panel`/`#tutorial-coach-bar` 与 `#challenge-briefing-panel` 两套提示卡片，以及分裂的 `pre-slider-*` vs `slider-*` 区间提示与重置逻辑。
  - Result Screen 在 Tutorial 与 Challenge 均只展示固定 2★/3★ 清单，未按模式区分 Learning Objective Completed 展示。
- **统一后的页面结构**：
  - `Level Selection` → 统一进入 `#view-preflight`（Mission Briefing、Drone Specifications、PIP Coach Card、PID Tuning Panel、Start Flight）→ `#view-flight`（Top HUD、Canvas、PIP Live Coach、统一 PID Tuning Panel、WASD + Flight Information Bar、统一 Briefing & Drone Specs Summary）→ `#view-result`（按模式配置展示 Learning Objective Completed 或 1~3 Stars + Breakdown + Flight Statistics + PIP Debrief + Retry / Pre-flight Tuning / Back / Next）。
- **复用的核心组件**：
  - `PIDController`（`src/pid.js`）、`stepDronePhysics`（`src/physics.js`）、`FlightSimulation` 与 `getSceneInitialGains`（`src/simulation.js`）。
  - 统一 `PID_PANEL_GROUPS` 与 `applyPidGains` / `resetScenePid`（`src/main.js`），共用 `PID_SLIDER_BOUNDS` 与 `Low / Recommended / High` 区间条。
  - 统一 PIP 虚拟教练（`src/coach.js`：`evaluatePidCoaching`、`evaluateLiveFlightCoaching`、`evaluatePostFlightFeedback`）与 `renderPipCard`。
- **新手村教学步骤**：
  - `Tutorial 1 — Flight Control Basics`（`full` 10 步引导）：Step 1 Mission Briefing → Step 2 Drone Specifications → Step 3 PID Tuning Panel → Step 4 Kp/Ki/Kd 滑块实操 → Step 5 PIP Assistant → Step 6 Start Flight → Step 7 WASD + 松键悬停真实输入验证 → Step 8 Flight Information → Step 9 Reach Target → Step 10 Results & Retry（`src/tutorial_guide.js` + `src/guide_overlay.js`）。
  - `Tutorial 2`（`medium` 3 步）、`Tutorial 3`（`light` 2 步）、`Tutorial 4`（`minimal` 1 步自主调参过渡）。
- **验收标准**：
  - [x] Tutorial 与 Challenge 共用核心页面（Briefing / Specs / PIP / PID Panel / Flight HUD / Result Screen）、同一 PID 控制器与物理引擎。
  - [x] 配置驱动 Spotlight 引导（`pointer-events: none` 遮罩）不阻挡滑块、按钮与 WASD 交互，支持 Back/Next/Hide/Replay 与跨视图自动清理。
  - [x] 全量 Node 自动化测试（22 suites, 60 pass）与真实 Chrome 无头浏览器交互验证（1440×900 / 1280×800、真实按键、零控制台报错）全部通过。
- **测试结果与已知问题**：
  - `node --test tests/*.test.mjs`：60/60 通过；Chrome E2E 交互脚本通过（无水平溢出、无遮罩残留）。
  - 已知问题：暂无已知阻塞缺陷；更精细的时序曲线对比图将在 M5 实现。

### M5 — PID Diagnostics
- [ ] 记录完整飞行遥测时间序列（参考位置、实际位置、速度、误差、P/I/D 分量、输出）
- [ ] 实现过冲、振荡、响应速度、稳态误差、积分饱和分析
- [ ] 生成针对性英文调参建议
- [ ] 实现上次试飞轨迹与本次试飞轨迹对比渲染

### M6 — Polish and Deployment
- [ ] 优化 UI 动画、视觉细节与移动端触控/窄屏布局
- [ ] 校准各关卡难度与评分阈值
- [ ] 配置 GitHub Actions 与 GitHub Pages 自动部署流程
- [ ] 完善 `README.md` 并执行全量回归测试

---

## 五、当前开发状态

- **当前里程碑**：`M4.1 — Tutorial & Challenge UI Alignment`（已完成，待确认后进入 M5）
- **已完成**：统一 Tutorial Village 与 Challenge Levels 核心界面（Briefing / Drone Specs / PID Tuning / PIP Coach / Flight HUD / Result Screen），统一 PID 状态与重置逻辑，新增可复用配置驱动 Spotlight 交互引导系统与 Tutorial 1 十步 UI+WASD+Result 新手引导。
- **尚未完成的功能**：M5（时间序列 PID 诊断分析与上次/本次试飞双轨迹对比）、M6（移动端布局打磨与 GitHub Pages 部署）。

---

## 六、测试和验收标准

### M0 验收标准
1. 浏览器打开首页全英文展示，无中文残留文本。
2. 首页清晰展示 `Drone Lab — PID Flight Challenge`、无人机主题视觉、`STEM Topic`、`STEM Activity`、`Learning Objectives`（5 条）、`How It Works`（3 步）与 `Start Game` 按钮。
3. 点击 `Start Game` 进入 `Mode Selection`（不直接进入飞行场景），展示 `Tutorial Village`（含首次游玩推荐标识）与 `Challenge Levels` 两种明显区分的模式入口、返回首页按钮、解锁数与历史星级。
4. 可进入 `Tutorial Village`（4 关）和 `Challenge Levels`（6 关）列表，展示关卡名称、难度、学习重点、最高星级和锁定状态，导航无 JS 报错。
5. 自动化测试 `node --test tests/*.test.mjs` 全部通过。

### M1 飞行手感验收计划（核心验收标准）
M1 实施时将按以下 8 项测试进行定量与定性验证，并在完成后交由用户人工试玩验收：
1. **Test 1 — Default PID**：推荐默认参数下，无人机可在 2 秒内平稳起飞，水平移动响应自然，松开按键后可稳定刹车并悬停在目标位置附近。
2. **Test 2 — Low Kp**：显著降低 `Kp` 后，上升与水平响应明显变慢，甚至在极低值时无法有效克服重力起飞或跟随缓慢。
3. **Test 3 — Low Kd**：显著降低 `Kd` 后，到达目标或刹车时出现明显过冲（Overshoot）与持续振荡（Oscillation）。
4. **Test 4 — High Kd**：增大 `Kd` 后阻尼明显增强、振荡减少；极高 `Kd` 下运动变得迟缓、响应受阻。
5. **Test 5 — Integral Effect**：在施加持续风扰/恒定外力时，开启合适 `Ki` 能够显著减小稳态位置误差，且自动化测试验证 `integral` 状态实际参与控制出力；过大 `Ki` 可观察到积分饱和/超调增大。
6. **Test 6 — Flight Accuracy**：使用推荐参数，玩家能通过 `WASD` 平稳飞入测试目标区并停稳。
7. **Test 7 — Numerical Stability**：在 60Hz / 120Hz / 144Hz 模拟帧率步进下，固定步长 `dt = 1/120` s 输出一致，无 `NaN`、速度爆炸或穿地。
8. **Test 8 — Input Handling**：松开按键、切换浏览器标签页（`blur` / `visibilitychange`）、暂停与恢复时，不发生按键卡住或积分时间跳变。

---

## 七、Bugs 与技术债

### Bugs
- 暂无（M0 阶段）。

### 技术债
- M0 阶段 `Mode Selection` 与关卡卡片点击后的飞行启动入口暂以里程碑提示弹窗承接，将在 M1（Flight Test Playground）、M2（Tutorial Village）、M3（Challenge Levels）逐一替换为真实 Canvas 飞行场景。

---

## 八、Git Commit 记录

- `chore(m0): initialize PID drone game and start screen` — 完成 M0 项目初始化、英文首页、模式与关卡入口框架及工程文档。
- `feat(m1): implement PID flight physics and manual controls` — 完成 M1 二维 PID 控制器、无人机动力学、WASD 操控与 Flight Test Playground。
- `feat(m2): implement PID tutorial village` — 完成 M2 新手村 4 个交互式 PID 教学实验关卡、实时教学反馈与顺序解锁。
- `feat(m3): implement drone challenge levels` — 完成 M3 六个正式挑战关卡、障碍物碰撞、高台着陆、顺序圆环穿越检测与越界判定。
- `feat(m3.1): add level-specific physics and PID tuning challenges` — 完成 M3.1 Pre-flight Tuning 调参流程、关卡物理差异（载荷/推重比/饱和/阵风）、L3 Heavy Cargo 重构与 M4 指标接口。
- `feat(m3.2): add progressive PID tuning and virtual coach` — 完成 M3.2 关卡教学递进、零初始 PID、虚拟教练 PIP、参数扫描标定与失败遥测解释。
- `feat(m4): implement stars and game progress` — 完成 M4 三星评分系统（含 REF 路线与实际路线拟合度）、独立 Result Screen 与 localStorage 最高星级存档。
- `feat(m4.1): align tutorial and challenge flight experience` — 统一 Tutorial 与 Challenge 核心界面、共享 PID/PIP/物理控制流，并实现基于真实输入验证的 10 步交互式新手村引导系统。

---

## 九、下一步开发任务

等待用户确认 **M4** 后，启动 **M5 — PID Diagnostics**：
1. 记录完整时间序列遥测并实现过冲/振荡/滞后/稳态误差/抗饱和智能诊断（`src/feedback.js`）。
2. 在 Canvas 飞行场景中叠加展示上次试飞轨迹与本次试飞轨迹对比。
