# PROGRESS.md — 《雀夜》开发状态与后续任务分批

> 更新日期：2026-10-21；交接基线：`QueYe-VidiMahjong-6roles-stage-effects-builder-v3.zip`。本次**只新增文档，不修改运行代码／功能**。

## 1. 当前可交付物与验证口径

**当前交接交付：** v3 **一键构建包**的全部原有文件 + `AGENTS.md`、`ARCHITECTURE.md`、`PROGRESS.md`。它不是已经编译或打包出的完整游戏源码；Windows 双击 `build.bat` 可尝试下载固定版本上游并生成 `VidiMahjong-zh-customized.zip`，需要 GitHub 网络连接。

| 项目 | 状态 | 证据/范围 |
|---|---|---|
| 上传包真实文件结构整理 | ✅ 本次已完成 | 原包 **28** 个条目，根目录 `build.bat`、`build-from-upstream.ps1` 与 `patch/` |
| 文档交接三件套 | ✅ 本次已完成 | 当前根目录三份 Markdown |
| 原有游戏文件不变 | ✅ 本次校验 | 新包中的原 28 个条目与原 v3 包逐项 SHA-256 一致 |
| 静态 JS 语法检查 | ✅ 本次通过 | `node --check patch/js/traditional/zh-custom.js` |
| WAV 文件结构检查 | ✅ 本次通过 | 5 个 WAV 可解析；未做真实扬声器/浏览器音量验收 |
| 检查固定上游源码结构 | ✅ 本次核对 | GitHub 上游提交的 Git tree、README 与关键模块文本 |
| Windows `build.bat` 实际完成 | ⏳ 未在本环境执行 | 此处不具 Windows/PowerShell/GitHub 直连的完整构建条件 |
| 原版 `npm test` / `server/npm test` | ⏳ 未在本次执行 | 测试文件位于构建后上游源码，不包含在此构建器中 |
| 浏览器单机打完一整场 | ⏳ 未实测 | 需要真实构建产物和浏览器运行 |
| 两人及四人真实 WebSocket 联机 | ⏳ 未实测 | 需要完整 Node 服务、不同浏览器身份及网络 |
| Ubuntu 完整部署/HTTPS/WSS | ⏳ 未实测 | 需要实际服务器环境和域名 |

> v3 之前的 `RELEASE_NOTES_v3.md` 记载了模拟测试和逻辑测试通过；这是原版本说明，并非本次重新执行的验证结果。

## 2. 已在代码中具备的功能（不等于本次真实运行验收）

- [x] 原版四人立直麻将及本地 AI/联机的源码集成入口。
- [x] 四人牌桌角色系统；`character-01` 至 `character-06`，角色数据可供本地与联机共享。
- [x] 简体中文词条叠加和中文/英语切换（**并非全量汉化**）。
- [x] 每名角色五个立绘资源槽位，缺图片显示占位。
- [x] 累计失分四级阈值：`3,000 / 8,000 / 15,000 / 25,000` 点。
- [x] 阶段只进不退；赢分不倒退；新对局清零。
- [x] 角色立绘的双层淡入淡出、轻微缩放/高光效果。
- [x] `stage-1..4.wav` 和 `win.wav` 五段短音效。
- [x] 六角色逐阶段台词（24 条）及大胜台词（6 条）、字幕和可选 MP3/OGG 播放代码。
- [x] 声音开关同时控制人声/SFX，字幕保留。
- [x] 单次正向分数变动达到 8,000 点时触发大胜反馈。
- [x] v3 构建脚本为在线房间增加选角信息和权威累计失分广播。

**缺失素材**：实际 `stage-*.png` 立绘 30 张均未随包提供；角色人声 `stage-*.mp3/ogg` 24 条、大胜语音 6 条均未提供。不要把“已写台词/播放逻辑”当成“已经录制配音”。

## 3. 已识别风险（本次只登记，不修复）

| ID | 优先级 | 风险/欠债 | 关联文件 | 建议验证 |
|---|---|---|---|---|
| R-01 | P0 | 上游精确字符串补丁易在升级时失败 | `build-from-upstream.ps1` | 同一 SHA 可重复构建，所有替换点命中 |
| R-02 | P1 | 中文化、角色、分数、音效在一个 31.9KB IIFE 中，耦合度高 | `patch/js/traditional/zh-custom.js` | 逐功能回归、隔离性测试 |
| R-03 | P1 | UI 借全局函数包装与 DOM 选择器接入原版，依赖加载顺序 | `zh-custom.js`、原版 `ui.js`/`online.js` | 原版渲染变更与连续对局测试 |
| R-04 | P1 | v3 联机字段需前后端同版本部署 | 构建脚本、`server/{index,room}.js` | 旧新混合版本、断线重连验证 |
| R-05 | P1 | 本地/服务端两条失分观察路径及画面重绘时机可能有差异 | `zh-custom.js`、`server/room.js` | 跨阈值、多家同时变分、结算时测试 |
| R-06 | P2 | 图像异步加载、音频队列和资源缺失需要完整浏览器验证 | `zh-custom.js`、`zh-custom.css`、`assets/` | 快速连跳、切屏、关闭声音、重连 |
| R-07 | P2 | 服务器内存保存房间，重启无恢复 | 原版 `server/index.js`、`server/room.js` | 服务重启恢复范围说明 |
| R-08 | P2 | 中文词条未覆盖全部上游动态役种名 | `zh-custom.js`、上游 i18n/结算 UI | 完整结算截图审查 |

