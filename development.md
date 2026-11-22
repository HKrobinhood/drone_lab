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
| **M4.2** | PIP Introduction & Visual Tutorial Redesign | PIP 首次自我介绍、5 种表情动画、6 张内联 SVG 教学图解、精简短句文案与 Learn More 展开 | **已完成** |
| **M5** | PID Diagnostics | 飞行遥测记录、过冲/振荡/滞后/稳态误差/抗饱和诊断、调参建议与轨迹对比 | **已完成** |
| **M5.1** | Visual-First UI & Animated Star Results | 视觉优先教学与交互图解（<=15 词）、Ghost Drone + 实时 PID 曲线与状态标签、PIP 精简优化、居中三星逐颗弹跳动画、真实 M4 评级依据与下一星建议、精简失败页 | **已完成** |
| **M5.2** | Homepage UI Redesign | 明亮卡通科技风游戏首页重设计：蓝天草地场景、左侧 PIP + 中央超大 `Start Game` + 右侧无人机、4 步图标玩法流程、4 张简洁课程信息卡与完整 `About` 课程弹窗 | **已完成** |
| **M5.3** | Strategic Control Trade-offs & Energy Model | 真实非线性旋翼功耗与电池耗尽失败模型、L1–L6 差异化策略格局（极速/精密/重载节能/狭缝权衡/强风抗扰/四维终考）、L3–L6 淡出绿区改用实时四维权衡预测器与结算四维策略雷达对比 | **已完成** |
| **M5.4** | Beginner-Friendly PID Tuning Redesign | 降噪三区布局（Mission Playground 场景预览 + PID Tuning Garage 圆形旋钮 + 紧凑 PIP 气泡）、可展开 Kp/Ki/Kd 图解卡、基于真实 120 Hz 仿真的 PID Test Bench（Step/Wind 实验、Tuning Challenge、Before/After 曲线与指标对比）及新手实验引导升级 | **已完成** |
| **M5.5** | Minimal Results Screen Redesign | 统一精简全部结算页（新手村与挑战关、成功与失败、1–3 星）：保留原三星造型与动画、主操作按钮紧贴星星下方、PIP 精简为头像 + 单句真实诊断反馈（<=20 词）、完整评分/指标/图表/深度分析收纳至默认折叠的 `Detailed Flight Report` | **已完成** |
| **M6** | Polish and Deployment | UI 打磨、移动端自适应、难度微调、GitHub Actions & GitHub Pages 部署 | **已完成部署** |

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

### M4.2 — PIP Introduction & Visual Tutorial Redesign
- **修改目标**：为统一虚拟教练 **PIP** 增加初次进入新手村的趣味自我介绍，升级 5 种轻量 SVG/CSS 表情状态，大幅精简教学文本并配齐 6 套贴近操作控件的内联矢量教学图解与可展开 `Learn More`。
- **PIP 介绍流程**：
  - 首次进入 Tutorial Village 检查 `localStorage` 中的 `pipIntroSeen`（`src/storage.js`）；未看过时侧滑出场展示 3 句短台词（Greeting → Explaining → Celebrating），提供 `Next` 与 `Skip Intro`；跳过介绍不跳过 Tutorial 1 交互操作步骤，且可通过 `Meet PIP / Help` 随时重播。
- **新增视觉教学资源（`src/visual_aids.js`）**：
  - 统一 PIP 机器人 SVG 构建器与 `Greeting`（挥手）、`Explaining`（指示）、`Thinking`（轻倾思考）、`Warning`（警示眉眼）、`Celebrating`（笑眼欢跃）5 种表情状态，支持 `prefers-reduced-motion`。
  - 6 张内联矢量图：`gravity-thrust`（推力↑ vs 重力↓）、`wasd-controls`（WASD 按键与方向箭头）、`kp-response`（Low Kp 慢响应 vs High Kp 快响应/可能超调）、`ki-integral`（Persistent Error → Accumulation → Correction）、`kd-damping`（Overshoot vs Damping & Smooth Stopping）、`pid-loop-steps`（5 步调参闭环）。
