# 雀夜 VidiMahjong 六角色改造构建包 v4（基于原项目）

这个包不是另写一套麻将引擎，而是一键构建补丁。运行 `build.bat` 后，它会下载原作者 `VidiPT89/VidiMahjong` 的已核对版本 `e4207acd04887355c012ee2ab9d9456c4cbcb874`，保留原有游戏规则与联机代码，再叠加中文界面和可替换角色立绘槽位，最终生成完整的 `VidiMahjong-zh-customized.zip`。

## 改造内容

- 保留原项目的四人立直麻将引擎、吃碰杠、役种判断、符数/番数、点数结算、AI 补位和 WebSocket 房间功能。
- 默认切换为简体中文，仍可通过语言按钮切换英文。
- 页面标题与模式标题改为「雀夜」。
- 在本地开局设置和在线建房/加入房间前选择角色。
- 预留 6 个成人角色，每个角色在选择界面展示 5 个立绘槽位（stage-0.png 至 stage-4.png）。
- 在线握手会把角色 ID 发送给服务器，并由房间状态广播给所有客户端。
- 为牌桌四个座位添加角色立绘占位框；依据本场累计失分切换 0–4 阶段，**整场只升不退**。
- 当前没有图片时显示占位框，不影响麻将功能；放入透明 PNG 后会自动加载。
- 阶段提升时通过双层立绘淡入淡出（约 300ms）、轻微缩放与高光、内置短促 SFX 过渡（含 5 个 WAV 文件）；约 200ms 后显示角色台词并尝试播放 MP3 / OGG 配音，未提供配音仍显示字幕。支持语音和音效共用静音开关。
- 单次赢分达到 8,000 点时触发该角色专属的胜利字幕和简短音效，若放置 `voice/win.mp3` 或 `voice/win.ogg`，还会播放胜利语音。**赢分不会恢复服装阶段**。
- 六位角色依次为：狼姬、小妖精（成年）、女仆、吸血鬼法师、三无法师（成年）、成年女OL。立绘表现为非露骨服装／配饰变化；角色均明确为成年人。

## v4 新增：整场末位失败 CG（本地与联机）

- **只在整场比赛结束**时展示，单个小局结束不会触发。
- 按**最终点数从高到低排名**，选出第四名（末位）；若末位同分，采用确定性顺序：按东/南/西/北座位序号由小到大排列，同分时**序号较大**的座位被选作唯一展示对象。这样所有客户端结果一致。
- 末位可能是真人，也可能是 AI；每个角色都有独立的 `defeat.png` 素材路径。
- 本地在最终排名弹窗显示失败 CG；联机所有已连接玩家在收到服务器最终 `state` 后显示**同一座位的失败 CG**。这一功能**不新增联机消息**、不修改计分与排名逻辑。
- 优先加载 `assets/characters/character-XX/defeat.png`；若缺失自动回退 `stage-4.png`，仍缺失则显示“失败CG素材待添加”占位，原结算排名与“再来一局/返回”按钮仍可使用。
- 为动画和图片设置简单过渡，适配移动端、尊重减少动态效果设置；不会自动播放额外声音。
- **当前 ZIP 未附上 6 张绘制完成的失败 CG**，请按以下位置加入（建议 16:9 PNG，所有角色均为成年人，画面非露骨）：

```text
assets/characters/character-01/defeat.png  # 狼姬
assets/characters/character-02/defeat.png  # 成年小妖精
assets/characters/character-03/defeat.png  # 女仆
assets/characters/character-04/defeat.png  # 吸血鬼法师
assets/characters/character-05/defeat.png  # 成年三无法师
assets/characters/character-06/defeat.png  # 成年女 OL
```

前端逻辑在 `patch/js/traditional/defeat-cg.js`，样式在 `patch/css/defeat-cg.css`；构建脚本会复制到生成后的项目 `js/traditional/` 和 `css/` 并在 `traditional.html` 最后加载。Ubuntu 部署需更新**静态文件**，本功能不修改服务器协议；沿用 v3 的服务器版本即可。

## 构建方法