**P0/P1 是后续排期优先级，不表示本次已发现可复现的运行故障。**

## 4. 建议的分批开发计划

每批以能独立验收为目标；**这些都是下一阶段候选任务，本次没有实施。** 推荐严格遵循以下顺序。

### 批次 A — 锁定基线并完成可复现构建（优先）

- 范围：Windows 运行 `build.bat`，记录上游提交、输出 ZIP SHA-256、Node/npm 版本与脚本日志；生成包含真实 `traditional.html` 与 `server/` 的完整产物。
- 测试：`npm test`（上游根）、`cd server && npm install && npm test`、`node --check js/traditional/zh-custom.js`。
- 验收：两次从空目录构建得到完整游戏结构；原有单机麻将和联机集成测试无回退。
- 交付：可复用的构建报告、版本锁及实际生成的完整游戏 ZIP。
- 前置条件：Windows 可访问 GitHub 固定版本源代码。

### 批次 B — 角色阶段／结算逻辑回归测试

- 范围：增加自动化或重复性手工测试，不先重构模块。
- 案例：3k/8k/15k/25k 刚好跨越；一次跨多级；输后再赢；大胜；同一手多人同时失分；新场次重置；联机重连；多浏览器会话。
- 验收：本地、联机四席阶段结果一致；无退级、无意外重置或重复播报；服务器分数仍具权威性。
- 交付：测试脚本与通过记录；可定位的失败用例。

### 批次 C — 人物素材制作与资源验收

- 范围：6 × 5 = 30 张 PNG；6 × (4 阶段 + 1 大胜) = 最多 30 段人声 MP3/OGG；检查时长、音量、文件名、透明边缘和移动端视野。
- 验收：每人全阶段无遮挡且不突兀；缺资源自动降级；音效与角色语音不互相抢占；成年形象和非露骨表现一致。
- 交付：按约定文件名导入素材，附来源和授权说明。

### 批次 D — 中文 UI 与可用性完善

- 范围：结算役名与错误提示覆盖、角色选择试听、响应式布局、音频开启提示、减少动态效果审查。
- 验收：常见完整对局不出现未翻译的显眼动态词条，手机和桌面均可操作；静音、键盘和无动画偏好可用。
- 交付：中英回归截图/测试表。**这批属于未来功能修改，本次没有动。**

### 批次 E — 联机健壮性与部署

- 范围：断线重连、玩家身份、协议信息、多人同时行动、房间清理、服务端错误处理；Windows 测试 Ubuntu 发布、Nginx WSS、systemd 自启。
- 验收：2 人 + AI、4 真人跑通一整场；服务端只发送许可的私有状态；HTTPS/WSS 正常；明确服务重启会清房的现有限制。
- 交付：部署/回滚手册、版本兼容声明、人工验收录像或截图。

### 批次 F — 在测试保护下的逐步解耦（最后）

- 范围：先定角色状态接口和音频队列事件，再分离 `zh-custom.js` 的职责；将字符串替换改成可验证补丁或明确扩展点。**必须单独批准后才能修改代码。**
- 验收：A–E 全部回归保持绿色；原版麻将玩法与 v3 六角色体验不变；上游固定版本不被静默升级。
- 交付：小步提交、耦合度变化说明及迁移方案。

## 5. Windows / Ubuntu 推荐测试矩阵

| 场景 | Windows 本地浏览器 | Ubuntu 服务端 + Windows 浏览器 | 当前交接结果 |
|---|---|---|---|
| 原版单机 AI 全场结算 | 需要 | 不适用 | 未执行 |
| 中文菜单、角色选择 | 需要 | 需要 | 未执行 |
| 阶段晋升、赢分不退 | 需要 | 需要 | 仅检查源码存在 |
| GIF/PNG 实际过渡和 5 WAV 播放 | 需要 | 需要 | 已检查 WAV 格式，未实播 |
| 无人声素材时字幕降级 | 需要 | 需要 | 仅检查代码逻辑 |
| 两浏览器同房间、掉线重连 | 需要 | 需要 | 未执行 |
| 四真人在线完成整场 | 可选 | 需要 | 未执行 |
| WSS、HTTPS、重启/回滚 | 不适用 | 需要 | 未执行 |

## 6. 本次交接的变更边界

**新增**：`AGENTS.md`、`ARCHITECTURE.md`、`PROGRESS.md`。