- **精简教学文案与 UI 调整**：
  - 所有新手步骤主提示压缩为 8~15 词的动词引导短句，详细原理解释收纳进 `<details>Learn More</details>`。
  - 在 Spotlight 指引气泡与 Pre-flight 卡片旁就近嵌入对应图解，明确区分 Intro、Tutorial Guide、PID Risk Advice 与 Flight Feedback 展示通道。
- **测试结果与已知问题**：
  - `node --test tests/*.test.mjs`：24 suites，65 tests 全部通过；无头 Chrome 端到端验证通过（1440×900 / 1280×800 无横向溢出、无控制台报错）。
  - 已知问题：暂无阻塞问题。

### M5 — PID Diagnostics
- [x] 记录完整飞行遥测时间序列（参考位置、实际位置、速度、误差、P/I/D 分量、输出、推力与饱和标记）
- [x] 实现过冲、振荡、响应速度、稳态误差、积分饱和/控制饱和定量分析（`src/feedback.js`）
- [x] 将新手村与正式关卡结算报告统一升级为 **PIP Flight Coach 第一人称对话式分析与调参建议**
- [x] 实现上次试飞轨迹与本次试飞轨迹对比渲染（飞行主画布 + Result 轨迹对比图 + 时序曲线小图）

### M5.1 — Visual-First UI & Animated Star Results
- **UI 改动目标**：将界面由大段文字说明升级为 **Visual → One Sentence → Player Action** 的视觉优先 STEM 交互体验，借鉴 PhET（即时物理实验与曲线）、Lightbot（分步动作引导）与 Angry Birds（居中三星揭晓与重玩闭环），保持纯原创 SVG/CSS/Canvas 美术与英文玩家界面。
- **视觉教学与交互图解（`src/tutorial_guide.js`, `src/visual_aids.js`, `src/guide_overlay.js`）**：
  - 将 Tutorial 1–4 所有步骤主提示精简至 `<= 15` 个英文单词（并保留 Tutorial 1 飞行开局 WASD 引导与全 4 关衡量指标口述）。
  - 升级 6 套内联矢量 STEM 图解（`gravity-thrust`、`wasd-controls`、`kp-response`、`ki-integral`、`kd-damping`、`pid-loop-steps`）并接入交互式预览切换按钮，复杂说明收纳至 `Learn More`。
- **飞行场景 PID 可视化（`src/renderer.js`, `src/feedback.js`, `index.html`, `src/main.js`）**：
  - 在主画布中绘制半透明 **Ghost Drone**（代表参考位置 REF）、实体无人机与实时误差连线/箭头/数值标注，并提供 `Ghost Drone (REF)` 与 `Flight Trails` 开关。
  - 在画布下方增加紧凑型 **Live PID Response** 实时折线图（直接读取 `sim.telemetry` 的 `Target`、`Actual` 与 `Error`，支持 `Z (Alt) / X (Horiz)` 轴切换，无预设假曲线）。
  - 新增真实遥测驱动的状态短标签 `evaluateLiveControlStatus`（`Ready` / `Calibrating` / `Stable` / `Overshoot` / `Oscillation` / `Saturated` / `Slow Response`），样本不足时不生成确定性误判。
- **PIP UI 优化（`src/coach.js`, `src/visual_aids.js`, `src/main.js`）**：
  - 支持 `Greeting / Teaching / Warning / Ready / Success / Failure` 六类状态与 5 种轻量表情动画，每次优先展示 1 条核心建议，补充信息收纳于可折叠 `Learn More`。
