# ARCHITECTURE.md — 《雀夜》当前架构与耦合审查

> v6 补充（2026-10-22）：以下 v3 目录描述属于历史记录。当前同时保留完整运行工程和规范补丁源；最新功能与验收见 PROGRESS.md / RELEASE_NOTES_v6.md。

> v7：最新说明见 RELEASE_NOTES_v7.md。前后端安装共用 riichi-rules / settlement 扩展；match-pause 适配实例暂停机器人和输入，server/stage-presentation 按权威失分安排带剩余时间的停顿，riichi-actions 校验宣言和摸切。score-show 先播放点数动画，再等待 stage-show 队列结束后打开原结算面板；缺配音时仅保留字幕，不调用系统朗读。dora-highlight 调用原引擎映射；dev-hand-fixtures 仅在本地测试按钮调用时注入手牌，由真实引擎完成结算。

新增同步加载链为：原版 ui/online → assets/characters/roster.js → characters.js → zh-custom → defeat-cg → table-ui → yaku-catalog → table-extras → dev-tools → ui-sfx → bgm。角色表通过 UMD 同时提供给浏览器和 Node 服务器；服务器只验证 ID 是否在名单内，不信任客户端点数。table-extras 读取已有公开桌面视图后发送浏览器内部事件 queye:table-state，供音乐和本地测试工具判断状态；该事件不进入 WebSocket 协议。新增角色流程见 CHARACTER_GUIDE.md。

> 2026-10-21 交接记录。实际检查对象：上传的 v3 构建包（28 个文件）；原版目录及源码入口：核对 GitHub 上游固定提交 `e4207acd04887355c012ee2ab9d9456c4cbcb874`。**没有在本环境完成联网构建，因此生成游戏目录属于构建规则确认，而非本地生成后的逐文件验收。**

## 1. 工程形态

《雀夜》= **VidiMahjong 原生浏览器游戏** + **中文／六角色呈现补丁** + **服务端联机扩展**。

- 无前端构建框架；HTML 依序引入 JS，全局变量交叉引用。
- 原版提供消消乐 (`index.html`) 和四人立直麻将 (`traditional.html`) 两种模式；当前补丁主要针对四人立直页面。
- 浏览器：日麻逻辑、渲染、角色图、字幕和音效。
- Node.js：`ws` WebSocket 服务；服务器仍运行上游同一套规则代码，通过 Node `vm` 加载共享引擎。
- 数据：浏览器 `localStorage` + Node 内存房间，无数据库；服务器重启将失去现存房间。

## 2. 上传的 v3 ZIP：真实物理结构

```text
[构建器根目录]
├── build.bat                         Windows 一键启动器
├── build-from-upstream.ps1           固定 SHA 下载、覆盖补丁、精确字符串修改、打包
├── RELEASE_NOTES_v3.md               原有版本说明
├── AGENTS.md                         本次新增：协作规则
├── ARCHITECTURE.md                   本次新增：架构与耦合
├── PROGRESS.md                       本次新增：进度与任务分批
└── patch/
    ├── README_CN.md                  安装与运行说明
    ├── start-local.bat                构建后打开 traditional.html
    ├── start-online-server.bat        构建后 npm install / npm start
    ├── css/zh-custom.css             立绘动效与角色选择界面样式
    ├── js/traditional/zh-custom.js    中文 + 角色 + 失分 + 声音逻辑
    └── assets/
        ├── sfx/
        │   ├── README.md
        │   ├── stage-1.wav
        │   ├── stage-2.wav
        │   ├── stage-3.wav
        │   ├── stage-4.wav
        │   └── win.wav
        └── characters/
            ├── README.md
            ├── 角色配音文案.md
            └── character-01 ... character-06/
                ├── README.md
                └── voice/README.md
```

**关键事实**：归档中没有 `traditional.html`、`js/traditional/engine.js`、`server/index.js`、`server/room.js`、`package.json` 等**原游戏文件**；它们在 Windows 执行 `build.bat` 后才从固定上游下载并进入最终 `VidiMahjong-zh-customized.zip`。当前三份新文档保留在构建器根目录，不被原有 PowerShell 脚本自动复制到生成的游戏 ZIP（为了遵守“只写文档”，没有修改该脚本）。

## 3. 构建完成后的预期目录（上游真实树 + 补丁）

