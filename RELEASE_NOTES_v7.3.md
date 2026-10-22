# 雀夜 v7.3 · 随机隐藏身份

选择已有的随机按钮后，使用 character-random 特殊身份进入游戏，显示本次生成的成年男性透明剪影。它不加入六女性角色名单，也不进入女性抽取池。

累计失分首次达到原有 3000 阈值时，从本场从未登场的女性角色中随机选取。多名随机玩家同时跨门槛会按座位依次挑选，排除刚揭晓的角色，避免相互重复。首次演出从男性剪影切换至选中女性的 stage-1，字幕为「诶？我怎么变成XXX了」，XXX 替换为角色名；这句没有录音，保持静音，不播放不对应的阶段录音，不调用系统朗读。

若一次跨多个门槛，第一段完成变身，后续继续同一角色的 stage-1→2→3→4 和对应阶段语音，不再次变身。赢回分数不回退身份或阶段，新场重新显示男性剪影。随机角色尚未变身时没有女性声线录音，因此行动配音保持静音。

本地由共享 random-character 模块从当前固定分配中排除已登场角色。联机由 server/random-character 扩展统一给机器人分配公开角色，并根据服务器累计失分选取新形态；客户端不提交目标角色。buildStateFor 各座位新增 randomPending，stagePresentation 第一段附 fromCharacterId、characterId、transformationLine、silent 表现字段。断线重连保留服务器已定身份，不能利用重新发送随机选项来重抽。前后端必须同版本，并重启 Node 服务；现存房间会关闭。

六个受保护规则文件、计分公式、四个失分门槛与固定上游提交保持不变；神秘身份由 characters.js 的保留 ID 支持，不把男性剪影添加成新的可选女性角色。未变身的末位结算也保留剪影，不错误回退到另一名女性。

## 验证与限制

Windows / Node.js v24.21.0：node --test tests/random-character.test.cjs 检查门槛、无重复、重开重置、服务器选择、连续段元数据、断线重连；node tools/qa-random-character.cjs 检查实际随机按钮、主立绘、精确字幕、首段静音、后续女性语音及本地／联机渲染。完整结果见 PROGRESS.md。素材提示词与生成方式见 assets/characters/character-random/ASSET_INFO.md。

DOM 和 Audio 桩不能替代实机视觉／听感测试；桌面、手机、真人多窗口重连与整场仍待实测。