- **居中三星动画与评级依据（`src/scoring.js`, `styles/main.css`, `src/main.js`, `index.html`）**：
  - 新手村（Tutorial Village）与正式关卡（Challenge Levels）统一使用同一套居中三星动画展示、1~3 星评级依据面板（`Mission Completed / Time Target / Precision Target` + 2★/3★ 明细）与下一颗星改进建议。
  - 通关结算顶部居中展示 3 颗原创矢量金星（未获星暗灰显示），按 `0.3s → 0.7s → 1.1s` 顺序逐颗弹跳点亮，三星时触发庆祝光效与轻量粒子动画；支持 `Skip Animation`、`prefers-reduced-motion` 以及同关 `Retry` 重新播放。
  - 失败界面不播放庆祝动画，以简洁 `Mission Failed` 卡片展示失败原因、关键指标与 PIP 一句话改进建议。
  - 新增 `buildRatingBreakdown` 与 `buildNextStarAdvice`，直接读取 M4 `scoreFlightRun` 与 `LEVEL_STAR_THRESHOLDS` 真实阈值生成 `Mission Completed / Time Target / Precision Target` 明细与无矛盾的下一颗星优化建议。
- **测试与已知问题**：
  - `node --test tests/*.test.mjs`：29 suites，76 tests 全部通过。
  - 无头 Chrome 端到端实测（1440×900 桌面与 390×844 移动端）：Tutorial 交互图解、Ghost Drone 与实时 PID 曲线、Challenge 真实失败无庆祝界面、居中三星动画与 `Skip Animation`、`prefers-reduced-motion`、`Retry` 重播及 `localStorage` 存档均通过，零控制台/运行时报错。
  - 已知问题：暂无阻塞问题；移动端触控操作与 GitHub Pages 自动发布将在 M6 推进。

### M5.2 — Homepage UI Redesign
- **旧版首页问题**：深色长段落卡片文字偏多、`Start Game` 按钮靠左不够突出、缺乏游戏氛围与角色视觉识别，课程分支（Engineering / Technology）和详细说明未分层。
- **新版信息架构**：
  - **Hero 主视觉区**：蓝天云朵草地背景（内联轻量 SVG，含飞行圆环、风旗、H 降落平台与三颗装饰星）+ 顶部 `STEM Game` 徽章与右上角 `About` 弹窗入口 + 左侧统一角色 **PIP** + 中央 `Drone Lab / PID Flight Challenge` 标题、短副标题（`Tune PID · Fly with WASD · Earn Stars`）与超大亮橙金发光 `Start Game` 按钮 + 右侧卡通四旋翼无人机。
  - **How to Play 图标流程**：`Start Game` 下方用箭头连接 4 张图标卡片（`Tune PID` → `Fly` → `Complete` → `Earn`）。
  - **About the Course 四卡区**：下方 4 张彩色页眉简洁信息卡（`STEM Topic`、`Branches of STEM`、`Game Overview`、`Learning Objectives`），保留全部 STEM 作业核心信息同时避免文字堆砌。
  - **About 完整课程弹窗（`#about-modal`）**：右上角 `About` 按钮打开完整课程信息模态窗，包含完整 STEM Topic、STEM Activity、Branches of STEM（Technology 与 Engineering Primary Focus）、Game Description 与 4 条 Learning Objectives，支持键盘 `Escape` 关闭与焦点恢复。
- **响应式与无障碍**：桌面端（1440×900）首屏完整展示 Hero、Start Game、4 步流程与 4 卡课程概览；平板端（834×1112）切换 2×2 卡片网格；手机端（390×844）标题与 `Start Game` 保持居中、角色缩放无遮挡、无横向溢出；所有动画支持 `prefers-reduced-motion` 且无外部 CDN 依赖。
- **测试结果**：`node --test tests/*.test.mjs` 全量通过；无头 Chrome 桌面/平板/手机实测截图与交互（`Start Game` 跳转 Mode Selection、`About` 弹窗开关、零控制台报错）均通过。