```text
[生成的完整游戏根目录]
├── index.html                       原版消消乐入口（基本未改造）
├── traditional.html                 日麻页面：构建时增加 zh CSS/JS 引用
├── css/
│   ├── style.css                    原版样式
│   ├── traditional.css              原版四人桌样式
│   └── zh-custom.css                [雀夜补丁]
├── js/
│   ├── i18n.js                      上游 PT/EN 语言表
│   ├── tiles-data.js                原版共用牌面数据
│   ├── layout.js, engine.js, ui.js   原版消消乐
│   ├── sound.js, leaderboard.js     原版消消乐附属模块
│   └── traditional/
│       ├── tiles.js                  立直牌山定义
│       ├── hand-eval.js              和牌牌型分解
│       ├── yaku.js                   役种、符等评估
│       ├── scoring.js                点数与支付
│       ├── engine.js                 单手回合与合法动作校验
│       ├── bot.js                    AI 的弃牌、副露等策略
│       ├── local-match.js            整场东风战管理、AI 推进
│       ├── ui.js                     本地模式牌桌 UI
│       ├── online.js                 联机客户端协议、牌桌 UI [握手追加 characterId]
│       └── zh-custom.js              [雀夜补丁]
├── server/
│   ├── index.js                     WebSocket 入口 [握手传 characterId]
│   ├── room.js                      房间、视图筛选 [角色/失分字段]
│   ├── shared-engine.js             vm 加载同一套浏览器麻将代码
│   ├── package.json                 npm start / npm test, ws 依赖
│   └── test/e2e.test.js             原版真实 WebSocket 集成测试
├── tests/                            原版前端引擎等 node --test 用例
├── assets/
│   ├── characters/                    [雀夜补丁] 六角色目录与素材槽位
│   └── sfx/                           [雀夜补丁] 5 个可播放 WAV
├── README.md, LICENSE, package.json   上游文件
├── README_CN.md                       [雀夜补丁]
├── start-local.bat                    [雀夜补丁]
└── start-online-server.bat           [雀夜补丁]
```

上游树来自 `https://github.com/VidiPT89/VidiMahjong/tree/e4207acd04887355c012ee2ab9d9456c4cbcb874`。**不要误读为当前 ZIP 内文件清单**。

## 4. 运行与依赖关系

```text
[浏览器 traditional.html]
  ├─ 上游 js/i18n.js + tiles-data.js + js/traditional/*.js（按顺序加载）
  ├─ 本地模式：ui.js → LocalMatch → RiichiEngine
  │                          ↘ bot.js → 抽牌/副露/出牌事件 → 重新渲染
  ├─ 联机模式：online.js ↔ WebSocket ↔ server/index.js
  │                                              │
  │                                         server/room.js
  │                                              │
  │                                     server/shared-engine.js (Node vm)
  │                                              │
  │                                        LocalMatch + RiichiEngine
  └─ 追加 zh-custom.js
        ├─ I18N.zh / 中英切换、UI 文案
        ├─ 六角色选择 → localStorage / 在线 create·join characterId
        ├─ 累计失分 → 阶段 0~4（只进不退）
        ├─ 渲染函数包装 → 每席角色部件 → 双层 PNG 淡化
        ├─ 阶段／大胜字幕与语音队列 → MP3，失败转 OGG
        └─ assets/sfx/*.wav → 短促提示音
```

### 4.1 麻将规则与 AI（原版）

`js/traditional/tiles.js` 定义立直牌；`hand-eval.js` 判定和牌型，`yaku.js` 判定役种及符，`scoring.js` 计算点数。`engine.js` 负责一个手牌局的抽牌、舍牌、吃碰杠、立直、和牌及合法性校验；`local-match.js` 串联整场比赛、点数和 AI 回合；`bot.js` 提供启发式策略。原版说明为一圈东风战，少量罕见规则简化。`server/shared-engine.js` 通过 `vm` 复用这些浏览器代码，而不是在服务器另写一套规则。

### 4.2 联机通信

