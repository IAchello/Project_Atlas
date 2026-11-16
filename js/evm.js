/* Project Atlas — earned value management (EVM): PV from the baseline, EV and AC from status dates.
   Calculations follow the EVM Project Tracker. No DOM access. */
var A = globalThis.A = globalThis.A || {};
A.evm = {};

/* the plan of a task used for PV: the baseline when there is one, otherwise the current schedule */
A.evm.plan = function (n) {
  var b = A.P.baseline && A.P.baseline.tasks[n.id];
  if (b) return { ES: b.ES, EF: b.EF, bac: b.own || 0, acc: n.t.accrual || 'prorated' };
  return { ES: n.ES, EF: n.EF, bac: n.own || 0, acc: n.t.accrual || 'prorated' };
};
/* planned value of one task once working-day index i is reached (i = number of working days elapsed) */
A.evm.pvAt = function (pl, i) {
  if (!pl.bac) return 0;
  if (pl.EF <= pl.ES) return i >= Math.max(pl.ES, 1) ? pl.bac : 0;
  if (pl.acc === 'start') return i > pl.ES ? pl.bac : 0;
  if (pl.acc === 'end') return i >= pl.EF ? pl.bac : 0;
  return pl.bac * Math.max(0, Math.min(1, (i - pl.ES) / (pl.EF - pl.ES)));
};
/* tasks measured: leaves; own cost of summaries is kept as a line too so totals match the budget */
A.evm.items = function (S) {
  return S.nodes.filter(function (n) { return !n.summary || n.own > 0; }).map(function (n) { return { n: n, pl: A.evm.plan(n) }; });
};
A.evm.sorted = function () { return (A.P.statuses || []).slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }); };
A.evm.kpis = function (o, method) {
  var bac = o.bac, ev = o.ev, pv = o.pv, ac = o.ac, sv = ev - pv, cv = ev - ac, spi = pv > 0 ? ev / pv : null, cpi = ac > 0 ? ev / ac : null, eac;
  if (bac === 0 && ac === 0 && ev === 0) eac = 0;
  else if (ev >= bac && bac > 0) eac = ac;
  else if (method === 'budget') eac = ac + bac - ev;
  else if (ac === 0) eac = bac;
  else { var f = method === 'spicpi' ? (cpi || 0) * (spi == null ? 1 : spi) : cpi; eac = f > 0 ? ac + (bac - ev) / f : null; }
  return { bac: bac, ev: ev, pv: pv, ac: ac, sv: sv, cv: cv, spi: spi, cpi: cpi, eac: eac, etc: eac == null ? null : eac - ac, vac: eac == null ? null : bac - eac,
    tcpi: (bac - ac) > 0 ? (bac - ev) / (bac - ac) : null, pctC: bac ? ev / bac : 0, pctP: bac ? pv / bac : 0 };
};
/* all figures at one status date */
A.evm.metrics = function (S, st) {
  var day = A.toDay(st.date), i = S.cal.endIdx(day), method = A.P.eacMethod || 'cpi';
  var rows = A.evm.items(S).map(function (it) {
    var pct = Math.max(0, Math.min(100, +(st.pct || {})[it.n.id] || 0));
    var k = A.evm.kpis({ bac: it.pl.bac, ev: it.pl.bac * pct / 100, pv: A.evm.pvAt(it.pl, i), ac: +(st.ac || {})[it.n.id] || 0 }, method);
    k.n = it.n; k.pct = pct; return k;
  });
  function total(list) { var o = { bac: 0, ev: 0, pv: 0, ac: 0 }; list.forEach(function (r) { o.bac += r.bac; o.ev += r.ev; o.pv += r.pv; o.ac += r.ac; }); return A.evm.kpis(o, method); }
  var comps = S.nodes.filter(function (n) { return !n.parent; }).map(function (c) { var k = total(rows.filter(function (r) { return r.n.comp === c; })); k.n = c; return k; });
  return { rows: rows, tot: total(rows), comps: comps, day: day, idx: i, st: st };
};
/* baseline span in working-day indexes */
A.evm.range = function (S) {
  var a = Infinity, b = -Infinity;
  A.evm.items(S).forEach(function (it) { if (!it.pl.bac && it.n.isLoe) return; if (it.pl.ES < a) a = it.pl.ES; if (it.pl.EF > b) b = it.pl.EF; });
  if (a === Infinity) { a = 0; b = S.PF; }
  return { a: a, b: Math.max(b, a + 1) };
};
A.evm.pvTotal = function (items, i) { var s = 0; for (var k = 0; k < items.length; k++) s += A.evm.pvAt(items[k].pl, i); return s; };
/* PV curve: [[day number, value]] from the day before the start to the planned finish */
A.evm.pvCurve = function (S) {
  var items = A.evm.items(S), R = A.evm.range(S), pts = [], step = Math.max(1, Math.floor((R.b - R.a) / 240));
  pts.push([S.cal.dateOf(R.a) - 1, 0]);
  for (var i = R.a + step; i < R.b; i += step) pts.push([S.cal.dateOf(i - 1), A.evm.pvTotal(items, i)]);
  pts.push([S.cal.dateOf(R.b - 1), A.evm.pvTotal(items, R.b)]);
  return pts;
};
/* earned schedule: forecast finish = start + planned duration / SPI(t) */
A.evm.forecast = function (S, m) {
  var items = A.evm.items(S), R = A.evm.range(S), PD = R.b - R.a, AT = m.idx - R.a, ev = m.tot.ev, planned = S.cal.dateOf(R.b - 1);
  if (m.tot.bac > 0 && ev >= m.tot.bac - 1e-6) return { done: true, planned: planned };
  if (AT <= 0 || ev <= 0) return { planned: planned, fin: null };
  var prev = 0, es = PD;
  for (var i = R.a + 1; i <= R.b; i++) {
    var p = A.evm.pvTotal(items, i);
    if (p >= ev) { es = (i - 1 - R.a) + (p === prev ? 0 : (ev - prev) / (p - prev)); break; }
    prev = p;
  }
  var spit = es / AT;
  return { planned: planned, es: es, spit: spit, fin: spit > 0 ? S.cal.dateOf(Math.max(0, Math.round(R.a + PD / spit) - 1)) : null };
};