### M5.3 — Strategic Control Trade-offs & Energy Model
- **真实旋翼功耗与电池模型（`src/physics.js`, `src/simulation.js`）**：基于动量理论实现非线性功率 $P(t) = P_{\text{avionics}} + k_{\text{ind}} T^{1.5} + k_{\text{slew}} |dT/dt|$，实时积分耗能并记录峰值功率与剩余电量；在 L3（3200 J）、L5（2800 J）、L6（4400 J）开启严格电池上限，电量耗尽直接触发 `Mission Failed — Battery Depleted`。
- **新手村（T1–T4）四维策略启蒙**：保持 4 关结构不变，在 T1–T4 分别融入推力与功耗、速度↔过冲/能耗、抗风精度↔饱和/能耗、阻尼稳定/节能↔速度的渐进式权衡教学。
- **正式挑战关（L1–L6）差异化策略分化（`src/scenes.js`, `src/scoring.js`, `scripts/calibrate_levels.mjs`）**：
  - L1 `Express Hover`（Speed-First）、L2 `Surgical Braking`（Precision-First）、L3 `Eco Cargo Run`（Energy-First）、L4 `Corridor Sprint`（Speed vs. Precision）、L5 `Storm Hold`（Wind Stability）、L6 `Final Rescue`（Full 4-Way Trade-off）。
  - 经离线跨关矩阵扫描实证：无单一 PID 组合可在全部 6 关获得 3★（例如 L1 极速参数在 L2/L4 降星并在 L6 硬着陆失败；L2 精密参数在 L1 降星并在 L3/L6 电量耗尽失败）。
- **渐进式支架淡出与四维可视化（`src/coach.js`, `src/renderer.js`, `index.html`, `src/main.js`）**：
  - T1–T4 与 L1–L2 保留滑块 `Low / Recommended / High` 辅助提示；**L3–L6 隐藏精确绿区**，引导玩家结合 `Mission Strategy Priorities` 与实时 **4-Axis Strategy Trade-off Meter（Speed / Stability / Precision / Efficiency）** 自主决策。
  - 飞行顶部新增实时电池进度条/瞬时功率胶囊与 `High Drain / Low Battery` 状态徽章；结算页新增 `Energy Target` 评级依据、四维策略对比雷达图（本次 vs 上次 vs 任务优先级）与 PIP 策略复盘。

### M5.4 — Beginner-Friendly PID Tuning Redesign
- **UI 降噪与三区重组（`index.html`, `styles/main.css`, `src/main.js`）**：
  - 将原先在赛前界面同时展开的十余项文字栏目重组为三个视觉清晰区域：
    1. **Mission Playground**：顶部简洁图标数值条（Hold、Speed、Mass、Wind、Max Thrust、Battery）+ 实时 2D 关卡预览画布（`#preflight-arena-canvas`，复用 `FlightRenderer` 绘制无人机、目标区、障碍物与风向），让初学者看图理解任务。
    2. **PID Tuning Garage**：三颗游戏化圆形控制旋钮（`Kp — Response`、`Ki — Correction`、`Kd — Damping`）+ `Test PID` / `Reset PID` / `Start Flight` 操作行。
    3. **PIP Flight Coach**：顶部紧凑迷你机器人 + 单句建议对话气泡。
  - 原有完整任务详情（Mission Briefing / 策略优先级 / 历史试飞）、Drone Specifications / 概念图解、以及四维 Strategy Trade-offs 收纳至默认折叠的 `<details>` 抽屉按需展开，不丢失任何教学信息且大幅降低首屏信息密度。
- **游戏化圆形控制旋钮与参数图解（`src/pid_knob.js`, `src/visual_aids.js`）**：
  - 零外部库纯 SVG + Pointer Events 旋钮，带 270° 刻度与彩色弧线、鼠标/触控拖拽（`touch-action: none`）、滚轮、键盘方向键、`−`/`+` 微调按钮与精确数值输入框，实时双向同步至真实 `PIDController` 边界与步长。
  - 每个旋钮左上角带闪电 / 累积误差 / 刹车图标按钮，点击就近展开交互式 SVG 参数图解卡（强调三参数耦合、不含误导性单参数论断），数学公式收纳在折叠 `Learn More (Formula)` 中。