**没有修改**：`build.bat`、`build-from-upstream.ps1`、`patch/` 下的任何 JS/CSS/音频/README、原有 `RELEASE_NOTES_v3.md`，以及任何麻将引擎文件（后者原本也不在上传包内）。

**没有完成**：下载上游并运行 `build.bat`、改造或修复游戏代码、录制人声/绘制立绘、真实 Windows/Ubuntu 端到端对局。

## 7. 下一个执行人的开始步骤

1. 阅读 `AGENTS.md` 与 `ARCHITECTURE.md`，确认当前输入是构建器，不是运行产物。
2. 在能访问 GitHub 的 Windows 机器上执行 `build.bat`，拿到真正的 `VidiMahjong-zh-customized.zip`。
3. 解压，在构建产物根目录运行 Node 单元与 WebSocket 测试，并手工完成一场对局。
4. 对照批次 A 验收清单记录结果；任何失败附错误日志和最小复现，不要越过测试直接重构。
5. 后续每完成一个批次，更新 `PROGRESS.md` 的实际测试证据和结论。

## v4 追加记录（2026-10-21）

**本段覆盖旧版“本次仅修改文档”的历史范围表述**：此前 v3 交接只整理文档；本轮 v4 已获用户授权，增加游戏结算 CG 功能。原有段落作为 v3 历史记录保留。

- [x] 新增整场结算末位 CG 面板（本地与在线）；真人/AI 均支持。
- [x] 末位按最终分数确定；同分时采用固定座位顺序选定单一展示者。
- [x] 在线端使用权威最终状态，不新增服务器协议；每个在线玩家显示同一末位角色。
- [x] 新增独立 JS/CSS 与构建复制、HTML 加载逻辑。
- [x] 6 个 `defeat.png` 资源槽位说明；未提供实际绘制图片，缺失时自动回退。
- [ ] Windows 实际运行 `build.bat` 并完成本地及两台设备在线整场验收。
- [ ] 补齐 6 张成年角色非露骨失败 CG，并确认素材授权。
- [ ] Ubuntu 更新静态文件后进行多浏览器同步验收。

**回归重点**：整个牌局结束才触发；同分、AI 末位、图片 404、中文/英文切换和移动端结算按钮；断线重连后相同分数应确定相同末位。

## v5 追加记录（2026-10-21，当前状态）

前文「仅有构建器」「缺少全部立绘」是历史记录。当前工作区已从 `G:\QueYe` 复制完整游戏，安装服务器依赖，并接入该目录现有素材。

### 展示批次

- [x] 新增独立 `table-ui.js` / `table-ui.css`，本地和联机共用四家围桌布局、中央局况和点数榜。
- [x] 用户确认的新名字同步选人、牌桌、字幕前缀、点数榜和结算 CG。
- [x] 选人仅显示初始头像；牌桌大立绘默认展示自己，点击座位头像切换，支持缩小／放大。
- [x] `patch/` 和运行文件同步；构建脚本加载新增展示模块，上游 SHA 不变。
- [x] 17 项现有 Node 测试通过；改名后 CG 4 项再次通过。环境与证据见 `RELEASE_NOTES_v5.md`。
- [x] 桌面本地出牌、键盘操作、帮助和立绘控制实测；手机真实服务器开局与出牌实测。
- [ ] 四真人完整比赛、阶段跨阈值整场、重连、Ubuntu 部署尚待验收，不标为完成。

### 素材批次

- [x] 读取 G 盘原素材，同步 6×5 阶段 PNG，已有结算图为 01、02、06；未重新生成或修改图片。
- [ ] 03、04、05 独立结算图缺失，继续使用已有 stage-4 回退。
- [ ] WAV 语音包尚未导入；保持后续独立批次，避免把已找到文件误报成已接入事件。

### 范围与风险

只改展示、角色名、选人和素材同步，未修改麻将规则引擎、AI、计分、服务器房间代码与消息协议。风险主要为小屏长牌河、大图加载、旧浏览器全屏支持；未以单局或模拟测试冒充多人整场验收。当前没有 Git 仓库，发布时附文件哈希清单及覆盖前备份。

## v5.1 追加记录

- [x] 展示批次：吃碰提示改中文牌名和组合牌面，保留原按钮事件；手牌可访问名称与暗杠名称同步处理。
- [x] 展示批次：立绘大图查看、再次点击返回、关闭按钮和 Esc，桌上头像与侧边立绘均可进入。
- [x] 音乐独立批次：新增 `bgm.js`，固定 `assets/bgm/table.mp3`，循环与独立开关；构建脚本同步模块和素材目录。
- [x] JavaScript 语法、构建脚本解析、两种真实提示构造函数的动作载荷、实际开局的大图交互检查通过。详细环境、步骤和局限见 `RELEASE_NOTES_v5.1.md`。
- [ ] 尚无 BGM 文件，用户自行放入；没有宣称实际播放听感已验收。

## v6 追加记录（2026-10-22）

