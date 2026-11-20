/* Project Atlas — scheduling engine (critical path method), costs and cash flow.
   Time is counted in working-day indexes: 0 is the first working day of the project.
   A task occupies [ES, EF): it starts on working day ES and its last day is EF-1. */
var A = globalThis.A = globalThis.A || {};

/* ---------- durations and predecessor text ---------- */
A.unitDays = function (unit) {
  var c = A.P.calendar;
  return unit === 'mo' ? c.daysPerMonth : unit === 'w' ? c.daysPerWeek : 1;
};
A.unitLabel = function (unit, n) {
  if (A.lang === 'fr') return unit === 'mo' ? ' mois' : unit === 'w' ? ' sem' : ' j';
  return unit === 'mo' ? ' mo' : unit === 'w' ? (n === 1 ? ' wk' : ' wks') : (n === 1 ? ' day' : ' days');
};
A.parseUnit = function (s) {
  s = (s || '').trim().toLowerCase();
  if (!s) return null;
  if (s[0] === 'm') return 'mo';
  if (s[0] === 'w' || s[0] === 's') return 'w';
  if (s[0] === 'd' || s[0] === 'j') return 'd';
  if (s[0] === 'h') return 'h';
  return null;
};
/* "3 mo", "2 sem", "15j", "0" -> {dur: working days, unit} ; null if not understood */
A.parseDur = function (text, defUnit) {
  var m = /^\s*(-?[\d.,]+)\s*([a-zA-Zéû]*)/.exec(String(text == null ? '' : text));
  if (!m) return null;
  var v = parseFloat(m[1].replace(',', '.'));
  if (!isFinite(v)) return null;
  var unit = A.parseUnit(m[2]) || defUnit || 'd';
  var days;
  if (unit === 'h') { days = v / A.P.calendar.hoursPerDay; unit = 'd'; }
  else days = v * A.unitDays(unit);
  var neg = days < 0; days = Math.abs(days);
  days = days === 0 ? 0 : Math.max(1, Math.round(days));
  return { dur: neg ? -days : days, unit: unit };
};
A.fmtDurT = function (days, t) { return A.fmtDur(days, A.dUnit(t)); };
A.fmtDur = function (days, unit) {
  unit = unit || 'd';
  var v = days / A.unitDays(unit);
  v = Math.round(v * 100) / 100;
  return A.fmtNum(v, v % 1 ? (Math.round(v * 10) % 1 ? 2 : 1) : 0).replace(/[,.]00$/, '') + A.unitLabel(unit, v);
};
A.linkCode = function (type) {
  if (A.lang !== 'fr') return type;
  return { FS: 'FD', SS: 'DD', FF: 'FF', SF: 'DF' }[type];
};
A.fmtPreds = function (t) {
  return (t.preds || []).map(function (p) {
    var i = A.taskIndex(p.id); if (i < 0) return null;
    var s = String(i + 1);
    if (p.type !== 'FS' || p.lag) s += A.linkCode(p.type);
    if (p.lag) s += (p.lag > 0 ? '+' : '-') + A.fmtDur(Math.abs(p.lag), p.lunit || 'd').replace(/\s/g, '');
    return s;
  }).filter(Boolean).join('; ');
};
/* "3; 5SS+2w; 7FD-1mois" -> [{id,type,lag,lunit}] ; throws a message on bad input */
A.parsePreds = function (text, selfId) {
  var out = [], ts = A.P.tasks;
  String(text || '').split(/[;,]+/).forEach(function (tok) {
    tok = tok.trim(); if (!tok) return;
    var m = /^(\d+)\s*(FS|SS|FF|SF|FD|DD|DF)?\s*(?:([+-])\s*([\d.,]+\s*[a-zA-Zéû]*))?$/i.exec(tok);
    if (!m) throw A.L('Cannot read predecessor "', 'Prédécesseur illisible « ') + tok + A.L('"', ' »');
    var row = +m[1], t = ts[row - 1];
    if (!t) throw A.L('There is no task number ', 'Aucune tâche numéro ') + row;
    if (t.id === selfId) throw A.L('A task cannot precede itself', 'Une tâche ne peut pas se précéder elle-même');
    var type = (m[2] || 'FS').toUpperCase();
    type = { FD: 'FS', DD: 'SS', DF: 'SF' }[type] || type;
    var lag = 0, lunit = 'd';
    if (m[4]) { var d = A.parseDur(m[4]); if (d) { lag = d.dur * (m[3] === '-' ? -1 : 1); lunit = d.unit; } }
    if (!out.some(function (o) { return o.id === t.id; })) out.push({ id: t.id, type: type, lag: lag, lunit: lunit });
  });
  return out;
};

