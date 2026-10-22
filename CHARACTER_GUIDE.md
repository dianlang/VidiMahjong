# 添加角色

角色名、顺序、头像裁切和台词统一放在 `patch/assets/characters/roster.js`。选人、随机选人、牌桌字幕、结算 CG 和联机角色校验均读取此配置，新增第七名角色无需修改这些功能的代码。

1. 在 `roster.js` 返回的数组末尾复制一条角色记录，把 `id` 改成未使用的 `character-07`，填写 `name`。ID 只允许 `character-` 加小写字母、数字、连字符；保存后不要再改已有角色的 ID。
2. 建立 `patch/assets/characters/character-07/`，放入 `stage-0.png` 至 `stage-4.png`。初始头像取自 `stage-0.png`；`avatar.scale` 控制放大倍数（1～5），`avatar.origin` 控制裁切中心，例如 `50% 18%`。所有角色须为成年人，画面非露骨。
3. 可选加入 `defeat.png`；缺失时结算使用 `stage-4.png`。可选在 `voice/` 放入 `stage-1.mp3` 至 `stage-4.mp3` 和 `win.mp3`（也支持 OGG）；台词填写 `stageLines` 和 `winLine`。缺少声音仍显示字幕，缺少图片仍可打牌。
4. 双击 `build.bat` 生成完整游戏包。若直接更新当前完整工程，同时把配置和素材复制到根目录 `assets/characters/`，不要只改运行文件而漏掉 `patch/`。
5. 联机服务器在启动时读取同一份配置。新增角色后，服务器和所有玩家要更新同一版本，并重启服务器；现有房间会随重启关闭。

例如新增记录可以只先填写：

```js
{ id: 'character-07', name: '新角色', avatar: { scale: 2.65, origin: '50% 18%' } }
```

数组条目之间要有逗号。省略台词会使用默认文本。新增角色自动出现在随机按钮之前；无需增加 HTML 按钮或修改服务器的角色白名单。

共享逻辑位于 `patch/js/traditional/characters.js`，负责校验、默认值和安全目录名。不要在该文件重复维护角色名单。

测试：Windows / Node.js 下执行 `node --test tests/v6-modules.test.cjs`；界面仍需检查新图片的头像裁切、缺图回退和手机布局。