- [x] 延续 v5.1，不重复导入已有立绘、重做原有全屏查看或吃碰提示。
- [x] 渲染模块：格斗式选人、末尾随机、34 张矢量牌面、四家牌河、30 项实际支持役种说明。
- [x] 角色模块：独立 roster 配置与浏览器／服务器共享校验，名称、头像裁切、台词集中维护；附 `CHARACTER_GUIDE.md`。
- [x] 本地测试模块：番符试算、点数转移、新局重置、阶段测试与 BGM 试听；联机不能改分。
- [x] 音频模块：立直换曲及下一局恢复、缺曲回退，四段雀魂 UI 音效本地接入并记录来源。
- [x] 构建模块：保持固定 SHA；修复 Windows TLS 下载备用路径，实际生成完整 ZIP；运行目录与 patch 同步。
- [x] Windows / Node.js v24.21.0 下 `npm test` 23 项通过，含真实双客户端一手对局；`node tools/qa-dom.cjs` 集成检查通过；详见 `RELEASE_NOTES_v6.md`。
- [x] 129 个变更文件先备份再同步 G:\QueYe，逐一校验 SHA-256；G 盘运行 `node --test tests/v6-modules.test.cjs tests/defeat-cg.test.cjs` 10 项通过。构建 ZIP 已验证补丁与六个受保护文件，旧版备份和同步清单位于当前工作区 release/。
- [ ] 桌面／手机视觉、真实音频听感、多人整场与 Ubuntu 验收未完成。本轮浏览器工具访问被策略拦截，DOM 模拟不能代替这些项目。G 盘已有 table.mp3，已保留并回填构建素材；riichi.mp3 仍待用户放入。
- [x] GitHub 备份：用户明确同意先公开上传至 `https://github.com/dianlang/VidiMahjong`，稍后自行改为私有。`git push --set-upstream origin main` 成功，原有分模块提交历史完整保留。首次完整备份提交 `f0f1d6f2227b55ae19edf22fbd888323cbecd271` 的 282 个文件（含 66 个 PNG 路径，以及音乐、音效）已通过 GitHub 连接器逐一比对 Git blob SHA，无缺失或差异。未上传 node_modules、临时缓存和 release/ 目录，依赖仍按 package.json 安装。

服务器变动仅为按统一角色表验证 ID，未改变房间消息格式、规则、AI、计分或累计失分语义。前后端一起部署，角色配置变更后重启 Node 服务。现有 BGM 文件和用户新增素材在同步时应保留。

## 选人文案更新（2026-10-22）

六角色和随机按钮改用用户确认的七句小字；角色句子存入 roster 的可选 tagline 字段，选人只以 textContent 渲染。运行目录、patch、构建注入与缓存版本同步，未改规则或联机行为。Windows / Node.js v24.21.0：`node --test tests/v6-modules.test.cjs` 六项通过；`node release/check-taglines.cjs`（临时 jsdom 检查）核对本地和联机两个选人卡片的七句文案，并通过现有 DOM 集成检查；不是视觉端到端验收。

## v7 追加记录（2026-10-22）

- 已实现和牌点数动画 → 跨失分阈值后全屏立绘、台词、可用录音（缺失时仅字幕）；本地暂停适配器、联机权威停顿、新局清理和重连剩余时间同步。
- 已实现宝牌金边与“宝”标记、实际宝牌展示；合法立直舍牌高亮、听牌预览、确认支付、横置宣言牌与后续摸切锁定；本地指定座位真实和牌测试。
- 用户明确授权立直规则修复，使用前后端共享扩展，原六个受保护文件未编辑。原支付公式保持，结束局公开分数及时使用已算出的最终点数，并避免重复结算。
- Windows / Node.js v24.21.0：`npm test` 35 项全部通过，含真实双 WebSocket 客户端完成一手、双方结算一致与点数守恒。立直 5 项、阶段／结算 5 项、指定和牌 2 项（覆盖 24 种组合）及三份 qa-* DOM 集成检查通过。构建与同步以交付文件哈希清单记录。
- 前端与 Node 服务需同版本并重启；新增协议字段见 RELEASE_NOTES_v7.md。桌面／手机视觉、实际语音听感、四真人整场及 Ubuntu 验收仍未完成。
- 实际执行 `powershell -NoProfile -ExecutionPolicy Bypass -File ./build-from-upstream.ps1` 并生成完整 ZIP，`python tools/verify-build.py` 核对全补丁、服务器扩展、加载顺序、交接文档及六个受保护文件通过。G 盘更新采用覆盖前备份与逐文件 SHA-256 清单。

- 根据用户最新要求，完全移除系统语音合成；仅尝试角色 MP3／OGG，缺失时静音并保留台词。Windows / Node.js v24.21.0 下重新执行 `node tools/qa-stage-show.cjs`、`node tools/qa-score-show.cjs`、`node tools/qa-riichi-dora.cjs` 均通过；缺录音用例明确断言系统朗读调用次数为 0。
- G:\QueYe 已先备份再同步 60 个文件并逐个核对 SHA-256。Windows / Node.js v24.21.0，在 G 盘执行 `node --test tests/v6-modules.test.cjs tests/riichi-rules.test.cjs tests/stage-presentation.test.cjs tests/dev-hand-fixtures.test.cjs`：18 项通过；同步清单和旧文件备份位于工作区 release/。