/* ---------- hierarchy ---------- */
A.buildTree = function (p) {
  var info = new Map(), stack = [], counters = [], prefix = p.wbsPrefix ? p.wbsPrefix + '.' : '';
  var prevLevel = -1;
  p.tasks.forEach(function (t, i) {
    if (!(t.level >= 0)) t.level = 0;
    if (t.level > prevLevel + 1) t.level = prevLevel + 1;
    prevLevel = t.level;
    stack.length = t.level;
    counters.length = t.level + 1;
    counters[t.level] = (counters[t.level] || 0) + 1;
    var parent = t.level > 0 ? stack[t.level - 1] : null;
    var n = { t: t, id: t.id, row: i, parent: parent, children: [], summary: false, wbs: prefix + counters.slice(0, t.level + 1).join('.') };
    if (parent) { parent.children.push(n); parent.summary = true; }
    stack[t.level] = n;
    info.set(t.id, n);
  });
  return info;
};
A.leavesOf = function (n, out) {
  out = out || [];
  if (!n.summary) out.push(n); else n.children.forEach(function (c) { A.leavesOf(c, out); });
  return out;
};

/* ---------- the schedule ---------- */
A.schedule = function (p) {
  var cal = new A.Calendar(p);
  var info = A.buildTree(p);
  var nodes = Array.from(info.values());
  var S = { cal: cal, info: info, nodes: nodes, errors: [], warnings: [], PF: 0 };

  /* links inherited from summary ancestors, with dangling references dropped */
  nodes.forEach(function (n) {
    n.t.preds = (n.t.preds || []).filter(function (l) { return info.has(l.id) && l.id !== n.id; });
  });
  nodes.forEach(function (n) {
    n.links = [];
    for (var a = n; a; a = a.parent) a.t.preds.forEach(function (l) { n.links.push({ p: info.get(l.id), type: l.type, lag: l.lag || 0 }); });
    n.isLoe = !n.summary && !!n.t.loe;
  });

  /* topological order (Kahn). A summary waits for its children; a task waits for its predecessors. */
  var indeg = new Map(), out = new Map();
  nodes.forEach(function (n) { indeg.set(n.id, 0); out.set(n.id, []); });
  function edge(a, b) { out.get(a.id).push(b); indeg.set(b.id, indeg.get(b.id) + 1); }
  nodes.forEach(function (n) {
    if (n.summary) n.children.forEach(function (c) { edge(c, n); });
    else if (!n.isLoe) n.links.forEach(function (l) { edge(l.p, n); });
  });
  var order = [], queue = nodes.filter(function (n) { return indeg.get(n.id) === 0; });
  while (queue.length) {
    var n = queue.shift(); order.push(n);
    out.get(n.id).forEach(function (m) { indeg.set(m.id, indeg.get(m.id) - 1); if (indeg.get(m.id) === 0) queue.push(m); });
  }
  if (order.length < nodes.length) {
    var stuck = nodes.filter(function (n) { return indeg.get(n.id) > 0; });
    S.errors.push({ type: 'cycle', ids: stuck.map(function (n) { return n.id; }) });
    S.cycle = true;
    /* schedule what is left without its links so that the screen still shows something */
    stuck.forEach(function (n) { if (!n.summary) n.links = []; });
    stuck.sort(function (a, b) { return b.t.level - a.t.level || a.row - b.row; });
    order = order.concat(stuck);
  }
  S.order = order;

  /* forward pass */
  order.forEach(function (n) {
    var t = n.t;
    if (n.summary) {
      var es = Infinity, ef = -Infinity;
      A.leavesOf(n).forEach(function (c) { if (c.isLoe) return; if (c.ES < es) es = c.ES; if (c.EF > ef) ef = c.EF; });
      if (es === Infinity) { es = 0; ef = 0; }
      n.ES = es; n.EF = ef; n.dur = ef - es; return;
    }
    if (n.isLoe) { n.ES = 0; n.EF = 0; n.dur = 0; return; }
    var dur = t.ms ? 0 : Math.max(0, Math.round(t.dur || 0));
    var ES = 0;
    n.links.forEach(function (l) {
      var v = l.type === 'FS' ? l.p.EF + l.lag : l.type === 'SS' ? l.p.ES + l.lag
        : l.type === 'FF' ? l.p.EF + l.lag - dur : l.p.ES + l.lag - dur;
      if (v > ES) ES = v;
    });
    var cd = A.toDay(t.cdate), linkES = ES;
    if (cd != null) {
      if (t.ctype === 'SNET') ES = Math.max(ES, cal.idxOf(cd));
      else if (t.ctype === 'FNET') ES = Math.max(ES, cal.endIdx(cd) - dur);
      else if (t.ctype === 'MSO') { ES = cal.idxOf(cd); if (linkES > ES) n.conflict = true; }
      else if (t.ctype === 'MFO') { ES = cal.endIdx(cd) - dur; if (linkES > ES) n.conflict = true; }
      else if (t.ctype === 'SNLT' && ES > cal.idxOf(cd)) n.conflict = true;
      else if (t.ctype === 'FNLT' && ES + dur > cal.endIdx(cd)) n.conflict = true;
    }
    if (ES < 0) ES = 0;
    var as = A.toDay(t.as), af = A.toDay(t.af);
    if (as != null) ES = cal.idxOf(as);
    var EF = ES + dur;
    if (af != null) { EF = Math.max(ES, cal.endIdx(af)); if (t.ms) EF = ES; }
    n.ES = ES; n.EF = EF; n.dur = EF - ES;
    n.constrained = cd != null && t.ctype !== 'ASAP' && ES !== linkES;
  });

  /* project finish, then level-of-effort tasks span the whole project */
  var PF = 0;
  nodes.forEach(function (n) { if (!n.summary && !n.isLoe && n.EF > PF) PF = n.EF; });
  S.PF = PF;
  nodes.forEach(function (n) { if (n.isLoe) { n.ES = 0; n.EF = PF; n.dur = PF; } });
  order.forEach(function (n) {
    if (!n.summary) return;
    var es = Infinity, ef = -Infinity;
    n.children.forEach(function (c) { if (c.ES < es) es = c.ES; if (c.EF > ef) ef = c.EF; });
    if (es !== Infinity) { n.ES = es; n.EF = ef; n.dur = ef - es; }
  });

  /* backward pass on leaves, with links from/to summaries expanded to their leaves */
  var succ = new Map();
  nodes.forEach(function (n) { succ.set(n.id, []); });
  nodes.forEach(function (n) {
    if (n.summary || n.isLoe) return;
    n.links.forEach(function (l) {
      var ps;
      if (!l.p.summary) ps = [l.p];
      else {
        ps = A.leavesOf(l.p).filter(function (c) { return !c.isLoe; });
        if (l.type === 'SS' || l.type === 'SF') ps = ps.filter(function (c) { return c.ES === l.p.ES; });
      }
      ps.forEach(function (pn) { if (!pn.isLoe) succ.get(pn.id).push({ s: n, type: l.type, lag: l.lag }); });
    });
  });
  for (var i = order.length - 1; i >= 0; i--) {
    var n = order[i];
    if (n.summary) continue;
    if (n.isLoe) { n.LS = n.ES; n.LF = n.EF; n.TF = 0; n.FF = 0; n.crit = false; continue; }
    var dur = n.dur, LF = PF, free = PF - n.EF;
    succ.get(n.id).forEach(function (l) {
      var s = l.s, v, f;
      if (l.type === 'FS') { v = s.LS - l.lag; f = s.ES - l.lag - n.EF; }
      else if (l.type === 'SS') { v = s.LS - l.lag + dur; f = s.ES - l.lag - n.ES; }
      else if (l.type === 'FF') { v = s.LF - l.lag; f = s.EF - l.lag - n.EF; }
      else { v = s.LF - l.lag + dur; f = s.EF - l.lag - n.ES; }
      if (v < LF) LF = v;
      if (f < free) free = f;
    });
    var cd = A.toDay(n.t.cdate);
    if (cd != null) {
      var ct = n.t.ctype;
      if (ct === 'SNLT' || ct === 'MSO') LF = Math.min(LF, cal.idxOf(cd) + dur);
      if (ct === 'FNLT' || ct === 'MFO') LF = Math.min(LF, cal.endIdx(cd));
    }
    n.LF = LF; n.LS = LF - dur; n.TF = n.LS - n.ES; n.FF = Math.max(0, free);
    n.crit = n.TF <= 0;
  }
  order.forEach(function (n) {
    if (!n.summary) return;
    var tf = Infinity, ls = Infinity, lf = -Infinity, crit = false;
    A.leavesOf(n).forEach(function (c) {
      if (c.isLoe) return;
      if (c.TF < tf) tf = c.TF; if (c.LS < ls) ls = c.LS; if (c.LF > lf) lf = c.LF; if (c.crit) crit = true;
    });
    n.TF = tf === Infinity ? 0 : tf; n.LS = ls === Infinity ? n.ES : ls; n.LF = lf === -Infinity ? n.EF : lf;
    n.FF = 0; n.crit = crit;
  });

  /* dates, costs, progress */
  nodes.forEach(function (n) {
    n.isMs = !n.summary && (n.t.ms || n.dur === 0) && !n.isLoe;
    /* a milestone driven by its predecessors sits at the end of the previous working day */
    n.msAtEnd = n.isMs && n.ES > 0 && !n.constrained && !n.t.as && n.links.length > 0;
    n.start = n.msAtEnd ? cal.dateOf(n.ES - 1) : cal.dateOf(n.ES);
    n.finish = n.isMs ? n.start : (n.EF > n.ES ? cal.dateOf(n.EF - 1) : cal.dateOf(n.ES));
    n.x0 = n.msAtEnd ? cal.endPos(n.ES) : cal.startPos(n.ES);
    n.x1 = n.isMs ? n.x0 : cal.endPos(n.EF);
  });
  A.computeCosts(p, S);
  order.forEach(function (n) {
    if (!n.summary) { n.pct = Math.max(0, Math.min(100, +n.t.pct || 0)); if (n.t.af) n.pct = 100; n.w = n.dur || 0; return; }
    var w = 0, d = 0, cnt = 0, done = 0;
    A.leavesOf(n).forEach(function (c) { w += c.w; d += c.w * c.pct; cnt++; done += c.pct; });
    n.w = w; n.pct = w ? d / w : (cnt ? done / cnt : 0);
  });
  S.start = cal.dateOf(0);
  S.finish = PF > 0 ? cal.dateOf(PF - 1) : cal.dateOf(0);
  S.total = 0; S.pctW = 0; S.pctD = 0;
  nodes.forEach(function (n) { if (!n.parent) { S.total += n.cost; S.pctW += n.w; S.pctD += n.w * n.pct; } });
  S.pct = S.pctW ? S.pctD / S.pctW : 0;
  /* effective category (own, else nearest ancestor) and component (top-level ancestor) */
  nodes.forEach(function (n) {
    var a = n; while (a && !a.t.cat) a = a.parent; n.cat = a ? a.t.cat : 0;
    a = n; while (a.parent) a = a.parent; n.comp = a;
  });
  return S;
};