- **真实仿真 PID Test Bench、实验挑战与 Before/After 对比（`src/test_bench.js`, `src/renderer.js`）**：
  - 点击 `Test PID` 创建完全隔离的 `FlightSimulation` 实例运行 6.5 秒真实 120 Hz 物理实验（按关卡自动选择 `Takeoff Height Step`、`Position Step` 或 `Wind Disturbance`），绝不污染正式飞行状态。
  - 折线图展示 `Target`（金虚线）、`Previous`（紫虚线）与 `Current`（青实线）真实采样轨迹，底部如实展示 `Overshoot`、`Settling Time`（未收敛显示 `Not Settled`）、`Steady Error`（不可测显示 `N/A`）。
  - 仅在相同 `experimentKey` 实验条件下生成 Before → After 对比胶囊（改善绿显、退化如实红显）；每关配备独立实验式 **Tuning Challenge**（严格按真实物理指标判定、不检查推荐区、可随时跳过直接 `Start Flight`）。
  - PIP 优先依据真实 Test Bench 遥测生成单句指导或祝贺，不泄露唯一最优参数。
- **新手村实验引导升级（`src/tutorial_guide.js`, `src/visual_aids.js`, `src/scenes.js`）**：
  - 将新手村 4 课统一重构为「**调 PID → 测曲线（Test PID）→ 观察与对比波形（Before/After）→ 起飞验证（Start Flight）**」递进方法论：
    - **Tutorial 1**：紧凑 8 步闭环（Step 1 看任务 → Step 2 建立工作流 → **Step 3 脉冲高亮 Kp 旋钮，按 `Low (0) → High (>9) → Recommended (4.5–9.0)` 三阶段完整体验三档参考徽章** → Step 4 点 `Test PID` 画曲线 → Step 5 读波形 → **Step 6 脉冲高亮 `Start Flight` 解锁起飞** → Step 7 WASD 实操 → **Step 8 明确引导将无人机飞入蓝色目标圈悬停 1.5 s**，完成后自然收尾且任意通关即 3★）。
    - **Tutorial 2 / 3 / 4（Kp / Ki / Kd 单步单旋钮高亮 + 自由波形实验）**：每关仅设 1 个 Step，脉冲高亮当前需调节的参数旋钮（`#knob-card-kp` / `#knob-card-ki` / `#knob-card-kd`），提供针对性调参建议并明确提示“调节后先点 `Test PID` 观看波形，满意后随时点击 `Start Flight` 进入飞行”；点 `Got It` 或 `Hide Guide` 后即可自由反复调参测曲线，PIP 持续弹出基于真实波形的诊断建议，全程不锁起飞。
  - **分层门禁**：Tutorial 1 保持完整 8 步 Spotlight 手把手引导（不显示 `Hide Guide`、完成 Step 1–5 解锁起飞、完成即 3★）；Tutorial 2–4 进入无遮罩自由调参实验模式。
  - 同步更新 `pid-loop-steps` 矢量流程图为 `1. Tune PID → 2. Test Curve → 3. Read Wave → 4. Start Flight → 5. Fly & Review`。
- **测试结果与已知问题**：
  - 全量语法检查与自动化测试 `node --test tests/*.test.mjs`：**35 套件、91 项测试全部通过（0 失败）**，包含新增 `tests/m5_4.test.mjs`。
  - Headless Chrome 实机交互与视觉截图验证（桌面 1440×900 与手机 390×844）：旋钮多方式同步、参数图解展开、Tutorial 4 真实物理 Before (`Kd=0.4`, Overshoot 86% / Not Settled) → After (`Kd=4.6`, Overshoot 3% / 1.8 s / `✓ Goal Met!`)、L3 去脚手架与跳过 Test PID 直接起飞全部通过，零控制台/运行报错、零横向溢出。
  - 已知问题：暂无阻塞缺陷。

