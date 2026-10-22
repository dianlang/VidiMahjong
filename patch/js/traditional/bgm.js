/* Optional, user-supplied music. Missing files never block play. */
(() => {
  'use strict';
  const audio = new Audio('assets/bgm/table.mp3');
  audio.loop = true;
  audio.preload = 'none';
  audio.volume = 0.25;
  let enabled = true;
  const unavailable = new Set();
  const positions = {table:0,riichi:0};
  let currentTrack = 'table';
  let wantedTrack = 'table';
  try { enabled = localStorage.getItem('queye-bgm') !== 'off'; } catch (_) {}
  let button;
  const zh = () => typeof currentLang === 'undefined' || currentLang === 'zh';
  function label() {
    if (!button) return;
    button.textContent = zh() ? `♫ 音乐${enabled ? '开' : '关'}` : `♫ Music ${enabled ? 'on' : 'off'}`;
    button.setAttribute('aria-label', zh() ? `背景音乐${enabled ? '开启' : '关闭'}` : `Background music ${enabled ? 'on' : 'off'}`);
    button.setAttribute('aria-pressed', String(enabled));
    button.title = zh() ? '替换 assets/bgm/table.mp3 更换音乐' : 'Replace assets/bgm/table.mp3 to change music';
  }
  function play() {
    if (!enabled || unavailable.has(currentTrack) || document.hidden || !audio.paused) return;
    audio.play().catch(() => {});
  }
  function selectTrack(requested) {
    wantedTrack = requested;
    const next = unavailable.has(requested) ? 'table' : requested;
    if (next === currentTrack) { play(); return; }
    positions[currentTrack] = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
    audio.pause();
    currentTrack = next;
    audio.src = `assets/bgm/${next}.mp3`;
    audio.load();
    play();
  }
  audio.addEventListener('loadedmetadata', () => { try { audio.currentTime = positions[currentTrack]; } catch (_) {} });
  audio.addEventListener('error', () => {
    unavailable.add(currentTrack);
    if (currentTrack === 'riichi') selectTrack('table');
  });
  document.addEventListener('queye:table-state', event => selectTrack(event.detail.riichi ? 'riichi' : 'table'));
  document.addEventListener('queye:bgm-preview', event => selectTrack(event.detail.riichi ? 'riichi' : 'table'));
  document.addEventListener('pointerdown', play, { passive: true });
  document.addEventListener('keydown', play);
  document.addEventListener('visibilitychange', () => { if (document.hidden) audio.pause(); else play(); });
  document.addEventListener('DOMContentLoaded', () => {
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'qy-tool';
    button.id = 'qy-bgm';
    button.addEventListener('click', () => {
      enabled = !enabled;
      try { localStorage.setItem('queye-bgm', enabled ? 'on' : 'off'); } catch (_) {}
      if (enabled) {
        unavailable.clear();
        selectTrack(wantedTrack);
        audio.load();
        play();
      } else audio.pause();
      label();
    });
    document.querySelector('.qy-tools')?.prepend(button);
    label();
  });
})();