## v7.1 配音导入（2026-10-22）

- 范围：从用户 E 盘批量输出的清单导入六角色各 35 段日语 WAV（210 段），保留事件文件名，另建立 24 个阶段别名和 6 个大胜别名；同步 patch 与完整游戏素材。生成工具的模型配置和原始文件不改动。
- 改动：阶段播放器和原语音队列支持 MP3 → OGG → WAV；阶段／大胜字幕对应清单中文释义；新增 voice-catalog.json 和可重复导入的 tools/import-voices.py；更新角色指南及缓存版本。
- 当前接通四个失分阶段与已有单次赢分至少 8000 的反馈；第五阶段及其余吃碰立直等事件只保存素材，未新增触发器。规则、计分、联机消息不变，无服务器重启要求。
- Windows / Python 3 / Node.js v24.21.0：`python tools/import-voices.py "E:\sbv2\雀夜_六角色批量配音工具\output"` 验证 210 个 WAV 头部与非空时长；`node tools/qa-voice-import.cjs` 验证 210 个哈希、匹配字幕和阶段／大胜 WAV 回退；`node tools/qa-score-show.cjs`、`node tools/qa-stage-show.cjs` 通过，缺配音系统朗读调用次数为 0。
- 风险／人工测试：所有阶段录音不超过 3.425 秒，处于已有 6 秒演出内。以上是文件与 DOM 测试，尚未人工试听或验证实际设备解码；缺失音频仍不影响对局。构建和 G 盘同步哈希清单在 release/ 留档。

## v7.2 配音绑定与连续阶段（2026-10-22）

- 范围：六角色 35 种配音事件全部定义实际触发；新增共享事件规划器、浏览器单通道播放器和服务器只读事件流。录音缺失仅字幕，不使用系统朗读。触发条件表、文件与边界见 RELEASE_NOTES_v7.2.md。
- 阶段改动：跨阈值按 N→N+1 逐段排队；每段 6 秒，先旧立绘／台词，约 3.5 秒开始抖动，再淡入下一立绘。本地跳过仅当前段。服务器按全部段数暂停，适配器最长 120 秒；重连按剩余时间恢复，并跳过已结束段落。
- 文件：patch/js/traditional/{voice-events,voice-runtime,stage-show,match-pause,zh-custom}.js、patch/server/{voice-events,stage-presentation}.js、patch/css/stage-show.css、生成的 voice-catalog.js 与运行副本，以及加载／构建／文档／回归文件。六个受保护上游文件、计分与役种判定不改动。
- 自动测试（Windows / Node.js v24.21.0）：`npm test` 41 项全部通过，包含真实双 WebSocket 一手、点数一致与守恒。`node tools/qa-stage-show.cjs`、`node tools/qa-voice-events.cjs`、`node tools/qa-voice-import.cjs`、`node tools/qa-score-show.cjs`、`node tools/qa-dom.cjs`、`node tools/qa-riichi-dora.cjs` 均通过；包括连续队列、96 秒停顿、合法服务器行动、私有跳过过滤、重复状态静音、单通道、210 录音哈希及无系统合成语音。
- 风险／人工：普通语音可能被阶段抢占，低优先级过期语音会丢弃，以避免积压。DOM／Audio 桩不是实机视觉或听感验收；真实手机／桌面音频、四真人整场与 Ubuntu 仍待检查。
- 部署：新增只读 voiceEvents 状态，无新增客户端命令；前后端须同版本更新并重启 Node 服务（旧房间关闭）。完整构建、覆盖前备份和 G 盘逐文件哈希清单位于 release/，保留用户 E 盘原配音与模型配置。

## v7.3 随机剪影变身（2026-10-22）

- 范围：随机选项改为成年男性剪影入场；第一次累计失分达 3000 才选取本场未登场女性。多人同时变身依序排除已出现角色；新场重置，赢回分数和重连都不回退／重抽。首段显示精确惊讶字幕，后续阶段沿同一女性连续演出。新台词无录音时静音。
- 文件：characters.js 保留 ID、共享 random-character.js、server/random-character.js、zh-custom／stage-show／voice-runtime／defeat-cg 适配及运行副本；生成素材在 patch/assets/characters/character-random/，同步 assets 副本。构建、缓存版本、文档和测试一并更新；六个受保护规则文件与四个失分阈值不变。
- 素材：使用内置 image_gen 生成成年男性全身剪影，1024×1536 透明 PNG。Windows System.Drawing 检查角部与侧边 alpha 为 0，主体存在非零 alpha；最终提示词与生成模式保存在 ASSET_INFO.md。未改变已有女性立绘。
- 自动测试（Windows / Node.js v24.21.0）：`npm test` 45 项全部通过，含真实双客户端一手及点数守恒；`node --test tests/random-character.test.cjs` 的四种核心场景通过。`node tools/qa-random-character.cjs` 核对实际按钮、主立绘、排除在场角色、精确字幕、首段静音、后续连续段、新局重置及联机角色；`node tools/qa-dom.cjs`、`node tools/qa-stage-show.cjs`、`node tools/qa-voice-events.cjs`、`node tools/qa-voice-import.cjs`、`node tools/qa-score-show.cjs` 均通过。
- 风险／未验收：上述为文件、逻辑和 DOM／Audio 桩验证；生成图已目视检查，但游戏实际合成画面、换装节奏、音频听感、真人多窗口整场与 Ubuntu 部署仍待实测。
- 部署：服务器控制随机形态与机器人角色，重连恢复原形态。新增 randomPending 与首段变身表现字段，需前后端同版本并重启 Node 服务，旧房间会关闭。完整构建和覆盖前备份／哈希清单在 release/ 留档；E 盘配音原始输出与配置未改动。

