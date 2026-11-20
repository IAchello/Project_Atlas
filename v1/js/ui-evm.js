/* Project Atlas — Earned value view: progress entry by status date, dashboard, formulas. */
var A = globalThis.A = globalThis.A || {};
(function () {
  var h = A.h, L = A.L;
  var C = { pv: '#0054A5', ev: '#7D8A00', ac: '#F26B43', grey: '#9A9B9C', ink: '#4d5b68' };
  var fN = function (v) { return v == null || !isFinite(v) ? '—' : A.fmtNum(Math.round(v)); };
  var fR = function (v) { return v == null || !isFinite(v) ? '—' : A.fmtNum(v, 2); };
  var fP = function (v) { return v == null ? '—' : A.fmtNum(v * 100) + ' %'; };
  function rag(v, index) { return v == null ? '' : index ? (v >= 0.95 ? '.ok' : v >= 0.85 ? '.warn' : '.bad') : (v >= -0.5 ? '.ok' : '.bad'); }

  /* ---------- charts ---------- */
  function ticks(a, b) {
    if (a === b) b = a + 1;
    var s0 = (b - a) / 5, mag = Math.pow(10, Math.floor(Math.log10(s0))), r = s0 / mag, step = (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10) * mag, out = [];
    for (var v = Math.floor(a / step + 1e-9) * step; v <= Math.ceil(b / step - 1e-9) * step + step / 2; v += step) out.push(+v.toFixed(10));
    return out;
  }
  function dateTicks(d0, d1) {
    var span = d1 - d0, out = [], loc = A.lang === 'fr' ? 'fr-FR' : 'en-GB';
    function lab(d, o) { return new Date(d * 864e5).toLocaleDateString(loc, Object.assign({ timeZone: 'UTC' }, o)); }
    if (span <= 100) { for (var d = d0 + ((4 - d0) % 7 + 7) % 7; d <= d1; d += span > 50 ? 14 : 7) out.push([d, lab(d, { day: '2-digit', month: 'short' })]); }
    else { var step = span <= 400 ? 1 : span <= 900 ? 3 : 6, x = A.ymd(d0); for (var m = x.m + 1, k = 0; k < 400; m++, k++) { var dd = A.dayOf(x.y, m, 1); if (dd > d1) break; if (((m % 12) + 12) % 12 % step === 0) out.push([dd, lab(dd, { month: 'short', year: '2-digit' })]); } }
    return out;
  }
  function frame(o) {
    var w = o.w || 1000, hh = o.h || 340, m = { l: 62, r: 24, t: 16, b: 34 }, iw = w - m.l - m.r, ih = hh - m.t - m.b;
    var X = function (v) { return m.l + (v - o.x[0]) / (o.x[1] - o.x[0]) * iw; }, Y = function (v) { return m.t + ih - (v - o.y[0]) / (o.y[1] - o.y[0]) * ih; };
    var s = '';
    o.yt.forEach(function (v) { s += '<line x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="' + (v === 0 ? '#8a94a0' : '#e3e7ec') + '"/><text x="' + (m.l - 8) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + A.esc((o.yf || A.shortNum)(v)) + '</text>'; });
    (o.xt || []).forEach(function (t) { s += '<line x1="' + X(t[0]) + '" x2="' + X(t[0]) + '" y1="' + m.t + '" y2="' + (hh - m.b) + '" stroke="#eef1f4"/><text x="' + X(t[0]) + '" y="' + (hh - m.b + 17) + '" text-anchor="middle">' + A.esc(t[1]) + '</text>'; });
    s += '<line x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + (hh - m.b) + '" y2="' + (hh - m.b) + '" stroke="#8a94a0"/>';
    return { m: m, X: X, Y: Y, w: w, h: hh, wrap: function (body) { return '<svg class="evm-ch" viewBox="0 0 ' + w + ' ' + hh + '" role="img">' + s + body + '</svg>'; } };
  }
  function pl(pts, f, col, o) {
    o = o || {}; if (pts.length < 2) return '';
    return '<polyline fill="none" stroke="' + col + '" stroke-width="' + (o.w || 2.5) + '"' + (o.dash ? ' stroke-dasharray="' + o.dash + '"' : '') + ' stroke-linejoin="round" points="' + pts.map(function (p) { return f.X(p[0]).toFixed(1) + ',' + f.Y(p[1]).toFixed(1); }).join(' ') + '"/>';
  }
  function dots(pts, f, col, name, shape, fmt) {
    return pts.map(function (p) {
      var cx = f.X(p[0]), cy = f.Y(p[1]), tt = '<title>' + A.esc(name + ' ' + A.fmtDate(p[0]) + ': ' + (fmt || fN)(p[1])) + '</title>';
      return shape === 'sq' ? '<rect x="' + (cx - 4.5) + '" y="' + (cy - 4.5) + '" width="9" height="9" fill="' + col + '" stroke="#fff">' + tt + '</rect>'
        : shape === 'tri' ? '<path d="M' + cx + ',' + (cy - 6) + ' L' + (cx + 5.5) + ',' + (cy + 4) + ' L' + (cx - 5.5) + ',' + (cy + 4) + 'Z" fill="' + col + '" stroke="#fff">' + tt + '</path>'
          : '<circle cx="' + cx + '" cy="' + cy + '" r="4.5" fill="' + col + '" stroke="#fff" stroke-width="1.2">' + tt + '</circle>';
    }).join('');
  }
  function legend(items) {
    return h('div.ch-legend', items.map(function (i) {
      return h('span', { html: '<svg width="30" height="12" aria-hidden="true" style="vertical-align:-1px;margin-right:5px">' + (i.line ? '<line x1="0" x2="30" y1="6" y2="6" stroke="' + i.c + '" stroke-width="2.5"' + (i.dash ? ' stroke-dasharray="' + i.dash + '"' : '') + '/>' : '') +
        (i.box ? '<rect x="8" y="1" width="14" height="10" fill="' + i.c + '"/>' : '') + (i.dot ? '<circle cx="15" cy="6" r="4.5" fill="' + i.c + '"/>' : '') + (i.sq ? '<rect x="10" y="1.5" width="9" height="9" fill="' + i.c + '"/>' : '') + (i.tri ? '<path d="M15,0 L21,11 L9,11Z" fill="' + i.c + '"/>' : '') + '</svg>' + A.esc(i.n) });
    }));
  }
  function chartBox(leg, svg) { return h('div.chart', leg, h('div', { html: svg })); }

  function chartS(S, ms, sel) {
    var pv = A.evm.pvCurve(S), d0 = pv[0][0], dF = pv[pv.length - 1][0], lt = sel ? sel.tot : null;
    var upTo = sel ? ms.filter(function (m) { return m.st.date <= sel.st.date; }) : [];
    var tf = sel ? A.evm.forecast(S, sel) : null, finF = tf && tf.fin ? tf.fin : dF, lastDay = sel ? sel.day : d0;
    var x1 = Math.max(dF, finF, lastDay) + Math.ceil((dF - d0) * 0.04) + 1, bac = pv[pv.length - 1][1], eac = lt && lt.eac != null ? lt.eac : bac;
    var ymax = Math.max.apply(null, [bac, eac].concat(upTo.map(function (m) { return m.tot.ac; }))) * 1.08 || 1, yt = ticks(0, ymax);
    var f = frame({ x: [d0, x1], y: [0, yt[yt.length - 1]], xt: dateTicks(d0, x1), yt: yt }), b = '';
    b += '<line x1="' + f.m.l + '" x2="' + (f.w - f.m.r) + '" y1="' + f.Y(bac) + '" y2="' + f.Y(bac) + '" stroke="' + C.grey + '" stroke-dasharray="6 4"/><text x="' + (f.w - f.m.r - 2) + '" y="' + (f.Y(bac) - 5) + '" text-anchor="end" style="font-weight:700">BAC ' + A.esc(A.shortNum(bac)) + '</text>';
    b += pl(pv, f, C.pv, { w: 3 });
    if (sel) {
      b += '<line x1="' + f.X(lastDay) + '" x2="' + f.X(lastDay) + '" y1="' + f.m.t + '" y2="' + (f.h - f.m.b) + '" stroke="' + C.ink + '" stroke-dasharray="5 4"/><text x="' + (f.X(lastDay) - 4) + '" y="' + (f.m.t + 11) + '" text-anchor="end">' + A.esc(A.fmtDate(lastDay)) + '</text>';
      var evP = [[d0, 0]].concat(upTo.map(function (m) { return [m.day, m.tot.ev]; })), acP = [[d0, 0]].concat(upTo.map(function (m) { return [m.day, m.tot.ac]; }));
      b += pl(evP, f, C.ev) + dots(evP.slice(1), f, C.ev, 'EV', 'sq') + pl(acP, f, C.ac) + dots(acP.slice(1), f, C.ac, 'AC', 'tri');
      if (!(tf && tf.done)) {
        b += pl([[lastDay, lt.ev], [finF, bac]], f, C.ev, { dash: '2 5' }) + pl([[lastDay, lt.ac], [finF, eac]], f, C.ac, { dash: '2 5' });
        b += '<text x="' + (Math.min(f.X(finF), f.w - f.m.r) - 2) + '" y="' + (f.Y(eac) + (eac >= bac ? -8 : 16)) + '" text-anchor="end" style="fill:' + C.ac + ';font-weight:700">EAC ' + A.esc(A.shortNum(eac)) + '</text>';
      }
      var bx = f.X(lastDay) + 9, br = function (a, c, lab, col) { return Math.abs(f.Y(a) - f.Y(c)) < 3 ? '' : '<line x1="' + bx + '" x2="' + bx + '" y1="' + f.Y(a) + '" y2="' + f.Y(c) + '" stroke="' + col + '" stroke-width="3"/><text x="' + (bx + 6) + '" y="' + ((f.Y(a) + f.Y(c)) / 2 + 4) + '" style="fill:' + col + ';font-weight:700">' + A.esc(lab) + '</text>'; };
      var ySV = (f.Y(lt.pv) + f.Y(lt.ev)) / 2 + 4, yCV = (f.Y(lt.ev) + f.Y(lt.ac)) / 2 + 4;
      if (Math.abs(ySV - yCV) < 15) { if (ySV <= yCV) yCV = ySV + 15; else ySV = yCV + 15; }
      var br2 = function (a, c, lab, col, ty) { return Math.abs(f.Y(a) - f.Y(c)) < 3 ? '' : '<line x1="' + bx + '" x2="' + bx + '" y1="' + f.Y(a) + '" y2="' + f.Y(c) + '" stroke="' + col + '" stroke-width="3"/><text x="' + (bx + 6) + '" y="' + ty + '" style="fill:' + col + ';font-weight:700;paint-order:stroke;stroke:#fff;stroke-width:3px">' + A.esc(lab) + '</text>'; };
      b += br2(lt.pv, lt.ev, 'SV ' + A.shortNum(lt.sv), C.pv, ySV) + br2(lt.ev, lt.ac, 'CV ' + A.shortNum(lt.cv), C.ac, yCV);
    }
    var leg = [{ n: L('Planned value (PV)', 'Valeur planifiée (PV)'), c: C.pv, line: 1 }];
    if (sel) leg.push({ n: L('Earned value (EV)', 'Valeur acquise (EV)'), c: C.ev, line: 1, sq: 1 }, { n: L('Actual cost (AC)', 'Coût réel (AC)'), c: C.ac, line: 1, tri: 1 }, { n: L('Forecast', 'Prévision'), c: C.ink, line: 1, dash: '2 4' });
    return chartBox(legend(leg), f.wrap(b));
  }
  function chartIdx(ms) {
    var pts = function (k) { return ms.filter(function (m) { return m.tot[k] != null; }).map(function (m) { return [m.day, m.tot[k]]; }); };
    var spi = pts('spi'), cpi = pts('cpi'), all = spi.concat(cpi).map(function (p) { return p[1]; });
    var lo = Math.min.apply(null, all.concat([0.8])), hi = Math.max.apply(null, all.concat([1.2])), yt = ticks(Math.floor(lo * 10) / 10, Math.ceil(hi * 10) / 10);
    var d0 = ms[0].day, d1 = ms[ms.length - 1].day, padd = Math.max(3, Math.round((d1 - d0) * 0.08));
    var f = frame({ w: 640, h: 300, x: [d0 - padd, d1 + padd], y: [yt[0], yt[yt.length - 1]], xt: ms.map(function (m) { return [m.day, new Date(m.day * 864e5).toLocaleDateString(A.lang === 'fr' ? 'fr-FR' : 'en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' })]; }), yt: yt, yf: function (v) { return A.fmtNum(v, 2); } });
    var b = '<line x1="' + f.m.l + '" x2="' + (f.w - f.m.r) + '" y1="' + f.Y(1) + '" y2="' + f.Y(1) + '" stroke="' + C.ink + '" stroke-dasharray="6 4"/>';
    b += pl(spi, f, C.pv) + dots(spi, f, C.pv, 'SPI', null, fR) + pl(cpi, f, C.ac) + dots(cpi, f, C.ac, 'CPI', 'tri', fR);
    return chartBox(legend([{ n: L('Schedule index (SPI)', 'Indice des délais (SPI)'), c: C.pv, line: 1, dot: 1 }, { n: L('Cost index (CPI)', 'Indice des coûts (CPI)'), c: C.ac, line: 1, tri: 1 }, { n: L('1.00 = on plan', '1,00 = conforme au plan'), c: C.ink, line: 1, dash: '6 4' }]), f.wrap(b));
  }
  function barChart(cats, series) {
    var all = []; series.forEach(function (s) { all = all.concat(s.vals); });
    var yt = ticks(Math.min.apply(null, all.concat([0])), Math.max.apply(null, all.concat([0])) || 1);
    var f = frame({ w: 640, h: 300, x: [0, cats.length], y: [yt[0], yt[yt.length - 1]], yt: yt }), band = f.X(1) - f.X(0), gw = band * 0.74, bw = gw / series.length, b = '';
    cats.forEach(function (c, i) {
      var gx = f.X(i) + (band - gw) / 2;
      series.forEach(function (s, j) {
        var v = s.vals[i], y0 = f.Y(0), y1 = f.Y(v), x0 = gx + j * bw;
        b += '<rect x="' + x0.toFixed(1) + '" y="' + Math.min(y0, y1).toFixed(1) + '" width="' + Math.max(1, bw - 2).toFixed(1) + '" height="' + Math.max(1, Math.abs(y1 - y0)).toFixed(1) + '" fill="' + s.c + '"><title>' + A.esc(s.n + ' — ' + c + ': ' + fN(v)) + '</title></rect>';
        if (cats.length * series.length <= 18) b += '<text x="' + (x0 + bw / 2 - 1).toFixed(1) + '" y="' + (v >= 0 ? y1 - 4 : y1 + 12).toFixed(1) + '" text-anchor="middle" style="font-size:11px">' + A.esc(A.shortNum(v)) + '</text>';
      });
      var max = Math.max(6, Math.floor(band / 7));
      b += '<text x="' + (f.X(i) + band / 2) + '" y="' + (f.h - f.m.b + 17) + '" text-anchor="middle">' + A.esc(c.length > max ? c.slice(0, max - 1) + '…' : c) + '</text>';
    });
    return chartBox(legend(series.map(function (s) { return { n: s.n, c: s.c, box: 1 }; })), f.wrap(b));
  }

  /* ---------- helpers ---------- */
  function selStatus() {
    var ss = A.evm.sorted(); if (!ss.length) { A.ui.evmSel = null; return null; }
    var s = ss.find(function (x) { return x.date === A.ui.evmSel; });
    if (!s) { s = ss[ss.length - 1]; A.ui.evmSel = s.date; }
    return s;
  }
  function stById(id) { return function () { return (A.P.statuses || []).find(function (s) { return s.id === id; }); }; }
  function kpiTile(label, value, tag, sub) { return h('div.kpi' + (tag[0] ? '.' + tag[0] : ''), h('span.k', label), h('span.v', value), h('span.s' + (tag[0] ? '.t' : ''), sub || tag[1] || '')); }
  A.evmKpis = function (S, m) {
    var T = m.tot, cur = A.P.currency;
    var spiTag = T.spi == null ? ['', '—'] : T.spi > 1.05 ? ['ok', L('▲ Ahead of schedule', '▲ En avance')] : T.spi >= 0.95 ? ['ok', L('● On schedule', '● Dans les délais')] : T.spi >= 0.85 ? ['warn', L('▼ Behind schedule', '▼ En retard')] : ['bad', L('▼ Behind schedule', '▼ En retard')];
    var cpiTag = T.cpi == null ? ['', '—'] : T.cpi > 1.05 ? ['ok', L('▲ Under budget', '▲ Sous le budget')] : T.cpi >= 0.95 ? ['ok', L('● On budget', '● Dans le budget')] : T.cpi >= 0.85 ? ['warn', L('▼ Over budget', '▼ Dépassement de budget')] : ['bad', L('▼ Over budget', '▼ Dépassement de budget')];
    var svTag = T.sv >= -0.5 ? ['ok', L('▲ Ahead of schedule', '▲ En avance')] : ['bad', L('▼ Behind schedule', '▼ En retard')], cvTag = T.cv >= -0.5 ? ['ok', L('▲ Under budget', '▲ Sous le budget')] : ['bad', L('▼ Over budget', '▼ Dépassement de budget')];
    var vacTag = T.vac == null ? ['', '—'] : T.vac >= -0.5 ? ['ok', L('▲ Under budget', '▲ Sous le budget')] : ['bad', L('▼ Over budget', '▼ Dépassement de budget')];
    var tcTag = T.tcpi == null ? ['', '—'] : T.tcpi > 1.1 ? ['bad', L('▼ Hard to reach (>1.10)', '▼ Difficile (>1,10)')] : T.tcpi > 1 ? ['warn', L('● Achievable', '● Réalisable')] : ['ok', L('▲ Comfortable', '▲ Confortable')];
    return h('div.kpis',
      kpiTile(L('Schedule (SPI)', 'Délais (SPI)'), fR(T.spi), spiTag), kpiTile(L('Cost (CPI)', 'Coûts (CPI)'), fR(T.cpi), cpiTag),
      kpiTile(L('Schedule variance', 'Écart de délai'), fN(T.sv), svTag), kpiTile(L('Cost variance', 'Écart de coût'), fN(T.cv), cvTag),
      kpiTile(L('Forecast at completion', 'Prévision à l’achèvement'), fN(T.eac), ['', ''], 'BAC ' + fN(T.bac) + ' ' + cur), kpiTile(L('Variance at completion', 'Écart à l’achèvement'), fN(T.vac), vacTag),
      kpiTile(L('Required efficiency', 'Efficacité requise'), fR(T.tcpi), tcTag), kpiTile(L('Progress', 'Avancement'), fP(T.pctC), ['', ''], fP(T.pctP) + ' ' + L('planned', 'prévu')));
  };
  A.evmChartS = chartS;
  function head(cols) { return h('thead', h('tr', cols.map(function (c, i) { return h('th' + (i ? '.r' : ''), { title: c[1] || null }, c[0]); }))); }
  var NAMES = function () { return { BAC: L('Budget at completion', 'Budget à l’achèvement'), PV: L('Planned value', 'Valeur planifiée'), EV: L('Earned value', 'Valeur acquise'), AC: L('Actual cost', 'Coût réel'), SV: L('Schedule variance', 'Écart de délai'), SPI: L('Schedule performance index', 'Indice de performance des délais'), CV: L('Cost variance', 'Écart de coût'), CPI: L('Cost performance index', 'Indice de performance des coûts'), EAC: L('Estimate at completion', 'Estimation à l’achèvement'), VAC: L('Variance at completion', 'Écart à l’achèvement'), TCPI: L('To-complete performance index', 'Indice de performance à réaliser') }; };
  function kcells(r, withT) {
    var c = [h('td.r' + rag(r.sv), fN(r.sv)), h('td.r' + rag(r.spi, 1), fR(r.spi)), h('td.r' + rag(r.cv), fN(r.cv)), h('td.r' + rag(r.cpi, 1), fR(r.cpi)), h('td.r', fN(r.eac)), h('td.r' + (r.vac == null ? '' : rag(r.vac)), fN(r.vac))];
    if (withT) c.push(h('td.r', fR(r.tcpi)));
    return c;
  }

  /* ---------- view ---------- */
  A.views.evm = function (root) {
    var P = A.P, S = A.S, ui = A.ui, cur = P.currency, N = NAMES();
    ui.evmTab = ui.evmTab || 'dash';
    var ss = A.evm.sorted(), st = selStatus();
    var tabs = [['dash', L('Dashboard', 'Tableau de bord')], ['progress', L('Progress entry', 'Saisie de l’avancement')], ['formulas', L('Formulas', 'Formules')]];
    var dateIn = h('input.in.sm', { type: 'date', value: ui.evmNew || P.statusDate || A.todayISO(), onchange: function () { ui.evmNew = dateIn.value; } });
    var eacSel = A.live(function () { return A.P; }, 'eacMethod', 'select', { fk: 'eacMethod', options: [{ id: 'cpi', name: 'EAC = AC + (BAC − EV) / CPI' }, { id: 'budget', name: 'EAC = AC + (BAC − EV)' }, { id: 'spicpi', name: 'EAC = AC + (BAC − EV) / (CPI × SPI)' }] });
    eacSel.classList.add('sm');
    root.appendChild(h('div.toolbar.noprint',
      h('div.seg', tabs.map(function (t) { return h('button' + (ui.evmTab === t[0] ? '.on' : ''), { type: 'button', onclick: function () { ui.evmTab = t[0]; A.refresh(); } }, t[1]); })),
      h('div.tg', h('span.muted', L('Status date', 'Date d’état')), dateIn, A.btn('plus', L('Add status date', 'Ajouter une date d’état'), function () {
        var d = dateIn.value; if (!d) return; var made;
        A.edit(function () { made = A.evm.addStatus(d); if (!made) return false; });
        if (!made) A.toast(L('This status date already exists.', 'Cette date d’état existe déjà.')); else { ui.evmSel = d; ui.evmTab = 'progress'; A.refresh(); }
      }, { primary: true })),
      h('div.tg', h('span.muted', L('Forecast', 'Prévision')), eacSel)));
    if (!P.tasks.length) { root.appendChild(h('div.empty-state', h('h3', L('No tasks yet', 'Aucune tâche')), h('p', L('Build the plan first, or load the earned value example from the File menu.', 'Construire d’abord le plan, ou charger l’exemple de valeur acquise depuis le menu Fichier.')), A.btn('book', L('Load the example: Project ABCDE', 'Charger l’exemple : Projet ABCDE'), function () { A.loadABCDE(); }, { primary: true }))); return; }
    if (!P.baseline) root.appendChild(h('div.banner.warn', A.icon('warn'), L('No baseline yet: the current schedule is used as the plan, so delays will not show as schedule variance. ', 'Pas encore de référence : le planning actuel sert de plan, les retards n’apparaîtront donc pas en écart de délai. '),
      A.btn('flag', L('Set baseline now', 'Fixer la référence maintenant'), function () { A.edit(function () { A.setBaseline(); }); })));
    if (ss.length && ui.evmTab !== 'formulas') root.appendChild(h('div.chips.noprint', ss.map(function (s) { return h('button.chip' + (st && s.date === st.date ? '.on' : ''), { type: 'button', onclick: function () { ui.evmSel = s.date; A.refresh(); } }, A.fmtDate(s.date)); })));

    if (ui.evmTab === 'formulas') {
      var F = [['BAC', 'Σ BAC', L('Total authorised budget of the task / project.', 'Budget total autorisé de la tâche / du projet.')], ['PV', 'BAC × % ' + L('planned', 'prévu'), L('Budgeted cost of the work that should be done by the status date.', 'Coût budgété du travail qui devrait être réalisé à la date d’état.')],
        ['EV', 'BAC × % ' + L('complete', 'réalisé'), L('Budgeted cost of the work actually done.', 'Coût budgété du travail effectivement réalisé.')], ['AC', 'Σ ' + L('actual costs', 'coûts réels'), L('Actual money spent on the work done.', 'Argent réellement dépensé pour le travail réalisé.')],
        ['SV', 'EV − PV', L('<0: behind schedule · >0: ahead.', '<0 : en retard · >0 : en avance.')], ['SPI', 'EV / PV', L('<1: behind schedule · >1: ahead.', '<1 : en retard · >1 : en avance.')],
        ['CV', 'EV − AC', L('<0: over budget · >0: under budget.', '<0 : dépassement · >0 : économie.')], ['CPI', 'EV / AC', L('<1: over budget · >1: under budget.', '<1 : dépassement · >1 : économie.')],
        ['EAC', 'AC + (BAC − EV) / CPI', L('Expected final cost if performance continues.', 'Coût final attendu si la performance se poursuit.')], ['ETC', 'EAC − AC', L('Cost still to be spent.', 'Coût restant à dépenser.')],
        ['VAC', 'BAC − EAC', L('<0: expected overrun at completion.', '<0 : dépassement attendu à l’achèvement.')], ['TCPI', '(BAC − EV) / (BAC − AC)', L('Efficiency needed on remaining work to finish on BAC (>1 = harder).', 'Efficacité requise sur le reste du travail pour finir au BAC (>1 = plus difficile).')],
        ['ES', 'PV(ES) = EV', L('Earned schedule: time at which the PV curve equals the current EV.', 'Délai acquis : date à laquelle la courbe PV égale l’EV actuelle.')], ['—', L('Start + planned duration / SPI(t)', 'Début + durée planifiée / SPI(t)'), L('Forecast finish date, with SPI(t) = ES / actual time.', 'Date de fin prévisionnelle, avec SPI(t) = ES / temps écoulé.')]];
      root.appendChild(h('div.card', h('div.card-head', h('h2', L('EVM formulas', 'Formules EVM'))), h('div.scroll-x', h('table.data.fx', h('thead', h('tr', h('th', L('Indicator', 'Indicateur')), h('th', L('Formula', 'Formule')), h('th', L('Interpretation', 'Interprétation')))),
        h('tbody', F.map(function (r) { return h('tr', h('td.b', r[0]), h('td.mono', r[1]), h('td', r[2])); })))),
        h('p.muted', L('In Atlas, PV comes from the baseline: each task’s budget is spread over its baseline working days (or placed at its start or end, as set in the task details). % complete and actual cost are entered for each status date.',
          'Dans Atlas, la PV vient de la référence : le budget de chaque tâche est réparti sur ses jours ouvrés de référence (ou placé au début ou à la fin, selon les détails de la tâche). Le % réalisé et le coût réel sont saisis à chaque date d’état.'))));
      return;
    }
    if (!st) {
      root.appendChild(h('div.card', h('div.card-head', h('h2', L('S-curve — planned value', 'Courbe en S — valeur planifiée') + ' (' + cur + ')')), chartS(S, [], null),
        h('p.muted', L('Add a status date above to enter, for each task, the % complete and the actual cost. Atlas then computes EV, the variances, the indices and the forecasts.', 'Ajouter une date d’état ci-dessus pour saisir, pour chaque tâche, le % réalisé et le coût réel. Atlas calcule alors l’EV, les écarts, les indices et les prévisions.'))));
      return;
    }
    var ms = ss.map(function (s) { return A.evm.metrics(S, s); }), sel = ms.find(function (m) { return m.st.date === st.date; }), T = sel.tot;

    if (ui.evmTab === 'progress') {
      var g = stById(st.id), showAll = !!ui.evmAll;
      var rows = sel.rows.filter(function (r) { return showAll || r.bac > 0 || r.ac > 0; });
      var tb = h('tbody');
      rows.forEach(function (r) {
        var id = r.n.id;
        tb.appendChild(h('tr', h('td', { title: r.n.t.name }, h('span.muted', r.n.wbs + '  '), r.n.t.name), h('td.r', fN(r.bac)),
          h('td.in-cell', A.live(g, 'x', 'pct', { fk: 'evm:pct:' + id, zero: false, set: function (s, v) { s.pct[id] = v; A.evm.sync(); } }, 0)),
          h('td.r', fN(r.ev)), h('td.r', fN(r.pv)),
          h('td.in-cell', A.live(g, 'y', 'num', { fk: 'evm:ac:' + id, set: function (s, v) { s.ac[id] = Math.max(0, v); } })), kcells(r)));
        var ins = tb.lastChild.querySelectorAll('input'); ins[0].value = st.pct[id] ? A.fmtNum(+st.pct[id], (+st.pct[id]) % 1 ? 1 : 0) : ''; ins[1].value = st.ac[id] ? A.fmtNum(+st.ac[id], (+st.ac[id]) % 1 ? 2 : 0) : '';
      });
      root.appendChild(h('div.card', h('div.card-head', h('h2', L('Progress at ', 'Avancement au ') + A.fmtDate(st.date)), h('span.sp'),
        h('label.chk', h('input', { type: 'checkbox', checked: showAll, onchange: function (e) { ui.evmAll = e.target.checked; A.refresh(); } }), L('Show tasks without budget', 'Afficher les tâches sans budget')),
        A.btn('trash', L('Delete this status date', 'Supprimer cette date d’état'), function () {
          A.confirm(L('Delete the status date ', 'Supprimer la date d’état ') + A.fmtDate(st.date) + L('?', ' ?'), L('Delete', 'Supprimer'), function () { A.edit(function () { A.P.statuses = A.P.statuses.filter(function (s) { return s.id !== st.id; }); A.evm.sync(); }); });
        }, { ghost: true, danger: true })),
        h('div.scroll-x.evm-table', h('table.data.evm', head([[L('Task', 'Tâche')], ['BAC', N.BAC], [L('% complete', '% réalisé')], ['EV', N.EV], ['PV', N.PV], ['AC', N.AC], ['SV', N.SV], ['SPI', N.SPI], ['CV', N.CV], ['CPI', N.CPI], ['EAC', N.EAC], ['VAC', N.VAC]]), tb,
          h('tfoot', h('tr.total', h('td', L('TOTAL', 'TOTAL')), h('td.r', fN(T.bac)), h('td.r', fP(T.pctC)), h('td.r', fN(T.ev)), h('td.r', fN(T.pv)), h('td.r', fN(T.ac)), kcells(T))))),
        h('p.muted', cur + ' · ' + L('Enter cumulative values at the status date: % complete and actual cost to date. The latest status date also updates the progress shown in the Gantt.', 'Saisir les valeurs cumulées à la date d’état : % réalisé et coût réel à ce jour. La dernière date d’état met aussi à jour l’avancement affiché dans le Gantt.'))));
      return;
    }

    /* dashboard */
    var tf = A.evm.forecast(S, sel), fin = tf.done ? L('Completed', 'Terminé') : tf.fin ? A.fmtDate(tf.fin) + ' (' + (tf.fin - tf.planned >= 0 ? '+' + (tf.fin - tf.planned) + L(' d late', ' j de retard') : (tf.planned - tf.fin) + L(' d early', ' j d’avance')) + ')' : '—';
    root.appendChild(h('div.card.slim', h('b', P.name), P.manager ? ' · ' + P.manager : '', ' · ' + cur, h('span.muted', '   |   ' + L('Planned finish: ', 'Fin planifiée : ')), h('b', A.fmtDate(tf.planned)), h('span.muted', '   ·   ' + L('Forecast finish: ', 'Fin prévisionnelle : ')), h('b', fin)));
    root.appendChild(A.evmKpis(S, sel));
    root.appendChild(h('div.card', h('div.card-head', h('h2', L('S-curve — cumulative PV, EV and AC', 'Courbe en S — PV, EV et AC cumulés'))), chartS(S, ms, sel)));
    var dlab = function (m) { return new Date(m.day * 864e5).toLocaleDateString(A.lang === 'fr' ? 'fr-FR' : 'en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' }); };
    var per = ms.map(function (m, i) { var p = i ? ms[i - 1].tot : { pv: 0, ev: 0, ac: 0 }; return { pv: m.tot.pv - p.pv, ev: m.tot.ev - p.ev, ac: m.tot.ac - p.ac }; });
    var groups = sel.rows.filter(function (r) { return r.bac > 0; }).length <= 8 ? sel.rows.filter(function (r) { return r.bac > 0; }) : sel.comps;
    var three = function (list) { return [{ n: 'PV', c: C.pv, vals: list.map(function (r) { return r.pv; }) }, { n: 'EV', c: C.ev, vals: list.map(function (r) { return r.ev; }) }, { n: 'AC', c: C.ac, vals: list.map(function (r) { return r.ac; }) }]; };
    root.appendChild(h('div.dash.two',
      h('div.card', h('div.card-head', h('h2', L('Schedule and cost variances', 'Écarts de délai et de coût'))), barChart(ms.map(dlab), [{ n: 'SV', c: C.pv, vals: ms.map(function (m) { return m.tot.sv; }) }, { n: 'CV', c: C.ac, vals: ms.map(function (m) { return m.tot.cv; }) }])),
      h('div.card', h('div.card-head', h('h2', L('Performance indices (SPI, CPI)', 'Indices de performance (SPI, CPI)'))), chartIdx(ms)),
      h('div.card', h('div.card-head', h('h2', (groups === sel.comps ? L('Performance by component', 'Performance par composante') : L('Performance by task', 'Performance par tâche')) + ' — ' + A.fmtDate(sel.day))), barChart(groups.map(function (r) { return r.n.t.name; }), three(groups))),
      h('div.card', h('div.card-head', h('h2', L('Period values', 'Valeurs par période'))), barChart(ms.map(dlab), three(per)))));
    var trs = sel.rows.filter(function (r) { return r.bac > 0 || r.ac > 0; }).map(function (r) { return h('tr', h('td', h('span.muted', r.n.wbs + '  '), r.n.t.name), h('td.r', fN(r.bac)), h('td.r', fP(r.pctC)), h('td.r', fN(r.ev)), h('td.r', fN(r.pv)), h('td.r', fN(r.ac)), kcells(r)); });
    root.appendChild(h('div.card', h('div.card-head', h('h2', L('Task performance at the status date', 'Performance des tâches à la date d’état'))),
      h('div.scroll-x', h('table.data.evm', head([[L('Task', 'Tâche')], ['BAC', N.BAC], ['%'], ['EV', N.EV], ['PV', N.PV], ['AC', N.AC], ['SV', N.SV], ['SPI', N.SPI], ['CV', N.CV], ['CPI', N.CPI], ['EAC', N.EAC], ['VAC', N.VAC]]), h('tbody', trs),
        h('tfoot', h('tr.total', h('td', 'TOTAL'), h('td.r', fN(T.bac)), h('td.r', fP(T.pctC)), h('td.r', fN(T.ev)), h('td.r', fN(T.pv)), h('td.r', fN(T.ac)), kcells(T)))))));
    root.appendChild(A.evmSummaryCard(ms));
  };
  A.evmSummaryCard = function (ms) {
    var N = NAMES();
    return h('div.card', h('div.card-head', h('h2', L('Summary by status date', 'Synthèse par date d’état'))),
      h('div.scroll-x', h('table.data.evm', head([[L('Status date', 'Date d’état')], ['BAC', N.BAC], ['PV', N.PV], ['EV', N.EV], ['AC', N.AC], ['SV', N.SV], ['SPI', N.SPI], ['CV', N.CV], ['CPI', N.CPI], ['EAC', N.EAC], ['VAC', N.VAC], ['TCPI', N.TCPI]]),
        h('tbody', ms.map(function (m) { return h('tr', h('td', A.fmtDate(m.day)), h('td.r', fN(m.tot.bac)), h('td.r', fN(m.tot.pv)), h('td.r', fN(m.tot.ev)), h('td.r', fN(m.tot.ac)), kcells(m.tot, true)); })))));
  };
})();