/* ---- changes (called inside A.edit) ---- */
A.evm.addStatus = function (date) {
  var p = A.P; p.statuses = p.statuses || [];
  if (p.statuses.some(function (s) { return s.date === date; })) return null;
  var prev = null; A.evm.sorted().forEach(function (s) { if (s.date < date) prev = s; });
  var st = { id: A.uid(), date: date, pct: {}, ac: {} };
  if (prev) { st.pct = A.clone(prev.pct); st.ac = A.clone(prev.ac); }
  else p.tasks.forEach(function (t) { if (t.pct) st.pct[t.id] = t.pct; });
  p.statuses.push(st); A.evm.sync();
  return st;
};
/* the latest status date drives the progress shown in the Gantt and the project status date */
A.evm.sync = function () {
  var ss = A.evm.sorted(), last = ss[ss.length - 1]; if (!last) return;
  A.P.statusDate = last.date;
  A.P.tasks.forEach(function (t) { if (last.pct[t.id] != null) { t.pct = Math.max(0, Math.min(100, +last.pct[t.id] || 0)); if (t.pct < 100) t.af = ''; } });
};
A.evm.table = function () {
  var L = A.L, S = A.S, rows = [[L('Status date', "Date d'état"), 'BAC', 'PV', 'EV', 'AC', 'SV', 'SPI', 'CV', 'CPI', 'EAC', 'VAC', 'TCPI']];
  var r2 = function (v) { return v == null ? '' : Math.round(v * 100) / 100; }, r0 = function (v) { return v == null ? '' : Math.round(v); };
  A.evm.sorted().forEach(function (st) {
    var t = A.evm.metrics(S, st).tot;
    rows.push([st.date, r0(t.bac), r0(t.pv), r0(t.ev), r0(t.ac), r0(t.sv), r2(t.spi), r0(t.cv), r2(t.cpi), r0(t.eac), r0(t.vac), r2(t.tcpi)]);
  });
  return rows;
};