## 2026-10-22 收工同步与接续点

- 今天功能停在 v7.3：六角色事件配音、逐阶段演出（旧图停留／台词→抖动→切图）、随机男性剪影首次失分变为未登场女性。后续从此继续，不重复导入已接入的录音或重做以上功能。
- 全项目收工核对发现 G:\QueYe 另有 13 张用户更新立绘：狼姬 stage-2～4、莉莉 stage-0～4、缇娜 stage-0～4。以 G 盘现用图片为准，回填工作区 assets 与 patch，并同步 G 盘 patch；旧图、新图及校验清单在 release/QueYe-before-end-of-day-2026-10-22.zip 保存。没有修改 G 盘当前立绘。
- 同步 server/package-lock.json 及其 canonical patch 副本；依赖仍为现有 package.json 的 ws，不升级软件。构建器复制锁文件，以保留依赖安装版本。
- 今日功能验证已记录于 v7.3：Windows / Node.js v24.21.0，源码 `npm test` 45 项通过；G 盘 `node --test tests/random-character.test.cjs tests/voice-events.test.cjs tests/stage-presentation.test.cjs tests/riichi-rules.test.cjs tests/v6-modules.test.cjs tests/dev-hand-fixtures.test.cjs` 28 项通过。本次仅素材、锁文件与交接更新，不重复运行整场对局；构建和文件比对结果留档于 release/。
- 下一次优先人工确认新立绘的实际合成画面、连续换装节奏和声音听感，再检查多窗口真人联机／重连。随机变身惊讶台词目前只有字幕，缺少对应录音时继续静音。联机新功能需要重启同版本服务器，今晚未替用户关闭现有房间。
- 本次不新增功能；保留 E 盘配音生成工具与原始输出，开发运行入口及固定上游 SHA 不变。源码、G 盘游戏与 GitHub main 以收工校验清单核对。


## v8 牌桌提示（2026-10-23，用户选项 1）

- 范围／文件：table-focus.js、table-focus.css 与 patch 副本；stage-show.js 新增纯表现事件。固定操作区保留原按钮，突出当前回合／弃牌／立直摸切限制／本人响应，演出期间提示暂停；小屏主立绘放在独立区域，保留全屏查看与缩放。
- 规则与素材：六个受保护文件、役种、计分、失分阈值与已有录音图片不变。风险为小屏滚动及布局，未宣称真实设备视觉验收。
- 自动测试：Windows / Node.js v24.21.0，`node tools/qa-table-focus.cjs`、`node tools/qa-riichi-dora.cjs`、`node tools/qa-stage-show.cjs`、`node tools/qa-score-show.cjs`、`node tools/qa-dom.cjs` 通过；核对原按钮迁移、立直选择、暂停恢复、当前公开牌与连接提示。DOM 桩不能替代人工视觉／触控验收。
- 部署：静态模块及缓存版本由构建器统一接入，不改支付方式。


## v8 自动重连（2026-10-23，用户选项 4）

- 范围／文件：reconnect-client.js、online-resume.js、server/reconnect-view.js 与 patch 副本，server/index.js 的心跳、server/room.js 的扩展安装；新增重连逻辑／真实服务器测试和 qa-online-resume.cjs。原六个受保护文件不变。
- 行为：自动退避重连、手动重试、同标签刷新恢复；恢复原 playerId／座位／权威角色与阶段，重建本人待处理吃碰提示。连接恢复前阻止行动，绝不缓存补发出牌或吃碰，旧连接延迟消息失效。
- 协议／隐私：仅本人 reactionPrompt，其他席位为 null，不附他人暗牌；新增 ping/pong。服务器仍负责计分、角色与演出剩余时间。前后端必须同版本并重启 Node 服务；不擅自关闭旧服务或原房间。房间已被清理时提示返回大厅。
- 自动测试：Windows / Node.js v24.21.0，`node --test tests/reconnect-client.test.cjs tests/reconnect-server.test.cjs` 5 项通过；真实 WebSocket 测试恢复本人反应选项、累计失分、变身身份与暂停剩余时间。`node tools/qa-online-resume.cjs`、`node tools/qa-table-focus.cjs` 通过。尚未真人多窗口整场和真实网络切换验收；DOM 结果不等于这些验收。