- `js/traditional/online.js`：`onlineConnect`、`onlineSend`、`handleServerMessage`、`renderLobbySeats`、`renderOnlineTable`。
- `server/index.js`：监听 `PORT`（默认 8080），处理 `create` / `join` / `start` 等 WebSocket 消息，映射 `Room`。
- `server/room.js`：保存四个座位及匹配引擎，接收合法动作，按座位生成经过裁剪的视图，广播状态。
- `server/shared-engine.js`：按约定顺序加载源代码，使客户端与服务器验证逻辑一致。
- v3 构建脚本会在**生成的源码**中加入 `characterId` 的 `create`/`join` 传输；在 `Room` 添加 `characterId`，并于分数变化时更新和广播累计失分、增益与修订号。**当前 builder ZIP 本身不存在已打补丁的服务器源码。**

WebSocket 主要消息类别：`create`、`join`、`start`、`discard`、`react`、`riichi`、`tsumo`、`ankan`、`nextHand`；服务端回 `joined`、`lobby`、`state`、`awaitReaction`、`error`。客户端动作仍需服务端校验。

### 4.3 角色系统与只升不退规则（雀夜）

- 角色 ID：`character-01`~`character-06`，每名角色预留 `stage-0.png`~`stage-4.png`。
- 阈值：`0 / 3000 / 8000 / 15000 / 25000`（累计本场负向点数）。阶段 0–4。
- 本地分数源：`match.engine.seats[].points` 每次可见分数变化的负增量累积。
- 联机分数源：`server/room.js` 的 `cumulativeLosses`；前端用 `scoreRevision`／`recentGains` 避免重复提示。
- 赢分不会退阶段；单次正向变动至少 8,000 点可触发“大胜”字幕/音效，但不重置。
- 新本地比赛 / 新联机房间从阶段 0 开始；服务端房间仍在时断线重连保留状态。
- `displayedStages` 只记录前端已展示阶段；`injectWidget()` 创建人物图文组件，`animatePortrait()` 通过叠加 PNG 过渡。样式为 `zh-custom.css`。

### 4.4 中文化、图片与声音

- `I18N.zh` 在 `zh-custom.js` 中创建，现有中文词条以原版 `I18N.en` 为回退；覆盖 `applyLang` 并将语言切换变为 中文/EN；这**不是整站完整汉化**，部分结算役名可能仍来自上游。
- 人物声音文案直接定义于 `STAGE_VOICE_LINES`（每人 4 条）与 `WIN_VOICE_LINES`（每人 1 条），还有单独 `assets/characters/角色配音文案.md`。
- 配音文件约定：`assets/characters/character-XX/voice/stage-{1..4}.mp3` / `.ogg`，`win.mp3` / `.ogg` 可选；当前实际无语音文件。
- 过渡音效实际存在：`assets/sfx/stage-{1..4}.wav`、`win.wav`；`playStageSfx` 控制；`flushCharacterVoiceQueue` 控制台词与音频队列。
- 静音：`localStorage['vidimahjong-character-voice']`，会同时关闭角色配音与 WAV，字幕仍显示。
- 动效提供 `prefers-reduced-motion` 降低动态效果；没有立绘时降级为占位状态。

## 5. 已发现的耦合点（仅审查，**没有重构**）

