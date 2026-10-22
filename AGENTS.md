# AGENTS.md — 《雀夜》VidiMahjong 开发协作与交接规范

> 文档版本：2026-10-21；基线：六角色阶段动效与音效构建包 v3。本文只定义协作边界，不改变任何运行代码。

## 0. 首先确认当前工作目录

这个归档是**源码构建器 + 叠加补丁**，并非全部麻将游戏源码。请不要把 `patch/` 误认为完整工程。

- **构建器根目录**：`build.bat`、`build-from-upstream.ps1`、`patch/`、`RELEASE_NOTES_v3.md`、本交接文档。
- **上游版本固定**：`VidiPT89/VidiMahjong`，提交 `e4207acd04887355c012ee2ab9d9456c4cbcb874`。
- **构建完成后的完整游戏目录**：`traditional.html`、`index.html`、`js/`、`css/`、`server/`、`assets/`、`README_CN.md` 等；由 `build.bat` 联网生成 `VidiMahjong-zh-customized.zip`。
- 本次新增的 `AGENTS.md`、`ARCHITECTURE.md`、`PROGRESS.md` 放在**构建器根目录**。现有构建脚本不会自动将这三份文档复制到构建产物；若交付生成后的游戏，请同时携带这些文档。

## 1. 开发原则（所有后续协作者与 AI 代理必须遵守）

1. **保持规则基线**：未经专门授权，不改 `js/traditional/engine.js`、`hand-eval.js`、`yaku.js`、`scoring.js`、`bot.js`、`local-match.js`，不改房间消息语义或计分方式。
2. **保持整场只进不退**：累计负向点数变动达到 `3000 / 8000 / 15000 / 25000` 时依次提升阶段 1–4；赢回分数不回退；新对局从阶段 0 开始。
3. **联机以服务器为准**：`server/room.js` 保存 `cumulativeLosses`、`scoreRevision`、`recentGains`；不能相信客户端上报的分数。前端渲染采用服务器已筛选的视图。
4. **原样保留可运行入口**：`build.bat` → `build-from-upstream.ps1` → 生成游戏 ZIP；Windows 联机运行 `server/npm start`，Ubuntu 用 Node.js + 静态站点服务。
5. **不要静默升级上游**：当前补丁依赖精确字符串匹配，擅自换 SHA 可能导致补丁失败或行为漂移。上游升级必须单独开任务、复核差异并回归测试。
6. **素材与代码分开**：立绘位于 `assets/characters/character-XX/stage-N.png`，配音位于对应 `voice/` 子目录；缺失素材保持占位/字幕，不能影响打牌。
7. **六名角色都是成年人**：角色 01 狼姬、02 成年小妖精、03 女仆、04 吸血鬼法师、05 成年三无法师、06 成年女 OL；素材只采用非露骨服饰／配件变化。
8. **一次只提交一个模块的变动**：麻将规则、在线房间、渲染、中文、配音与素材导入分开评审；同步更新 `PROGRESS.md` 的验收结果和待办。
9. **无依赖大型前端框架的约定**：上游是按 `<script>` 顺序运行的原生 JS；不要假设有 TypeScript、Webpack、Vite 或前端包管理流程。
10. **任何“已通过测试”结论必须附命令和环境**；静态检查不能写成“端到端已验收”。

## 2. 目录导航／从哪儿开始看

| 目标 | 构建器中的文件／构建后的目标 |
|---|---|
| 下载上游并安装补丁 | `build-from-upstream.ps1` |
| 一键构建入口 | `build.bat` |
| 中文文案、六角色、累计失分、动效触发、配音队列 | `patch/js/traditional/zh-custom.js` → `js/traditional/zh-custom.js` |
| 立绘淡化、缩放、字幕框、角色选择 UI | `patch/css/zh-custom.css` → `css/zh-custom.css` |
| 音效 | `patch/assets/sfx/*.wav` → `assets/sfx/` |
| 立绘与语音槽位 | `patch/assets/characters/` → `assets/characters/` |
| 日麻引擎与 AI | 上游 `js/traditional/{engine,bot,local-match}.js` |
| 役种与结算 | 上游 `js/traditional/{hand-eval,yaku,scoring}.js` |
| 浏览器渲染 | 上游 `js/traditional/{ui,online}.js` + `traditional.html` |
| WebSocket 路由 | 上游（构建时注入变更）`server/index.js` |
| 房间状态及累计失分 | 上游（构建时注入变更）`server/room.js` |
| 同一套引擎用于服务端 | 上游 `server/shared-engine.js` |

**提醒**：不要混淆 `js/engine.js`（消消乐）和 `js/traditional/engine.js`（立直麻将）。

## 3. 关键边界和不可破坏的契约

### 浏览器调用顺序

