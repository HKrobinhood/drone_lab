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
| **M3.1** | Challenge Physics & Pre-flight Tuning | 起飞前调参界面、关卡差异化动力学（质量/载荷/推力限幅/阵风）、Heavy Cargo 重构、重试参数保留与 M4 指标接口 | **已完成（待人工试玩验收）** |
| **M4** | Scoring and Progress | 1~3 星评分算法、结果界面、localStorage 进度与最高星级存档 | 待开始 |
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

### M4 — Scoring and Progress
- [ ] 实现 `src/scoring.js`（1~3 星评价与各关卡阈值）
- [ ] 完善 Result Screen（Mission Complete/Failed、指标展示、Retry/Next/Back）
- [ ] 接入 `localStorage` 历史最高星级与进度保存

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

- **当前里程碑**：`M3.1 — Challenge Physics & Pre-flight Tuning`（已完成开发，等待用户试玩验收）
- **已完成**：每个正式关卡独立的 Pre-flight Tuning 调参流、载荷质量与固定推力限制下的真实推重比与控制饱和物理、可重复阵风模型、重构后的 L1–L6 正式挑战、失败/重试保留 PID 参数与对比，以及面向 M4 的 8 项指标采集接口。
- **当前阻塞 / 注意事项**：1~3 星评分公式、本地星级持久化与完整 Result Screen 将在 M4 实现；等待用户确认 M3.1 试玩验收后进入 M4。

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

---

## 九、下一步开发任务

等待用户试玩并验收 **M3.1** 后，启动 **M4 — Scoring and Progress**：
1. 实现 `src/scoring.js`（1~3 星评价指标与各关卡阈值）。
2. 完善 Result Screen 并持久化历史最高星级。
