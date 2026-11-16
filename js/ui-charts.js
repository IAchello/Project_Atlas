/* Project Atlas — small SVG charts: stacked bars per period and cumulative lines, with hover tooltips. */
var A = globalThis.A = globalThis.A || {};
(function () {
  var h = A.h;
  A.SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];
  function nice(max) {
    if (!(max > 0)) return { max: 1, step: 1 };
    var raw = max / 4, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p, step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
    return { max: Math.ceil(max / step) * step, step: step };
  }
  function short(v) {
    var a = Math.abs(v);
    if (a >= 1e9) return A.fmtNum(v / 1e9, a % 1e9 ? 1 : 0) + (A.lang === 'fr' ? ' Md' : 'B');
    if (a >= 1e6) return A.fmtNum(v / 1e6, a % 1e6 ? 1 : 0) + ' M';
    if (a >= 1e3) return A.fmtNum(v / 1e3, a % 1e3 ? 1 : 0) + ' k';
    return A.fmtNum(v, a % 1 ? 1 : 0);
  }
  A.shortNum = short;
  function legend(series) {
    return h('div.ch-legend', series.map(function (s) { return h('span', h('i' + (s.dash ? '.dash' : s.line ? '.ln' : ''), { style: { background: s.dash ? 'none' : s.color, borderColor: s.color } }), s.name); }));
  }
  function frame(o, W, H, m, yMax, step, labels, bandW) {
    var s = '', pw = W - m.l - m.r, ph = H - m.t - m.b, ink = A.cssVar('--muted'), grid = A.cssVar('--grid');
    for (var v = 0; v <= yMax + 1e-9; v += step) {
      var y = m.t + ph - (v / yMax) * ph;
      s += '<line x1="' + m.l + '" y1="' + y + '" x2="' + (W - m.r) + '" y2="' + y + '" stroke="' + (v === 0 ? A.cssVar('--line-2') : grid) + '"/>';
      s += '<text x="' + (m.l - 8) + '" y="' + (y + 4) + '" text-anchor="end" font-size="11" fill="' + ink + '">' + A.esc(short(v)) + '</text>';
    }
    var every = Math.max(1, Math.ceil(labels.length * 46 / pw));
    labels.forEach(function (lb, i) {
      if (i % every) return;
      s += '<text x="' + (m.l + bandW * (i + 0.5)) + '" y="' + (H - m.b + 16) + '" text-anchor="middle" font-size="11" fill="' + ink + '">' + A.esc(lb) + '</text>';
    });
    return s;
  }
  function tipBox(wrap) {
    var tip = h('div.ch-tip'); tip.style.display = 'none'; wrap.appendChild(tip);
    return {
      show: function (x, rows, title) {
        tip.textContent = ''; tip.appendChild(h('b', title));
        rows.forEach(function (r) { tip.appendChild(h('div.r', h('i', { style: { background: r.color } }), h('span', r.name), h('em', A.money(r.value)))); });
        tip.style.display = 'block';
        var w = wrap.clientWidth, tw = tip.offsetWidth; tip.style.left = Math.max(4, Math.min(w - tw - 4, x + 14 > w - tw ? x - tw - 14 : x + 14)) + 'px'; tip.style.top = '8px';
      },
      hide: function () { tip.style.display = 'none'; }
    };
  }
  /* o = {labels[], series:[{name,color,values[]}], height, unit} */
  A.stackedBars = function (o) {
    var wrap = h('div.chart'), W = 1200, H = o.height || 260, m = { l: 54, r: 12, t: 12, b: 28 };
    var totals = o.labels.map(function (_, i) { return o.series.reduce(function (a, s) { return a + (s.values[i] || 0); }, 0); });
    var ax = nice(Math.max.apply(null, totals.concat([0]))), pw = W - m.l - m.r, ph = H - m.t - m.b, band = pw / Math.max(1, o.labels.length);
    var bw = Math.max(2, Math.min(46, band * 0.68)), s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + A.esc(o.title || '') + '">';
    s += frame(o, W, H, m, ax.max, ax.step, o.labels, band);
    o.labels.forEach(function (_, i) {
      var y = m.t + ph, x = m.l + band * i + (band - bw) / 2, top = -1;
      o.series.forEach(function (sr, k) { if (sr.values[i] > 0) top = k; });
      o.series.forEach(function (sr, k) {
        var v = sr.values[i] || 0; if (v <= 0) return;
        var hh = v / ax.max * ph, gap = hh > 4 ? 2 : 0, r = k === top ? Math.min(4, bw / 2, hh) : 0, y0 = y - hh;
        s += '<path d="M' + x + ',' + (y - 0) + 'V' + (y0 + gap + r) + 'q0,-' + r + ' ' + r + ',-' + r + 'H' + (x + bw - r) + 'q' + r + ',0 ' + r + ',' + r + 'V' + y + 'Z" fill="' + sr.color + '"/>';
        y = y0;
      });
      s += '<rect class="hit" data-i="' + i + '" x="' + (m.l + band * i) + '" y="' + m.t + '" width="' + band + '" height="' + ph + '" fill="transparent"/>';
    });
    s += '</svg>';
    wrap.innerHTML = s;
    if (o.series.length > 1) wrap.insertBefore(legend(o.series), wrap.firstChild);
    var tip = tipBox(wrap);
    wrap.addEventListener('pointermove', function (e) {
      var t = e.target.closest('.hit'); if (!t) return tip.hide();
      var i = +t.dataset.i, rows = o.series.filter(function (sr) { return sr.values[i]; }).map(function (sr) { return { name: sr.name, color: sr.color, value: sr.values[i] }; }).reverse();
      if (o.series.length > 1) rows.push({ name: A.L('Total', 'Total'), color: 'transparent', value: totals[i] });
      tip.show(e.clientX - wrap.getBoundingClientRect().left, rows, o.labels[i]);
    });
    wrap.addEventListener('pointerleave', tip.hide);
    return wrap;
  };
  /* o = {labels[], series:[{name,color,values[], dash}], height} ; values are plotted at the end of each period */
  A.lineChart = function (o) {
    var wrap = h('div.chart'), W = 1200, H = o.height || 260, m = { l: 54, r: 16, t: 12, b: 28 };
    var max = 0; o.series.forEach(function (sr) { sr.values.forEach(function (v) { if (v > max) max = v; }); });
    var ax = nice(max), pw = W - m.l - m.r, ph = H - m.t - m.b, band = pw / Math.max(1, o.labels.length);
    var X = function (i) { return m.l + band * (i + 1); }, Y = function (v) { return m.t + ph - v / ax.max * ph; };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + A.esc(o.title || '') + '">';
    s += frame(o, W, H, m, ax.max, ax.step, o.labels, band);
    o.series.forEach(function (sr) {
      var d = 'M' + m.l + ',' + Y(0), n = sr.upTo != null ? sr.upTo : sr.values.length;
      for (var i = 0; i < n; i++) d += 'L' + X(i) + ',' + Y(sr.values[i]);
      s += '<path d="' + d + '" fill="none" stroke="' + sr.color + '" stroke-width="2" stroke-linejoin="round"' + (sr.dash ? ' stroke-dasharray="6 4"' : '') + '/>';
    });
    s += '<line class="cross" x1="0" x2="0" y1="' + m.t + '" y2="' + (m.t + ph) + '" stroke="' + A.cssVar('--muted') + '" stroke-dasharray="3 3" visibility="hidden"/>';
    s += '<rect class="hit" x="' + m.l + '" y="' + m.t + '" width="' + pw + '" height="' + ph + '" fill="transparent"/></svg>';
    wrap.innerHTML = s;
    if (o.series.length > 1) wrap.insertBefore(legend(o.series.map(function (x) { return { name: x.name, color: x.color, dash: x.dash, line: true }; })), wrap.firstChild);
    var tip = tipBox(wrap), cross = wrap.querySelector('.cross'), svg = wrap.querySelector('svg');
    wrap.addEventListener('pointermove', function (e) {
      var r = svg.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W;
      var i = Math.max(0, Math.min(o.labels.length - 1, Math.round((x - m.l) / band - 1)));
      if (x < m.l - 4 || x > W - m.r + 4) { cross.setAttribute('visibility', 'hidden'); return tip.hide(); }
      cross.setAttribute('x1', X(i)); cross.setAttribute('x2', X(i)); cross.setAttribute('visibility', 'visible');
      tip.show(e.clientX - wrap.getBoundingClientRect().left, o.series.filter(function (sr) { return sr.upTo == null || i < sr.upTo; }).map(function (sr) { return { name: sr.name, color: sr.color, value: sr.values[i] }; }), A.L('End of ', 'Fin ') + o.labels[i]);
    });
    wrap.addEventListener('pointerleave', function () { cross.setAttribute('visibility', 'hidden'); tip.hide(); });
    return wrap;
  };
})();
