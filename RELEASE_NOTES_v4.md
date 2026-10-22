# 《雀夜》v4 — 整场末位失败 CG

基于 v3 开发交接版新增独立的**结算 CG 展示模块**，未修改日麻规则引擎、役种/符番、AI、联机协议及服务器累计失分处理。

## 代码变更

- 新增 `patch/js/traditional/defeat-cg.js`：包装原版 `showMatchEnd()` 与 `showOnlineMatchEnd(st)`，从最终点数得到第四名，按座位展示对应角色的 `defeat.png`。全体在线客户端使用同一份服务器最终点数，在各自浏览器显示同一失败角色。
- 新增 `patch/css/defeat-cg.css`：失败 CG 面板、占位与入场动画、移动端适配、减少动态效果选项。
- 更新 `build-from-upstream.ps1`：复制并加载上述两个新增文件，不修改上游规则和服务器代码的原有 v3 替换点。
- 更新素材 README 与 `patch/README_CN.md`，并补充交接文档说明。

## 行为约定

1. 只在整场结束 (`matchOver`) 显示，单局结算不触发。
2. 末位同分：使用排名从高到低、座位序号从小到大排序，结果中的最后一个座位作为唯一失败 CG 主角。
3. 素材优先 `assets/characters/character-XX/defeat.png`，缺少时回退 `stage-4.png`，仍缺图显示可用占位；不影响最终排名与交互。
4. 真人或 AI 都可以成为末位；六名角色均有独立素材路径。素材由用户制作或导入，当前未附绘制好的失败 CG。
5. 不自动播放新的失败音效或人声，不干扰 v3 音效设置。

## 验证与限制

- `node --check`：新增 JS 通过。
- 本地与联网纯逻辑模拟覆盖末位、并列末位、各客户端分数一致、不重复插入面板、缺素材处理；详见本轮测试输出。
- 未进行 Windows 上实际 `build.bat` 下载、整场浏览器联网实测或 Ubuntu 正式部署；仍是一键构建补丁包，需联网下载上游游戏本体才能产出可运行的完整游戏 ZIP。

## 本轮测试记录

- `node --check patch/js/traditional/defeat-cg.js`、`node --check patch/js/traditional/zh-custom.js`：通过。
- `node --test tests/defeat-cg.test.cjs`：4 / 4 子测试通过。
- Playwright + 系统 Chromium 144：模拟本地结算展示、四个独立页面接收相同在线最终分数、并列末位、404 图片占位及 375px 手机宽度，均通过。该测试未覆盖真实麻将牌局/WebSocket 整场运行。
- 原 v3 主要运行代码（`zh-custom.js`、`zh-custom.css`、WAV）未修改；本轮只改新增 CG 模块、构建器的复制/加载环节与文档。
