# 添加角色

角色名、顺序、头像裁切和台词统一放在 `patch/assets/characters/roster.js`。选人、随机选人、牌桌字幕、结算 CG 和联机角色校验均读取此配置，新增第七名角色无需修改这些功能的代码。

1. 在 `roster.js` 返回的数组末尾复制一条角色记录，把 `id` 改成未使用的 `character-07`，填写 `name`；`tagline` 是选人界面名字下方的小字，可自行修改。ID 只允许 `character-` 加小写字母、数字、连字符；保存后不要再改已有角色的 ID。
2. 建立 `patch/assets/characters/character-07/`，放入 `stage-0.png` 至 `stage-4.png`。初始头像取自 `stage-0.png`；`avatar.scale` 控制放大倍数（1～5），`avatar.origin` 控制裁切中心，例如 `50% 18%`。所有角色须为成年人，画面非露骨。
3. 可选加入 `defeat.png`；缺失时结算使用 `stage-4.png`。可选在 `voice/` 放入 `stage-1.mp3` 至 `stage-4.mp3` 和 `win.mp3`（也支持 OGG、WAV）；台词填写 `stageLines` 和 `winLine`。缺少声音仍显示字幕，缺少图片仍可打牌。
4. 双击 `build.bat` 生成完整游戏包。若直接更新当前完整工程，同时把配置和素材复制到根目录 `assets/characters/`，不要只改运行文件而漏掉 `patch/`。
5. 联机服务器在启动时读取同一份配置。新增角色后，服务器和所有玩家要更新同一版本，并重启服务器；现有房间会随重启关闭。

例如新增记录可以只先填写：

```js
{ id: 'character-07', name: '新角色', tagline: '今夜，与你同席。', avatar: { scale: 2.65, origin: '50% 18%' } }
```

数组条目之间要有逗号。省略台词会使用默认文本。新增角色自动出现在随机按钮之前；无需增加 HTML 按钮或修改服务器的角色白名单。

共享逻辑位于 `patch/js/traditional/characters.js`，负责校验、默认值和安全目录名。不要在该文件重复维护角色名单。

v7 全屏演出直接读取 `stageLines`，配音仍用 `voice/stage-N.mp3` 、OGG 或 WAV，缺少录音时不播放角色语音，仅保留字幕；不必在演出代码重复填写台词。

测试：Windows / Node.js 下执行 `node --test tests/v6-modules.test.cjs`；界面仍需检查新图片的头像裁切、缺图回退和手机布局。

## 批量 WAV 配音导入（v7.1）

执行 `python tools/import-voices.py "E:\sbv2\雀夜_六角色批量配音工具\output"`，读取 `_manifest.csv` 并检查 WAV，将音频同时导入 patch 和运行目录。游戏语音目录为 `assets/characters/character-XX/voice/`：01 狼姬、02 秋源、03 莉莉、04 缇娜、05 棉花糖、06 拉比。

原始 35 个事件文件名保留；`stage_1.wav`～`stage_4.wav` 同时建立 `stage-1.wav`～`stage-4.wav` 副本供现有演出读取；`win_small.wav` 同时作为 `win.wav`，用于现有单次赢分至少 8000 的胜利反馈。字幕从清单的中文释义同步，日语原文、中文释义、音频哈希及长度记录在 `assets/characters/voice-catalog.json`。录音依次尝试 MP3、OGG、WAV，缺失保持静音。

v7.2 已绑定全部事件类别，触发条件见 RELEASE_NOTES_v7.2.md。四个阶段逐段演出；stage_5 是高累计失分末位结算的附加台词，不新增第五阶段。生成工具的配置及原始台词留在原 E 盘文件夹，游戏运行不依赖该工具或语音服务。

新增录音后重新导入会同时生成 voice-catalog.json / voice-catalog.js；新角色有相应事件录音和清单条目即可由统一事件播放器读取。普通语音与阶段语音共用单通道，未录制的事件保持静音。

## 随机隐藏身份（v7.3）

character-random 是固定保留 ID，不应复制到 roster 作为第七个女性角色。它的成年男性剪影在 assets/characters/character-random/stage-0.png。随机池仅使用 roster 的女性条目；首次跨门槛从本场未出现者中抽取，身份在本场固定。新增女性会自动进入未登场候选池。首段专用惊讶字幕没有录音时静音，后续阶段使用选中角色的正常录音。
