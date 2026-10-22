/* QueYe table presentation. Reads the existing renderers' public state only. */
(() => {
  'use strict';
  const byId = (id) => document.getElementById(id);
  const words = {
    zh: { room: '雀夜 · 私人雀馆', practice: '本地练习', online: '好友对局', scores: '本场点数', east: '东风战', wall: '余牌', dora: '宝牌指示', ready: '轮到你了', waiting: '牌局进行中', note: '点击手牌打出 · 金边标记摸入牌', help: '操作说明', sound: '声音', fullscreen: '全屏', you: '你', bot: '电脑', info: '对局情报', subtitle: '一桌四席，今夜相逢。', close: '知道了', helpText: '轮到你时，点击一张手牌打出。出现可用动作时，可选择立直、自摸、吃、碰或杠。键盘左右键选择手牌，回车出牌。每局结算后点击「下一局」继续。', missing: '角色', live: '正在行动', hands: '手牌', scoreUnit: '点', soundOff: '静音', exit: '返回大厅' },
    en: { room: 'QUEYE · PRIVATE ROOM', practice: 'Local practice', online: 'Friends room', scores: 'Match scores', east: 'East round', wall: 'Tiles left', dora: 'Dora indicator', ready: 'Your turn', waiting: 'Hand in progress', note: 'Click to discard · Gold marks the drawn tile', help: 'How to play', sound: 'Sound', fullscreen: 'Fullscreen', you: 'You', bot: 'Bot', info: 'MATCH INFO', subtitle: 'Four seats. One evening.', close: 'Got it', helpText: 'On your turn, click a tile to discard. Available actions appear beside your hand. Use Left / Right to focus a tile and Enter to discard. After each hand, choose Next hand to continue.', missing: 'Character', live: 'Playing', hands: 'Hand', scoreUnit: 'pts', soundOff: 'Muted', exit: 'Back to lobby' }
  };
  const tr = (key) => (words[typeof currentLang === 'string' ? currentLang : 'zh'] || words.en)[key];
  let lastOnlineState = null;
  let mode = 'local';
  let initialized = false;
  let helpOpener = null;
  let portraitOpener = null;
  let featuredSeat = null;
  let portraitSmall = false;
  try { portraitSmall = localStorage.getItem('queye-portrait-size') === 'small'; } catch (_) {}

  function element(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text) node.textContent = text;
    return node;
  }
  function tileName(id) {
    const tile = TILE_TYPES_BY_ID[id];
    const chinese = currentLang === 'zh';
    if (!tile) return chinese ? '未知牌' : 'Unknown tile';
    if (tile.category === 'suit') {
      return chinese ? `${['','一','二','三','四','五','六','七','八','九'][tile.rank]}${{characters:'万',circle:'筒',bamboo:'索'}[tile.suit]}` : `${tile.rank} ${{characters:'Characters',circle:'Dots',bamboo:'Bamboo'}[tile.suit]}`;
    }
    const names = chinese ? {wE:'东风',wS:'南风',wW:'西风',wN:'北风',dR:'红中',dG:'发财',dW:'白板'} : {wE:'East',wS:'South',wW:'West',wN:'North',dR:'Red dragon',dG:'Green dragon',dW:'White dragon'};
    return names[id] || (chinese ? '花牌' : 'Bonus tile');
  }
  function reactionTile(id, called = false) {
    const chip = miniTileChip(id, false);
    chip.classList.add('qy-reaction-tile');
    chip.classList.toggle('is-incoming', called);
    chip.setAttribute('aria-hidden', 'true');
    return chip;
  }
  function presentReaction() {
    if (byId('modal-reaction')?.classList.contains('hidden')) return;
    const state = mode === 'online' ? lastOnlineState : null;
    const game = mode === 'local' && typeof match !== 'undefined' ? match?.engine : null;
    const discard = state?.lastDiscard || game?.lastDiscard;
    if (!discard || !TILE_TYPES_BY_ID[discard.tile]) return;
    const seat = (state?.seats || game?.seats)?.[discard.seat];
    const wind = seat ? t(WIND_KEY[seat.wind]) : '';
    const title = byId('reaction-tile-label');
    title.replaceChildren(element('span', 'qy-discard-caption', currentLang === 'zh' ? `${wind || '对方'}打出` : `${wind || 'Opponent'} discarded`), reactionTile(discard.tile), element('strong', '', tileName(discard.tile)));
    byId('reaction-buttons').querySelectorAll('button').forEach((button) => {
      const raw = button.textContent;
      let label = raw;
      let tiles = [];
      if (raw.startsWith(`${t('chiBtn')} `)) {
        const pair = raw.match(/\b(?:[mps][1-9])\b/g);
        if (!pair || pair.length !== 2) return;
        label = t('chiBtn');
        tiles = [...pair, discard.tile].sort((a,b) => TILE_TYPES_BY_ID[a].rank - TILE_TYPES_BY_ID[b].rank);
      } else if (raw === t('ponBtn')) { tiles = Array(3).fill(discard.tile); }
      else if (raw === t('kanBtn')) { tiles = Array(4).fill(discard.tile); }
      else if (raw === t('passBtn')) { label = currentLang === 'zh' ? '跳过' : 'Skip'; }
      button.replaceChildren(element('span', 'qy-reaction-action', label));
      if (tiles.length) {
        const preview = element('span', 'qy-reaction-tiles');
        let incoming = false;
        tiles.forEach((id) => {
          const called = !incoming && id === discard.tile;
          if (called) incoming = true;
          preview.append(reactionTile(id, called));
        });
        button.append(preview);
      }
      const accessible = label + (tiles.length ? `：${tiles.map(tileName).join('、')}` : '');
      button.setAttribute('aria-label', accessible);
      button.title = accessible;
      button.classList.add('qy-reaction-choice');
      button.classList.toggle('qy-reaction-quad', tiles.length === 4);
    });
  }
  function labeled(node, key) { node.dataset.qyText = key; return node; }
  function tool(label, symbol, action) {
    const button = element('button', 'qy-tool');
    button.type = 'button';
    button.dataset.qyLabel = label;
    button.setAttribute('aria-label', tr(label));
    button.title = tr(label);
    const icon = element('span', 'qy-tool-symbol', symbol);
    icon.setAttribute('aria-hidden', 'true');
    button.append(icon, labeled(element('span'), label));
    button.addEventListener('click', action);
    return button;
  }

  function initTable() {
    if (initialized || !byId('table-screen')) return;
    initialized = true;
    const table = byId('table-screen');
    table.classList.add('qy-table');
    const oldHeader = table.querySelector('.table-header');
    const opponents = byId('opponents-row');
    const human = table.querySelector('.human-panel');
    const center = byId('center-board');
    const header = element('header', 'qy-header');
    const home = element('a', 'qy-brand');
    home.href = 'traditional.html';
    home.setAttribute('aria-label', tr('exit'));
    home.innerHTML = '<span class="qy-seal">雀</span><span class="qy-brand-name">雀夜<small>QUEYE MAHJONG</small></span>';
    const context = element('div', 'qy-header-context');
    context.append(element('span', 'qy-live-dot'), labeled(element('span'), 'room'));
    const tools = element('div', 'qy-tools');
    const sound = tool('sound', '♪', () => {
      document.querySelector('.character-voice-toggle')?.click();
      syncSound();
    });
    sound.id = 'qy-sound';
    const help = tool('help', '?', () => {
      helpOpener = help;
      byId('qy-help-dialog').showModal();
    });
    const fullscreen = tool('fullscreen', '⛶', async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await document.documentElement.requestFullscreen();
      } catch (_) { showToast(currentLang === 'zh' ? '当前窗口不支持全屏' : 'Fullscreen is unavailable'); }
    });
    tools.append(sound, help, fullscreen);
    header.append(home, context, tools);

    const workspace = element('div', 'qy-workspace');
    const arena = element('main', 'qy-arena');
    arena.setAttribute('aria-label', 'Mahjong table');
    const watermark = element('div', 'qy-watermark', '雀 夜');
    watermark.setAttribute('aria-hidden', 'true');
    const tableLabel = element('div', 'qy-table-label');
    tableLabel.append(element('span', '', 'RIICHI MAHJONG'), element('b', '', '四 人 立 直'));
    const console = element('div', 'qy-console');
    const winds = element('div', 'qy-compass');
    for (let i = 0; i < 4; i++) {
      const wind = element('span', `qy-compass-wind qy-compass-wind--${i}`);
      wind.dataset.offset = i;
      winds.appendChild(wind);
    }
    const centerInfo = element('div', 'qy-center-info');
    centerInfo.append(byId('round-info'));
    const wall = element('div', 'qy-wall');
    wall.append(byId('wall-count'), labeled(element('small'), 'wall'));
    centerInfo.append(wall, byId('riichi-sticks-indicator'));
    centerInfo.append(winds);
    console.append(centerInfo);
    const dora = element('div', 'qy-dora');
    dora.append(labeled(element('span', 'qy-dora-label'), 'dora'), element('div', 'qy-dora-tiles'));
    dora.querySelector('.qy-dora-tiles').id = 'qy-dora-tiles';
    dora.append(byId('dora-info'));
    console.append(dora, center);
    arena.append(watermark, tableLabel, opponents, console, human);

    const sidebar = element('aside', 'qy-sidebar');
    const sideTitle = element('div', 'qy-side-title');
    sideTitle.append(labeled(element('small'), 'info'), labeled(element('h2'), 'scores'));
    const badge = element('span', 'qy-mode-badge');
    badge.id = 'qy-mode';
    sideTitle.append(badge);
    const scores = element('div', 'qy-scores');
    scores.id = 'qy-scores';
    const note = element('div', 'qy-side-note');
    note.append(element('span', 'qy-note-mark', '夜'), labeled(element('p'), 'subtitle'), element('small', '', 'PRIVATE RIICHI CLUB'));
    const featured = element('section', 'qy-featured');
    featured.id = 'qy-featured';
    featured.classList.toggle('is-small', portraitSmall);
    const portraitTitle = element('div', 'qy-featured-title');
    const portraitName = element('strong');
    portraitName.id = 'qy-featured-name';
    const portraitStage = element('small');
    portraitStage.id = 'qy-featured-stage';
    portraitTitle.append(portraitName, portraitStage);
    const figure = element('div', 'qy-featured-figure');
    figure.setAttribute('role', 'button');
    figure.setAttribute('tabindex', '0');
    figure.setAttribute('aria-label', '放大查看立绘');
    figure.addEventListener('click', () => openPortrait(figure));
    figure.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openPortrait(figure); }
    });
    const image = element('img', 'qy-featured-image');
    image.id = 'qy-featured-image';
    image.alt = '';
    image.decoding = 'async';
    image.addEventListener('load', () => { image.hidden = false; figure.classList.add('has-art'); });
    image.addEventListener('error', () => {
      if (!image.src.endsWith('/stage-0.png')) image.src = `assets/characters/${image.dataset.character}/stage-0.png`;
      else { image.hidden = true; figure.classList.remove('has-art'); }
    });
    figure.append(image, element('span', 'qy-featured-placeholder', '雀夜'));
    const size = element('button', 'qy-portrait-size');
    size.id = 'qy-portrait-size';
    size.type = 'button';
    size.addEventListener('click', () => {
      portraitSmall = !portraitSmall;
      featured.classList.toggle('is-small', portraitSmall);
      try { localStorage.setItem('queye-portrait-size', portraitSmall ? 'small' : 'large'); } catch (_) {}
      syncPortraitSize();
    });
    featured.append(portraitTitle, figure, size);
    sidebar.append(sideTitle, featured, scores, note);
    workspace.append(arena, sidebar);
    const footer = element('footer', 'qy-footer');
    footer.append(labeled(element('span'), 'note'), element('span', '', 'QUEYE / 立直麻将'));
    oldHeader.remove();
    table.replaceChildren(header, workspace, footer);
    table.addEventListener('click', (event) => {
      const portrait = event.target.closest('.character-portrait');
      if (!portrait) return;
      featuredSeat = Number(portrait.closest('.character-widget').dataset.characterSeat);
      refreshFeatured();
      openPortrait(portrait);
    });
    table.addEventListener('keydown', (event) => {
      if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('.character-portrait')) {
        event.preventDefault();
        event.target.click();
      }
    });

    const dialog = element('dialog', 'qy-help-dialog');
    dialog.id = 'qy-help-dialog';
    dialog.setAttribute('aria-labelledby', 'qy-help-title');
    const title = labeled(element('h2'), 'help');
    title.id = 'qy-help-title';
    const close = labeled(element('button', 'btn btn-primary'), 'close');
    close.type = 'button';
    close.addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => helpOpener?.focus());
    dialog.append(title, labeled(element('p'), 'helpText'), close);
    document.body.appendChild(dialog);
    const viewer = element('dialog', 'qy-portrait-viewer');
    viewer.id = 'qy-portrait-viewer';
    viewer.setAttribute('aria-label', '立绘大图');
    const fullImage = element('img', 'qy-portrait-full-image');
    fullImage.id = 'qy-portrait-full-image';
    const viewerClose = element('button', 'qy-portrait-close', '×');
    viewerClose.type = 'button';
    viewerClose.setAttribute('aria-label', '关闭大图');
    viewer.append(fullImage, viewerClose, element('span', 'qy-portrait-return', '再次点击返回 · Esc'));
    viewer.addEventListener('click', () => viewer.close());
    viewer.addEventListener('close', () => portraitOpener?.focus());
    document.body.appendChild(viewer);
    byId('human-hand').addEventListener('keydown', (event) => {
      const tiles = Array.from(byId('human-hand').querySelectorAll('[role="button"]'));
      const index = tiles.indexOf(event.target);
      if (index < 0) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        tiles[(index + (event.key === 'ArrowRight' ? 1 : tiles.length - 1)) % tiles.length].focus();
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (event.target.getAttribute('aria-disabled') !== 'true') event.target.click();
      }
    });
    translate();
  }

  function syncSound() {
    const button = byId('qy-sound');
    if (!button) return;
    const source = document.querySelector('.character-voice-toggle');
    const enabled = source?.getAttribute('aria-pressed') !== 'false';
    button.setAttribute('aria-pressed', String(enabled));
    const label = button.querySelector('[data-qy-text]');
    label.dataset.qyText = enabled ? 'sound' : 'soundOff';
    label.textContent = tr(label.dataset.qyText);
    button.setAttribute('aria-label', label.textContent);
    button.title = label.textContent;
  }
  function syncPortraitSize() {
    const button = byId('qy-portrait-size');
    if (!button) return;
    button.textContent = currentLang === 'zh' ? (portraitSmall ? '＋ 放大立绘' : '－ 缩小立绘') : (portraitSmall ? '+ Enlarge art' : '− Reduce art');
    button.setAttribute('aria-expanded', String(!portraitSmall));
  }
  function openPortrait(opener) {
    const image = byId('qy-featured-image');
    const viewer = byId('qy-portrait-viewer');
    if (!image || image.hidden || !image.naturalWidth || !viewer) return;
    portraitOpener = opener;
    const full = byId('qy-portrait-full-image');
    full.src = image.src;
    full.alt = image.alt;
    viewer.querySelector('.qy-portrait-return').textContent = currentLang === 'zh' ? '再次点击返回 · Esc' : 'Click again to return · Esc';
    if (!viewer.open) viewer.showModal();
  }
  function refreshFeatured(me) {
    if (!initialized) return;
    const seat = featuredSeat ?? me ?? (mode === 'online' ? lastOnlineState?.you?.seat : viewSeat);
    const widget = document.querySelector(`.character-widget[data-character-seat="${seat}"]`);
    if (!widget) return;
    const id = widget.dataset.characterId;
    const stage = widget.dataset.characterStage || '0';
    const name = widget.querySelector('.character-name')?.textContent || '';
    byId('qy-featured-name').textContent = name;
    byId('qy-featured-stage').textContent = currentLang === 'zh' ? `阶段 ${stage} / 4` : `Stage ${stage} / 4`;
    const image = byId('qy-featured-image');
    const source = `assets/characters/${id}/stage-${stage}.png`;
    if (image.dataset.source !== source) {
      image.dataset.source = source;
      image.dataset.character = id;
      image.alt = currentLang === 'zh' ? `${name} · 阶段 ${stage}` : `${name} · Stage ${stage}`;
      image.src = source;
    }
    syncPortraitSize();
  }
  function translate() {
    document.querySelectorAll('[data-qy-text]').forEach((node) => { node.textContent = tr(node.dataset.qyText); });
    document.querySelectorAll('[data-qy-label]').forEach((node) => { node.setAttribute('aria-label', tr(node.dataset.qyLabel)); node.title = tr(node.dataset.qyLabel); });
    syncSound();
    syncPortraitSize();
  }

  function refresh(st) {
    initTable();
    const local = mode === 'local' && typeof match !== 'undefined' && match?.engine;
    const state = st || (mode === 'online' ? lastOnlineState : null);
    const seats = state ? state.seats : local ? match.engine.seats : null;
    if (!seats || seats.length !== 4) return;
    const me = state ? state.you.seat : viewSeat;
    const current = state ? state.currentSeat : match.engine.currentSeat;
    const phase = state ? state.phase : match.engine.phase;
    const canDiscard = current === me && phase === 'discard';
    byId('qy-mode').textContent = tr(state ? 'online' : 'practice') + (state && typeof onlineRoomCode === 'string' ? ` · ${onlineRoomCode}` : '');
    byId('table-screen').classList.toggle('qy-your-turn', canDiscard);
    const panels = Array.from(byId('opponents-row').children);
    document.querySelectorAll('.character-widget .character-portrait').forEach((portrait) => {
      portrait.setAttribute('role', 'button');
      portrait.setAttribute('tabindex', '0');
      const name = portrait.closest('.character-widget').querySelector('.character-name')?.textContent || '';
      portrait.setAttribute('aria-label', currentLang === 'zh' ? `查看${name}立绘` : `View ${name}`);
    });
    panels.forEach((panel, index) => {
      panel.dataset.qySeat = (me + index + 1) % 4;
      panel.setAttribute('aria-label', `${['東','南','西','北'][(me + index + 1) % 4]} · ${tr('hands')}`);
    });
    document.querySelectorAll('.qy-compass-wind').forEach((node) => {
      const seat = (me + Number(node.dataset.offset)) % 4;
      node.textContent = { wE: '東', wS: '南', wW: '西', wN: '北' }[seats[seat].wind];
      node.classList.toggle('is-current', seat === current);
    });
    const dora = state ? state.dora : match.engine.doraIndicators();
    const doraArea = byId('qy-dora-tiles');
    doraArea.replaceChildren(...dora.map((tile) => miniTileChip(tile, false)));
    const scoreArea = byId('qy-scores');
    const ranking = seats.map((seat, index) => ({ seat, index })).sort((a, b) => b.seat.points - a.seat.points || a.index - b.index);
    scoreArea.replaceChildren(...ranking.map(({ seat, index }, rank) => {
      const row = element('div', `qy-score-row${index === me ? ' is-self' : ''}${index === current ? ' is-current' : ''}`);
      row.append(element('span', 'qy-rank', String(rank + 1).padStart(2, '0')));
      const info = element('div', 'qy-score-person');
      const widget = document.querySelector(`.character-widget[data-character-seat="${index}"]`);
      const name = widget?.querySelector('.character-name')?.textContent || tr('missing');
      info.append(element('strong', '', name), element('small', '', `${{ wE: '東', wS: '南', wW: '西', wN: '北' }[seat.wind]} · ${index === me ? tr('you') : state ? (seat.isBot ? tr('bot') : seat.name || tr('missing')) : isHumanArr[index] ? tr('you') : tr('bot')}`));
      row.append(info, element('b', 'qy-score-value', Number(seat.points).toLocaleString('en-US')));
      return row;
    }));
    const ownHand = [...(state ? state.you.hand : seats[me].hand)].sort();
    byId('human-hand').querySelectorAll('.htile').forEach((tile, index) => {
      tile.setAttribute('role', 'button');
      tile.setAttribute('tabindex', canDiscard ? '0' : '-1');
      tile.setAttribute('aria-disabled', String(!canDiscard));
      tile.setAttribute('aria-label', `${tileName(ownHand[index])} · ${currentLang === 'zh' ? '打出' : 'Discard'}`);
    });
    const hint = byId('turn-hint');
    if (!hint.textContent) hint.textContent = tr('waiting');
    syncSound();
    refreshFeatured(me);
    byId('human-actions').querySelectorAll('button').forEach((button) => {
      button.textContent = button.textContent.replace(/\b(?:[mps][1-9]|w[ESWN]|d[RGW])\b/g, tileName);
    });
  }

  if (typeof openModal === 'function') {
    const original = openModal;
    openModal = function (id) { const result = original.call(this, id); if (id === 'modal-reaction') presentReaction(); return result; };
  }

  if (typeof renderAll === 'function') {
    const original = renderAll;
    renderAll = function (...args) { mode = 'local'; const result = original.apply(this, args); refresh(); return result; };
  }
  if (typeof renderOnlineTable === 'function') {
    const original = renderOnlineTable;
    renderOnlineTable = function (st) { mode = 'online'; lastOnlineState = st; const result = original.call(this, st); refresh(st); return result; };
  }
  if (typeof applyLang === 'function') {
    const original = applyLang;
    applyLang = function (...args) { const result = original.apply(this, args); translate(); if (mode === 'online') refresh(lastOnlineState); return result; };
  }
  document.addEventListener('DOMContentLoaded', initTable);
})();