`traditional.html` 先加载原版 JS，再由构建器追加 `js/traditional/zh-custom.js`。该叠加脚本包装／替换以下全局函数：`applyLang`、`renderOpponents`、`renderHumanPanel`、`renderOnlineTable`、`showToast`。它依赖上游全局对象 `I18N`、`match`、`viewSeat`、`onlineRoomCode` 等，以及固定 DOM 选择器。

### 联机消息

创建/加入房间携带 `characterId`；房间座位与状态下发对应角色。状态新增：
- `cumulativeLosses: number[4]` — 服务器每席累计失分；
- `scoreRevision: number` — 点数发生变化时递增；
- `recentGains: number[4]` — 上一次被服务器识别的正向点数增量（供大胜台词）；
- `seats[].characterId` — 当前座位选角，旧版服务器可能没有此字段。

服务端不能把其他人的暗牌等私有信息广播给客户端；参见上游 `Room.buildStateFor(seatIndex)`（以实际文件为准）。

### 本地与在线状态

- 本地：`lossTrackers.local` 从 `match.engine.seats[].points` 的负差累加。
- 联机：以房间 `cumulativeLosses` 为权威；刷新/重连在房间仍存在时应不退阶段。
- 新本地对局、新联机房间应清零；单手结束或赢回分数**不能清零**。
- 阶段视觉态保存在 `displayedStages`，只负责过渡表现，不应反向改变游戏分数。

## 4. 基线检查与验收命令

在**已构建的完整游戏目录**运行：

```powershell
# Windows（先确保 Node.js 已安装）
node --check js/traditional/zh-custom.js
npm test
cd server
npm install
npm test
npm start
```

也可以使用 Python 在完整游戏目录启动静态站点：

```powershell
py -m http.server 8000
# 然后打开 http://localhost:8000/traditional.html
```

Ubuntu 可以使用 `python3 -m http.server 8000` 临时测试静态页面，并通过 `cd server && npm start` 启动联机服务。生产部署应采用 Nginx + HTTPS/WSS，8080 端口不直接暴露公网。

**本构建器目录没有** `server/`、`package.json` 和游戏入口 HTML；不能在这里执行上述完整游戏测试。`npm install` 仅在已有 `server/` 的完整游戏目录中执行。

### 必须手工检查的最短回归场景

- Windows 两个独立浏览器会话加入同一房间；检查双方角色分配及断线重连。
- 失分分别跨越四道阈值；立绘、字幕、音效只在阶段上升时触发。
- 赢回大分仍停留在最高已达阶段；大胜反馈不换回旧立绘。
- 下一场重新归零；当前联机房间断线重连不归零。
- 素材缺失时占位正常；声音静音时仍有字幕；移动端屏幕无严重遮挡。
- 一场比赛正常走到结算，检查点数总和和服务端规则校验。

## 5. 修改、提交、交接要求

- 每个开发批次记录**范围、改动文件、风险、自动测试、人工测试、未通过项、部署影响**。
- 任何改动联机协议的任务必须注明前端/服务器需要同版本部署，部署后重启 Node 服务。
- 修改 `build-from-upstream.ps1` 前必须核验每个 `Replace-RequiredText` 的原字符串；构建失败时不得输出空壳“完整包”。
- 避免手工编辑构建产物而忘记回填 `patch/` 或构建脚本；**构建器是当前改造源**。
- 若任务仅是文档交接：只创建/修改 Markdown，原 28 个构建包条目的内容及相对路径必须保持一致。

## 6. 建议阅读顺序

先看 `PROGRESS.md` 确认当前状态，再看 `ARCHITECTURE.md` 理解调用链，最后看 `patch/README_CN.md` 和 `RELEASE_NOTES_v3.md` 了解使用方法。启动任何编码任务前，先复核上游固定 SHA 和真实构建结果。

## v4 开发补充：失败 CG 不影响计分逻辑

- 新增模块 `patch/js/traditional/defeat-cg.js` / `patch/css/defeat-cg.css`，由构建脚本插入 `traditional.html`，**必须在** `zh-custom.js` 和原版 `ui.js` / `online.js` 之后加载。
- 只在整场结束通过包装 `showMatchEnd()` / `showOnlineMatchEnd(st)` 读取最终 `points`；**不改变**任何分数、匹配结果或 WebSocket 消息。
- 只信任服务器下发的在线最终分数与角色信息，禁止客户端自行选择末位并广播。末位同分固定按座位索引升序稳定排位，最后一席展示 CG。
- 失败 CG 素材 `assets/characters/character-XX/defeat.png`，缺失回退 `stage-4.png`，仍缺则显示占位。所有角色必须为成年人，且画面非露骨。
- 功能回归：本地真人/AI 第四名、联机各玩家 CG 一致、同分、无素材、刷新重连、手机端，以及最终排名按钮保持可用。
