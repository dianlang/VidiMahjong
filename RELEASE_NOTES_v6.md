# 雀夜 v6 · 2026-10-22

## 本次功能

- 格斗游戏式头像选人、角色预览和末尾随机按钮；保留六个已确认名字。
- 独立角色配置 `assets/characters/roster.js`，浏览器与服务器通过 `characters.js` 读取同一名单。新增角色步骤见 `CHARACTER_GUIDE.md`。
- 34 张 CC0 矢量牌面；牌河标注座位和张数，可打开四家牌河集中查看，当前待响应弃牌用金边标识。
- 30 项本版役种说明、番数、门清条件、搜索、筛选和引擎简化说明。没有修改役种判定或计分。
- 本地测试工具：番符点数试算、四家点数转移、阶段阈值快捷值、新开本地测试局、普通／立直 BGM 试听。联机禁止修改点数。
- 任意一席立直后切换 `assets/bgm/riichi.mp3`，下一局恢复 `table.mp3`。音乐由用户提供，缺失立直曲时沿用普通曲。
- Riichi.moe 雀魂镜像的四段界面音效（确认、取消、点牌、出牌），按 MajsoulData 索引定位，随现有声音开关静音；完整来源和文件哈希随素材保存。
- 一键构建仍固定上游 e4207acd04887355c012ee2ab9d9456c4cbcb874；增加 Windows TLS 下载失败时的 Node 备用下载，携带交接文档与角色扩展说明。

## 修改范围和部署

麻将引擎、手牌判定、役种、计分、AI、本地对局控制六个受保护文件保持原样。服务器只把硬编码六人校验换为统一角色名单；消息字段和计分方式不变。前后端须一起部署，新角色名单生效需要重启服务器；服务器重启会关闭旧房间。

源码以 `patch/` 和构建脚本为准，运行目录同步修改。新增模块为 `characters.js`、`yaku-catalog.js`、`table-extras.js`、`dev-tools.js`、`ui-sfx.js` 和两份样式；既有大立绘查看、吃碰提示继续保留。

## 验收证据

环境：Windows、PowerShell、Node.js v24.21.0。以下是真实执行结果，不把 DOM 模拟当成浏览器验收。

- `npm test`：23 项通过，包含两个真实 WebSocket 客户端创建／加入同一房间、打一手、双方结束一致、总点数 100000，以及注册第七名角色、拒绝非法 ID、役种名单、BGM 切换／缺曲回退／静音、补丁一致性检查。
- `node --check js/traditional/*.js`：逐文件语法检查通过（PowerShell 逐文件执行）。构建脚本 PowerShell 语法解析通过。
- `node tools/qa-dom.cjs`：使用 jsdom 的 DOM 集成检查通过，涵盖随机选人、真实手牌 SVG 渲染、实际出牌进入牌河、役种搜索、闲家荣和 3 番 40 符 5200、转移 15000 后阶段三、赢回不退、新局归零、联机改分锁和立直音乐事件。
- DOM 检查依赖只用于开发：`npm install --prefix .qa-deps jsdom --no-audit --no-fund`；游戏运行不依赖它，也不引入前端框架。
- `powershell -NoProfile -ExecutionPolicy Bypass -File ./build-from-upstream.ps1` 已实际成功构建完整 ZIP；Windows 原下载遇到 TLS 错误，Node 备用路径成功。
- `python tools/verify-build.py`（使用本机配套 Python）：已核对完整 ZIP、所有补丁素材与加载顺序、五份交接文档；六个受保护文件与固定上游构建及 G 盘原版逐字节相同。
- 已先备份再同步到 `G:\QueYe`，129 个变更文件逐一核对 SHA-256；该目录执行 `node --test tests/v6-modules.test.cjs tests/defeat-cg.test.cjs`，10 项通过。G 盘原有普通 BGM 保留，构建补丁也已回填同一文件。

## 未验收与风险

本轮浏览器预览工具被访问策略拦截，没有完成桌面／手机视觉与真实音频听感检查。DOM 模拟不验证布局、声音解码或完整比赛。四真人整场、断线重连、Ubuntu 部署仍待实测。已保留 G 盘现有普通 BGM，尚未提供立直 BGM；03／04／05 独立结算图仍使用 stage-4 回退。

素材来源和权利分别记录在 `assets/tiles/SOURCE.md`、`assets/tiles/LICENSE.md`、`assets/sfx/majsoul/SOURCES.json`。雀魂音效没有被声明为 CC0；按用户本轮要求仅用于私人测试备份。

GitHub 目标：用户随后指定 `https://github.com/dianlang/VidiMahjong`，并明确允许先公开上传完整工程和现有素材，稍后自行改为私有。本机推送登录现已可用；保留原先分模块提交历史，上传完成后核对远程分支与文件哈希，再记录完成状态。