1. Windows 安装 Node.js 18 或更新版本（用于运行游戏服务器）。
2. 双击 `build.bat`。
3. 脚本联网下载原项目并自动打补丁，完成后会在当前文件夹生成 `VidiMahjong-zh-customized.zip`。
4. 解压生成的 ZIP。

## 启动游戏

- 双击 `start-local.bat`：打开原项目的四人立直模式页面，可选择真人座位并由 AI 补位。
- 双击 `start-online-server.bat`：安装服务器依赖并启动在线房间服务器。
- 在线联机时，所有玩家都要使用可互相访问的 WebSocket 服务器地址；`localhost` 只指向玩家自己的电脑，异地联机需部署服务器并配置 `wss://`。

## 立绘文件路径

开局时可在角色选择卡片中选择角色。每个角色有一个文件夹，且预留五张立绘：

```text
assets/characters/character-01/stage-0.png
assets/characters/character-01/stage-1.png
assets/characters/character-01/stage-2.png
assets/characters/character-01/stage-3.png
assets/characters/character-01/stage-4.png
```

`character-02` 到 `character-06` 同理。

每个角色另外可以提供四句阶段语音：

```text
assets/characters/character-01/voice/stage-1.mp3
assets/characters/character-01/voice/stage-2.mp3
assets/characters/character-01/voice/stage-3.mp3
assets/characters/character-01/voice/stage-4.mp3
```

也可以采用 `.ogg` 格式；优先尝试 MP3，失败时再尝试 OGG。新增 `voice/win.mp3`（或 `.ogg`）作为获大分语音，六个角色各有一条预设胜利字幕。音频缺失不会影响游戏。**阶段切换与胜利的短 WAV 音效已经内置，无需自行录制。**角色音频总开关位于角色选择区域，各页面同步。查看完整台词：`assets/characters/角色配音文案.md`。

**当前只有台词和播放逻辑，不含已录制配音、TTS 合成音频或角色立绘。**图片建议使用透明背景 PNG，人物构图和画布比例保持一致。立绘会按阶段自动切换。本地模式中，所选角色分配给第一位真人座位，其余座位自动分配剩余角色；在线模式会同步每位玩家选择的角色。

## 重要说明

- 这个补丁不替换原项目的麻将引擎，也不宣称原项目实现了所有竞赛规则；原项目 README 已注明少数罕见规则仍有简化。
- 运行构建脚本需要访问 GitHub。若网络无法下载原项目，脚本会报错，不会生成伪装成完整项目的 ZIP。
- 原项目的 MIT LICENSE 会保留在生成的游戏目录中。代码和素材请分别遵守各自授权。

## Windows 测试 / Ubuntu 部署建议

Windows：运行 `build.bat` 生成完整游戏，再使用 `start-local.bat` 测试网页、`start-online-server.bat` 测试联机。
Ubuntu：直接上传生成后的完整游戏文件夹，使用 Node.js 跑 `server/index.js`，Nginx 提供静态网站并反向代理 WebSocket。

**累计失分规则**：某座位在一场麻将中所有负向点数变化累计相加；赢回点数不会抵消损失。当累计失分达到 3,000 / 8,000 / 15,000 / 25,000 时，阶段升到 1 / 2 / 3 / 4。不会回退。**下一场新建的本地对局或新联机房间重置为阶段 0**。联机模式由 `server/room.js` 记录四个座位的累计失分并同步给每位客户端，因此刷新页面、掉线重连后保持阶段（只要服务器房间还在）。本地模式在本次页面打开期间有效，刷新会重新创建本地对局。

**阶段语音为可选素材**：现阶段内置字幕和短过渡音效，不包含实际配音和立绘 PNG；出现角色占位框是正常情况。浏览器初次播放声音可能需要用户主动点击一次游戏界面。

**部署**：Windows 用 `build.bat` 生成完整游戏；生成后的游戏文件夹可以在 Windows 运行，也可以上传 Ubuntu 由 Nginx + Node.js 提供服务。新版服务器 `room.js` 需要一同部署并重启服务。
