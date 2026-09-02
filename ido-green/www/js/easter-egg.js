/**
 * Everesting - the hidden climb.
 *
 * Loaded only when someone finds the trigger, so the homepage pays nothing for
 * it. Everything the game needs lives in this one file: no build step, no
 * dependencies, and its own <style> so it cannot drift from main.css.
 *
 * The climb is 8,848m - the real Everesting number, and the same one behind the
 * Everesting tool in the projects list. Steer with a finger, the arrow keys or
 * A/D; the rider climbs on its own and gets faster the higher it goes.
 */
(function () {
  'use strict';

  var SUMMIT_M = 8848;
  var STORE_KEY = 'everesting-egg-best';
  // Canvas parses the font shorthand itself and rejects var(), silently
  // dropping to 10px sans-serif. These have to be literal family names.
  var DISPLAY_FONT = '"Outfit", "Inter", system-ui, sans-serif';
  var BODY_FONT = '"Inter", system-ui, sans-serif';
  var dialog = null;
  var game = null;

  var CSS = [
    // A dialog defaults to position:absolute with auto margins, which on a long
    // page parks it against the document rather than the viewport. Pinning it
    // fixed is what actually makes it full-screen.
    '#everesting-egg{position:fixed;inset:0;margin:0;border:0;padding:0;width:100vw;height:100%;height:100dvh;max-width:100vw;max-height:100dvh;background:#05070f;overflow:hidden;overscroll-behavior:contain;color:#e9edf7;font-family:var(--font-sans,system-ui,sans-serif)}',
    '#everesting-egg::backdrop{background:rgba(3,5,12,.92)}',
    '#everesting-egg canvas{display:block;width:100%;height:100%;touch-action:none;cursor:crosshair}',
    '#everesting-egg .egg-close{position:absolute;top:14px;right:14px;z-index:3;width:40px;height:40px;border-radius:50%;border:1px solid rgba(255,255,255,.18);background:rgba(10,14,26,.6);color:#e9edf7;font-size:20px;line-height:1;cursor:pointer;backdrop-filter:blur(8px)}',
    '#everesting-egg .egg-close:hover{background:rgba(30,38,60,.8)}',
    '#everesting-egg .egg-close:focus-visible{outline:2px solid oklch(72% .18 200);outline-offset:2px}'
  ].join('');

  /* ---------------------------------------------------------------- helpers */

  function readBest() {
    // Private windows and blocked site data both throw here; a missing best
    // score is not worth failing the game over.
    try { return parseInt(localStorage.getItem(STORE_KEY), 10) || 0; } catch (e) { return 0; }
  }

  function writeBest(v) {
    try { localStorage.setItem(STORE_KEY, String(v)); } catch (e) { /* not important */ }
  }

  function metres(n) {
    return Math.floor(n).toLocaleString('en-US') + 'm';
  }

  /* ------------------------------------------------------------------ game */

  function Game(canvas, reduceMotion) {
    var ctx = canvas.getContext('2d');
    var W = 0, H = 0, dpr = 1;
    var state = 'intro';      // intro | playing | dead | summit
    var alt = 0;              // metres climbed
    var best = readBest();
    var rider = { x: 0.5, target: 0.5 };
    var rocks = [];
    var gels = [];
    var ridges = [];
    var stars = [];
    var boost = 0;            // seconds of remaining gel boost
    var shake = 0;
    var spawnGap = 0;
    var last = 0;
    var raf = 0;
    var running = false;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // The playfield is a fixed-width lane centred in the canvas, so a wide
    // desktop window does not turn the climb into a trivially empty road.
    function lane() {
      var w = Math.min(W * 0.9, 420);
      return { x: (W - w) / 2, w: w };
    }

    function reset() {
      alt = 0;
      rocks = [];
      gels = [];
      boost = 0;
      shake = 0;
      spawnGap = 0;
      rider.x = rider.target = 0.5;
      ridges = [];
      for (var i = 0; i < 3; i++) ridges.push({ depth: i, offset: 0, pts: ridgeProfile() });
      stars = [];
      for (var s = 0; s < 70; s++) {
        stars.push({ x: Math.random(), y: Math.random(), r: Math.random() * 1.2 + 0.3, tw: Math.random() * 6 });
      }
    }

    // A fresh silhouette for a ridge. Regenerated when one wraps, so the
    // reset reads as new terrain rather than the same peaks snapping back.
    function ridgeProfile() {
      var pts = [];
      for (var i = 0; i < 8; i++) pts.push(Math.random());
      pts.push(pts[0]);
      return pts;
    }

    function speed() {
      // Climbs from a gentle 210 px/s to about 620 near the summit.
      var t = Math.min(alt / SUMMIT_M, 1);
      return (210 + t * 410) * (boost > 0 ? 1.35 : 1);
    }

    function start() {
      reset();
      state = 'playing';
    }

    /* ------------------------------------------------------------- updating */

    function spawn(dt) {
      var progress = Math.min(alt / SUMMIT_M, 1);
      spawnGap -= dt;
      if (spawnGap > 0) return;
      // Rocks arrive faster the higher you are, but never closer than 0.28s.
      spawnGap = Math.max(0.28, 0.85 - progress * 0.5) * (0.7 + Math.random() * 0.6);

      var l = lane();
      var r = 12 + Math.random() * 16;
      rocks.push({ x: l.x + r + Math.random() * (l.w - r * 2), y: -40, r: r, spin: Math.random() * Math.PI });

      // A gel every so often - a small reward for taking the tighter line.
      if (Math.random() < 0.16) {
        gels.push({ x: l.x + 16 + Math.random() * (l.w - 32), y: -120, r: 9, t: 0 });
      }
    }

    function update(dt) {
      if (state !== 'playing') return;

      var v = speed();
      alt += v * dt * 0.55;
      if (boost > 0) boost -= dt;
      if (shake > 0) shake = Math.max(0, shake - dt * 3);

      // Ease toward the steer target so a flick of the finger still reads as
      // a lean rather than a teleport.
      rider.x += (rider.target - rider.x) * Math.min(1, dt * 12);

      spawn(dt);

      var l = lane();
      var rx = l.x + rider.x * l.w;
      var ry = H * 0.72;

      for (var i = rocks.length - 1; i >= 0; i--) {
        var rock = rocks[i];
        rock.y += v * dt;
        if (rock.y - rock.r > H) { rocks.splice(i, 1); continue; }
        var dx = rock.x - rx, dy = rock.y - ry;
        if (dx * dx + dy * dy < (rock.r + 11) * (rock.r + 11)) {
          state = 'dead';
          shake = reduceMotion ? 0 : 1;
          if (Math.floor(alt) > best) { best = Math.floor(alt); writeBest(best); }
          return;
        }
      }

      for (var g = gels.length - 1; g >= 0; g--) {
        var gel = gels[g];
        gel.y += v * dt;
        gel.t += dt;
        if (gel.y - gel.r > H) { gels.splice(g, 1); continue; }
        var gx = gel.x - rx, gy = gel.y - ry;
        if (gx * gx + gy * gy < (gel.r + 14) * (gel.r + 14)) {
          gels.splice(g, 1);
          boost = 2.2;
        }
      }

      ridges.forEach(function (ridge) {
        ridge.offset += v * dt * (0.08 + ridge.depth * 0.06);
        if (ridge.offset > H * 0.5) {
          ridge.offset -= H * 0.5;
          ridge.pts = ridgeProfile();
        }
      });

      if (alt >= SUMMIT_M) {
        alt = SUMMIT_M;
        state = 'summit';
        if (SUMMIT_M > best) { best = SUMMIT_M; writeBest(best); }
      }
    }

    /* ------------------------------------------------------------- drawing */

    function sky(progress) {
      // Dawn at the bottom of the climb, deep space at the summit.
      var g = ctx.createLinearGradient(0, 0, 0, H);
      var hue = 250 - progress * 40;
      g.addColorStop(0, 'oklch(' + (10 + progress * 6) + '% 0.06 ' + hue + ')');
      g.addColorStop(0.55, 'oklch(' + (18 - progress * 6) + '% 0.07 ' + (hue + 20) + ')');
      g.addColorStop(1, 'oklch(' + (26 - progress * 14) + '% 0.09 ' + (hue + 45) + ')');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    function drawStars(progress, time) {
      if (progress < 0.35) return;
      var a = Math.min((progress - 0.35) / 0.4, 1);
      stars.forEach(function (s) {
        var tw = reduceMotion ? 1 : 0.65 + Math.sin(time * 2 + s.tw) * 0.35;
        ctx.globalAlpha = a * tw * 0.9;
        ctx.fillStyle = '#dce6ff';
        ctx.beginPath();
        ctx.arc(s.x * W, s.y * H * 0.7, s.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }

    function drawRidges() {
      // Three parallax silhouettes; the far ones move least, which is what
      // sells the sense of height on a canvas this small.
      ridges.forEach(function (ridge) {
        var d = ridge.depth;
        ctx.fillStyle = 'rgba(' + (16 + d * 10) + ',' + (22 + d * 12) + ',' + (42 + d * 16) + ',' + (0.55 + d * 0.15) + ')';
        var baseY = H * (0.30 + d * 0.18) + ridge.offset;
        var amp = 78 - d * 20;
        var n = ridge.pts.length - 1;
        ctx.beginPath();
        ctx.moveTo(0, H);
        for (var i = 0; i <= n; i++) {
          ctx.lineTo((i / n) * W, baseY - ridge.pts[i] * amp);
        }
        ctx.lineTo(W, H);
        ctx.closePath();
        ctx.fill();
      });
    }

    function drawLane() {
      var l = lane();
      var g = ctx.createLinearGradient(l.x, 0, l.x + l.w, 0);
      g.addColorStop(0, 'rgba(120,190,255,0)');
      g.addColorStop(0.5, 'rgba(120,190,255,.05)');
      g.addColorStop(1, 'rgba(120,190,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(l.x, 0, l.w, H);
      ctx.strokeStyle = 'rgba(140,200,255,.14)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(l.x + 0.5, 0); ctx.lineTo(l.x + 0.5, H);
      ctx.moveTo(l.x + l.w - 0.5, 0); ctx.lineTo(l.x + l.w - 0.5, H);
      ctx.stroke();
    }

    function drawRider(time) {
      var l = lane();
      var x = l.x + rider.x * l.w;
      var y = H * 0.72;
      var lean = (rider.target - rider.x) * 0.9;

      if (boost > 0) {
        ctx.fillStyle = 'oklch(85% 0.19 145 / .18)';
        ctx.beginPath();
        ctx.arc(x, y, 26 + Math.sin(time * 14) * 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Trail: the line the rider has just carved.
      ctx.strokeStyle = 'oklch(72% 0.18 200 / .35)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - lean * 40, y + 34);
      ctx.quadraticCurveTo(x - lean * 18, y + 16, x, y + 6);
      ctx.stroke();

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(lean * 0.5);
      ctx.fillStyle = boost > 0 ? 'oklch(85% 0.19 145)' : 'oklch(78% 0.17 200)';
      ctx.beginPath();
      ctx.moveTo(0, -13);
      ctx.lineTo(9, 10);
      ctx.lineTo(0, 5);
      ctx.lineTo(-9, 10);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    function drawRocks() {
      rocks.forEach(function (rock) {
        ctx.save();
        ctx.translate(rock.x, rock.y);
        ctx.rotate(rock.spin);
        // Bright enough to read against every parallax band; an obstacle you
        // cannot see is not difficulty, it is a bug.
        ctx.fillStyle = 'oklch(48% 0.02 250)';
        ctx.strokeStyle = 'oklch(78% 0.03 250 / .75)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (var i = 0; i < 6; i++) {
          var a = (i / 6) * Math.PI * 2;
          var rr = rock.r * (i % 2 ? 0.82 : 1);
          ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });
    }

    function drawGels(time) {
      gels.forEach(function (gel) {
        var pulse = reduceMotion ? 1 : 1 + Math.sin(time * 6 + gel.t) * 0.12;
        ctx.fillStyle = 'oklch(85% 0.19 145)';
        ctx.shadowColor = 'oklch(85% 0.19 145 / .6)';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(gel.x, gel.y, gel.r * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });
    }

    function drawHud() {
      var progress = Math.min(alt / SUMMIT_M, 1);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#e9edf7';
      ctx.font = '600 30px ' + DISPLAY_FONT;
      ctx.fillText(metres(alt), 20, 46);

      ctx.fillStyle = 'rgba(233,237,247,.55)';
      ctx.font = '500 13px ' + BODY_FONT;
      ctx.fillText('of ' + metres(SUMMIT_M) + (best ? '   ·   best ' + metres(best) : ''), 20, 68);

      // Vertical progress rail down the right edge - you can see the summit
      // coming, which is most of the reason to keep going.
      var railX = W - 26, railTop = 40, railH = H - 120;
      ctx.strokeStyle = 'rgba(255,255,255,.12)';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(railX, railTop + railH);
      ctx.lineTo(railX, railTop);
      ctx.stroke();

      ctx.strokeStyle = 'oklch(72% 0.18 200)';
      ctx.beginPath();
      ctx.moveTo(railX, railTop + railH);
      ctx.lineTo(railX, railTop + railH * (1 - progress));
      ctx.stroke();
    }

    function panel(lines) {
      ctx.fillStyle = 'rgba(5,7,15,.72)';
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center';
      var y = H / 2 - (lines.length * 17);
      lines.forEach(function (line) {
        ctx.fillStyle = line.dim ? 'rgba(233,237,247,.6)' : (line.accent || '#e9edf7');
        ctx.font = line.big
          ? '700 ' + Math.round(Math.min(46, W * 0.11)) + 'px ' + DISPLAY_FONT
          : '500 ' + (line.dim ? 14 : 17) + 'px ' + BODY_FONT;
        ctx.fillText(line.text, W / 2, y);
        y += line.big ? 52 : (line.dim ? 26 : 30);
      });
      ctx.textAlign = 'left';
    }

    function draw(time) {
      var progress = Math.min(alt / SUMMIT_M, 1);
      ctx.save();
      if (shake > 0) {
        ctx.translate((Math.random() - 0.5) * shake * 12, (Math.random() - 0.5) * shake * 12);
      }
      sky(progress);
      drawStars(progress, time);
      drawRidges();
      drawLane();
      drawGels(time);
      drawRocks();
      drawRider(time);
      ctx.restore();
      drawHud();

      if (state === 'intro') {
        panel([
          { text: 'EVERESTING', big: true, accent: 'oklch(78% 0.17 200)' },
          { text: 'Climb 8,848m without hitting the rock.' },
          { text: 'Drag, or use ← → / A D. Green gels are speed.', dim: true },
          { text: 'Press space to start · Esc to leave', dim: true }
        ]);
      } else if (state === 'dead') {
        panel([
          { text: metres(alt), big: true, accent: 'oklch(70% 0.20 25)' },
          { text: alt >= best ? 'A new personal best.' : 'Best so far: ' + metres(best) },
          { text: Math.round(progress * 100) + '% of Everest', dim: true },
          { text: 'Press space to go again · Esc to leave', dim: true }
        ]);
      } else if (state === 'summit') {
        panel([
          { text: 'SUMMIT', big: true, accent: 'oklch(85% 0.19 145)' },
          { text: 'You Everested. 8,848m, no rest.' },
          { text: 'Now go do it on the bike.', dim: true },
          { text: 'Press space to ride again · Esc to leave', dim: true }
        ]);
      }
    }

    /* --------------------------------------------------------------- input */

    function steerTo(clientX) {
      var l = lane();
      var rect = canvas.getBoundingClientRect();
      rider.target = Math.max(0, Math.min(1, (clientX - rect.left - l.x) / l.w));
    }

    function onPointerDown(e) {
      if (state !== 'playing') { start(); return; }
      canvas.setPointerCapture(e.pointerId);
      steerTo(e.clientX);
    }

    function onPointerMove(e) {
      if (state === 'playing' && e.buttons !== 0) steerTo(e.clientX);
    }

    function onKey(e) {
      if (e.key === ' ' || e.key === 'Enter') {
        // Someone who tabbed to the close button means to press it.
        if (document.activeElement && document.activeElement.classList.contains('egg-close')) return;
        e.preventDefault();
        if (state !== 'playing') start();
        return;
      }
      if (state !== 'playing') return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        rider.target = Math.max(0, rider.target - 0.14);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        rider.target = Math.min(1, rider.target + 0.14);
      }
    }

    /* ---------------------------------------------------------------- loop */

    function frame(now) {
      if (!running) return;
      // Clamp dt so a backgrounded tab does not resume with a huge jump that
      // teleports the rider into a rock.
      var dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      update(dt);
      draw(now / 1000);
      raf = requestAnimationFrame(frame);
    }

    return {
      mount: function () {
        reset();
        resize();
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(frame);
        window.addEventListener('resize', resize);
        canvas.addEventListener('pointerdown', onPointerDown);
        canvas.addEventListener('pointermove', onPointerMove);
        window.addEventListener('keydown', onKey);
      },
      unmount: function () {
        running = false;
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', resize);
        canvas.removeEventListener('pointerdown', onPointerDown);
        canvas.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('keydown', onKey);
      }
    };
  }

  /* --------------------------------------------------------------- overlay */

  function build() {
    var style = document.createElement('style');
    style.id = 'everesting-egg-style';
    style.textContent = CSS;
    document.head.appendChild(style);

    dialog = document.createElement('dialog');
    dialog.id = 'everesting-egg';
    dialog.setAttribute('aria-label', 'Everesting - a hidden climbing game');

    var close = document.createElement('button');
    close.className = 'egg-close';
    close.type = 'button';
    close.setAttribute('aria-label', 'Close the game');
    close.textContent = '×';
    close.addEventListener('click', function () { dialog.close(); });

    var canvas = document.createElement('canvas');
    // showModal() focuses the first focusable child, which would be the close
    // button - so the first space press would close the game instead of
    // starting it. The canvas takes focus instead; Tab still reaches the button.
    canvas.tabIndex = -1;

    dialog.appendChild(close);
    dialog.appendChild(canvas);
    document.body.appendChild(dialog);

    // Esc fires 'close' natively; tearing down there covers the button, the
    // key and any programmatic close with one path.
    dialog.addEventListener('close', function () {
      if (game) { game.unmount(); game = null; }
      document.body.style.overflow = '';
    });

    return canvas;
  }

  function open() {
    if (dialog && dialog.open) return;
    var canvas = dialog ? dialog.querySelector('canvas') : build();
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    document.body.style.overflow = 'hidden';
    dialog.showModal();
    canvas.focus();
    game = Game(canvas, reduceMotion);
    game.mount();

    if (typeof window.gtag === 'function') {
      window.gtag('event', 'easter_egg_opened', { egg: 'everesting' });
    }
  }

  window.startEverestingEgg = open;
}());
