/* Optional, user-supplied music. Missing files never block play. */
(() => {
  'use strict';
  const audio = new Audio('assets/bgm/table.mp3');
  audio.loop = true;
  audio.preload = 'none';
  audio.volume = 0.25;
  let enabled = true;
  let missing = false;
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
    if (!enabled || missing || document.hidden || !audio.paused) return;
    audio.play().catch(() => {});
  }
  audio.addEventListener('error', () => { missing = true; });
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
        if (missing) { missing = false; audio.load(); }
        play();
      } else audio.pause();
      label();
    });
    document.querySelector('.qy-tools')?.prepend(button);
    label();
  });
})();