/* would adding these predecessors create a loop? (used before accepting an edit) */
A.wouldCycle = function (taskId, preds) {
  var t = A.taskById(taskId), old = t.preds;
  t.preds = preds;
  var s = A.schedule(A.P);
  t.preds = old;
  return !!s.cycle;
};

/* ---------- costs ---------- */
A.ratePerDay = function (r) {
  var c = A.P.calendar;
  return r.per === 'h' ? r.rate * c.hoursPerDay : r.per === 'w' ? r.rate / c.daysPerWeek : r.per === 'mo' ? r.rate / c.daysPerMonth : r.rate; // 'd' and 'u'
};
A.assignCost = function (a, r, durDays) {
  if (!r) return 0;
  if (r.type === 'work') return (a.units == null ? 100 : a.units) / 100 * durDays * A.ratePerDay(r) + (r.perUse || 0);
  if (r.type === 'material') return (a.units || 0) * (r.rate || 0) + (r.perUse || 0);
  return a.units || 0; // cost resource: the amount is on the assignment
};
A.computeCosts = function (p, S) {
  var byTask = new Map(), resById = new Map();
  p.resources.forEach(function (r) { resById.set(r.id, r); });
  p.assignments = p.assignments.filter(function (a) { return S.info.has(a.task) && resById.has(a.res); });
  p.assignments.forEach(function (a) { if (!byTask.has(a.task)) byTask.set(a.task, []); byTask.get(a.task).push(a); });
  S.assignByTask = byTask;
  var saved = A.P; A.P = p;
  S.order.forEach(function (n) {
    var t = n.t, own = +t.fixed || 0;
    if (!n.summary) own += (+t.rate || 0) * n.dur / p.calendar.daysPerMonth;
    (byTask.get(t.id) || []).forEach(function (a) { own += A.assignCost(a, resById.get(a.res), n.dur); });
    n.own = own; n.cost = own;
    if (n.summary) n.children.forEach(function (c) { n.cost += c.cost; });
  });
  A.P = saved;
};

