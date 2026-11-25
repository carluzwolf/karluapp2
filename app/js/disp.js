/* Display 3D do Karlu: monta o canvas dos olhos (KarluEyes) + giro com o dedo */
(function () {
  'use strict';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var items = [], running = false;

  function make(el, o) {
    o = o || {};
    var edges = '';
    for (var k = -2; k <= 2; k++) edges += '<div class="disp-edge" style="transform:translateZ(calc(var(--t) * ' + (k * 0.25) + '))"></div>';
    el.classList.add('disp');
    el.innerHTML = '<div class="disp-float"><div class="disp-3d">' + edges +
      '<div class="disp-back"><img src="assets/logo-bw.png" alt=""><small>Karlu</small></div>' +
      '<div class="disp-front"><canvas></canvas></div></div></div>';
    var cv = el.querySelector('canvas'), d3 = el.querySelector('.disp-3d');
    var face = parseInt(el.dataset.face || o.face || '0', 10);
    var eyes = new KarluEyes(cv, {
      face: face, reacts: o.reacts || ['happy'], gap: o.gap || [600000, 900000],
      delay: 0, dpr: Math.min(window.devicePixelRatio || 1, 2)
    });
    el.__eyes = eyes;
    if (reduce) KarluEyes.still(eyes, 'happy'); else KarluEyes.add(eyes);

    var it = { el: el, d3: d3, rx: 5, ry: -16, vel: 0, idle: 0, sway: o.sway || 0, host: o.host || el,
      drag: !!o.drag, down: false, lx: 0, off: Math.random() * 6, when: o.when };
    items.push(it);
    if (it.drag) bindDrag(it);
    if (!running && !reduce) { running = true; requestAnimationFrame(tick); }
    return eyes;
  }

  function bindDrag(it) {
    var h = it.host;
    h.addEventListener('pointerdown', function (e) {
      if (it.when && !it.when()) return;
      if (e.target.closest && e.target.closest('button')) return;
      it.down = true; it.lx = e.clientX; it.vel = 0; it.idle = 0;
      try { h.setPointerCapture(e.pointerId); } catch (x) {}
    });
    h.addEventListener('pointermove', function (e) {
      if (!it.down) return;
      var dx = e.clientX - it.lx; it.lx = e.clientX; it.ry += dx * 0.55; it.vel = dx * 0.55;
    });
    var up = function () { if (!it.down) return; it.down = false; it.idle = performance.now(); };
    h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up);
  }

  function tick(now) {
    requestAnimationFrame(tick);
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (!it.el.getClientRects().length) continue;
      if (!it.down) {
        it.ry += it.vel; it.vel *= 0.94;
        if (it.drag && it.idle && now - it.idle > 1400) {
          var n = Math.round((it.ry + 16) / 360) * 360 - 16; it.ry += (n - it.ry) * 0.04;
        }
      }
      var sy = it.sway ? Math.sin(now / 1900 + it.off) * it.sway : 0;
      var sx = it.sway ? Math.cos(now / 2300 + it.off) * it.sway * 0.35 : 0;
      it.d3.style.transform = 'rotateX(' + (it.rx + sx).toFixed(2) + 'deg) rotateY(' + (it.ry + sy).toFixed(2) + 'deg)';
    }
  }

  window.KarluDisp = { make: make };

  /* display principal (usado pelo configurar.js): precisa existir antes dele */
  var main = document.getElementById('cfg-disp');
  if (main) {
    make(main, {
      face: 0, reacts: ['happy'], gap: [600000, 900000], sway: 3, drag: true, host: document.getElementById('stage') || main,
      when: function () { return document.body.dataset.screen === 'home'; }
    });
  }
})();