## v8 素材管理（2026-10-23，用户选项 5）

- 范围／文件：素材管理页面 HTML／CSS／JS、asset-entry.js、start-asset-manager.bat、tools/asset-store.cjs 与 asset-manager-server.cjs 及 patch 源；voice-runtime.js 按素材目录优先播放最新导入格式；asset-manager.test.cjs 与 qa-assets-ui.cjs。
- 功能：按角色预览立绘与缺失槽位，试听 35 种配音、批量 PNG／WAV／MP3／OGG 导入、中日台词保存与新增角色。每次覆盖前备份字节与清单，保存同步现用 assets 与 canonical patch/assets；本机配置关联 C 盘源码与 G:\QueYe，不进入 Git。备份位置 release/asset-manager，不改 E 盘原生成工具与录音输出。
- 完整性：固定文件槽位、格式与大小检查、整批校验、旧哈希冲突保护、写入失败回滚；本机监听、令牌与同源限制，不暴露任意路径。缺素材不阻止游戏，缺语音静音，禁止系统朗读。新角色联机须重启 Node 服务。
- 自动测试：Windows / Node.js v24.21.0，`node --test tests/asset-manager.test.cjs` 5 项通过，覆盖四副本同步、旧字节备份、整批拒绝、模拟磁盘失败回滚、录音别名／格式／时长、字幕、创建角色、本机 API 保护；`node tools/qa-assets-ui.cjs` 通过实际本机 API 的页面 DOM 保存流程，`node tools/qa-voice-import.cjs` 核验原 210 段录音哈希与播放路由通过。
- 风险／人工：文件选择器、图片解码和声音听感尚未实机验收；页面草稿仅当前页内存保存。每次素材操作先本地备份，GitHub 为批次备份，并非每次点击自动提交。安装位置与操作说明见 RELEASE_NOTES_v8.md。


- v8 素材管理补检：导出的完整游戏包初始不含 patch/，管理工具现在以实际游戏角色表识别目录，首次保存时创建 canonical 副本。Windows / Node.js v24.21.0，`node --test tests/asset-manager.test.cjs tests/v6-modules.test.cjs` 12 项通过（素材管理 6 项），覆盖全新解压目录直接导入；未要求用户手建 patch 目录。


## v8 集成与交付

- 集成文件：traditional.html、build-from-upstream.ps1、tests/v6-modules.test.cjs、tools/verify-build.py、README_CN／角色指南／架构／v8 说明。构建器保留固定上游 SHA，增加四个顺序加载模块、两张样式表、本机管理页与启动器、工具副本和服务端心跳／恢复状态扩展；交接文档一并装入 ZIP。
- 自动回归环境 Windows / Node.js v24.21.0：`npm test` 55 项通过，含真实双客户端一手结束、双方点数一致与总和 100000。之后新增的导出目录兼容修复已以 `node --test tests/asset-manager.test.cjs tests/v6-modules.test.cjs` 12 项通过，不把静态检查写成端到端验收。
- 页面 DOM 集成命令：`node tools/qa-stage-show.cjs`、`node tools/qa-voice-events.cjs`、`node tools/qa-score-show.cjs`、`node tools/qa-riichi-dora.cjs`、`node tools/qa-dom.cjs`、`node tools/qa-table-focus.cjs`、`node tools/qa-online-resume.cjs`、`node tools/qa-assets-ui.cjs`、`node tools/qa-voice-import.cjs` 均通过；包括 210 录音哈希、原动作按钮、连续演出与单通道语音，不含真人音频或手机视觉验收。
- 交付验证命令：`powershell -NoProfile -ExecutionPolicy Bypass -File ./build-from-upstream.ps1`、`python tools/verify-build.py`；记录位于忽略于 Git 的 release/。G 盘同步逐文件预检旧哈希、覆盖前备份并核对新哈希；同步期间发现新素材应保留回填，不静默覆盖。
- 风险／未通过项：无已知失败自动用例；真实浏览器手机／桌面视觉、实际录音解码听感、多真人整场和 Ubuntu 仍待人工验收。联机需同版本部署重启，不能承诺跨服务器重启保留内存房间。素材管理默认本机 8766，原游戏入口与启动方式保留。

- 实际交付结果：固定 SHA 完整构建及 `python tools/verify-build.py` 通过，六个受保护文件与原版逐字节相同；从新 ZIP 提取管理工具，在没有 patch/ 的临时目录实际启动、列出七个入口并新增角色／备份／回填 canonical 成功。47 个变更文件覆盖前备份后同步 G 盘，全项目 859 个跟踪／新增文件哈希核对一致。
- G 盘最初缺少 ws 依赖，已在 G:\QueYe\server 执行 `npm ci --ignore-scripts --no-audit --no-fund`，按现有锁文件安装且不升级。随后在 G:\QueYe 执行 `node --test tests/asset-manager.test.cjs tests/reconnect-client.test.cjs tests/reconnect-server.test.cjs tests/v6-modules.test.cjs tests/riichi-rules.test.cjs tests/stage-presentation.test.cjs`：27 项全部通过（Windows / Node.js v24.21.0），包括真实断线恢复；初次因缺依赖失败已解决。


