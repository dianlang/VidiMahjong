/* QueYe v4 -- Final-rank defeat CG panel. No scoring/rules/network changes.
 * Loaded after the upstream ui/online scripts and zh-custom.js.
 * Online scores are server-authoritative; each connected client renders
 * the identical last-place seat from the final state message.
 */
(() => {
  'use strict';
  const SEAT_COUNT = 4;
  const registry = globalThis.QueYeCharacters;
  const CHARACTER_IDS = new Set([...registry.ids,registry.RANDOM_ID]);
  const CHARACTER_NAMES = Object.fromEntries(registry.entries.map(c => [c.id, c.name]));
  CHARACTER_NAMES[registry.RANDOM_ID]=registry.get(registry.RANDOM_ID).name;
  const seatWinds = ['东', '南', '西', '北'];

  // Ranking rule: lower final score loses. For tied last places, choose
  // the higher absolute seat index so every client selects one same seat.
  function getLastPlace(scores) {
    if (!Array.isArray(scores) || scores.length !== SEAT_COUNT ||
        scores.some((value) => !Number.isFinite(Number(value)))) return null;
    const ranking = scores.map((score, seat) => ({seat, points: Number(score)}));
    ranking.sort((a, b) => b.points - a.points || a.seat - b.seat);
    return ranking[ranking.length - 1];
  }

  function selectedCharacterForSeat(seat, onlineState) {
    // v3 character widgets represent the visible choice for every seat,
    // including bot seats (which have no characterId in the room state).
    const widget = document.querySelector(`.character-widget[data-character-seat="${seat}"]`);
    const id = widget && widget.dataset.characterId;
    if (CHARACTER_IDS.has(id)) return id;
    const transmitted = onlineState && onlineState.seats && onlineState.seats[seat]
      ? onlineState.seats[seat].characterId : null;
    return CHARACTER_IDS.has(transmitted) ? transmitted :
      registry.ids[seat % registry.ids.length];
  }

  function uiText(chinese, english) {
    return typeof currentLang !== 'undefined' && currentLang === 'en' ? english : chinese;
  }

  function makeElement(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function showDefeatCG(scores, onlineState = null) {
    const last = getLastPlace(scores);
    const modal = document.getElementById('modal-match-end');
    const standings = document.getElementById('final-standings');
    if (!last || !modal || !standings) return;
    const characterId = selectedCharacterForSeat(last.seat, onlineState);
    const name = CHARACTER_NAMES[characterId] || characterId;
    const onlineSeat = onlineState && onlineState.seats && onlineState.seats[last.seat];
    const playerLabel = onlineSeat && !onlineSeat.isBot && onlineSeat.name
      ? onlineSeat.name : seatWinds[last.seat] + uiText('家', ' seat');
    const signature = [last.seat, last.points, characterId, playerLabel].join(':');
    let panel = modal.querySelector('.qye-defeat-cg');
    if (panel && panel.dataset.signature === signature) return;
    if (panel) panel.remove();

    panel = makeElement('section', 'qye-defeat-cg');
    panel.dataset.signature = signature;
    panel.setAttribute('aria-label', uiText('末位玩家失败CG', 'Last-place defeat CG'));

    const heading = makeElement('div', 'qye-defeat-heading', uiText('末位玩家 · 失败CG', 'LAST PLACE · DEFEAT CG'));
    const figure = makeElement('div', 'qye-defeat-figure');
    const image = makeElement('img', 'qye-defeat-image');
    image.alt = uiText(`${name}的结算失败CG`, `${name} defeat CG`);
    image.decoding = 'async';
    // Missing resources must not create broken-image indicators or block play.
    image.hidden = true;
    const placeholder = makeElement('div', 'qye-defeat-placeholder');
    const mark = makeElement('strong', 'qye-defeat-mark', uiText('败', 'DEFEAT'));
    const placeholderDescription = makeElement('span', 'qye-defeat-missing',
      uiText('失败CG素材待添加', 'Defeat CG artwork not added yet'));
    placeholder.append(mark, placeholderDescription);
    figure.append(image, placeholder);

    const description = makeElement('p', 'qye-defeat-description');
    const score = last.points.toLocaleString();
    description.textContent = uiText(
      `${playerLabel}（${name}） · 最终点数：${score}`,
      `${playerLabel} (${name}) · final score: ${score}`);
    panel.append(heading, figure, description);
    // Put the panel before standings so the CG is immediately visible.
    standings.parentNode.insertBefore(panel, standings);

    const basePath = `assets/characters/${characterId}`;
    const images = [`${basePath}/defeat.png`, `${basePath}/stage-4.png`];
    let candidateIndex = 0;
    image.onload = () => {
      if (!panel.isConnected) return;
      image.hidden = false;
      placeholder.hidden = true;
      if (candidateIndex === 1) {
        heading.textContent = uiText('末位玩家 · 结算立绘', 'LAST PLACE · PORTRAIT');
      }
    };
    image.onerror = () => {
      if (!panel.isConnected) return;
      candidateIndex++;
      if (candidateIndex < images.length) {
        image.src = images[candidateIndex];
      } else {
        image.hidden = true;
        placeholder.hidden = false;
      }
    };
    image.src = images[candidateIndex];
  }

  // Local callback is fired on the whole-match 'match-end', not per-hand.
  // Wrapping the existing modal preserves the original standings/actions.
  if (typeof showMatchEnd === 'function') {
    const originalShowMatchEnd = showMatchEnd;
    showMatchEnd = function (...args) {
      const result = originalShowMatchEnd.apply(this, args);
      if (typeof match !== 'undefined' && match && Array.isArray(match.points)) {
        showDefeatCG(match.points);
      }
      return result;
    };
  }

  // Every online client receives the final state from Room.broadcastState().
  // No client-supplied loser or new protocol message is required.
  if (typeof showOnlineMatchEnd === 'function') {
    const originalShowOnlineMatchEnd = showOnlineMatchEnd;
    showOnlineMatchEnd = function (state, ...args) {
      const result = originalShowOnlineMatchEnd.call(this, state, ...args);
      if (state && state.matchOver) showDefeatCG(state.points, state);
      return result;
    };
  }
  // Read-only test API; keeps the tie-break contract easy to verify.
  if (typeof window !== 'undefined') window.QueYeDefeatCG = Object.freeze({ getLastPlace });
})();