### M5.5 — Minimal Results Screen Redesign
- **原结算页面存在的问题**：
  - 结算首屏同时展开居中三星卡片、大段 PIP Telemetry Analysis、2★/3★ 评级依据、三张 Canvas 分析图表与 9 项性能指标卡片，信息密度过高，主操作按钮被挤到中下部。
  - `Mission Complete`、任务名称、完成时间及相似诊断结论在头部、PIP 气泡与指标区多次重复展示。
- **新版统一 UI 信息层级（覆盖 Tutorial / Challenge 的成功、失败与 1★ / 2★ / 3★ 全部场景）**：
  1. **Mission Result**：仅展示标题（`Mission Complete!` 或 `Mission Failed`）+ 单行关卡名称（如 `Tutorial 2 — Proportional Control`），去除重复徽章与冗余文案。
  2. **Star Animation**：100% 保留原有矢量金星设计、逐颗弹跳揭晓动画（`0.3s → 0.7s → 1.1s`）、三星庆祝光效与粒子、`Skip Animation` 及 `prefers-reduced-motion` 支持；失败页展示 0/3 暗灰星且不播放庆祝动画。
  3. **Action Buttons（紧贴星星正下方）**：
     - 成功且有下一关：主按钮 `Next Level →`，次按钮 `Retry`，辅助操作 `Pre-flight Tuning` / `Back to Levels`。
     - 新手村最后一关（Tutorial 4）：主按钮 `Enter Challenge Levels →`，次按钮 `Retry`，辅助 `Pre-flight Tuning` / `Back to Levels`。
     - 挑战最后一关（Level 6 无下一关）：主按钮 `Back to Levels`，次按钮 `Retry`，辅助 `Pre-flight Tuning`。
     - 失败场景：主按钮 `Retry`，次按钮 `Pre-flight Tuning`，辅助 `Back to Levels`。
     - 常见桌面视口首屏无需滚动即可看到完整按钮，移动端纵向全宽排布。
  4. **PIP Short Feedback（`buildConcisePipResultFeedback`）**：精简为 1 个 PIP 头像 + 1 句 <= 20 词英文短评，严格基于 M5 真实遥测诊断与 M4 评分结果挑出最重要的一条建议（如过冲、振荡、滞后、稳态漂移、碰撞、硬着陆、电量耗尽或三星祝贺），无充分依据时使用中性鼓励语句。
  5. **Detailed Flight Report（默认折叠手风琴）**：
     - 整行可点击标题栏 + 右侧动态旋转 Chevron 箭头，具备 `aria-expanded` / `aria-controls` / `role="region"` 键盘与无障碍支持及 `prefers-reduced-motion` 兼容；每次进入新结算页自动重置为折叠状态。
     - 展开后完整保留：Star Rating Breakdown（含下一星建议与 2★/3★ 细项）、Flight Performance Metrics（9 项真实指标，缺失项显示 `N/A`）、Strategy Trade-off Profile 雷达图、Route Fit Comparison 轨迹图、Telemetry Time-Series 时序图与完整 PIP Detailed Analysis。
     - 仅在展开后（及窗口尺寸变化时）触发 Canvas 渲染并测量真实可见容器宽高，杜绝隐藏容器 `0×0` 绘图失真。
- **测试结果**：
  - 全量语法检查与自动化测试 `node --check src/*.js && node --test tests/*.test.mjs`：**37 套件、93 项测试全部通过（0 失败）**，包含新增 `tests/m5_5.test.mjs`。
  - Headless Chrome 实机端到端与多端截图验收（桌面 `1280×820` 与手机 `390×844`）：验证 Tutorial 成功（3★）、展开 Detailed Flight Report（3 张 Canvas 全部真实绘制且无裁切）、点击 `Next Level →` 跳转、硬着陆失败页（自动重置折叠、`Retry` 为主按钮）、按钮导航与零控制台报错、零横向溢出。