## v8.1 操作设置（2026-10-23）

- 用户选择先优化操作：自动过、禁止鸣牌、立直摸切、可选出牌确认。新增 play-policy.js / play-options.js / play-options.css 与 canonical 副本；加载顺序在现有渲染、立直、重连后，不编辑六个受保护文件或计分公式。
- 默认四项关闭；设备本地保存。自动过与禁止鸣牌绝不自动放弃荣和，立直摸切遇到自摸／暗杠／宣言待选时停下；暂停、弹窗、后台和断线时停止计时。必须在新服务器视图到达后重新判断，重复状态不会重复执行。确认选牌随手牌／回合变化失效，立直使用原确认，不重复确认。
- Windows / Node.js v24.21.0：`node --test tests/play-policy.test.cjs` 2 项通过；`node tools/qa-play-options.cjs` 验证实际本地摸切、逐个本地真人过、荣和保留、二次确认与取消、原立直、联机自动过／摸切去重、重连等待、自摸／暗杠／暂停保护、设置保存。`node tools/qa-table-focus.cjs`、`node tools/qa-online-resume.cjs`、`node tools/qa-dom.cjs` 通过。无真人手机视觉／触控验收，不将 DOM 结果冒充实机。
- 集成回归：同环境 `npm test` 59 项通过，含真实双客户端一手结束与点数守恒；随后连接恢复的自动操作收尾调整已由上述 DOM 场景验证。构建仍固定上游 e4207acd04887355c012ee2ab9d9456c4cbcb874，加载与 ZIP 核验见交付记录。

## v8.1 临时好友试玩

- 用户尚未购买云服务器，随后明确选择临时网页链接。新增 friend-server.cjs / friend-launcher.cjs / download-cloudflared.cjs / stop-friend-test.cjs、start/stop-friend-test.bat、friend-entry.js 及 patch 源。保持原 server/index.js 的房间路由，仅增加 HOST 环境变量供隔离绑定，默认原监听行为不变；无新游戏协议、计分或隐私状态字段。
- 本机 8770 网关将静态游戏与 /ws 合用一个入口，经 Cloudflare 官方 Quick Tunnel 暂时分享；网页自动填 WSS，支持复制邀请和填房号。仅提供游戏文件，不开放素材管理 API、tools/server/patch/Git 或任意目录；音频支持 Range。关闭／重启试玩会丢失原内存房间和临时网址。
- 下载从官方 release 查询 SHA-256；本机版本 cloudflared 2026.10.3，已校验官方散列。GitHub 直连与大文件官方接口尝试超时后，使用本机既有 Git 代理下载成功；未改系统代理或使用第三方文件镜像。二进制、运行会话和本机配置仅放忽略的 .local-tools/。
- Windows / Node.js v24.21.0：`node --test tests/friend-server.test.cjs tests/play-policy.test.cjs tests/v6-modules.test.cjs` 9 项通过，含真实双客户端通过网关建房／入房／同步出牌、暗牌过滤、静态路径拒绝、Origin 检查与音频分段；`node tools/qa-friend-entry.cjs` 检查 HTTPS 自动 WSS、邀请填房号和复制通过。
- 公网原型实际验证：通过本机已配置代理请求公开 HTTPS /healthz 返回 200；公开 WSS 双客户端建房、入房、出牌同步、暗牌过滤与点数总和 100000 均通过，记录在 release/。这不等于大陆所有运营商可用，朋友仍需实际试连；未宣称正式云部署完成。
- 部署影响：前端与试玩工具一起更新；HOST 为可选绑定配置。原本机／联机入口仍保留，未替用户购买服务器，未启动公网素材管理。停止工具仅核对并停止当前项目记录且标记／启动时间匹配的进程。


## v8.2 大厅与主菜单（2026-10-23）

- 范围／文件：online-resume.js／css 与 patch 副本。退出时清除旧房卡、座位和会话；开始按钮等待连接完成，增加退出／重试。返回主菜单改为雀夜选项页，清理本地比赛、演出和连接，防止跳进上游消消乐。
- Windows / Node.js v24.21.0：`node tools/qa-online-resume.cjs` 通过；`node tools/qa-online-ui.cjs` 在隔离服务器与两个独立加载页面上验证实际建房、退出重进、返回正确页面／清除会话，无未捕获异常。后者同时依赖本批结算扩展，随集成提交入库。
- 风险／人工：退出连接仍保留原服务器重连席位；不宣称释放座位或踢人。DOM 不是手机触控／视觉验收。部署文件暂在源码与新 ZIP，G 盘旧服务和房间尚未重启。