/* ---- EVM Project Tracker files (.json) -> Atlas project ---- */
A.evm.isTrackerFile = function (o) { return o && Array.isArray(o.tasks) && Array.isArray(o.statuses) && o.tasks.every(function (t) { return 'uid' in t && 'bac' in t; }) && !o.app; };
A.evm.fromTracker = function (o) {
  var saved = A.P, p = A.newProject(o.name || 'EVM'); A.P = p;
  try {
    p.manager = o.manager || ''; p.client = o.ref || ''; p.currency = o.currency || ''; p.start = o.start || p.start; p.wbsPrefix = '';
    p.eacMethod = o.eac || 'cpi';
    if (+o.cal === 7) { p.calendar.workDays = [0, 1, 2, 3, 4, 5, 6]; p.calendar.daysPerWeek = 7; p.calendar.daysPerMonth = 30; }
    var map = new Map();
    o.tasks.forEach(function (x) {
      var t = A.ops.insert(null, x.name || '—', 0, { dur: Math.max(1, Math.round(+x.dur) || 1), fixed: +x.bac || 0 });
      if (x.start) { t.ctype = 'SNET'; t.cdate = x.start; }
      map.set(x.uid, t);
    });
    o.tasks.forEach(function (x) {
      (x.preds || []).forEach(function (l) { var pr = map.get(l.uid), t = map.get(x.uid); if (pr && pr !== t) t.preds.push({ id: pr.id, type: l.type || 'FS', lag: +l.lag || 0, lunit: 'd' }); });
    });
    A.recalc(); A.setBaseline();
    if (o.baseline && o.baseline.date) p.baseline.date = o.baseline.date;
    p.statuses = (o.statuses || []).map(function (s) {
      var st = { id: A.uid(), date: s.date, pct: {}, ac: {} };
      Object.keys(s.pct || {}).forEach(function (u) { var t = map.get(+u); if (t) st.pct[t.id] = +s.pct[u] || 0; });
      Object.keys(s.ac || {}).forEach(function (u) { var t = map.get(+u); if (t) st.ac[t.id] = +s.ac[u] || 0; });
      return st;
    });
    A.evm.sync();
  } finally { A.P = saved; }
  return p;
};
/* second built-in example: the EVM Tracker's project ABCDE */
A.buildABCDE = function () {
  return A.evm.fromTracker({
    name: A.L('Example — Project ABCDE (earned value)', 'Exemple — Projet ABCDE (valeur acquise)'), ref: '000-000-000', currency: 'Franc CFA', start: '2026-06-01', cal: 5, eac: 'cpi',
    tasks: [{ uid: 1, name: 'A', dur: 10, bac: 100000, preds: [] }, { uid: 2, name: 'B', dur: 15, bac: 250000, preds: [{ uid: 1, type: 'FS', lag: 0 }] },
      { uid: 3, name: 'C', dur: 20, bac: 400000, preds: [{ uid: 2, type: 'FS', lag: 0 }] }, { uid: 4, name: 'D', dur: 10, bac: 150000, preds: [{ uid: 2, type: 'FS', lag: 0 }] },
      { uid: 5, name: 'E', dur: 10, bac: 100000, preds: [{ uid: 3, type: 'FS', lag: 0 }, { uid: 4, type: 'FS', lag: 0 }] }],
    baseline: { date: '2026-05-29' },
    statuses: [{ date: '2026-06-30', pct: { 1: 100, 2: 60 }, ac: { 1: 105000, 2: 160000 } },
      { date: '2026-07-15', pct: { 1: 100, 2: 100, 3: 25, 4: 70 }, ac: { 1: 105000, 2: 275000, 3: 120000, 4: 118000 } },
      { date: '2026-07-31', pct: { 1: 100, 2: 100, 3: 85, 4: 100 }, ac: { 1: 105000, 2: 275000, 3: 380000, 4: 160000 } }]
  });
};