| 风险级别 | 位置 | 事实与后果 | 将来可做的独立任务 |
|---|---|---|---|
| **高** | `patch/js/traditional/zh-custom.js`（约 31.9KB） | 同一 IIFE 集中了中文、角色选择、浏览器状态、分数追踪、立绘渲染、语音队列与音效；一个修改容易波及其他模块 | 先增加回归测试，再分离角色数据/展示/音频（需单独获准改代码） |
| **高** | `build-from-upstream.ps1` | 多处 `Replace-RequiredText` 精确匹配上游代码；上游一行变化即可构建失败，且补丁分散在 PowerShell 片段中 | 引入补丁兼容性检查、构建日志和可重放测试 |
| **高** | `zh-custom.js` 对原版全局函数的包装 | 直接包装 `applyLang`、`renderOpponents`、`renderHumanPanel`、`renderOnlineTable`、`showToast`；依赖脚本顺序、全局名与被包装函数的原始行为 | 引入渲染事件/明确扩展点，逐步消除全局猴子补丁 |
| **中高** | `injectWidget` 与原版 UI DOM | 依赖 `.human-panel`、`#opponents-row .opponent-panel`、`#btn-start-match` 等选择器；原版重新构建座位 DOM 会令附加角色部件重建与过渡中断 | 为角色层建立稳定挂载点或 UI 渲染契约 |
| **中高** | 前端 `online.js` ↔ `server/index.js/room.js` | 角色和累计失分字段是双端约定；只更新前端或服务器会导致兼容性问题／失去权威状态 | 建立版本握手与混合版本回归用例 |
| **中** | 本地失分 vs 服务端失分 | 本地通过渲染时机观察分数负增量，联机通过 `Room.onMatchEvent` 保存分数快照；两条计算路径可产生边界差异，尚未端到端核对 | 定义共享事件/测试样例，核验双路径一致性 |
| **中** | `displayedStages`、队列、异步图片加载 | UI 重绘、连续多阶段晋级、音频缺失等边界涉及跨异步状态；目前没有实际浏览器端回归报告 | 编写可自动重复执行的阶段/渲染/音频测试 |
| **中** | 上游共享 `vm` 加载链 | 引擎代码依赖全局绑定及固定载入顺序；拆文件/模块化不能仅改浏览器侧 | 修改前必须同时验证 Node `shared-engine.js` |
| **低** | 音频与角色素材约定 | 文件名硬编码到运行时代码，素材不齐会发送缺失资源请求；当下设计允许正常降级 | 资源预检与素材清单验证，非必需 |

上述为**结构风险识别**，不等同于已有功能故障的断言。未发现需要本次立即修改源码的证据；本交接保持现状。

## 6. 配置、存储、部署与运行边界

| 配置/状态 | 位置或键 | 说明 |
|---|---|---|
| 默认服务端端口 | `server/index.js` / `process.env.PORT` | 默认 8080 |
| 玩家标识 | `localStorage['vidimahjong-player-id']` | 同一浏览器资料空间的标签可能共享身份，联机测试请用不同浏览器会话 |
| 服务器 URL | `localStorage['vidimahjong-server-url']` | 跨设备需真实地址；HTTPS 网页需 WSS |
| 当前语言 | `localStorage['vidimahjong-lang']` | v3 默认 zh，可切 EN |
| 角色选择 | `localStorage['vidimahjong-character-id']` | 默认 character-01 |
| 音频开关 | `localStorage['vidimahjong-character-voice']` | 关闭也保留字幕 |
| 房间状态 | 服务器内存 `rooms` | 非持久化；进程重启/房间回收会丢失 |

Windows：先 `build.bat`，再解压产物、启动本地静态文件或联机服务；Ubuntu：上传**构建产物**，Nginx 服务静态文件，Node.js 服务 `server/index.js`，Nginx 代理 WSS。服务器的代码更新后应重启进程。具体命令参见 `patch/README_CN.md`。

## 7. 测试体系及目前证据边界

原版包含 `package.json` 的 `npm test`（Node 内建测试），以及 `server/test/e2e.test.js` 的联机集成测试；这些目录**不在构建器 ZIP 中**，需要下载上游构建成功后才可以运行。当前环境能够检查本 ZIP 的 JS 语法、WAV 有效性、归档完整性与哈希一致性；未在本次交接实际构建完整原版，也未运行真实浏览器/多人 WebSocket 的端到端测试。

## 8. 溯源

- 上游仓库：`https://github.com/VidiPT89/VidiMahjong`
- 固定上游：`e4207acd04887355c012ee2ab9d9456c4cbcb874`
- 本交接依据：实际 v3 ZIP 中的 `build-from-upstream.ps1`、`patch/js/traditional/zh-custom.js`、`patch/css/zh-custom.css`、`patch/assets/`；并核对上游提交的 Git tree、README、关键前端与联机源码。
- 相关现有说明：`RELEASE_NOTES_v3.md`、`patch/README_CN.md`。

## v4 架构增补：整场末位失败 CG

