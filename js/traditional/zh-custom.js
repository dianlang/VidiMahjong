/* Chinese localization + replaceable character/wardrobe-stage overlay.
 * This file is injected after the original VidiMahjong scripts. It deliberately
 * leaves the upstream riichi engine, yaku, fu/scoring and WebSocket protocol intact.
 */
(() => {
  if (typeof I18N === 'undefined' || typeof setLang !== 'function') return;

  const zh = {
    tradSetupTitle: '四人立直麻将',
    tradSetupSubtitle: '选择真人座位，其余座位由 AI 补位。',
    humanPlayers: '真人玩家',
    startMatch: '开始对局',
    windE: '东家', windS: '南家', windW: '西家', windN: '北家',
    you: '你', bot: 'AI',
    wallLeft: '牌山剩余',
    roundLabel: '场风', handLabel: '局数', doraLabel: '宝牌指示牌',
    pointsLabel: '点数',
    riichiBtn: '立直', tsumoBtn: '自摸', ronBtn: '荣和',
    ponBtn: '碰', chiBtn: '吃', kanBtn: '杠', passBtn: '过',
    waitingOthers: '等待其他玩家行动……',
    yourTurnDiscard: '轮到你了，请选择一张牌打出。',
    tsumoWinTitle: '自摸！', ronWinTitle: '荣和！',
    exhaustiveDrawTitle: '荒牌流局',
    tenpaiLabel: '听牌', notenLabel: '未听牌',
    yakuLabel: '役种', hanLabel: '番', fuLabel: '符',
    totalPoints: '点', nextHand: '下一局',
    matchEndTitle: '对局结束', finalStandings: '最终排名',
    riichiSticksLabel: '场上立直棒',
    noYakuWarning: '当前手牌没有役种，不能和牌。',
    playLocal: '本地对局', playOnline: '在线联机',
    onlineIntro: '创建私人房间并分享房间码，或加入朋友的房间。',
    serverUrlLabel: '服务器地址',
    createRoom: '创建房间', joinRoom: '加入房间',
    roomCodeLabel: '房间码', roomCodePlaceholder: '例如 A7K2P',
    yourRoomCode: '你的房间码',
    waitingForPlayers: '等待玩家加入……',
    startOnlineMatch: '开始对局',
    connecting: '正在连接……',
    connectionError: '无法连接服务器，请检查地址。',
    roomNotFound: '没有找到这个房间。',
    roomFull: '房间已满或对局已经开始。',
    playerConnected: '已连接', playerWaiting: '等待连接',
    onlineSeatFillNote: '开始后，空座位将由 AI 补位。',
    howToPlay: '玩法说明', backToMenu: '返回主菜单', back: '返回',
    developedBy: '原项目作者',
    characterName: '角色',
    characterArtPending: '立绘待填充',
    characterInitial: '初始服装',
    characterStage1: '服装阶段一',
    characterStage2: '服装阶段二',
    characterStage3: '服装阶段三',
    characterStage4: '最终阶段',
    clothingStage: '服装阶段',
    lossProgress: '本场累计失分',
    lossProgressHint: '累计失分只增不减，赢分不恢复阶段，新对局从初始阶段开始。',
    characterSelectTitle: '选择你的角色',
    characterSelectHint: '选择与你同席的角色。',
    characterSelectStage: '阶段',
    characterSelected: '已选择',
    characterVoice: '语音与音效', characterVoiceOn: '开启', characterVoiceOff: '关闭',
    characterVoiceHint: '累计失分达到阈值后阶段只升不退；切换时播放短音效、过渡动效及角色台词。赢回点数不会恢复服装；大胜有专属反应。音频文件可后续补充。'
  };

  I18N.zh = Object.assign({}, I18N.en || {}, zh);
  if (I18N.en) Object.assign(I18N.en, {
    characterName: 'Character', characterArtPending: 'Art placeholder',
    characterInitial: 'Initial outfit', characterStage1: 'Outfit stage 1',
    characterStage2: 'Outfit stage 2', characterStage3: 'Outfit stage 3',
    characterStage4: 'Final stage', clothingStage: 'Outfit stage',
    lossProgress: 'Cumulative match loss',
    characterSelectTitle: 'Choose your character',
    characterSelectHint: 'Choose your companion at the table.',
    characterSelectStage: 'Stage', characterSelected: 'Selected',
    characterVoice: 'Voice & SFX', characterVoiceOn: 'On', characterVoiceOff: 'Off',
    characterVoiceHint: 'Outfit stages only advance based on cumulative losses. Winning points does not reverse stages. Plays light transition SFX and character lines; win cues are optional. All characters are adults.'
  });
  try { localStorage.setItem('vidimahjong-lang', 'zh'); } catch (_) {}
  try { currentLang = 'zh'; } catch (_) {}
  try { setStoredLang('zh'); } catch (_) {}

  // Keep the existing language toggle, but change it to Chinese / English.
  const langToggle = document.getElementById('lang-toggle');
  if (langToggle) {
    const opts = langToggle.querySelectorAll('.lang-opt');
    if (opts[0]) {
      opts[0].dataset.langOpt = 'zh';
      opts[0].textContent = '中文';
    }
    if (opts[1]) {
      opts[1].dataset.langOpt = 'en';
      opts[1].textContent = 'EN';
    }
    langToggle.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      setLang(currentLang === 'zh' ? 'en' : 'zh');
    }, true);
  }

  const originalApplyLang = applyLang;
  applyLang = function () {
    originalApplyLang();
    document.documentElement.lang = currentLang === 'zh' ? 'zh-CN' : currentLang === 'pt' ? 'pt-PT' : 'en';
    refreshCharacterPickers();
  };

  document.title = '雀夜 · 四人立直麻将';
  document.querySelectorAll('.brand-logo').forEach((logo) => {
    logo.innerHTML = '<span class="brand-vidi">雀</span><span class="brand-mahjong">夜</span>';
    logo.setAttribute('aria-label', '雀夜');
  });

  const registry = globalThis.QueYeCharacters;
  const CHARACTER_IDS = registry.ids;
  const CHARACTER_NAMES = Object.fromEntries(registry.entries.map(c => [c.id, c.name]));
  const STAGE_VOICE_LINES = Object.fromEntries(registry.entries.map(c => [c.id, c.stageLines]));
  const normalizeCharacterId = value => registry.normalize(value);
  function readSelectedCharacterId() {
    try { return normalizeCharacterId(localStorage.getItem('vidimahjong-character-id')); }
    catch (_) { return CHARACTER_IDS[0]; }
  }
  let selectedCharacterId = readSelectedCharacterId();
  let randomCharacter = false;
  try { randomCharacter = localStorage.getItem('vidimahjong-character-random') === 'on'; } catch (_) {}
  let localHumanCharacterSeat = 0;
  let localCharacterAssignments = {};
  let voiceEnabled = (() => {
    try { return localStorage.getItem('vidimahjong-character-voice') !== 'off'; }
    catch (_) { return true; }
  })();
  function updateVoiceSwitches() {
    const dict = I18N[currentLang] || I18N.en || {};
    document.querySelectorAll('.character-voice-toggle').forEach((button) => {
      button.textContent = `${dict.characterVoice || '角色语音'}：${voiceEnabled ? (dict.characterVoiceOn || '开启') : (dict.characterVoiceOff || '关闭')}`;
      button.setAttribute('aria-pressed', String(voiceEnabled));
    });
    document.querySelectorAll('.character-voice-hint').forEach((element) => {
      element.textContent = dict.characterVoiceHint || '';
    });
  }
  function toggleCharacterVoice() {
    voiceEnabled = !voiceEnabled;
    try { localStorage.setItem('vidimahjong-character-voice', voiceEnabled ? 'on' : 'off'); } catch (_) {}
    updateVoiceSwitches();
    if (!voiceEnabled && cancelPlayingVoice) cancelPlayingVoice();
  }

  function refreshCharacterPickers() {
    const dict = I18N[currentLang] || I18N.en || {};
    document.querySelectorAll('[data-character-picker]').forEach((card) => {
      const title = card.querySelector('.character-select-title');
      const hint = card.querySelector('.character-select-hint');
      if (title) title.textContent = dict.characterSelectTitle || 'Choose your character';
      if (hint) hint.textContent = dict.characterSelectHint || '';
      card.querySelectorAll('.character-choice').forEach((button) => {
        const id = button.dataset.characterId;
        const name = button.querySelector('.character-choice-name');
        const chosen = id === (randomCharacter ? 'random' : selectedCharacterId);
        if (name) name.textContent = id === 'random' ? (currentLang === 'zh' ? '随机' : 'Random') : CHARACTER_NAMES[id];
        button.classList.toggle('is-selected', chosen);
        button.setAttribute('aria-pressed', String(chosen));
        const badge = button.querySelector('.character-choice-selected');
        if (badge) badge.textContent = chosen ? (dict.characterSelected || 'Selected') : '';
        button.querySelectorAll('.character-stage-slot-label').forEach((label, i) => {
          label.textContent = `${dict.characterSelectStage || 'Stage'} ${i}`;
        });
      });
      previewCharacter(card, randomCharacter ? 'random' : selectedCharacterId);
    });
    updateVoiceSwitches();
  }

  function setSelectedCharacterId(id) {
    randomCharacter = id === 'random';
    if (!randomCharacter) selectedCharacterId = normalizeCharacterId(id);
    try {
      localStorage.setItem('vidimahjong-character-id', selectedCharacterId);
      localStorage.setItem('vidimahjong-character-random', randomCharacter ? 'on' : 'off');
    } catch (_) {}
    refreshCharacterPickers();
  }
  function resolveRandomCharacter() {
    if (!randomCharacter) return;
    selectedCharacterId = CHARACTER_IDS[Math.floor(Math.random() * CHARACTER_IDS.length)];
    try { localStorage.setItem('vidimahjong-character-id', selectedCharacterId); } catch (_) {}
  }
  function previewCharacter(card, id) {
    const preview = card.querySelector('.character-fighter-stage');
    if (!preview) return;
    const random = id === 'random';
    preview.classList.toggle('is-random', random);
    preview.querySelector('.fighter-name').textContent = random ? (currentLang === 'zh' ? '随机' : 'RANDOM') : CHARACTER_NAMES[id];
    preview.querySelector('.fighter-number').textContent = random ? 'RANDOM SELECT' : `PLAYER SELECT / ${id.slice(-2)}`;
    preview.querySelector('.fighter-tagline').textContent = random ? (currentLang === 'zh' ? '这一席，交给缘分。' : 'A new pick when the match starts.') : (currentLang === 'zh' ? registry.get(id).tagline : 'Take your seat tonight.');
    const image = preview.querySelector('img');
    image.hidden = random;
    if (!random) {
      const source = `assets/characters/${id}/stage-0.png`;
      if (image.getAttribute('src') !== source) image.src = source;
      image.alt = CHARACTER_NAMES[id];
    }
  }

  function createCharacterPicker() {
    const card = document.createElement('div');
    card.className = 'setup-card character-select-card';
    card.dataset.characterPicker = 'true';
    card.innerHTML = `
      <p class="setup-label character-select-title"></p>
      <p class="character-select-hint"></p>
      <div class="character-fighter-stage">
        <div class="fighter-copy"><small class="fighter-number"></small><h2 class="fighter-name"></h2><p class="fighter-tagline"></p></div>
        <span class="fighter-random-mark" aria-hidden="true">?</span><img alt="">
        <span class="fighter-ready" aria-hidden="true">CHOOSE YOUR CHARACTER</span>
      </div>
      <div class="character-choice-grid"></div>`;
    const grid = card.querySelector('.character-choice-grid');
    [...CHARACTER_IDS, 'random'].forEach((id) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'character-choice';
      button.dataset.characterId = id;
      button.setAttribute('aria-label', id === 'random' ? '随机选择角色' : CHARACTER_NAMES[id]);
      const head = document.createElement('div');
      head.className = 'character-choice-head';
      const name = document.createElement('span');
      name.className = 'character-choice-name';
      name.textContent = id === 'random' ? '随机' : CHARACTER_NAMES[id];
      const badge = document.createElement('span');
      badge.className = 'character-choice-selected';
      head.append(name, badge);
      button.appendChild(head);

      const avatar = document.createElement('div');
      avatar.className = 'character-choice-avatar';
      if (id !== 'random') {
        const crop = registry.get(id).avatar;
        avatar.style.setProperty('--avatar-scale', crop.scale);
        avatar.style.setProperty('--avatar-origin', crop.origin);
      }
      const img = document.createElement('img');
      if (id !== 'random') img.src = `assets/characters/${id}/stage-0.png`;
      else { img.hidden = true; button.classList.add('character-choice--random'); }
      img.alt = '';
      img.loading = 'lazy';
      img.addEventListener('load', () => avatar.classList.add('has-art'));
      img.addEventListener('error', () => { img.hidden = true; });
      const fallback = document.createElement('span');
      fallback.textContent = id === 'random' ? '?' : CHARACTER_NAMES[id].slice(0, 1);
      avatar.append(img, fallback);
      button.prepend(avatar);
      button.addEventListener('click', () => setSelectedCharacterId(id));
      button.addEventListener('mouseenter', () => previewCharacter(card, id));
      button.addEventListener('focus', () => previewCharacter(card, id));
      grid.appendChild(button);
    });
    card.addEventListener('mouseleave', () => previewCharacter(card, randomCharacter ? 'random' : selectedCharacterId));
    grid.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      const choices = Array.from(grid.querySelectorAll('button'));
      const index = choices.indexOf(event.target);
      if (index < 0) return;
      event.preventDefault();
      const step = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
      choices[(index + step + choices.length) % choices.length].focus();
    });
    const voiceOptions = document.createElement('div');
    voiceOptions.className = 'character-voice-options';
    const voiceButton = document.createElement('button');
    voiceButton.type = 'button';
    voiceButton.className = 'character-voice-toggle';
    voiceButton.addEventListener('click', toggleCharacterVoice);
    const voiceHint = document.createElement('span');
    voiceHint.className = 'character-voice-hint';
    voiceOptions.append(voiceButton, voiceHint);
    card.appendChild(voiceOptions);
    return card;
  }

  function mountCharacterPickers() {
    const localSetup = document.getElementById('setup-screen');
    const localSeatCard = localSetup && localSetup.querySelector('.setup-card');
    if (localSeatCard && !localSetup.querySelector('[data-character-picker]')) {
      localSeatCard.insertAdjacentElement('afterend', createCharacterPicker());
    }
    const onlineCard = document.getElementById('online-connect-card');
    if (onlineCard && !onlineCard.querySelector('[data-character-picker]')) {
      const picker = createCharacterPicker();
      const actions = onlineCard.querySelector('.online-actions');
      if (actions) onlineCard.insertBefore(picker, actions);
      else onlineCard.appendChild(picker);
    }
    refreshCharacterPickers();
  }
  mountCharacterPickers();

  // Monotonic stage progression per match. Winning points cannot undo a stage.
  // Local scores are tracked here; online losses are read from the server's
  // authoritative cumulativeLosses so reconnect/reload preserves the stage.
  const stageThresholds = [0, 3000, 8000, 15000, 25000];
  const BIG_WIN_THRESHOLD = 8000;
  const stageKeys = ['characterInitial', 'characterStage1', 'characterStage2', 'characterStage3', 'characterStage4'];
  const WIN_VOICE_LINES = Object.fromEntries(registry.entries.map(c => [c.id, c.winLine]));
  const lossTrackers = {
    local: { key: null, last: null, losses: [0, 0, 0, 0], gains: [0, 0, 0, 0], revision: 0, lastWinRevision: 0 },
    online: { key: null, last: null, losses: [0, 0, 0, 0], gains: [0, 0, 0, 0], revision: null, lastWinRevision: null }
  };
  const displayedStages = { local: new Map(), online: new Map() };
  const voiceQueue = [];
  let playingVoice = null;
  let cancelPlayingVoice = null;
  let cueQueueActive = false;
  let cueTimeout = null;
  const cueEpoch = { local: 0, online: 0 };
  const soundCache = new Map();

  function resetStagePresentation(mode) {
    window.QueYeStageShow?.cancel(mode);
    cueEpoch[mode]++;
    displayedStages[mode].clear();
    // Don't let cues from the previous match play during the new match.
    for (let i = voiceQueue.length - 1; i >= 0; i--) {
      if (voiceQueue[i].mode === mode) voiceQueue.splice(i, 1);
    }
    if (cancelPlayingVoice) cancelPlayingVoice();
    const cue = document.getElementById('character-voice-cue');
    if (cue) cue.classList.remove('is-visible');
    clearTimeout(cueTimeout);
  }

  function showCharacterCue(characterId, stage, kind = 'stage') {
    const line = kind === 'win' ? WIN_VOICE_LINES[characterId] : STAGE_VOICE_LINES[characterId]?.[stage];
    if (!line) return;
    let cue = document.getElementById('character-voice-cue');
    if (!cue) {
      cue = document.createElement('div');
      cue.id = 'character-voice-cue';
      cue.className = 'character-voice-cue';
      cue.setAttribute('role', 'status');
      cue.setAttribute('aria-live', 'polite');
      document.body.appendChild(cue);
    }
    cue.textContent = `${CHARACTER_NAMES[characterId] || '角色'}：${line}`;
    cue.classList.add('is-visible');
    clearTimeout(cueTimeout);
    cueTimeout = setTimeout(() => cue.classList.remove('is-visible'), 3000);
  }

  // Small shipped SFX files make transitions audible without requiring external libraries.
  // The same preference disables both SFX and character voices, not captions.
  function playStageSfx(stage, kind = 'stage') {
    if (!voiceEnabled || typeof Audio === 'undefined') return;
    const filename = kind === 'win' ? 'win.wav' : `stage-${stage}.wav`;
    let sound = soundCache.get(filename);
    if (!sound) {
      sound = new Audio(`assets/sfx/${filename}`);
      sound.preload = 'auto';
      sound.volume = 0.22;
      soundCache.set(filename, sound);
    }
    try {
      sound.pause();
      sound.currentTime = 0;
      sound.play().catch(() => {});
    } catch (_) { /* Audio can be blocked until the user's next gesture. */ }
  }

  function playAudioPath(characterId, name, extension) {
    return new Promise((resolve) => {
      if (!voiceEnabled || typeof Audio === 'undefined') { resolve(false); return; }
      const audio = new Audio(`assets/characters/${characterId}/voice/${name}.${extension}`);
      playingVoice = audio;
      let settled = false;
      const timer = setTimeout(() => finish(false), 12000);
      function finish(ok) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        audio.pause();
        audio.removeAttribute('src');
        if (playingVoice === audio) playingVoice = null;
        if (cancelPlayingVoice === stopVoice) cancelPlayingVoice = null;
        resolve(ok);
      }
      function stopVoice() { finish(false); }
      cancelPlayingVoice = stopVoice;
      audio.addEventListener('ended', () => finish(true), { once: true });
      audio.addEventListener('error', () => finish(false), { once: true });
      audio.play().catch(() => finish(false));
    });
  }

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  async function flushCharacterVoiceQueue() {
    if (cueQueueActive) return;
    cueQueueActive = true;
    try {
      while (voiceQueue.length) {
        const { mode, epoch, characterId, stage, kind } = voiceQueue.shift();
        // Give the light portrait transition room to start before speaking.
        await sleep(200);
        if (kind === 'win') await (window.QueYeStageShow?.whenIdle() || Promise.resolve());
        if (epoch !== cueEpoch[mode]) continue;
        showCharacterCue(characterId, stage, kind);
        if (!voiceEnabled) { await sleep(450); continue; }
        const filename = kind === 'win' ? 'win' : `stage-${stage}`;
        const success = await playAudioPath(characterId, filename, 'mp3');
        const fallbackSuccess = !success && voiceEnabled ? await playAudioPath(characterId, filename, 'ogg') : success;
        if (!fallbackSuccess) await sleep(1250); // leave readable subtitle if files are absent
      }
    } finally { cueQueueActive = false; }
  }

  function queueCharacterCue(mode, characterId, stage, kind = 'stage') {
    voiceQueue.push({ mode, epoch: cueEpoch[mode], characterId, stage, kind });
    if (kind === 'stage') playStageSfx(stage);
    else playStageSfx(0, 'win');
    void flushCharacterVoiceQueue();
  }

  function stageForLoss(loss) {
    let stage = 0;
    for (let i = 1; i < stageThresholds.length; i++) {
      if (loss >= stageThresholds[i]) stage = i;
    }
    return stage;
  }

  function updateLossTracker(mode, key, scores, serverLosses = null, serverRevision = null, serverGains = null) {
    const tracker = lossTrackers[mode];
    const first = tracker.key !== key || !tracker.last;
    if (first) {
      tracker.key = key;
      tracker.last = scores.slice();
      tracker.losses = Array.isArray(serverLosses) ? serverLosses.slice(0, 4) : [0, 0, 0, 0];
      tracker.gains = [0, 0, 0, 0];
      tracker.revision = serverRevision == null ? 0 : serverRevision;
      tracker.lastWinRevision = tracker.revision;
      resetStagePresentation(mode);
      return tracker.losses;
    }
    const deltas = scores.map((score, i) => Number(score) - Number(tracker.last[i]));
    if (Array.isArray(serverLosses) && serverLosses.length === 4) {
      // In online mode the room owns cumulative-loss history; reconnects cannot regress.
      tracker.losses = serverLosses.map((n, i) => Math.max(Number(n) || 0, tracker.losses[i] || 0));
      if (serverRevision != null && serverRevision !== tracker.revision) {
        tracker.gains = Array.isArray(serverGains) ? serverGains.slice(0, 4) : deltas.map((d) => Math.max(0, d));
        tracker.revision = serverRevision;
      } else tracker.gains = [0, 0, 0, 0];
    } else {
      let changed = false;
      tracker.gains = deltas.map((delta, i) => {
        if (delta) changed = true;
        if (delta < 0) tracker.losses[i] += -delta;
        return Math.max(0, delta);
      });
      if (changed) tracker.revision++;
    }
    tracker.last = scores.slice();
    return tracker.losses;
  }

  function notifyBigWins(mode, characterAssignments) {
    const tracker = lossTrackers[mode];
    if (tracker.lastWinRevision === tracker.revision) return;
    tracker.lastWinRevision = tracker.revision;
    for (let seat = 0; seat < 4; seat++) {
      if (tracker.gains[seat] >= BIG_WIN_THRESHOLD) {
        queueCharacterCue(mode, normalizeCharacterId(characterAssignments[seat]), 0, 'win');
      }
    }
  }

  function characterMarkup(seatIndex, loss, characterId, initialStage) {
    const safeCharacterId = normalizeCharacterId(characterId);
    const stage = stageForLoss(loss);
    const stageText = I18N[currentLang]?.[stageKeys[stage]] || I18N.en?.[stageKeys[stage]] || `阶段 ${stage}`;
    const artPath = `assets/characters/${safeCharacterId}/stage-${initialStage}.png`;
    const progress = Math.min(100, Math.round(stage / 4 * 100));
    return `
      <div class="character-widget" data-character-seat="${seatIndex}" data-character-id="${safeCharacterId}" data-character-stage="${stage}">
        <div class="character-portrait">
          <img class="character-art character-art--base" src="${artPath}" alt="" loading="eager">
          <img class="character-art character-art--incoming" alt="" hidden>
          <div class="character-placeholder">
            <span class="character-placeholder-mark">${['東','南','西','北'][seatIndex]}</span>
            <span>${I18N[currentLang]?.characterArtPending || '立绘待填充'}</span>
          </div>
          <div class="character-stage-flash" aria-hidden="true"></div>
        </div>
        <div class="character-info">
          <div class="character-name">${registry.escapeHTML(CHARACTER_NAMES[safeCharacterId] || safeCharacterId)}</div>
          <div class="character-stage">${I18N[currentLang]?.clothingStage || '服装阶段'} ${stage}/4 · ${stageText}</div>
          <div class="character-progress"><span style="width:${progress}%"></span></div>
          <div class="character-loss">${I18N[currentLang]?.lossProgress || '本场累计失分'}：${Math.floor(loss).toLocaleString()}</div>
        </div>
      </div>`;
  }

  function animatePortrait(widget, characterId, nextStage) {
    const portrait = widget.querySelector('.character-portrait');
    const base = widget.querySelector('.character-art--base');
    const incoming = widget.querySelector('.character-art--incoming');
    const nextSrc = `assets/characters/${characterId}/stage-${nextStage}.png`;
    let completed = false;
    function finish() {
      if (completed || !widget.isConnected) return;
      completed = true;
      portrait.classList.remove('is-changing');
      if (!incoming.hidden && incoming.naturalWidth > 0) {
        base.src = nextSrc;
        base.hidden = false;
        widget.classList.add('has-art');
      }
      incoming.hidden = true;
      incoming.removeAttribute('src');
    }
    // Flash also works when optional PNGs have not been supplied yet.
    portrait.classList.add('is-stage-pulse');
    setTimeout(() => portrait.classList.remove('is-stage-pulse'), 380);
    incoming.onload = () => {
      if (!widget.isConnected || completed) return;
      incoming.hidden = false;
      widget.classList.add('has-art');
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (widget.isConnected) portrait.classList.add('is-changing');
      }));
    };
    incoming.onerror = () => { incoming.hidden = true; };
    incoming.src = nextSrc;
    setTimeout(finish, 380);
  }

  function injectWidget(container, seatIndex, points, loss, characterId, self = false, mode = 'local') {
    if (!container) return;
    const safeCharacterId = normalizeCharacterId(characterId);
    const stage = stageForLoss(loss);
    const seen = displayedStages[mode];
    const previousStage = seen.get(seatIndex);
    const advancing = previousStage !== undefined && stage > previousStage && stage > 0;
    // The upstream opponent renderer rebuilds its panels on every state update.
    // Recreate with the PREVIOUS art when advancing, then cross-fade into new art.
    const initialStage = advancing ? previousStage : stage;
    const existing = container.querySelector(`:scope > .character-widget[data-character-seat="${seatIndex}"]`);
    if (existing) existing.remove();
    const wrapper = document.createElement('div');
    wrapper.innerHTML = characterMarkup(seatIndex, loss, safeCharacterId, initialStage).trim();
    const widget = wrapper.firstElementChild;
    if (self) widget.classList.add('character-widget--self');
    const image = widget.querySelector('.character-art--base');
    image.addEventListener('load', () => widget.classList.add('has-art'));
    image.addEventListener('error', () => { image.hidden = true; });
    container.insertAdjacentElement('afterbegin', widget);
    // Cached images can finish loading before the listener was attached.
    if (image.complete && image.naturalWidth > 0) widget.classList.add('has-art');
    seen.set(seatIndex, Math.max(previousStage ?? 0, stage));
    if (advancing) {
      animatePortrait(widget, safeCharacterId, stage);
      if (window.QueYeStageShow) {
        if (mode === 'local') window.QueYeStageShow.enqueue({mode,seat:seatIndex,characterId:safeCharacterId,previousStage,stage});
      } else queueCharacterCue(mode, safeCharacterId, stage);
    }
  }
  let lastLocalMatch = null;

  function buildLocalCharacterAssignments(primarySeat) {
    const result = {};
    result[primarySeat] = selectedCharacterId;
    const remaining = CHARACTER_IDS.filter((id) => id !== selectedCharacterId);
    for (let seat = 0; seat < 4; seat++) {
      if (seat !== primarySeat) result[seat] = remaining.shift() || CHARACTER_IDS[seat];
    }
    return result;
  }

  function decorateLocalOpponents() {
    if (typeof match === 'undefined' || !match || !match.engine) return;
    const game = match.engine;
    const losses = updateLossTracker('local', match, game.seats.map((s) => s.points));
    const panels = document.querySelectorAll('#opponents-row .opponent-panel');
    panels.forEach((panel, offset) => {
      const seatIndex = (viewSeat + offset + 1) % 4;
      injectWidget(panel, seatIndex, game.seats[seatIndex].points, losses[seatIndex], localCharacterAssignments[seatIndex] || CHARACTER_IDS[seatIndex]);
    });
    notifyBigWins('local', localCharacterAssignments);
  }

  function decorateLocalSelf() {
    if (typeof match === 'undefined' || !match || !match.engine) return;
    const game = match.engine;
    const losses = lossTrackers.local.losses;
    const seatIndex = viewSeat;
    injectWidget(document.querySelector('.human-panel'), seatIndex, game.seats[seatIndex].points, losses[seatIndex], localCharacterAssignments[seatIndex] || CHARACTER_IDS[seatIndex], true);
  }

  const localStartButton = document.getElementById('btn-start-match');
  if (localStartButton) {
    localStartButton.addEventListener('click', () => {
      resolveRandomCharacter();
      const humanSeats = Array.from(document.querySelectorAll('#seat-picker .seat-toggle.is-human'))
        .map((button) => Number(button.dataset.seat)).filter((seat) => Number.isInteger(seat));
      localHumanCharacterSeat = humanSeats.length ? humanSeats[0] : 0;
      localCharacterAssignments = buildLocalCharacterAssignments(localHumanCharacterSeat);
      lossTrackers.local.key = null;
      lossTrackers.local.last = null;
      lossTrackers.local.losses = [0, 0, 0, 0];
      resetStagePresentation('local');
    }, true);
  }
  ['btn-create-room', 'btn-join-room'].forEach((id) => {
    document.getElementById(id)?.addEventListener('click', resolveRandomCharacter, true);
  });

  if (typeof renderOpponents === 'function') {
    const originalRenderOpponents = renderOpponents;
    renderOpponents = function () {
      originalRenderOpponents();
      if (typeof match !== 'undefined' && match && match !== lastLocalMatch) {
        lastLocalMatch = match;
        lossTrackers.local.key = null;
        lossTrackers.local.last = null;
        lossTrackers.local.losses = [0, 0, 0, 0];
        resetStagePresentation('local');
      }
      decorateLocalOpponents();
    };
  }
  if (typeof renderHumanPanel === 'function') {
    const originalRenderHumanPanel = renderHumanPanel;
    renderHumanPanel = function () {
      originalRenderHumanPanel();
      decorateLocalSelf();
    };
  }

  function buildOnlineCharacterAssignments(st, mySeat) {
    const result = {};
    const used = new Set();
    st.seats.forEach((seat, index) => {
      const id = seat && CHARACTER_IDS.includes(seat.characterId) ? seat.characterId : null;
      if (id) { result[index] = id; used.add(id); }
    });
    if (mySeat >= 0 && mySeat < 4 && !result[mySeat]) {
      result[mySeat] = selectedCharacterId;
      used.add(selectedCharacterId);
    }
    for (let seat = 0; seat < 4; seat++) {
      if (result[seat]) continue;
      const available = CHARACTER_IDS.find((id) => !used.has(id));
      result[seat] = available || CHARACTER_IDS[seat];
      used.add(result[seat]);
    }
    return result;
  }

  if (typeof renderOnlineTable === 'function') {
    const originalRenderOnlineTable = renderOnlineTable;
    renderOnlineTable = function (st) {
      originalRenderOnlineTable(st);
      if (!st || !Array.isArray(st.seats) || !st.you) return;
      const roomKey = onlineRoomCode || 'online-room';
      const losses = updateLossTracker('online', roomKey, st.seats.map((s) => s.points), st.cumulativeLosses, st.scoreRevision, st.recentGains);
      const mySeat = Number.isInteger(st.you.seat) ? st.you.seat : onlineSeat;
      const characterAssignments = buildOnlineCharacterAssignments(st, mySeat);
      const panels = document.querySelectorAll('#opponents-row .opponent-panel');
      panels.forEach((panel, offset) => {
        const seatIndex = (mySeat + offset + 1) % 4;
        injectWidget(panel, seatIndex, st.seats[seatIndex].points, losses[seatIndex], characterAssignments[seatIndex], false, 'online');
      });
      injectWidget(document.querySelector('.human-panel'), mySeat, st.you.points, losses[mySeat], characterAssignments[mySeat], true, 'online');
      notifyBigWins('online', characterAssignments);
    };
  }

  // Translate a few messages that the upstream code currently constructs inline.
  if (typeof showToast === 'function') {
    const originalShowToast = showToast;
    showToast = function (message) {
      if (currentLang === 'zh') {
        const translations = {
          'Ligação ao servidor perdida.': '与服务器的连接已断开。',
          'Connection to server lost.': '与服务器的连接已断开。',
          'Escolhe pelo menos 1 jogador humano.': '请至少选择一名真人玩家。',
          'Pick at least 1 human player.': '请至少选择一名真人玩家。'
        };
        message = translations[message] || message;
      }
      originalShowToast(message);
    };
  }
})();