/* ---------- time-phased costs ---------- */
/* periods: [{d0,d1 (day numbers, d1 exclusive), label}] covering the project, by 'month' | 'quarter' | 'year' */
A.periods = function (S, step, fromDay, toDay) {
  var n = step === 'year' ? 12 : step === 'quarter' ? 3 : 1;
  var a = fromDay != null ? fromDay : S.start, b = toDay != null ? toDay : S.finish;
  var x = A.ymd(a), m0 = x.m - (x.m % n), out = [];
  var d = A.dayOf(x.y, m0, 1), guard = 0;
  while (d <= b && guard++ < 600) {
    var e = A.addMonths(d, n), q = A.ymd(d), label;
    if (step === 'year') label = String(q.y);
    else if (step === 'quarter') label = (A.lang === 'fr' ? 'T' : 'Q') + (Math.floor(q.m / 3) + 1) + ' ' + q.y;
    else label = new Date(d * 864e5).toLocaleDateString(A.lang === 'fr' ? 'fr-FR' : 'en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' });
    out.push({ d0: d, d1: e, label: label });
    d = e;
  }
  return out;
};
/* spread the own cost of every task over the periods; returns rows [{node, values[]}] */
A.phaseCosts = function (S, periods) {
  var cal = S.cal, idx = periods.map(function (pr) { return cal.idxOf(pr.d0); });
  idx.push(cal.idxOf(periods.length ? periods[periods.length - 1].d1 : 0));
  var rows = [];
  S.nodes.forEach(function (n) {
    if (!n.own) return;
    var v = periods.map(function () { return 0; });
    var acc = n.t.accrual || 'prorated';
    if (n.summary || n.dur === 0 || acc !== 'prorated') {
      var at = (acc === 'end' && !n.summary) ? n.finish : n.start, k = 0;
      for (var i = 0; i < periods.length; i++) if (at >= periods[i].d0) k = i;
      v[k] += n.own;
    } else {
      for (var j = 0; j < periods.length; j++) {
        var lo = Math.max(n.ES, idx[j]), hi = Math.min(n.EF, idx[j + 1]);
        if (j === periods.length - 1) hi = Math.max(hi, n.EF > idx[j + 1] ? n.EF : hi);
        if (hi > lo) v[j] += n.own * (hi - lo) / n.dur;
      }
    }
    rows.push({ node: n, values: v });
  });
  return rows;
};
/* budget table: components (top-level tasks) x expense categories */
A.budgetMatrix = function (p, S) {
  var comps = S.nodes.filter(function (n) { return !n.parent; });
  var cats = p.categories.map(function (c) { return c.id; }).concat([0]);
  var m = comps.map(function () { return cats.map(function () { return 0; }); });
  S.nodes.forEach(function (n) {
    if (!n.own) return;
    var i = comps.indexOf(n.comp), j = cats.indexOf(n.cat); if (j < 0) j = cats.length - 1;
    m[i][j] += n.own;
  });
  return { comps: comps, cats: cats, m: m };
};

