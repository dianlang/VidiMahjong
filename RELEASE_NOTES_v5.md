# 雀夜 v5 — 牌桌与角色展示

2026-10-21。基于本机已有完整 v4 工程继续开发，上游固定提交不变。

## 本轮内容

- 深绿色牌桌、金色局况台、四家围桌布局、宝牌实物牌面、活动座位标记与实时点数榜。
- 角色名称：01 狼姬、02 秋源、03 莉莉、04 缇娜、05 棉花糖、06 拉比。内部 `character-XX` ID 保持不变。
- 本地、在线选人卡片各只显示一张初始阶段头像和名字，不再预览全部阶段。
- 游戏默认突出显示自己的大立绘；点击四家头像可查看对应角色。缩小／放大按钮记住本机偏好。
- 大立绘读取现有角色阶段，随着原有阶段变化更新；不改累计失分、计分或联机消息。
- 将 `G:\QueYe\assets\characters` 中的 30 张阶段图和已有 3 张结算图同步到运行目录与 `patch/`。03、04、05 未找到独立 `defeat.png`，沿用现有最终阶段回退。
- 手机布局、键盘左右选牌与回车出牌、帮助弹窗和声音按钮。

## 验证

环境：Windows，Node.js v24.21.0，Codex 内置 Chromium 浏览器，本机 HTTP 与真实 WebSocket 服务。

- `node --test`：17 项通过，包括两名真实 WebSocket 客户端完成一局、点数守恒；完整输出 `release/test-results.txt`。此测试在本轮规则代码未改动的基础上执行。
- 改名后 `node --test tests/defeat-cg.test.cjs`：4 项通过。
- `node --check js/traditional/zh-custom.js`、`node --check js/traditional/defeat-cg.js`、`node --check js/traditional/table-ui.js`：分别通过。
- PowerShell Parser 解析 `build-from-upstream.ps1`：无语法错误。
- 浏览器实际验证：1440×900 本地开局、点击出牌、左右键选牌、回车出牌、帮助打开/关闭、立绘缩小/恢复、点击他家头像切换展示。
- 390×844：在线建房、选拉比、AI 补位开局和出牌；14 张手牌均位于视口内，大立绘加载成功，控制按钮有可访问名称。结果 `release/browser-checks.json`，截图 `release/table-mobile.png`。
- 以上不等同于四真人整场验收。未重新下载上游执行完整构建，未做 Ubuntu 正式部署；全屏依赖浏览器支持，未验证。

## 使用与更新

本次修改保存在当前工作区，发布 ZIP 是完整可运行目录，可解压到新目录使用。启动 `start-local.bat`，或通过静态 HTTP 服务打开 `traditional.html`；联机仍使用 `start-online-server.bat` 和 Node.js。

新增展示模块是 `patch/js/traditional/table-ui.js` 与 `patch/css/table-ui.css`，已同步运行目录；构建脚本会复制并在 v4 模块之后加载。线上更新只涉及静态资源，不要求协议变更。

语音包接入属于后续独立批次：现有 MP3/OGG 播放约定本轮未修改。大图缺失回退为初始图或占位，不影响牌局。
