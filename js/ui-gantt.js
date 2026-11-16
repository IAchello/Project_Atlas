/* Project Atlas — Gantt view: task grid + bar chart, and the static Gantt drawing used by reports. */
var A = globalThis.A = globalThis.A || {};
(function () {
  var h = A.h, L = A.L, ROW = 30, HEAD = 44;
  var ZOOMS = [
    { id: 'day', ppd: 26, top: 'month', bot: 'day' },
    { id: 'week', ppd: 9, top: 'month', bot: 'week' },
    { id: 'month', ppd: 3, top: 'year', bot: 'month' },
    { id: 'quarter', ppd: 1.15, top: 'year', bot: 'quarter' },
    { id: 'year', ppd: 0.5, top: 'year', bot: 'half' }
  ];
  A.zoomName = function (id) { return { day: L('Days', 'Jours'), week: L('Weeks', 'Semaines'), month: L('Months', 'Mois'), quarter: L('Quarters', 'Trimestres'), year: L('Years', 'Années') }[id]; };
  function zoom() {
    if (!A.ui.zoom) { var span = A.S.finish - A.S.start; A.ui.zoom = span < 45 ? 'day' : span < 150 ? 'week' : span < 500 ? 'month' : 'quarter'; }
    return ZOOMS.find(function (z) { return z.id === A.ui.zoom; }) || ZOOMS[2];
  }
  var C = function (n) { return A.cssVar('--' + n); };

  /* ---------- time scale ---------- */
  function ticks(kind, d0, d1) {
    var out = [], x = A.ymd(d0), d, loc = A.lang === 'fr' ? 'fr-FR' : 'en-GB';
    function mname(day, style) { return new Date(day * 864e5).toLocaleDateString(loc, { month: style, timeZone: 'UTC' }); }
    if (kind === 'day') { for (d = d0; d < d1; d++) out.push({ a: d, b: d + 1, label: String(A.ymd(d).d) }); return out; }
    if (kind === 'week') {
      d = d0 - ((((d0 + 4) % 7) + 6) % 7); // Monday on or before d0
      for (; d < d1; d += 7) out.push({ a: d, b: d + 7, label: String(A.ymd(d).d).padStart(2, '0') + '/' + String(A.ymd(d).m + 1).padStart(2, '0') });
      return out;
    }
    var step = kind === 'month' ? 1 : kind === 'quarter' ? 3 : kind === 'half' ? 6 : 12;
    var m0 = x.m - (x.m % step); d = A.dayOf(x.y, m0, 1);
    while (d < d1) {
      var e = A.addMonths(d, step), q = A.ymd(d), label;
      if (kind === 'month') label = mname(d, 'short');
      else if (kind === 'quarter') label = (A.lang === 'fr' ? 'T' : 'Q') + (q.m / 3 + 1);
      else if (kind === 'half') label = (A.lang === 'fr' ? 'S' : 'H') + (q.m / 6 + 1);
      else label = String(q.y);
      out.push({ a: d, b: e, label: label, full: kind === 'month' ? mname(d, 'long') + ' ' + q.y : null }); d = e;
    }
    return out;
  }
  function scaleSVG(z, d0, d1, w, hgt, y0) {
    var s = '', X = function (d) { return (Math.max(d0, Math.min(d1, d)) - d0) * z.ppd; };
    s += '<rect x="0" y="' + y0 + '" width="' + w + '" height="' + hgt + '" fill="' + C('head') + '"/>';
    ticks(z.top, d0, d1).forEach(function (t) {
      var a = X(t.a), b = X(t.b), txt = z.top === 'month' ? t.full : t.label;
      s += '<line x1="' + a + '" y1="' + y0 + '" x2="' + a + '" y2="' + (y0 + hgt / 2) + '" stroke="' + C('line') + '"/>';
      if (b - a > 34) s += '<text x="' + (a + 6) + '" y="' + (y0 + hgt / 4 + 4) + '" class="gt-top">' + A.esc(txt) + '</text>';
    });
    ticks(z.bot, d0, d1).forEach(function (t) {
      var a = X(t.a), b = X(t.b);
      s += '<line x1="' + a + '" y1="' + (y0 + hgt / 2) + '" x2="' + a + '" y2="' + (y0 + hgt) + '" stroke="' + C('line') + '"/>';
      if (b - a > 13) s += '<text x="' + ((a + b) / 2) + '" y="' + (y0 + hgt * 0.75 + 4) + '" text-anchor="middle" class="gt-bot">' + A.esc(t.label) + '</text>';
    });
    s += '<line x1="0" y1="' + (y0 + hgt / 2) + '" x2="' + w + '" y2="' + (y0 + hgt / 2) + '" stroke="' + C('line') + '"/>';
    s += '<line x1="0" y1="' + (y0 + hgt - 0.5) + '" x2="' + w + '" y2="' + (y0 + hgt - 0.5) + '" stroke="' + C('line-2') + '"/>';
    return s;
  }

  /* ---------- bars ---------- */
  /* draw rows of schedule nodes. o = {rows, z, d0, d1, y0, rowH, crit, base, labels, x0 (left offset)} */
  function bodySVG(o) {
    var S = A.S, z = o.z, s = '', w = (o.d1 - o.d0) * z.ppd, rh = o.rowH, hgt = o.rows.length * rh;
    var X = function (d) { return (d - o.d0) * z.ppd; };
    var rowOf = new Map(); o.rows.forEach(function (n, i) { rowOf.set(n.id, i); });
    s += '<g transform="translate(' + (o.x0 || 0) + ',' + o.y0 + ')">';
    /* non-working days */
    if (z.ppd >= 6) {
      for (var d = o.d0; d < o.d1; d++) if (!S.cal.isWork(d)) s += '<rect x="' + X(d) + '" y="0" width="' + z.ppd + '" height="' + hgt + '" fill="' + C('offday') + '"/>';
    }
    ticks(z.bot, o.d0, o.d1).forEach(function (t) { var a = X(t.a); if (a > 0) s += '<line x1="' + a + '" y1="0" x2="' + a + '" y2="' + hgt + '" stroke="' + C('grid') + '"/>'; });
    o.rows.forEach(function (n, i) {
      if (o.sel && o.sel.has(n.id)) s += '<rect x="0" y="' + (i * rh) + '" width="' + w + '" height="' + rh + '" fill="' + C('sel') + '"/>';
      s += '<line x1="0" y1="' + ((i + 1) * rh - 0.5) + '" x2="' + w + '" y2="' + ((i + 1) * rh - 0.5) + '" stroke="' + C('grid') + '"/>';
    });
    /* status / today line */
    var sd = A.toDay(A.P.statusDate) || A.toDay(A.todayISO());
    if (sd >= o.d0 && sd <= o.d1) s += '<line x1="' + X(sd) + '" y1="0" x2="' + X(sd) + '" y2="' + hgt + '" stroke="' + C('today') + '" stroke-width="1.5" stroke-dasharray="4 3"><title>' + A.esc(L('Status date ', "Date d'état ") + A.fmtDate(sd)) + '</title></line>';
    /* links */
    var links = '';
    o.rows.forEach(function (n, i) {
      n.t.preds.forEach(function (l) {
        var pn = S.info.get(l.id), pi = rowOf.get(l.id); if (pn == null || pi == null) return;
        var py = pi * rh + rh / 2, sy = i * rh + rh / 2;
        var exit = (l.type === 'FS' || l.type === 'FF') ? 1 : -1, arr = (l.type === 'FS' || l.type === 'SS') ? 1 : -1;
        var sx = X(exit > 0 ? pn.x1 : pn.x0) + (pn.isMs ? exit * 6 : 0), ex = X(arr > 0 ? n.x0 : n.x1) - (n.isMs ? arr * 6 : 0);
        var a = sx + exit * 7, b = ex - arr * 9, path;
        if (exit === arr && ((arr > 0 && b >= a) || (arr < 0 && b <= a))) path = 'M' + sx + ',' + py + 'H' + a + 'V' + sy + 'H' + (ex - arr * 4);
        else { var my = py + (sy > py ? 1 : -1) * rh / 2; path = 'M' + sx + ',' + py + 'H' + a + 'V' + my + 'H' + b + 'V' + sy + 'H' + (ex - arr * 4); }
        var crit = o.crit && pn.crit && n.crit, col = crit ? C('crit') : C('link');
        links += '<path d="' + path + '" fill="none" stroke="' + col + '" stroke-width="1.1"/>';
        links += '<path d="M' + ex + ',' + sy + 'l' + (-arr * 5) + ',-3.2v6.4z" fill="' + col + '"/>';
      });
    });
    s += links;
    /* bars */
    o.rows.forEach(function (n, i) {
      var t = n.t, y = i * rh, a = X(n.x0), b = X(n.x1), bw = Math.max(b - a, 2), mid = y + rh / 2;
      var crit = o.crit && n.crit && !n.summary, bl = o.base && A.P.baseline && A.P.baseline.tasks[n.id];
      var tip = '<title>' + A.esc(n.wbs + ' ' + t.name + '\n' + A.fmtDate(n.start) + ' → ' + A.fmtDate(n.finish) + (n.isMs ? '' : '  (' + A.fmtDur(n.dur, t.unit) + ')') +
        (n.summary || n.isLoe ? '' : '\n' + L('Total float: ', 'Marge totale : ') + A.fmtDur(n.TF, 'd')) + (n.cost ? '\n' + L('Cost: ', 'Coût : ') + A.money(n.cost) + ' ' + A.P.currency : '')) + '</title>';
      s += '<g class="bar" data-id="' + n.id + '">' + tip;
      if (bl && !n.summary) {
        var ba = X(bl.x0), bb = X(bl.x1);
        if (bb - ba < 1) s += '<path d="M' + ba + ',' + (y + rh - 9) + 'l4,4l-4,4l-4,-4z" fill="' + C('base') + '"/>';
        else s += '<rect x="' + ba + '" y="' + (y + rh - 8) + '" width="' + Math.max(2, bb - ba) + '" height="4" rx="2" fill="' + C('base') + '"/>';
      }
      if (n.summary) {
        var sy2 = y + rh / 2 - 5, col = t.procSum ? C('proc-2') : C('summary');
        s += '<path d="M' + a + ',' + sy2 + 'H' + (a + bw) + 'V' + (sy2 + 10) + 'L' + (a + bw - Math.min(5, bw / 2)) + ',' + (sy2 + 5) + 'H' + (a + Math.min(5, bw / 2)) + 'L' + a + ',' + (sy2 + 10) + 'Z" fill="' + col + '"/>';
        if (n.pct > 0) s += '<rect x="' + a + '" y="' + (sy2 + 1.5) + '" width="' + (bw * n.pct / 100) + '" height="2" fill="#fff" opacity=".7"/>';
      } else if (n.isMs) {
        s += '<path d="M' + a + ',' + (mid - 7) + 'l7,7l-7,7l-7,-7z" fill="' + (crit ? C('crit') : t.proc ? C('proc-2') : C('milestone')) + '" stroke="#fff" stroke-width="1"/>';
      } else {
        var fill = crit ? C('crit') : t.proc ? C('proc') : n.isLoe ? C('loe') : C('bar'), dark = crit ? C('crit-2') : t.proc ? C('proc-2') : n.isLoe ? C('loe-2') : C('bar-2');
        s += '<rect class="b" x="' + a + '" y="' + (y + 7) + '" width="' + bw + '" height="' + (rh - 14) + '" rx="3" fill="' + fill + '"/>';
        if (n.pct > 0) s += '<rect x="' + a + '" y="' + (y + 7) + '" width="' + (bw * n.pct / 100) + '" height="' + (rh - 14) + '" rx="3" fill="' + dark + '"/>';
        if (o.drag) s += '<rect class="grip" x="' + (a + bw - 5) + '" y="' + (y + 7) + '" width="7" height="' + (rh - 14) + '" fill="transparent"/>';
      }
      if (o.labels) {
        var lab = o.labels === 'name' ? t.name : (n.isMs ? A.fmtDate(n.start) : A.fmtResources(t.id));
        if (lab) s += '<text x="' + (Math.max(a + bw, a) + (n.isMs ? 11 : 6)) + '" y="' + (mid + 4) + '" class="gt-lab">' + A.esc(lab.length > 60 ? lab.slice(0, 58) + '…' : lab) + '</text>';
      }
      s += '</g>';
    });
    s += '</g>';
    return s;
  }
  function range(z) {
    var S = A.S, d0 = S.start, d1 = S.finish + 1;
    S.nodes.forEach(function (n) { if (n.x1 > d1) d1 = Math.ceil(n.x1); });
    if (A.ui.showBase && A.P.baseline) { var bf = A.P.baseline.finish + 1; if (bf > d1) d1 = bf; }
    var pad = Math.max(4, Math.round(60 / z.ppd));
    d0 -= pad; d1 += Math.round(260 / z.ppd) + pad;
    if (z.bot === 'week' || z.bot === 'day') d0 -= ((((d0 + 4) % 7) + 6) % 7);
    else d0 = A.monthStart(d0);
    return { d0: d0, d1: d1 };
  }
  function visibleRows() {
    var out = [], hideBelow = null;
    A.P.tasks.forEach(function (t) {
      if (hideBelow != null && t.level > hideBelow) return;
      hideBelow = null;
      out.push(A.S.info.get(t.id));
      if (t.collapsed && A.S.info.get(t.id).summary) hideBelow = t.level;
    });
    return out;
  }
  A.visibleRows = visibleRows;

  /* ---------- static Gantt for reports: returns an SVG string with a text column and the chart ---------- */
  A.ganttSVG = function (rows, opts) {
    opts = opts || {};
    var S = A.S, rh = 20, head = 34, colW = [54, 250, 62, 78, 78], left = colW.reduce(function (a, b) { return a + b; }, 0);
    var d0 = A.monthStart(S.start), d1 = A.addMonths(S.finish, 1), span = d1 - d0;
    var chartW = 1500 - left, ppd = chartW / span;
    var z = ppd >= 20 ? ZOOMS[0] : ppd >= 6 ? ZOOMS[1] : ppd >= 1.9 ? ZOOMS[2] : ppd >= 0.75 ? ZOOMS[3] : ZOOMS[4];
    z = { id: z.id, top: z.top, bot: z.bot, ppd: ppd };
    var H = head + rows.length * rh, W = 1500, s = '';
    s += '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" class="gantt-print" font-family="inherit">';
    s += '<g transform="translate(' + left + ',0)">' + scaleSVG(z, d0, d1, chartW, head, 0) + '</g>';
    s += '<rect x="0" y="0" width="' + left + '" height="' + head + '" fill="' + C('head') + '"/>';
    var heads = [L('WBS', 'WBS'), L('Task', 'Tâche'), L('Duration', 'Durée'), L('Start', 'Début'), L('Finish', 'Fin')], x = 0;
    heads.forEach(function (t, i) { s += '<text x="' + (x + 5) + '" y="' + (head - 11) + '" class="gp-h">' + A.esc(t) + '</text>'; x += colW[i]; });
    rows.forEach(function (n, i) {
      var y = head + i * rh, t = n.t, cx = 0, name = t.name, max = Math.max(12, 44 - t.level * 2);
      if (name.length > max) name = name.slice(0, max - 1) + '…';
      var cells = [n.wbs, name, n.isMs ? '' : A.fmtDur(n.dur, t.unit), A.fmtDate(n.start), A.fmtDate(n.finish)];
      if (i % 2) s += '<rect x="0" y="' + y + '" width="' + left + '" height="' + rh + '" fill="' + C('stripe') + '"/>';
      cells.forEach(function (c, k) {
        s += '<text x="' + (cx + 5 + (k === 1 ? t.level * 8 : 0)) + '" y="' + (y + 14) + '" class="gp-c' + (n.summary ? ' b' : '') + '">' + A.esc(c) + '</text>'; cx += colW[k];
      });
    });
    s += bodySVG({ rows: rows, z: z, d0: d0, d1: d1, y0: head, x0: left, rowH: rh, crit: opts.crit !== false, base: opts.base, labels: false });
    s += '<rect x="0.5" y="0.5" width="' + (W - 1) + '" height="' + (H - 1) + '" fill="none" stroke="' + C('line-2') + '"/>';
    s += '<line x1="' + left + '" y1="0" x2="' + left + '" y2="' + H + '" stroke="' + C('line-2') + '"/></svg>';
    return s;
  };

  /* ---------- grid columns ---------- */
  function columns() {
    return [
      { k: 'n', w: 38, label: '#', cls: 'c' },
      { k: 'wbs', w: 78, label: L('WBS', 'WBS') },
      { k: 'name', w: 300, label: L('Task name', 'Nom de la tâche'), edit: 'text' },
      { k: 'dur', w: 76, label: L('Duration', 'Durée'), edit: 'text' },
      { k: 'start', w: 100, label: L('Start', 'Début'), edit: 'date' },
      { k: 'finish', w: 100, label: L('Finish', 'Fin') },
      { k: 'preds', w: 104, label: L('Predecessors', 'Prédécesseurs'), edit: 'text' },
      { k: 'res', w: 150, label: L('Resources', 'Ressources'), edit: 'text' },
      { k: 'cost', w: 108, label: L('Cost', 'Coût') + ' (' + A.P.currency + ')', edit: 'text', cls: 'r' },
      { k: 'pct', w: 56, label: '%', edit: 'text', cls: 'r' },
      { k: 'cat', w: 150, label: L('Category', 'Catégorie'), edit: 'select' },
      { k: 'tf', w: 70, label: L('Float', 'Marge'), cls: 'r' }
    ];
  }
  function cellText(n, k, i) {
    var t = n.t;
    switch (k) {
      case 'n': return String(i + 1);
      case 'wbs': return n.wbs;
      case 'name': return t.name;
      case 'dur': return n.isMs ? A.fmtDur(0, t.unit) : A.fmtDur(n.dur, t.unit);
      case 'start': return A.fmtDate(n.start);
      case 'finish': return A.fmtDate(n.finish);
      case 'preds': return A.fmtPreds(t);
      case 'res': return A.fmtResources(t.id);
      case 'cost': return n.cost ? A.money(n.cost) : '';
      case 'pct': return n.pct ? Math.round(n.pct) + ' %' : '';
      case 'cat': var c = A.catById(n.cat); return c ? c.name : '';
      case 'tf': return n.summary || n.isLoe ? '' : A.fmtDur(n.TF, 'd');
    }
    return '';
  }
  function canEdit(n, k) {
    if (k === 'dur') return !n.summary && !n.isLoe;
    if (k === 'start') return !n.summary && !n.isLoe;
    if (k === 'cost') return !n.summary;
    if (k === 'pct') return !n.summary;
    if (k === 'res') return !n.summary;
    return true;
  }
  /* apply a typed value to a task; returns an error message or nothing. Runs inside A.edit. */
  function applyCell(t, k, v) {
    var n = A.S.info.get(t.id);
    if (k === 'name') { if (v.trim()) t.name = v.trim(); }
    else if (k === 'dur') { var d = A.parseDur(v, t.unit); if (!d) return L('Type a duration such as 5d, 2w or 3mo', 'Saisir une durée comme 5j, 2s ou 3mois'); t.dur = Math.abs(d.dur); t.unit = d.unit; t.ms = t.dur === 0; }
    else if (k === 'start') { if (v) { t.ctype = 'SNET'; t.cdate = v; } else { t.ctype = 'ASAP'; t.cdate = ''; } }
    else if (k === 'preds') {
      var pr; try { pr = A.parsePreds(v, t.id); } catch (e) { return String(e); }
      if (A.wouldCycle(t.id, pr)) return L('This link would create a loop between tasks.', 'Ce lien créerait une boucle entre les tâches.');
      t.preds = pr;
    }
    else if (k === 'res') A.ops.setResources(t.id, v);
    else if (k === 'cost') { var other = n ? n.own - (+t.fixed || 0) : 0; t.fixed = Math.max(0, A.num(v) - other); }
    else if (k === 'pct') { t.pct = Math.max(0, Math.min(100, A.num(v))); if (t.pct < 100) t.af = ''; }
    else if (k === 'cat') t.cat = +v || 0;
  }

  /* ---------- selection ---------- */
  function select(id, e) {
    var ui = A.ui;
    if (e && e.shiftKey && ui.anchor != null) {
      var rows = visibleRows().map(function (n) { return n.id; }), a = rows.indexOf(ui.anchor), b = rows.indexOf(id);
      if (a >= 0 && b >= 0) { ui.sel = new Set(rows.slice(Math.min(a, b), Math.max(a, b) + 1)); return; }
    }
    if (e && (e.ctrlKey || e.metaKey)) { if (ui.sel.has(id)) ui.sel.delete(id); else ui.sel.add(id); ui.anchor = id; return; }
    ui.sel = new Set([id]); ui.anchor = id;
  }
  function selIds() { return A.P.tasks.filter(function (t) { return A.ui.sel.has(t.id); }).map(function (t) { return t.id; }); }
  A.selIds = selIds;
  function firstSel() { var ids = selIds(); return ids.length ? ids[0] : null; }

  /* ---------- actions ---------- */
  var act = A.ganttActions = {
    add: function (ms) {
      var id = firstSel(), nt;
      A.edit(function () {
        var name = ms ? L('New milestone', 'Nouveau jalon') : L('New task', 'Nouvelle tâche');
        if (id == null) nt = A.ops.insert(null, name, A.P.tasks.length ? A.P.tasks[A.P.tasks.length - 1].level : 0);
        else { var i = A.taskIndex(id); nt = A.ops.insert(A.blockEnd(i), name, A.P.tasks[i].level); }
        if (ms) { nt.ms = true; nt.dur = 0; }
      });
      A.ui.sel = new Set([nt.id]); A.ui.anchor = nt.id; A.ui.pendingEdit = { id: nt.id, k: 'name' }; A.refresh();
    },
    insertAbove: function () {
      var id = firstSel(), nt; if (id == null) return act.add();
      A.edit(function () { var i = A.taskIndex(id); nt = A.ops.insert(i, L('New task', 'Nouvelle tâche'), A.P.tasks[i].level); });
      A.ui.sel = new Set([nt.id]); A.ui.anchor = nt.id; A.ui.pendingEdit = { id: nt.id, k: 'name' }; A.refresh();
    },
    del: function () {
      var ids = selIds(); if (!ids.length) return;
      var kids = 0; ids.forEach(function (id) { var i = A.taskIndex(id); kids += A.blockEnd(i) - i - 1; });
      var go = function () { A.ui.sel = new Set(); A.edit(function () { A.ops.remove(ids); }); };
      if (kids > 0 || ids.length > 3) A.confirm(L('Delete the selected tasks and their sub-tasks?', 'Supprimer les tâches sélectionnées et leurs sous-tâches ?'), L('Delete', 'Supprimer'), go); else go();
    },
    indent: function (d) { var ids = selIds(); if (ids.length) A.edit(function () { A.ops.indent(ids, d); if (A.schedule(A.P).cycle) { A.toast(L('This would put a task under its own predecessor.', 'Cela placerait une tâche sous son propre prédécesseur.'), 'bad'); return false; } }); },
    move: function (d) { var id = firstSel(); if (id != null) A.edit(function () { A.ops.move(id, d); }); },
    link: function () { var ids = selIds(); if (ids.length < 2) return A.toast(L('Select at least two tasks to link them (Ctrl+click or Shift+click).', 'Sélectionner au moins deux tâches à lier (Ctrl+clic ou Maj+clic).')); A.edit(function () { A.ops.link(ids); }); },
    unlink: function () { var ids = selIds(); if (ids.length) A.edit(function () { A.ops.unlink(ids); }); },
    info: function () { var id = firstSel(); if (id != null) A.taskDialog(id); else A.toast(L('Select a task first.', "Sélectionner d'abord une tâche.")); },
    zoom: function (d) { var i = ZOOMS.findIndex(function (z) { return z.id === zoom().id; }) - d; if (i >= 0 && i < ZOOMS.length) { A.ui.zoom = ZOOMS[i].id; A.refresh(); } },
    level: function (lv) { A.edit(function () { A.P.tasks.forEach(function (t) { t.collapsed = lv > 0 && t.level >= lv - 1; }); }); }
  };

  /* ---------- the view ---------- */
  var scroll = { top: 0, left: 0, gleft: 0 };
  A.views.gantt = function (root) {
    var S = A.S, ui = A.ui, z = zoom(), rows = visibleRows(), cols = columns(), rg = range(z);
    var maxLevel = 0; A.P.tasks.forEach(function (t) { if (t.level > maxLevel) maxLevel = t.level; });
    var levelSel = h('select.in.sm', { title: L('Show outline levels', 'Afficher les niveaux'), onchange: function () { act.level(+levelSel.value); } },
      h('option', { value: 0 }, L('All levels', 'Tous les niveaux')));
    for (var lv = 1; lv <= maxLevel; lv++) levelSel.appendChild(h('option', { value: lv }, L('Level ', 'Niveau ') + lv));
    var zoomSel = h('select.in.sm', { title: L('Time scale', 'Échelle de temps'), onchange: function () { ui.zoom = zoomSel.value; A.refresh(); } },
      ZOOMS.map(function (q) { return h('option', { value: q.id, selected: q.id === z.id }, A.zoomName(q.id)); }));
    var tb = h('div.toolbar',
      h('div.tg', A.btn('plus', L('Task', 'Tâche'), function () { act.add(false); }, { primary: true, title: L('Add a task below the selection (Insert adds above)', 'Ajouter une tâche sous la sélection (Inser ajoute au-dessus)') }),
        A.btn('diamond', L('Milestone', 'Jalon'), function () { act.add(true); }),
        A.btn('trash', L('Delete', 'Supprimer'), act.del, { iconOnly: true })),
      h('div.tg', A.btn('outdent', L('Outdent (Alt+←)', 'Désindenter (Alt+←)'), function () { act.indent(-1); }, { iconOnly: true }),
        A.btn('indent', L('Indent: make it a sub-task (Alt+→)', 'Indenter : en faire une sous-tâche (Alt+→)'), function () { act.indent(1); }, { iconOnly: true }),
        A.btn('up', L('Move up', 'Monter'), function () { act.move(-1); }, { iconOnly: true }),
        A.btn('down', L('Move down', 'Descendre'), function () { act.move(1); }, { iconOnly: true })),
      h('div.tg', A.btn('link', L('Link', 'Lier'), act.link, { title: L('Link the selected tasks finish-to-start', 'Lier les tâches sélectionnées (fin-début)') }),
        A.btn('unlink', L('Unlink', 'Délier'), act.unlink, { iconOnly: true }),
        A.btn('info', L('Details', 'Détails'), act.info, { title: L('Task details (double-click a bar)', 'Détails de la tâche (double-clic sur une barre)') })),
      h('div.tg', levelSel, zoomSel, A.btn('zoomout', L('Zoom out', 'Zoom arrière'), function () { act.zoom(-1); }, { iconOnly: true }), A.btn('zoomin', L('Zoom in', 'Zoom avant'), function () { act.zoom(1); }, { iconOnly: true })),
      h('div.tg', h('label.chk', h('input', { type: 'checkbox', checked: ui.showCrit, onchange: function (e) { ui.showCrit = e.target.checked; A.refresh(); } }), L('Critical path', 'Chemin critique')),
        h('label.chk', h('input', { type: 'checkbox', checked: ui.showBase, onchange: function (e) { ui.showBase = e.target.checked; A.refresh(); } }), L('Baseline', 'Référence')),
        A.btn('flag', L('Set baseline', 'Fixer la référence'), function () {
          var go = function () { A.edit(function () { A.setBaseline(); }); A.ui.showBase = true; A.refresh(); A.toast(L('Baseline saved.', 'Planification de référence enregistrée.'), 'ok'); };
          if (A.P.baseline) A.confirm(L('Replace the baseline saved on ', 'Remplacer la référence enregistrée le ') + A.fmtDate(A.P.baseline.date) + L('?', ' ?'), L('Replace', 'Remplacer'), go); else go();
        }))
    );
    root.appendChild(tb);
    if (S.cycle) root.appendChild(h('div.banner.bad', A.icon('warn'), L('Some tasks depend on each other in a loop. Remove one of the links between the highlighted tasks.', "Des tâches dépendent les unes des autres en boucle. Supprimer l'un des liens entre les tâches signalées.")));

    /* grid */
    var gw = cols.reduce(function (a, c) { return a + c.w; }, 0);
    var table = h('table.grid', { style: { width: gw + 'px' } });
    table.appendChild(h('colgroup', cols.map(function (c) { return h('col', { style: { width: c.w + 'px' } }); })));
    table.appendChild(h('thead', h('tr', cols.map(function (c) { return h('th' + (c.cls ? '.' + c.cls : ''), c.label); }))));
    var tbody = h('tbody'), cyc = new Set(S.cycle ? S.errors[0].ids : []);
    rows.forEach(function (n) {
      var t = n.t, i = n.row;
      var tr = h('tr' + (ui.sel.has(t.id) ? '.sel' : '') + (n.summary ? '.sum' : '') + (ui.showCrit && n.crit && !n.summary ? '.crit' : '') + (cyc.has(t.id) ? '.cyc' : ''), { data: { id: t.id } });
      cols.forEach(function (c) {
        var td = h('td' + (c.cls ? '.' + c.cls : ''), { data: { k: c.k } });
        if (c.k === 'name') {
          var tog = n.summary ? h('button.tog', { type: 'button', 'aria-label': t.collapsed ? L('Expand', 'Développer') : L('Collapse', 'Réduire'), onclick: function (e) { e.stopPropagation(); A.edit(function () { A.taskById(t.id).collapsed = !t.collapsed; }); } }, A.icon(t.collapsed ? 'collapse' : 'expand')) : h('span.tog');
          var marks = [];
          if (n.isMs) marks.push(h('span.mk.ms', { title: L('Milestone', 'Jalon') }, '◆'));
          if (n.isLoe) marks.push(h('span.mk', { title: L('Spans the whole project', 'Couvre tout le projet') }, '↔'));
          if (t.ctype !== 'ASAP' && t.cdate && !n.summary) marks.push(h('span.mk', { title: A.constraintName(t.ctype) + ' ' + A.fmtDate(t.cdate) }, '📌'));
          if (n.conflict) marks.push(h('span.mk.bad', { title: L('The constraint conflicts with the links', 'La contrainte est en conflit avec les liens') }, '!'));
          if (t.contract) marks.push(h('span.mk.ct', { title: L('Contract: ', 'Contrat : ') + ((A.contractById(t.contract) || {}).title || '') }, '§'));
          td.appendChild(h('div.nm', { style: { paddingLeft: (t.level * 16) + 'px' } }, tog, h('span.tx', { title: t.name }, t.name), marks));
        } else td.textContent = cellText(n, c.k, i);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    var ghost = h('tr.ghost', h('td'), h('td'), h('td', { colspan: cols.length - 2 }, L('Click here to add a task…', 'Cliquer ici pour ajouter une tâche…')));
    ghost.addEventListener('click', function () { ui.sel = new Set(); act.add(false); });
    tbody.appendChild(ghost);
    table.appendChild(tbody);

    /* chart */
    var cw = Math.round((rg.d1 - rg.d0) * z.ppd), chH = (rows.length + 1) * ROW;
    var headSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + cw + '" height="' + HEAD + '">' + scaleSVG(z, rg.d0, rg.d1, cw, HEAD, 0) + '</svg>';
    var bodySvg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + cw + '" height="' + chH + '" class="gantt-body">' +
      bodySVG({ rows: rows, z: z, d0: rg.d0, d1: rg.d1, y0: 0, rowH: ROW, crit: ui.showCrit, base: ui.showBase, labels: 'res', sel: ui.sel, drag: true }) + '</svg>';
    var gridPane = h('div.g-grid', { style: { width: ui.gridW + 'px' } }, table);
    var chartPane = h('div.g-chart', h('div.g-chead', { html: headSvg }), h('div.g-cbody', { html: bodySvg }));
    var split = h('div.g-split', { title: L('Drag to resize', 'Glisser pour redimensionner') });
    var wrap = h('div.gantt', gridPane, split, chartPane);
    root.appendChild(wrap);
    root.appendChild(h('div.legend',
      h('span', h('i.sw', { style: { background: C('bar') } }), L('Task', 'Tâche')), h('span', h('i.sw', { style: { background: C('crit') } }), L('Critical', 'Critique')),
      h('span', h('i.sw', { style: { background: C('summary') } }), L('Summary', 'Récapitulative')), h('span', h('i.sw', { style: { background: C('proc') } }), L('Procurement', 'Passation de marché')),
      h('span', h('i.sw', { style: { background: C('loe') } }), L('Whole-project task', 'Tâche sur tout le projet')), h('span', h('i.sw.dia', { style: { background: C('milestone') } }), L('Milestone', 'Jalon')),
      ui.showBase && A.P.baseline ? h('span', h('i.sw.thin', { style: { background: C('base') } }), L('Baseline of ', 'Référence du ') + A.fmtDate(A.P.baseline.date)) : null,
      h('span.sp'), h('span.muted', L('Double-click a cell to edit · drag a bar to move it, its right edge to resize · durations: 5d, 2w, 3mo · predecessors: 3; 5SS+2w',
        'Double-clic sur une cellule pour modifier · glisser une barre pour la déplacer, son bord droit pour la redimensionner · durées : 5j, 2s, 3mois · prédécesseurs : 3; 5DD+2s'))));

    /* scroll sync + restore */
    gridPane.scrollTop = scroll.top; chartPane.scrollTop = scroll.top; chartPane.scrollLeft = scroll.left; gridPane.scrollLeft = scroll.gleft;
    var lock = false;
    gridPane.addEventListener('scroll', function () { scroll.gleft = gridPane.scrollLeft; if (lock) return; lock = true; chartPane.scrollTop = gridPane.scrollTop; scroll.top = gridPane.scrollTop; lock = false; });
    chartPane.addEventListener('scroll', function () { scroll.left = chartPane.scrollLeft; if (lock) return; lock = true; gridPane.scrollTop = chartPane.scrollTop; scroll.top = chartPane.scrollTop; lock = false; });
    split.addEventListener('pointerdown', function (e) {
      var x0 = e.clientX, w0 = ui.gridW; split.setPointerCapture(e.pointerId);
      split.onpointermove = function (ev) { ui.gridW = Math.max(160, Math.min(wrap.clientWidth - 120, w0 + ev.clientX - x0)); gridPane.style.width = ui.gridW + 'px'; };
      split.onpointerup = function () { split.onpointermove = null; };
    });

    /* grid events */
    function startEdit(td) {
      var tr = td.parentNode, id = +tr.dataset.id, k = td.dataset.k, col = cols.find(function (c) { return c.k === k; }), n = S.info.get(id);
      if (!col || !col.edit || !n || !canEdit(n, k) || td.querySelector('.cell-in')) return;
      var t = n.t, inp, done = false;
      if (col.edit === 'select') {
        inp = h('select.cell-in', h('option', { value: 0 }, n.parent && n.parent.cat ? L('(inherited)', '(héritée)') : '—'), A.P.categories.map(function (c) { return h('option', { value: c.id, selected: t.cat === c.id }, c.name); }));
      } else if (col.edit === 'date') {
        inp = h('input.cell-in', { type: 'date', value: A.toISO(n.start) });
      } else {
        var val = k === 'cost' ? (n.cost ? String(Math.round(n.cost * 100) / 100) : '') : k === 'pct' ? (n.pct ? String(Math.round(n.pct)) : '') : cellText(n, k, n.row);
        inp = h('input.cell-in' + (col.cls === 'r' ? '.r' : ''), { type: 'text', value: val });
      }
      var holder = k === 'name' ? td.querySelector('.tx') : td, old = holder.textContent;
      holder.textContent = ''; holder.appendChild(inp); td.classList.add('editing');
      inp.focus(); if (inp.select) inp.select();
      function commit(next) {
        if (done) return; done = true;
        var v = inp.value, err, changed = (col.edit === 'select') ? (+v !== (t.cat || 0)) : (col.edit === 'date' ? v !== A.toISO(n.start) : v !== (k === 'cost' ? (n.cost ? String(Math.round(n.cost * 100) / 100) : '') : k === 'pct' ? (n.pct ? String(Math.round(n.pct)) : '') : cellText(n, k, n.row)));
        if (next) ui.pendingEdit = next;
        if (!changed) { A.refresh(); return; }
        A.edit(function () { err = applyCell(A.taskById(id), k, v); if (err) return false; });
        if (err) A.toast(err, 'bad');
      }
      inp.addEventListener('keydown', function (e) {
        e.stopPropagation();
        if (e.key === 'Enter') { e.preventDefault(); commit(); }
        else if (e.key === 'Escape') { done = true; A.refresh(); }
        else if (e.key === 'Tab') {
          e.preventDefault();
          var ed = cols.filter(function (c) { return c.edit && canEdit(n, c.k); }), ci = ed.findIndex(function (c) { return c.k === k; }) + (e.shiftKey ? -1 : 1);
          commit(ed[ci] ? { id: id, k: ed[ci].k } : null);
        }
      });
      inp.addEventListener('blur', function () { commit(); });
      if (col.edit !== 'text') inp.addEventListener('change', function () { if (col.edit === 'select') commit(); });
      inp.addEventListener('click', function (e) { e.stopPropagation(); }); inp.addEventListener('dblclick', function (e) { e.stopPropagation(); });
    }
    tbody.addEventListener('click', function (e) {
      var tr = e.target.closest('tr[data-id]'); if (!tr || e.target.closest('.cell-in') || e.target.closest('.tog')) return;
      var id = +tr.dataset.id, td = e.target.closest('td');
      var again = ui.sel.size === 1 && ui.sel.has(id) && !e.shiftKey && !e.ctrlKey && !e.metaKey && ui.lastCell === (id + ':' + (td && td.dataset.k));
      ui.lastCell = id + ':' + (td && td.dataset.k);
      if (again && td) { startEdit(td); return; }
      select(id, e); paintSel();
    });
    tbody.addEventListener('dblclick', function (e) {
      var td = e.target.closest('td[data-k]'); if (!td || e.target.closest('.cell-in')) return;
      var tr = td.parentNode, n = S.info.get(+tr.dataset.id), col = cols.find(function (c) { return c.k === td.dataset.k; });
      if (col && col.edit && n && canEdit(n, col.k)) startEdit(td); else if (n) A.taskDialog(n.id);
    });
    function paintSel() {
      tbody.querySelectorAll('tr[data-id]').forEach(function (tr) { tr.classList.toggle('sel', ui.sel.has(+tr.dataset.id)); });
    }
    if (ui.pendingEdit) {
      var pe = ui.pendingEdit; ui.pendingEdit = null;
      var tr = tbody.querySelector('tr[data-id="' + pe.id + '"]'), td = tr && tr.querySelector('td[data-k="' + pe.k + '"]');
      if (td) setTimeout(function () { tr.scrollIntoView({ block: 'nearest' }); startEdit(td); }, 0);
    }

    /* chart events: select, open, drag to move / resize */
    var svg = chartPane.querySelector('.gantt-body');
    svg.addEventListener('pointerdown', function (e) {
      var g = e.target.closest('.bar'); if (!g || e.button !== 0) return;
      var id = +g.dataset.id, n = S.info.get(id), now = Date.now();
      if (ui.lastBar && ui.lastBar.id === id && now - ui.lastBar.t < 450) { ui.lastBar = null; A.taskDialog(id); return; }
      ui.lastBar = { id: id, t: now };
      if (!ui.sel.has(id) || ui.sel.size > 1 || e.shiftKey || e.ctrlKey) { select(id, e); paintSel(); }
      if (n.summary || n.isLoe) return;
      var grip = e.target.classList.contains('grip'), rect = g.querySelector('.b'), x0 = e.clientX, moved = false, dd = 0;
      if (!rect && !n.isMs) return;
      svg.setPointerCapture(e.pointerId);
      var ox = rect ? +rect.getAttribute('x') : 0, ow = rect ? +rect.getAttribute('width') : 0;
      svg.onpointermove = function (ev) {
        var dx = ev.clientX - x0; if (Math.abs(dx) < 4 && !moved) return; moved = true;
        dd = Math.round(dx / z.ppd);
        if (rect) { if (grip) rect.setAttribute('width', Math.max(3, ow + dd * z.ppd)); else rect.setAttribute('x', ox + dd * z.ppd); }
        else g.setAttribute('transform', 'translate(' + (dd * z.ppd) + ',0)');
        svg.style.cursor = grip ? 'ew-resize' : 'grabbing';
      };
      svg.onpointerup = function () {
        svg.onpointermove = svg.onpointerup = null; svg.style.cursor = '';
        if (!moved || !dd) { if (moved) A.refresh(); return; }
        A.edit(function () {
          var t = A.taskById(id);
          if (grip) { var nd = S.cal.endIdx(n.finish + dd) - n.ES; t.dur = Math.max(1, nd); t.ms = false; }
          else { t.ctype = 'SNET'; t.cdate = A.toISO(n.start + dd); }
        });
        if (!grip && A.S.info.get(id).ES === n.ES) A.toast(L('The task cannot start earlier than its predecessors allow.', 'La tâche ne peut pas commencer plus tôt que ne le permettent ses prédécesseurs.'));
      };
    });
  };

  /* keyboard shortcuts for the Gantt view (installed once) */
  document.addEventListener('keydown', function (e) {
    if (A.ui.tab !== 'gantt' || !A.P) return;
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'textarea' || document.querySelector('dialog[open]')) return;
    var rows = visibleRows().map(function (n) { return n.id; }), cur = A.ui.anchor != null ? rows.indexOf(A.ui.anchor) : -1;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (e.altKey) return;
      var ni = Math.max(0, Math.min(rows.length - 1, cur + (e.key === 'ArrowDown' ? 1 : -1)));
      if (rows[ni] != null) { select(rows[ni], e.shiftKey ? e : null); A.refresh(); var tr = document.querySelector('.grid tr[data-id="' + rows[ni] + '"]'); if (tr) tr.scrollIntoView({ block: 'nearest' }); }
      e.preventDefault();
    } else if (e.key === 'Insert') { act.insertAbove(); e.preventDefault(); }
    else if (e.key === 'Delete') { act.del(); e.preventDefault(); }
    else if (e.altKey && e.key === 'ArrowRight') { act.indent(1); e.preventDefault(); }
    else if (e.altKey && e.key === 'ArrowLeft') { act.indent(-1); e.preventDefault(); }
    else if (e.key === 'F2' || e.key === 'Enter') { var id = firstSel(); if (id != null) { A.ui.pendingEdit = { id: id, k: 'name' }; A.refresh(); e.preventDefault(); } }
  });

  /* ---------- task details dialog ---------- */
  A.constraintName = function (c) {
    return {
      ASAP: L('As soon as possible', 'Dès que possible'), SNET: L('Start no earlier than', 'Début au plus tôt le'), SNLT: L('Start no later than', 'Début au plus tard le'),
      FNET: L('Finish no earlier than', 'Fin au plus tôt le'), FNLT: L('Finish no later than', 'Fin au plus tard le'), MSO: L('Must start on', 'Doit commencer le'), MFO: L('Must finish on', 'Doit finir le')
    }[c] || c;
  };
  A.taskDialog = function (id) {
    var t0 = A.taskById(id), n = A.S.info.get(id); if (!t0) return;
    var d = A.clone(t0), sum = n.summary;
    var asg = A.clone((A.S.assignByTask.get(id) || []));
    var F = A.field, I = A.input, body = h('div.form');
    var others = A.P.tasks.filter(function (t) { return t.id !== id; }).map(function (t) { return { id: t.id, name: (A.taskIndex(t.id) + 1) + '  ' + A.S.info.get(t.id).wbs + '  ' + t.name }; });
    var types = ['FS', 'SS', 'FF', 'SF'].map(function (x) { return { id: x, name: { FS: L('Finish-to-start (FS)', 'Fin-début (FD)'), SS: L('Start-to-start (SS)', 'Début-début (DD)'), FF: L('Finish-to-finish (FF)', 'Fin-fin (FF)'), SF: L('Start-to-finish (SF)', 'Début-fin (DF)') }[x] }; });
    var predBox = h('div'), resBox = h('div');
    function drawPreds() {
      predBox.textContent = '';
      d.preds.forEach(function (l, i) {
        predBox.appendChild(h('div.rowline', I(l, 'id', 'select', { options: others }), I(l, 'type', 'select', { options: types }),
          I(l, 'lag', 'dur', { unitKey: 'lunit', signed: true, title: L('Lag (negative = lead)', 'Décalage (négatif = avance)') }),
          A.btn('trash', L('Remove', 'Retirer'), function () { d.preds.splice(i, 1); drawPreds(); }, { iconOnly: true, ghost: true })));
      });
      if (!d.preds.length) predBox.appendChild(h('p.muted', L('No predecessor: the task starts with the project unless a constraint says otherwise.', 'Aucun prédécesseur : la tâche commence avec le projet, sauf contrainte.')));
      predBox.appendChild(A.btn('plus', L('Add predecessor', 'Ajouter un prédécesseur'), function () { if (others.length) { d.preds.push({ id: others[0].id, type: 'FS', lag: 0, lunit: 'd' }); drawPreds(); } }));
    }
    function drawRes() {
      resBox.textContent = '';
      var ropts = A.P.resources.map(function (r) { return { id: r.id, name: r.name }; });
      asg.forEach(function (a, i) {
        var r = A.resById(a.res);
        resBox.appendChild(h('div.rowline', I(a, 'res', 'select', { options: ropts, after: drawRes }), I(a, 'units', 'num', { zero: true, title: L('Units', 'Unités') }),
          h('span.unit', r && r.type === 'work' ? '%' : r && r.type === 'material' ? (r.unit || L('qty', 'qté')) : A.P.currency),
          A.btn('trash', L('Remove', 'Retirer'), function () { asg.splice(i, 1); drawRes(); }, { iconOnly: true, ghost: true })));
      });
      if (!ropts.length) resBox.appendChild(h('p.muted', L('Create resources in the Resources tab, or type names in the Resources column of the Gantt.', "Créer des ressources dans l'onglet Ressources, ou saisir des noms dans la colonne Ressources du Gantt.")));
      else resBox.appendChild(A.btn('plus', L('Assign a resource', 'Affecter une ressource'), function () { var r = A.P.resources[0]; asg.push({ task: id, res: r.id, units: r.type === 'work' ? 100 : 1 }); drawRes(); }));
    }
    var catOpts = [{ id: 0, name: L('— (inherit from parent)', '— (hériter du parent)') }].concat(A.P.categories);
    var conOpts = [{ id: 0, name: '—' }].concat(A.P.contracts.map(function (c) { return { id: c.id, name: (c.ref ? c.ref + '  ' : '') + c.title }; }));
    var ctOpts = ['ASAP', 'SNET', 'SNLT', 'FNET', 'FNLT', 'MSO', 'MFO'].map(function (c) { return { id: c, name: A.constraintName(c) }; });
    body.appendChild(F(L('Name', 'Nom'), I(d, 'name', 'text'), null, 'full'));
    if (!sum) {
      body.appendChild(h('div.cols3',
        F(L('Duration', 'Durée'), I(d, 'dur', 'dur', { unitKey: 'unit' }), L('5d, 2w, 3mo', '5j, 2s, 3mois')),
        F(L('% complete', '% achevé'), I(d, 'pct', 'pct', { zero: true })),
        h('div.checks', h('label.chk', I(d, 'ms', 'check'), L('Milestone', 'Jalon')), h('label.chk', { title: L('For management or monitoring tasks that last as long as the project', 'Pour les tâches de gestion ou de suivi qui durent autant que le projet') }, I(d, 'loe', 'check'), L('Spans the whole project', 'Couvre tout le projet')))));
      body.appendChild(h('div.cols3',
        F(L('Constraint', 'Contrainte'), I(d, 'ctype', 'select', { options: ctOpts })), F(L('Constraint date', 'Date de contrainte'), I(d, 'cdate', 'date')),
        h('div')));
      body.appendChild(h('div.cols3', F(L('Actual start', 'Début réel'), I(d, 'as', 'date')), F(L('Actual finish', 'Fin réelle'), I(d, 'af', 'date')), h('div')));
    }
    body.appendChild(h('h3', L('Predecessors', 'Prédécesseurs'))); body.appendChild(predBox);
    body.appendChild(h('h3', L('Costs', 'Coûts')));
    body.appendChild(h('div.cols3',
      F(L('Fixed cost', 'Coût fixe') + ' (' + A.P.currency + ')', I(d, 'fixed', 'num')),
      sum ? h('div') : F(L('Cost per month', 'Coût par mois') + ' (' + A.P.currency + ')', I(d, 'rate', 'num'), L('× duration, e.g. unit running costs', "× durée, p. ex. fonctionnement d'une unité")),
      F(L('Spending pattern', 'Rythme de dépense'), I(d, 'accrual', 'select', { options: [{ id: 'prorated', name: L('Spread over the task', 'Réparti sur la tâche') }, { id: 'start', name: L('At the start', 'Au début') }, { id: 'end', name: L('At the end', 'À la fin') }] }))));
    body.appendChild(h('div.cols3', F(L('Expense category', 'Catégorie de dépense'), I(d, 'cat', 'select', { options: catOpts })), F(L('Contract', 'Contrat'), I(d, 'contract', 'select', { options: conOpts })), h('div')));
    if (!sum) { body.appendChild(h('h3', L('Resources', 'Ressources'))); body.appendChild(resBox); }
    body.appendChild(F(L('Notes', 'Notes'), I(d, 'notes', 'area'), null, 'full'));
    drawPreds(); drawRes();
    A.dialog({
      title: n.wbs + '  ' + t0.name, wide: true, body: body,
      buttons: [{ label: L('Cancel', 'Annuler') }, {
        label: L('Save', 'Enregistrer'), primary: true, onclick: function () {
          var seen = new Set(); d.preds = d.preds.filter(function (l) { if (seen.has(l.id)) return false; seen.add(l.id); return true; });
          if (A.wouldCycle(id, d.preds)) { A.toast(L('These links would create a loop between tasks.', 'Ces liens créeraient une boucle entre les tâches.'), 'bad'); return false; }
          if (!d.name.trim()) d.name = t0.name;
          if (d.ms) d.dur = 0; else if (!d.dur) d.dur = 1;
          if (d.ctype !== 'ASAP' && !d.cdate) d.ctype = 'ASAP';
          if (d.af && d.pct < 100) d.pct = 100;
          A.edit(function () {
            var t = A.taskById(id); for (var k in d) if (k !== 'id' && k !== 'level' && k !== 'collapsed') t[k] = d[k];
            A.P.assignments = A.P.assignments.filter(function (a) { return a.task !== id; }).concat(asg.map(function (a) { return { task: id, res: a.res, units: a.units }; }));
          });
        }
      }]
    });
  };
})();