### M6 — Polish and Deployment
- [x] 优化 UI 动画、视觉细节与移动端触控/窄屏自适应布局（桌面/平板/移动端适配）
- [x] 校准各关卡难度与评分阈值，并保持 100% 纯英文玩家界面
- [x] 配置 GitHub Actions 与 GitHub Pages 自动部署流程（`.github/workflows/deploy.yml` 自动化测试与静态部署）
- [x] 完善 `README.md`（完整 STEM 教学目标、架构图、操作指南、测试与部署说明）并执行全量回归测试
- [x] 关联远程仓库 `https://github.com/HKrobinhood/drone_lab.git` 并成功推送到 `main` 分支

---

## 五、当前开发状态

- **当前里程碑**：`M6 — Polish and Deployment`（已完成部署上线）
- **已完成**：完成 M0 至 M6 全部功能研发、37 套件 93 项自动化测试、UI 打磨、英文文档及 GitHub Actions / GitHub Pages 部署发布。
- **发布状态**：远程代码库已推送至 `https://github.com/HKrobinhood/drone_lab.git`，在线地址为 `https://hkrobinhood.github.io/drone_lab/`。

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
- `feat(m4.2): add PIP introduction and visual tutorials` — 新增 PIP 首次自我介绍、5 种表情动画、6 套内联矢量 STEM 教学图解与精简短句引导。
- `feat(m5): add PID diagnostics and PIP coach debrief` — 完成时间序列遥测、控制行为诊断、PIP 对话式结算分析报告（双模式共用）及历史/本次轨迹对比渲染。
- `feat(m5.1): add flight WASD intro and PIP metric coaching in tutorials` — 新手村第一课飞行界面开局增加 WASD 介绍，并通过 PIP 对话式讲解贯穿新手村四关的全部飞行衡量指标。
- `refactor: remove flight test playground feature` — 删除独立的 Flight Test Playground 自由沙盒入口、场景定义及多余风扰下拉控件，统一通过 Tutorial Village 与 Challenge Levels 进行飞行训练与挑战。
- `feat(m5.1): improve STEM visuals and animated star results` — 完成 M5.1 视觉优先教学与交互图解、Ghost Drone / 实时 PID 曲线与状态标签、PIP 精简优化、居中三星动画、真实 M4 评级依据与精简失败结果页。
- `feat(m5.1): unify tutorial and challenge star result display` — 统一新手村与正式关卡的三星动画与评级依据展示。
- `feat(ui): redesign STEM game homepage` — 完成 M5.2 明亮卡通科技风 STEM 首页重设计、4 步图标玩法、4 张课程信息卡与完整 `About` 课程弹窗。
- `feat(m5.3): add strategic PID trade-offs, rotor energy model, and 4-axis radar` — 完成 M5.3 非线性旋翼功耗与电池模型、L1–L6 差异化策略格局、L3–L6 绿区淡出、实时四维权衡预测与结算策略雷达对比。
- `feat(tuning): redesign beginner PID tuning experience` — 完成 M5.4 初学者友好型 PID 调参重设计（Mission Playground 实时预览、圆形旋钮、参数图解卡、真实仿真 PID Test Bench 与 Before/After 对比、新手实验引导）。
- `feat(ui): simplify results screen and collapse flight reports` — 完成 M5.5 极简统一结算页重设计（保留三星动画、按钮紧贴星星下方、PIP 单句真实诊断反馈与默认折叠 `Detailed Flight Report`）。
- `ci(deploy): configure GitHub Actions for Pages and complete M6 deployment` — 完成 M6 部署配置（GitHub Actions 自动化测试与 Pages 部署工作流、精炼 README.md、推送到远程仓库）。

---

## 九、后续维护与展望

1. 依据 GitHub Pages 在线试玩反馈进行微调与难度持续标定。
2. 可选支持移动端虚拟双摇杆触控体验扩展。