/* ---------- resource usage ---------- */
/* for one work resource: units (%) per period = peak of the summed assignment units over the period's working days */
A.resourceLoad = function (S, resId, periods) {
  var p = A.P, cal = S.cal, asg = p.assignments.filter(function (a) { return a.res === resId; });
  var ev = [];
  asg.forEach(function (a) {
    var n = S.info.get(a.task); if (!n || n.EF <= n.ES) return;
    ev.push({ a: n.ES, b: n.EF, u: a.units == null ? 100 : a.units, n: n });
  });
  return periods.map(function (pr) {
    var i0 = cal.idxOf(pr.d0), i1 = cal.idxOf(pr.d1), pts = [i0], peak = 0, work = 0;
    ev.forEach(function (e) { if (e.a > i0 && e.a < i1) pts.push(e.a); });
    pts.forEach(function (pt) {
      var u = 0; ev.forEach(function (e) { if (e.a <= pt && e.b > pt) u += e.u; });
      if (u > peak) peak = u;
    });
    ev.forEach(function (e) { var lo = Math.max(e.a, i0), hi = Math.min(e.b, i1); if (hi > lo) work += (hi - lo) * e.u / 100; });
    return { peak: peak, days: work };
  });
};
/* list of over-allocated work resources with the first date of the problem */
A.overallocations = function (S) {
  var p = A.P, out = [];
  p.resources.forEach(function (r) {
    if (r.type === 'material') { // capacity = quantity available for the whole project
      if (!(r.max > 0)) return;
      var qty = 0, first = null;
      p.assignments.forEach(function (a) { var n = S.info.get(a.task); if (a.res !== r.id || !n) return; qty += +a.units || 0; if (first == null || n.ES < first) first = n.ES; });
      if (qty > r.max) out.push({ res: r, peak: qty, qty: true, day: S.cal.dateOf(first || 0) });
      return;
    }
    if (r.type !== 'work') return;
    var ev = [];
    p.assignments.forEach(function (a) {
      if (a.res !== r.id) return;
      var n = S.info.get(a.task); if (!n || n.EF <= n.ES) return;
      ev.push({ a: n.ES, b: n.EF, u: a.units == null ? 100 : a.units });
    });
    var worst = 0, at = null;
    ev.forEach(function (e) {
      var u = 0; ev.forEach(function (f) { if (f.a <= e.a && f.b > e.a) u += f.u; });
      if (u > (r.max || 100) && u > worst) { worst = u; at = e.a; }
    });
    if (at != null) out.push({ res: r, peak: worst, day: S.cal.dateOf(at) });
  });
  return out;
};

