// Harbour at Dusk — a spot-the-difference game.
// Two pictures of the same harbour, drawn twice by hand on canvas.
// The right picture carries the round's seven changes; clicking a change
// on either picture rings it on both. Original art, original code.
(function () {
  'use strict';

  var W = 560, H = 420;

  // --- the ten possible changes; each round uses seven of them ------------
  // x, y: scene coordinates (same on both pictures). r: click radius.
  var DIFFS = [
    { x: 120, y: 70,  r: 26, name: 'a gull is missing' },
    { x: 80,  y: 165, r: 26, name: 'the lighthouse light changed colour' },
    { x: 300, y: 168, r: 24, name: 'the sailboat flag changed colour' },
    { x: 478, y: 205, r: 24, name: 'an attic window is lit' },
    { x: 368, y: 298, r: 28, name: 'the cat is gone' },
    { x: 210, y: 375, r: 26, name: 'the buoy changed colour' },
    { x: 480, y: 55,  r: 30, name: 'the moon changed phase' },
    { x: 320, y: 315, r: 24, name: 'the boat number changed' },
    { x: 440, y: 340, r: 28, name: 'a crate is missing' },
    { x: 150, y: 348, r: 26, name: 'the rope coil is gone' }
  ];
  var ROUNDS = [
    [0, 1, 2, 3, 4, 5, 6],
    [3, 4, 5, 6, 7, 8, 9]
  ];

  // --- state ---------------------------------------------------------------
  var params = new URLSearchParams(location.search);
  var roundIdx = params.get('round') === '2' ? 1 : 0;
  var active = ROUNDS[roundIdx].slice();
  var found = new Set();
  var hintsLeft = 3;
  var hintPulse = null; // { id, until }
  var misses = [];      // { x, y, panel, until }
  var startedAt = Date.now();
  var won = false;
  var crosshair = { panel: 0, x: 280, y: 210, visible: false };
  var audioCtx = null;

  var leftCv = document.getElementById('left');
  var rightCv = document.getElementById('right');
  var leftCtx = leftCv.getContext('2d');
  var rightCtx = rightCv.getContext('2d');
  var foundEl = document.getElementById('found');
  var timeEl = document.getElementById('time');
  var hintsEl = document.getElementById('hints');
  var winBox = document.getElementById('win');
  var winText = document.getElementById('winText');

  // --- helpers ---------------------------------------------------------------
  function beep(freq, dur) {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      var o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.12, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(); o.stop(audioCtx.currentTime + dur);
    } catch (e) { /* headless or muted: the game plays on silently */ }
  }

  function fmtTime(ms) {
    var s = Math.floor(ms / 1000);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  // --- the harbour, drawn by hand -------------------------------------------
  // changed: a Set of diff ids to apply (only the right picture gets them).
  function drawScene(ctx, changed) {
    // sky
    var sky = ctx.createLinearGradient(0, 0, 0, 270);
    sky.addColorStop(0, '#3b3561'); sky.addColorStop(0.55, '#b85c6e');
    sky.addColorStop(1, '#f2a35e');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, 270);
    // stars
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    [[40, 30], [150, 22], [250, 40], [330, 26], [420, 34], [90, 90], [360, 70],
     [200, 18], [520, 110], [30, 130]].forEach(function (p) {
      ctx.beginPath(); ctx.arc(p[0], p[1], 1.6, 0, 7); ctx.fill();
    });
    // clouds
    ctx.fillStyle = 'rgba(255,214,178,0.35)';
    ctx.beginPath(); ctx.ellipse(170, 60, 62, 14, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(400, 110, 70, 13, 0, 0, 7); ctx.fill();
    // moon: full on the left, crescent on the right (diff 6)
    ctx.fillStyle = '#f7ecc8';
    ctx.beginPath(); ctx.arc(480, 55, 26, 0, 7); ctx.fill();
    if (changed.has(6)) {
      ctx.fillStyle = '#b85c6e';
      ctx.beginPath(); ctx.arc(492, 48, 22, 0, 7); ctx.fill();
    }
    // gulls: three on the left, the first one missing on the right (diff 0)
    ctx.strokeStyle = '#2c2438'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    var gulls = [[120, 70], [180, 55], [240, 85]];
    gulls.forEach(function (g, i) {
      if (changed.has(0) && i === 0) return;
      ctx.beginPath();
      ctx.moveTo(g[0] - 9, g[1]); ctx.quadraticCurveTo(g[0] - 3, g[1] - 7, g[0], g[1]);
      ctx.quadraticCurveTo(g[0] + 3, g[1] - 7, g[0] + 9, g[1]);
      ctx.stroke();
    });
    // sea
    var sea = ctx.createLinearGradient(0, 260, 0, H);
    sea.addColorStop(0, '#2e5f7a'); sea.addColorStop(1, '#1d3f57');
    ctx.fillStyle = sea; ctx.fillRect(0, 260, W, H - 260);
    ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 2;
    [285, 310, 340, 375, 400].forEach(function (y, i) {
      ctx.beginPath();
      for (var x = 0; x <= W; x += 20) ctx.lineTo(x, y + Math.sin((x + i * 40) / 55) * 3);
      ctx.stroke();
    });
    // lighthouse on its rock (left)
    ctx.fillStyle = '#4a4a55';
    ctx.beginPath(); ctx.moveTo(35, 300); ctx.lineTo(115, 300); ctx.lineTo(105, 268); ctx.lineTo(45, 268); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f3ead8'; ctx.fillRect(58, 185, 34, 85);
    ctx.fillStyle = '#c8443c'; ctx.fillRect(58, 205, 34, 12); ctx.fillRect(58, 238, 34, 12);
    ctx.fillStyle = '#2c2438'; ctx.fillRect(54, 168, 42, 18);
    // lighthouse light: warm yellow on the left, red on the right (diff 1)
    ctx.fillStyle = changed.has(1) ? '#ff5a4d' : '#ffd23f';
    ctx.beginPath(); ctx.arc(75, 160, 9, 0, 7); ctx.fill();
    ctx.fillStyle = changed.has(1) ? 'rgba(255,90,77,0.25)' : 'rgba(255,210,63,0.30)';
    ctx.beginPath(); ctx.moveTo(75, 160); ctx.lineTo(150, 140); ctx.lineTo(150, 180); ctx.closePath(); ctx.fill();
    // harbour house (right)
    ctx.fillStyle = '#f2d8a7'; ctx.fillRect(420, 215, 120, 85);
    ctx.fillStyle = '#8a4b3a';
    ctx.beginPath(); ctx.moveTo(410, 215); ctx.lineTo(480, 178); ctx.lineTo(550, 215); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5a3a28'; ctx.fillRect(470, 255, 22, 45);
    // windows, warmly lit
    ctx.fillStyle = '#ffd23f';
    [[435, 232], [472, 232], [509, 232]].forEach(function (w) {
      ctx.fillRect(w[0], w[1], 16, 18);
    });
    ctx.strokeStyle = '#5a3a28'; ctx.lineWidth = 2;
    [[435, 232], [472, 232], [509, 232]].forEach(function (w) {
      ctx.strokeRect(w[0], w[1], 16, 18);
      ctx.beginPath(); ctx.moveTo(w[0] + 8, w[1]); ctx.lineTo(w[0] + 8, w[1] + 18); ctx.stroke();
    });
    // attic window, lit only on the right (diff 3)
    if (changed.has(3)) {
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath(); ctx.arc(478, 205, 9, 0, 7); ctx.fill();
      ctx.strokeStyle = '#5a3a28'; ctx.beginPath(); ctx.arc(478, 205, 9, 0, 7); ctx.stroke();
    }
    // dock
    ctx.fillStyle = '#7a5a38'; ctx.fillRect(110, 330, 450, 16);
    ctx.fillStyle = '#5f4527';
    [140, 240, 340, 440, 530].forEach(function (x) { ctx.fillRect(x, 330, 10, 42); });
    // rope coil on the dock (diff 9 removes it)
    if (!changed.has(9)) {
      ctx.strokeStyle = '#d8c49a'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(150, 348, 13, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.arc(150, 348, 6, 0, 7); ctx.stroke();
    }
    // sailboat (centre)
    ctx.fillStyle = '#3a2e22';
    ctx.beginPath(); ctx.moveTo(275, 300); ctx.lineTo(365, 300); ctx.lineTo(345, 328); ctx.lineTo(295, 328); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8a4b3a'; ctx.fillRect(272, 296, 96, 5);
    ctx.fillStyle = '#5a3a28'; ctx.fillRect(316, 168, 5, 132);
    ctx.fillStyle = '#f3ead8';
    ctx.beginPath(); ctx.moveTo(321, 172); ctx.lineTo(321, 292); ctx.lineTo(362, 292); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(316, 180); ctx.lineTo(316, 292); ctx.lineTo(282, 292); ctx.closePath(); ctx.fill();
    // flag: red on the left, blue on the right (diff 2)
    ctx.fillStyle = changed.has(2) ? '#3d6fd8' : '#c8443c';
    ctx.beginPath(); ctx.moveTo(321, 168); ctx.lineTo(344, 174); ctx.lineTo(321, 182); ctx.closePath(); ctx.fill();
    // hull number: 7 on the left, 1 on the right (diff 7)
    ctx.fillStyle = '#f3ead8'; ctx.font = 'bold 20px Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillText(changed.has(7) ? '1' : '7', 320, 320);
    // rowboat (left of the dock)
    ctx.fillStyle = '#6e4a2f';
    ctx.beginPath(); ctx.moveTo(175, 332); ctx.lineTo(235, 332); ctx.lineTo(222, 348); ctx.lineTo(188, 348); ctx.closePath(); ctx.fill();
    // crates on the dock
    ctx.fillStyle = '#a87c46'; ctx.fillRect(352, 306, 34, 24);
    ctx.strokeStyle = '#6e4a2f'; ctx.lineWidth = 2; ctx.strokeRect(352, 306, 34, 24);
    ctx.beginPath(); ctx.moveTo(352, 306); ctx.lineTo(386, 330); ctx.moveTo(386, 306); ctx.lineTo(352, 330); ctx.stroke();
    if (!changed.has(8)) {
      ctx.fillStyle = '#96703c'; ctx.fillRect(424, 316, 30, 22);
      ctx.strokeStyle = '#6e4a2f'; ctx.strokeRect(424, 316, 30, 22);
      ctx.beginPath(); ctx.moveTo(424, 316); ctx.lineTo(454, 338); ctx.moveTo(454, 316); ctx.lineTo(424, 338); ctx.stroke();
    }
    // the cat on the first crate (diff 4 removes it)
    if (!changed.has(4)) {
      ctx.fillStyle = '#4a3d5c';
      ctx.beginPath(); ctx.ellipse(369, 296, 15, 11, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(369, 281, 9, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(362, 274); ctx.lineTo(364, 265); ctx.lineTo(369, 273); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(376, 274); ctx.lineTo(374, 265); ctx.lineTo(369, 273); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#4a3d5c'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(382, 300); ctx.quadraticCurveTo(395, 296, 392, 282); ctx.stroke();
    }
    // buoy in the water (diff 5 changes its colour)
    ctx.fillStyle = changed.has(5) ? '#3fae6a' : '#e86a2a';
    ctx.beginPath(); ctx.arc(210, 375, 12, 0, 7); ctx.fill();
    ctx.fillStyle = '#f3ead8'; ctx.fillRect(206, 358, 8, 8);
    ctx.fillStyle = '#2c2438'; ctx.beginPath(); ctx.arc(210, 356, 3, 0, 7); ctx.fill();
  }

  // --- markers ---------------------------------------------------------------
  function ring(ctx, x, y, r, colour) {
    ctx.strokeStyle = colour; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, y, r + 3, 0, 7); ctx.stroke();
  }

  function render() {
    var leftChanged = new Set();
    var rightChanged = new Set(active);
    drawScene(leftCtx, leftChanged);
    drawScene(rightCtx, rightChanged);
    // found rings on both pictures
    active.forEach(function (id) {
      if (!found.has(id)) return;
      var d = DIFFS[id];
      ring(leftCtx, d.x, d.y, d.r, '#7fc98f');
      ring(rightCtx, d.x, d.y, d.r, '#7fc98f');
    });
    // hint pulse on both pictures
    if (hintPulse && Date.now() < hintPulse.until) {
      var hd = DIFFS[hintPulse.id];
      var pulse = 1 + 0.18 * Math.sin(Date.now() / 130);
      ring(leftCtx, hd.x, hd.y, hd.r * pulse, '#ffd23f');
      ring(rightCtx, hd.x, hd.y, hd.r * pulse, '#ffd23f');
    }
    // miss marks, fading
    var now = Date.now();
    misses = misses.filter(function (m) { return now < m.until; });
    misses.forEach(function (m) {
      var ctx = m.panel === 0 ? leftCtx : rightCtx;
      var a = (m.until - now) / 900;
      ctx.strokeStyle = 'rgba(224,92,70,' + a + ')'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(m.x - 10, m.y - 10); ctx.lineTo(m.x + 10, m.y + 10);
      ctx.moveTo(m.x + 10, m.y - 10); ctx.lineTo(m.x - 10, m.y + 10);
      ctx.stroke();
    });
    // keyboard crosshair on the active picture
    if (crosshair.visible) {
      var cctx = crosshair.panel === 0 ? leftCtx : rightCtx;
      cctx.strokeStyle = '#ffffff'; cctx.lineWidth = 2;
      cctx.beginPath(); cctx.arc(crosshair.x, crosshair.y, 14, 0, 7); cctx.stroke();
      cctx.beginPath();
      cctx.moveTo(crosshair.x - 20, crosshair.y); cctx.lineTo(crosshair.x + 20, crosshair.y);
      cctx.moveTo(crosshair.x, crosshair.y - 20); cctx.lineTo(crosshair.x, crosshair.y + 20);
      cctx.stroke();
    }
    // status
    foundEl.textContent = found.size + ' / ' + active.length;
    hintsEl.textContent = String(hintsLeft);
    timeEl.textContent = fmtTime(Date.now() - startedAt);
    leftCv.classList.toggle('active', crosshair.visible && crosshair.panel === 0);
    rightCv.classList.toggle('active', crosshair.visible && crosshair.panel === 1);
    document.getElementById('hintBtn').disabled = hintsLeft === 0 || won || found.size === active.length;
  }

  // --- play ------------------------------------------------------------------
  function clickAt(panel, x, y) {
    if (won) return;
    var hit = null;
    active.forEach(function (id) {
      if (found.has(id)) return;
      var d = DIFFS[id];
      var dx = x - d.x, dy = y - d.y;
      if (dx * dx + dy * dy <= d.r * d.r) hit = id;
    });
    if (hit !== null) {
      found.add(hit);
      beep(880, 0.18);
      if (found.size === active.length) {
        won = true;
        winText.textContent = 'All seven differences found in ' + fmtTime(Date.now() - startedAt) +
          ' — round ' + (roundIdx + 1) + ' complete.';
        winBox.style.display = 'block';
        beep(1320, 0.3);
      }
    } else {
      misses.push({ x: x, y: y, panel: panel, until: Date.now() + 900 });
      beep(180, 0.12);
    }
    render();
  }

  function canvasPos(cv, ev) {
    var r = cv.getBoundingClientRect();
    return { x: (ev.clientX - r.left) * (W / r.width), y: (ev.clientY - r.top) * (H / r.height) };
  }

  leftCv.addEventListener('click', function (ev) {
    var p = canvasPos(leftCv, ev); clickAt(0, p.x, p.y);
  });
  rightCv.addEventListener('click', function (ev) {
    var p = canvasPos(rightCv, ev); clickAt(1, p.x, p.y);
  });

  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Tab') {
      ev.preventDefault();
      crosshair.panel = 1 - crosshair.panel; crosshair.visible = true; render();
      return;
    }
    var step = ev.shiftKey ? 40 : 12;
    if (ev.key === 'ArrowLeft') { crosshair.x = Math.max(10, crosshair.x - step); crosshair.visible = true; }
    else if (ev.key === 'ArrowRight') { crosshair.x = Math.min(W - 10, crosshair.x + step); crosshair.visible = true; }
    else if (ev.key === 'ArrowUp') { crosshair.y = Math.max(10, crosshair.y - step); crosshair.visible = true; }
    else if (ev.key === 'ArrowDown') { crosshair.y = Math.min(H - 10, crosshair.y + step); crosshair.visible = true; }
    else if (ev.key === ' ' || ev.key === 'Enter') {
      ev.preventDefault();
      crosshair.visible = true;
      clickAt(crosshair.panel, crosshair.x, crosshair.y);
      return;
    } else return;
    ev.preventDefault();
    render();
  });

  document.getElementById('hintBtn').addEventListener('click', function () {
    if (hintsLeft === 0 || won) return;
    var remaining = active.filter(function (id) { return !found.has(id); });
    if (!remaining.length) return;
    hintsLeft--;
    hintPulse = { id: remaining[0], until: Date.now() + 2000 };
    beep(660, 0.15);
    render();
  });

  function newRound() {
    roundIdx = 1 - roundIdx;
    active = ROUNDS[roundIdx].slice();
    found = new Set();
    hintsLeft = 3;
    hintPulse = null;
    misses = [];
    won = false;
    startedAt = Date.now();
    winBox.style.display = 'none';
    render();
  }
  document.getElementById('roundBtn').addEventListener('click', newRound);
  document.getElementById('againBtn').addEventListener('click', newRound);

  // --- demo hooks for screenshots (documented in the README) -----------------
  var shot = params.get('shot');
  var pre = params.get('found');
  if (shot === 'play') pre = '0,2,4';
  if (shot === 'end') pre = active.join(',');
  if (pre) {
    pre.split(',').forEach(function (s) {
      var i = parseInt(s, 10);
      if (active.indexOf(i) >= 0) found.add(i);
    });
    if (found.size === active.length) {
      won = true;
      winText.textContent = 'All seven differences found in ' + fmtTime(0) + ' — round ' + (roundIdx + 1) + ' complete.';
      winBox.style.display = 'block';
    }
  }

  render();
  setInterval(render, 250);
})();
