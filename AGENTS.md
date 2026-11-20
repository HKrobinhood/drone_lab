# AGENTS.md — Drone Lab — PID Flight Challenge

本文件是 **Drone Lab — PID Flight Challenge** 项目的长期开发规则，适用于所有后续 Codex / AI 工程对话。

---

## 一、每次对话启动前必读流程

每次开启新的开发对话，**必须按顺序执行**：
1. 读取 `AGENTS.md`（本文件）与 `development.md`。
2. 运行 `git status` 检查工作区状态。
3. 运行 `git branch` 检查当前分支，并运行 `git log -n 5 --oneline` 检查最近 5 条提交。
4. 确认当前所处的里程碑阶段及未完成任务，不得跳过或擅自提前执行未授权里程碑。

---

## 二、项目目标

在纯前端静态网页技术栈下，构建一款以 **PID 无人机飞行控制** 为主题的 STEM 教育游戏 **Drone Lab — PID Flight Challenge**，最终通过 GitHub Pages 免费公开部署。

核心教学理念：玩家不直接通过键盘控制无人机位置或速度，而是通过 `WASD` 移动**参考位置（Reference Position）**，由后台真实运行的二维位置式 **PID 控制器** 根据位置误差计算控制输出并驱动二维无人机动力学模型，从而让玩家直观观察 `Kp`、`Ki`、`Kd` 对无人机飞行表现的影响。

---

## 三、技术选型与约束

### 允许使用
- HTML5 / CSS3
- Vanilla JavaScript（ES Modules）
- Canvas 2D
- JSON / `localStorage`
- Node.js 原生测试框架（`node:test` + `node:assert`）用于自动化单元测试与集成测试
- Git / GitHub Pages / GitHub Actions

### 严禁使用
- React / Vue / Angular 等前端框架
- Three.js 等 3D 引擎
- 任何后端服务器、数据库或外部 AI API
- ROS / PX4 / Gazebo

---

## 四、语言规范（严格执行）

1. **工程文档与开发指令**：`AGENTS.md`、`development.md` 以及开发对话中的计划与说明使用**中文**编写。
2. **玩家可见内容**：游戏中**所有**玩家可见的 UI 文本、HTML 页面、教学内容、操作说明、关卡名称、按钮、错误反馈、诊断建议和评分信息**必须全部使用英文**（不得在玩家界面或游戏文案中出现中文）。

---

## 五、PID 算法与物理仿真核心原则

1. **真实位置式 PID**：必须完整实现 P、I、D 三项计算，**严禁用 PD 控制器冒充 PID**。
   - `error = reference_position - actual_position`
   - `P = Kp * error`
   - `I = Ki * integral(error * dt)`（需持久化积分状态并实现 Anti-Windup）
   - `D` 项建议采用测量速度微分近似 `D = -Kd * measured_velocity` 以避免目标位置突变时的 Derivative Kick；当参考位置随 WASD 连续变化时，须在源码注释中明确说明该简化与完整误差微分的差异。
   - `control_output = P + I + D`（需控制输出限幅）
2. **控制链路不可破坏**：
   `Keyboard Input -> Reference Position Generator -> PID Controller -> Control Output -> Drone Dynamics -> Actual Position / Velocity -> Sensor Feedback -> PID Controller`
   键盘 `W/A/S/D` 绝不能直接修改无人机坐标或速度。
3. **双轴共享参数**：第一版设 `PID-X`（水平）与 `PID-Z`（垂直）两个独立控制器，对外暴露同一组共享的 `Kp`、`Ki`、`Kd` 滑块。两轴可使用不同的内部固定物理缩放系数，但必须在 `pid.js` / `physics.js` 源码中清晰注释记录。
4. **物理真实性**：
   - 采用固定仿真步长（`dt = 1 / 120` 秒），`requestAnimationFrame` 渲染与物理积分分离，防止切换标签页或高/低刷新率导致仿真时间跳跃。
   - 考虑重力 `g`、推力上下限、俯仰角 `theta` 限幅、速度、加速度、惯性、风扰与地面碰撞。
   - 参数过大/过小引起的滞后、过冲、振荡、稳态误差、积分饱和必须由真实数学模型自然产生，**严禁通过参数阈值触发假动画**。

---

## 六、工程结构规划

代码结构保持简洁、内聚，避免过度拆分：

```text
Drone_lab/
├── index.html          # 单页多视图入口（Start / Mode / Levels / Flight / Result）
├── styles/
│   └── main.css        # 全局样式、响应布局与模式视觉区分
├── src/
│   ├── main.js         # 应用入口、视图导航状态机与事件绑定
│   ├── levels.js       # 新手村 4 关与正式关卡 6 关元数据及目标配置
│   ├── storage.js      # localStorage 存档（历史最高星级、解锁状态）
│   ├── input.js        # [M1] WASD / R / P 键盘状态与失焦/暂停防卡键处理
│   ├── pid.js          # [M1] 独立可测的 PID 控制器模块（脱离 Canvas）
│   ├── physics.js      # [M1] 2D 无人机动力学模型（脱离 Canvas）
│   ├── simulation.js   # [M1] 固定步长仿真循环与参考位置生成器
│   ├── renderer.js     # [M1] Canvas 2D 侧视角渲染（无人机、地面、轨迹、目标区）
│   ├── scenes.js       # [M2/M3] 新手村教学实验与正式关卡场景元素/碰撞/圆环检测
│   ├── scoring.js      # [M4] 1~3 星评分指标计算（时间、过冲、稳定时间、平滑度）
│   └── feedback.js     # [M5] 飞行遥测记录、PID 诊断与英文调参建议
├── tests/
│   └── m0.test.mjs     # 各里程碑自动化测试脚本
├── AGENTS.md           # 本开发规则文件
├── development.md      # 里程碑计划、Checklist 与进度记录
└── README.md           # 项目说明与本地/线上运行指南
```

---

## 七、代码与测试规范

1. **逻辑与渲染解耦**：`pid.js`、`physics.js`、`simulation.js`、`scoring.js`、`feedback.js`、`levels.js`、`storage.js` 必须可在 Node.js 环境下脱离 DOM/Canvas 独立运行自动化测试。
2. **代码质量**：
   - 不重复编写相似逻辑，合理提取公共辅助函数。
   - 保留与当前修改无关的既有注释与文档字符串。
   - 对所有状态更新做好边界保护，严禁出现 `NaN`、`Infinity` 或按键卡死。
3. **测试规范**：
   - 每次创建 Git Commit 前必须运行全量自动化测试（如 `node --test tests/*.test.mjs`），确保全部通过后方可提交。
   - 未经实际验证的功能，不得在 `development.md` 中勾选完成。

---

## 八、Git 与里程碑验收规范

1. **不覆盖工作区**：提交前检查 `git status`，不得覆盖已有未提交修改。
2. **一里程碑一提交**：每个里程碑完成后更新 `development.md` 并创建一个独立的语义化 Commit（包含代码、测试与文档）。
3. **禁止危险 Git 操作**：禁止擅自使用 `git reset --hard` 或 `git push --force`。
4. **禁止自动推送**：未经用户明确授权，不得自动 `git push` 到 GitHub。
5. **停止并等待验收**：
   - 每次完成当前里程碑后必须停止推进，等待用户指令。
   - **M1（PID Physics and Flight Feel）** 完成后必须提供试玩指南并等待用户**人工试玩验收通过**，未获明确通过前严禁进入 M2。