/* ---------- baseline ---------- */
A.MAX_BASELINES = 10;
/* save the current schedule as a new baseline (up to 10) and make it the one in use; returns it, or null when the list is full */
A.setBaseline = function (name) {
  var p = A.P; p.baselines = p.baselines || [];
  if (p.baselines.length >= A.MAX_BASELINES) return null;
  var b = { id: A.uid(), name: name || (A.L('Baseline ', 'Référence ') + (p.baselines.length + 1)), date: A.todayISO(), tasks: {}, total: A.S.total, finish: A.S.finish };
  A.S.nodes.forEach(function (n) { b.tasks[n.id] = { ES: n.ES, EF: n.EF, x0: n.x0, x1: n.x1, start: n.start, finish: n.finish, cost: n.cost, own: n.own }; });
  p.baselines.push(b); p.baselineId = b.id; p.baseline = b;
  return b;
};
A.useBaseline = function (id) { A.P.baselineId = id; A.P.baseline = A.activeBaseline(A.P); };
/* "clear baseline": removes the baseline in use; the previous one, if any, takes over */
A.clearBaseline = function (id) {
  var p = A.P; id = id || p.baselineId;
  p.baselines = (p.baselines || []).filter(function (b) { return b.id !== id; });
  if (p.baselineId === id) p.baselineId = p.baselines.length ? p.baselines[p.baselines.length - 1].id : 0;
  p.baseline = A.activeBaseline(p);
};