- **新增浏览器模块**：`patch/js/traditional/defeat-cg.js` → 构建产物 `js/traditional/defeat-cg.js`；独立 CSS `patch/css/defeat-cg.css` → `css/defeat-cg.css`。
- **调用链（本地）**：原版 `LocalMatch` 发出 `match-end` → 原版 `onMatchEvent` → `showMatchEnd()`（已渲染最终排名）→ v4 包装函数 `showDefeatCG(match.points)` → 第四名角色图片。
- **调用链（联机）**：服务器 `Room.broadcastState()` 向每席发送含 `matchOver` 与相同最终 `points` 的 `state` → 原版 `handleServerMessage` 调用 `showOnlineMatchEnd(st)` → v4 包装函数 `showDefeatCG(st.points, st)`。无新增 WebSocket 消息。
- **角色定位**：优先查找 v3 已渲染的 `.character-widget[data-character-seat]` 及其 `data-character-id`；后备读取 `state.seats[seat].characterId`；仍缺则按东南西北默认映射。属于对 v3 DOM 结构的轻度耦合，需要独立回归。
- **资源契约**：优先 `assets/characters/character-XX/defeat.png`；缺失回退 `stage-4.png`；最终缺失显示占位。推荐 16:9，原有结算按钮不被替代。
- **排序**：最终分数倒序，同分按座位索引升序，展示排序后的最后席。此排序仅用于 CG，原版最终排名的排序不被修改。
- **已知边界**：当前仍是补丁构建包；不包含完整上游源码和六张实际失败 CG 图。联机依赖 v3 已正确同步角色选择及服务器最终点数。

## v5 实际工程与展示层

本机现在包含完整运行目录和叠加补丁，不再只是构建器。`table-ui.js` 在 `zh-custom.js`、`defeat-cg.js` 后加载，移动现有 DOM 节点以保留 ID 和事件绑定，并包装 `renderAll` / `renderOnlineTable` 读取已有公开视图。中央局况、四家排名和大立绘都来自本地已有状态或服务端已筛选视图，不发新的消息。

大立绘通过现有 `.character-widget` 的 `data-character-id`、`data-character-stage` 读取资源。可点击的头像只改变查看对象；缩放偏好键为 `queye-portrait-size`，不影响角色分配、阶段或计分。角色选择改为单张初始图的 CSS 头像裁切。

## v7.2 配音事件扩展

新增末尾加载 voice-catalog.js → voice-events.js → voice-runtime.js。共享事件规划器仅消费已确认事件和公开结算；服务端 voice-events 扩展保存有界序列，在 buildStateFor 中过滤私有跳过反馈。前端按房间 session、sequence 及 hand 去重，共享单个角色音频通道，阶段演出抢占并阻止普通语音。stagePresentation.changes 逐个包含中间阶段，120 秒有界暂停适配器覆盖最长队列。详细契约及验证见 RELEASE_NOTES_v7.2.md。

## v7.3 随机身份

characters → random-character → zh-custom：共享角色会话维护已出现集合，首次累计失分达 3000 才揭晓特殊 character-random 身份。服务端 random-character 最后安装，包装 start／trackCumulativeLosses／buildStateFor／addPlayer，不改计分；按全部公开分配排除候选，并在首段变化附带旧剪影、专用字幕与静音标记。重连恢复服务端形态。stage-show 只在链的第一段使用旧身份，之后连续展示同一女性。


## v8 增量调用链

- 原渲染／立直模块 → `table-focus.js` 将原 `human-actions` 移至独立操作区，读取公开牌桌状态。`stage-show.js` 派发表现事件供提示刷新，不参与规则。
- `reconnect-client.js` 独立管理连接、心跳、退避与会话，`online-resume.js` 适配现有 onlineConnect／onlineSend；收到权威 state 后再解锁并恢复本人 reactionPrompt，旧连接回调按代次失效，行动从不排队重发。
- `server/reconnect-view.js` 包装 buildStateFor，依据引擎当前反应与 LocalMatch 待处理席位，仅为接收者附上可恢复选项；断线广播仍不含暗牌。server/index.js 处理 ping/pong。前后端须同版本并重启服务。
- 本机素材工具：`start-asset-manager.bat` → `tools/asset-manager-server.cjs`（127.0.0.1）→ `asset-store.cjs`。接口固定槽位、同源令牌、串行保存、旧哈希冲突检查；先备份、临时写入后重命名，失败回滚。游戏目录是导入与同步的现用来源，运行 assets 与 canonical patch/assets 始终一起保存。工具本身的 canonical 源位于 patch/tools，不属于联机服务器。
- 本机双目录配置与备份不进入 Git。构建器携带管理页、启动器和两个原生 Node 工具，不引入前端框架或额外服务依赖。六个受保护文件及上游 SHA 保持不变。