/* ---------- task list operations (called inside A.edit) ---------- */
A.ops = {};
A.ops.insert = function (index, name, level, extra) {
  var ts = A.P.tasks;
  if (index == null || index > ts.length) index = ts.length;
  if (level == null) level = index > 0 ? ts[index - 1].level : 0;
  var t = A.newTask(name, level, extra);
  ts.splice(index, 0, t);
  return t;
};
A.ops.addChild = function (parentId, name) {
  var i = A.taskIndex(parentId); if (i < 0) return A.ops.insert(null, name, 0);
  var parent = A.P.tasks[i];
  parent.collapsed = false;
  return A.ops.insert(A.blockEnd(i), name, parent.level + 1);
};
A.ops.addSibling = function (id, name) {
  var i = A.taskIndex(id); if (i < 0) return A.ops.insert(null, name, 0);
  return A.ops.insert(A.blockEnd(i), name, A.P.tasks[i].level);
};
A.ops.remove = function (ids) {
  var ts = A.P.tasks, kill = new Set();
  ids.forEach(function (id) {
    var i = A.taskIndex(id); if (i < 0) return;
    for (var j = i, e = A.blockEnd(i); j < e; j++) kill.add(ts[j].id);
  });
  A.P.tasks = ts.filter(function (t) { return !kill.has(t.id); });
  A.P.tasks.forEach(function (t) { t.preds = t.preds.filter(function (l) { return !kill.has(l.id); }); });
  A.P.assignments = A.P.assignments.filter(function (a) { return !kill.has(a.task); });
};
A.ops.indent = function (ids, delta) {
  var ts = A.P.tasks, idx = ids.map(A.taskIndex).filter(function (i) { return i >= 0; }).sort(function (a, b) { return a - b; });
  var done = new Set();
  idx.forEach(function (i) {
    if (done.has(i)) return;
    var e = A.blockEnd(i);
    if (delta > 0 && (i === 0 || ts[i].level > ts[i - 1].level)) return;
    if (delta < 0 && ts[i].level === 0) return;
    for (var j = i; j < e; j++) { ts[j].level += delta; done.add(j); }
    if (delta > 0 && i > 0) { // the task above becomes a summary: keep its own links, show its children
      var k = i - 1; while (k >= 0 && ts[k].level >= ts[i].level) k--;
      if (k >= 0) ts[k].collapsed = false;
    }
  });
};
/* move a task (with its sub-tasks) next to or under another one: where = 'child' | 'before' | 'after' */
A.ops.reparent = function (id, targetId, where) {
  var ts = A.P.tasks, i = A.taskIndex(id), j = A.taskIndex(targetId); if (i < 0 || j < 0 || id === targetId) return false;
  var e = A.blockEnd(i); if (j >= i && j < e) return false; // cannot drop inside its own sub-tree
  var block = ts.splice(i, e - i), tj = A.taskIndex(targetId), target = ts[tj], lv0 = block[0].level, newLevel, at;
  if (where === 'child') { newLevel = target.level + 1; at = A.blockEnd(tj); target.collapsed = false; target.wbsFold = false; }
  else { newLevel = target.level; at = where === 'before' ? tj : A.blockEnd(tj); }
  block.forEach(function (t) { t.level += newLevel - lv0; });
  ts.splice.apply(ts, [at, 0].concat(block));
  return true;
};
A.ops.move = function (id, dir) {
  var ts = A.P.tasks, i = A.taskIndex(id); if (i < 0) return;
  var e = A.blockEnd(i), lv = ts[i].level, block;
  if (dir < 0) {
    var j = i - 1; while (j >= 0 && ts[j].level > lv) j--;
    if (j < 0 || ts[j].level < lv) return;
    block = ts.splice(i, e - i); ts.splice.apply(ts, [j, 0].concat(block));
  } else {
    if (e >= ts.length || ts[e].level < lv) return;
    var e2 = A.blockEnd(e);
    block = ts.splice(i, e - i); ts.splice.apply(ts, [i + (e2 - e), 0].concat(block));
  }
};
/* chain the given tasks finish-to-start in row order */
A.ops.link = function (ids) {
  var rows = ids.map(A.taskIndex).filter(function (i) { return i >= 0; }).sort(function (a, b) { return a - b; });
  for (var k = 1; k < rows.length; k++) {
    var t = A.P.tasks[rows[k]], pid = A.P.tasks[rows[k - 1]].id;
    if (t.preds.some(function (l) { return l.id === pid; })) continue;
    var np = t.preds.concat([{ id: pid, type: 'FS', lag: 0, lunit: 'd' }]);
    if (!A.wouldCycle(t.id, np)) t.preds = np;
  }
};
A.ops.unlink = function (ids) {
  var set = new Set(ids);
  A.P.tasks.forEach(function (t) {
    if (set.has(t.id)) t.preds = ids.length === 1 ? [] : t.preds.filter(function (l) { return !set.has(l.id); });
  });
};
/* "Engineer[50%]; Cement[20]" -> assignments for the task, creating resources that do not exist yet */
A.ops.setResources = function (taskId, text) {
  var p = A.P;
  p.assignments = p.assignments.filter(function (a) { return a.task !== taskId; });
  String(text || '').split(/[;,]+/).forEach(function (tok) {
    tok = tok.trim(); if (!tok) return;
    var m = /^(.*?)\s*(?:\[\s*([\d.,\s]+)\s*%?\s*\])?$/.exec(tok), name = m[1].trim(); if (!name) return;
    var r = p.resources.find(function (x) { return x.name.toLowerCase() === name.toLowerCase(); });
    if (!r) { r = A.newResource(name, 'work'); p.resources.push(r); }
    var units = m[2] != null ? A.num(m[2]) : (r.type === 'work' ? 100 : 1);
    p.assignments.push({ task: taskId, res: r.id, units: units });
  });
};
A.fmtResources = function (taskId) {
  return (A.S.assignByTask.get(taskId) || []).map(function (a) {
    var r = A.resById(a.res); if (!r) return null;
    if (r.type === 'work') return r.name + (a.units !== 100 ? '[' + a.units + '%]' : '');
    if (r.type === 'material') return r.name + '[' + A.fmtNum(a.units, a.units % 1 ? 2 : 0) + ']';
    return r.name;
  }).filter(Boolean).join('; ');
};
