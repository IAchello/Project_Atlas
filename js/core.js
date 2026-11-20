/* Project Atlas — core: namespace, language, dates, calendar, data model, store.
   No DOM access here so the engine can be tested under Node. */
var A = globalThis.A = globalThis.A || {};

/* ---------- language ---------- */
A.lang = 'en';
A.L = function (en, fr) { return A.lang === 'fr' ? fr : en; };

/* ---------- dates: everything is a day number (days since 1970-01-01, UTC) ---------- */
A.toDay = function (iso) {
  if (iso == null || iso === '') return null;
  if (typeof iso === 'number') return iso;
  var m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(iso);
  if (!m) return null;
  return Math.round(Date.UTC(+m[1], +m[2] - 1, +m[3]) / 864e5);
};
A.toISO = function (day) {
  if (day == null) return '';
  return new Date(day * 864e5).toISOString().slice(0, 10);
};
A.todayISO = function () {
  var d = new Date();
  return A.toISO(Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5));
};
A.fmtDate = function (v) {
  var day = typeof v === 'number' ? v : A.toDay(v);
  if (day == null) return '';
  return new Date(day * 864e5).toLocaleDateString(A.lang === 'fr' ? 'fr-FR' : 'en-GB',
    { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
};
A.ymd = function (day) { var d = new Date(day * 864e5); return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate() }; };
A.dayOf = function (y, m, d) { return Math.round(Date.UTC(y, m, d) / 864e5); };
A.monthStart = function (day) { var x = A.ymd(day); return A.dayOf(x.y, x.m, 1); };
A.addMonths = function (day, n) { var x = A.ymd(day); return A.dayOf(x.y, x.m + n, 1); };

/* ---------- numbers ---------- */
A.num = function (v) {
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  if (v == null) return 0;
  var s = String(v).replace(/[\s  ]/g, '').replace(/[^0-9,.\-]/g, '');
  if (s.indexOf(',') >= 0 && s.indexOf('.') >= 0) s = s.replace(/,/g, '');
  else if (/,\d{3}(,|$)/.test(s)) s = s.replace(/,/g, '');
  else s = s.replace(',', '.');
  var n = parseFloat(s);
  return isFinite(n) ? n : 0;
};
A.fmtNum = function (n, dec) {
  if (n == null || !isFinite(n)) return '';
  return n.toLocaleString(A.lang === 'fr' ? 'fr-FR' : 'en-US', { maximumFractionDigits: dec || 0, minimumFractionDigits: dec || 0 });
};
A.money = function (n) { return (n == null || !isFinite(n)) ? '' : A.fmtNum(Math.round(n)); };
/* ids: sequential in a local project; time-based (with a random tail) in a shared project so that
   two people adding tasks at the same time never produce the same id */
A.uid = function () {
  if (A.P && A.P.shared && A.P.shared.id) { var id = Date.now() * 1000 + Math.floor(Math.random() * 1000); if (id <= A.P.nextId) id = A.P.nextId + 1; A.P.nextId = id + 1; return id; }
  return A.P.nextId++;
};
A.CURRENCIES = ['USD', 'EUR', 'XOF', 'XAF', 'CAD', 'GBP', 'CHF', 'MAD', 'DZD', 'TND', 'EGP', 'NGN', 'GHS', 'KES', 'TZS', 'UGX', 'RWF', 'BIF', 'ETB', 'CDF', 'GNF', 'MGA', 'MRU', 'HTG', 'KMF', 'DJF', 'SDG', 'ZAR', 'XPF', 'JPY', 'CNY', 'INR', 'BRL', 'AUD'];
A.clone = function (o) { return JSON.parse(JSON.stringify(o)); };

/* ---------- working calendar ---------- */
A.Calendar = function (p) {
  var c = p.calendar || {};
  this.work = new Set((c.workDays && c.workDays.length) ? c.workDays : [1, 2, 3, 4, 5]);
  this.hol = new Set();
  (c.holidays || []).forEach(function (h) {
    var a = A.toDay(h.from), b = A.toDay(h.to || h.from);
    if (a == null) return;
    if (b == null || b < a) b = a;
    for (var d = a; d <= b && d - a < 3660; d++) this.hol.add(d);
  }, this);
  this.days = [];
  this._next = A.toDay(p.start) || A.toDay(A.todayISO());
};
A.Calendar.prototype.isWork = function (d) {
  return this.work.has((((d + 4) % 7) + 7) % 7) && !this.hol.has(d);
};
A.Calendar.prototype._extend = function () {
  var guard = 0;
  while (guard++ < 4000) {
    var d = this._next++;
    if (this.isWork(d)) { this.days.push(d); return; }
  }
  this.days.push(this._next++); // calendar with no working day: never loop forever
};
/* date (day number) of working-day index i (0 = first working day of the project) */
A.Calendar.prototype.dateOf = function (i) {
  if (i < 0) i = 0;
  while (this.days.length <= i) this._extend();
  return this.days[i];
};
/* index of the first working day on or after date d */
A.Calendar.prototype.idxOf = function (d) {
  if (!this.days.length) this._extend();
  if (d <= this.days[0]) return 0;
  while (this.days[this.days.length - 1] < d) this._extend();
  var lo = 0, hi = this.days.length - 1;
  while (lo < hi) { var mid = (lo + hi) >> 1; if (this.days[mid] < d) lo = mid + 1; else hi = mid; }
  return lo;
};
/* exclusive end index for a task finishing on date d (inclusive) */
A.Calendar.prototype.endIdx = function (d) { return this.idxOf(d + 1); };
/* calendar positions (fractional day numbers) of a boundary index, used to draw bars */
A.Calendar.prototype.startPos = function (i) { return this.dateOf(i); };
A.Calendar.prototype.endPos = function (i) { return i <= 0 ? this.dateOf(0) : this.dateOf(i - 1) + 1; };

/* ---------- data model ---------- */
A.defaultThresholds = function () {
  return {
    works: { icb: 5000000, ncb: 1000000, prior: 500000 },
    goods: { icb: 3000000, ncb: 500000, prior: 500000 },
    firm: { prior: 100000 },
    indiv: { prior: 50000 }
  };
};
A.newProject = function (name) {
  return {
    app: 'Project Atlas', version: 2,
    name: name || A.L('New project', 'Nouveau projet'),
    client: '', financier: '', manager: '',
    start: A.todayISO(), statusDate: '', currency: 'USD',
    calendar: { workDays: [1, 2, 3, 4, 5], hoursPerDay: 8, daysPerWeek: 5, daysPerMonth: 20, holidays: [] },
    wbsPrefix: '1', durUnit: 'auto',
    categories: [
      { id: 1, name: A.L('Category 1: Works', 'Catégorie 1 : Travaux') },
      { id: 2, name: A.L('Category 2: Goods', 'Catégorie 2 : Biens') },
      { id: 3, name: A.L('Category 3: Consultants', 'Catégorie 3 : Consultants') },
      { id: 4, name: A.L('Category 4: Operating costs', 'Catégorie 4 : Fonctionnement') },
      { id: 5, name: A.L('Category 5: Unallocated', 'Catégorie 5 : Non alloué') }
    ],
    thresholds: A.defaultThresholds(),
    tasks: [], resources: [], assignments: [], contracts: [],
    baseline: null, baselines: [], baselineId: 0, statuses: [], eacMethod: 'cpi', shared: null,
    stakeholders: [], results: [], kpis: [], risks: [], issues: [], definition: null, nextId: 100
  };
};
A.newTask = function (name, level, extra) {
  var t = {
    id: A.uid(), name: name || '', level: level || 0,
    dur: 1, unit: 'd', ms: false, loe: false, preds: [],
    ctype: 'ASAP', cdate: '', pct: 0, as: '', af: '',
    fixed: 0, rate: 0, accrual: 'prorated', cat: 0, contract: 0, proc: 0,
    notes: '', collapsed: false
  };
  if (extra) for (var k in extra) t[k] = extra[k];
  return t;
};
A.newResource = function (name, type) {
  return { id: A.uid(), name: name || '', type: type || 'work', max: type === 'material' ? 0 : 100, rate: 0, per: type === 'material' ? 'u' : 'd', perUse: 0, unit: '', group: '', account: '' };
};
A.newContract = function (title) {
  return {
    id: A.uid(), ref: '', title: title || '', contractor: '',
    pcat: 'works', method: '', ctype: 'lump', review: '', lead: 0,
    estimate: 0, amount: 0, sign: '', start: '', end: '', status: 'planned',
    advPct: 10, retPct: 5, mobil: 0, procParent: 0, notes: '',
    milestones: [], payments: [], guarantees: [], changes: []
  };
};
/* fill in fields missing from files written by older versions or imported by hand */
A.normalize = function (p) {
  var d = A.newProjectShell();
  for (var k in d) if (p[k] == null) p[k] = d[k];
  for (var c in d.calendar) if (p.calendar[c] == null) p.calendar[c] = d.calendar[c];
  var maxId = 0;
  function seen(o) { if (o && o.id > maxId) maxId = o.id; }
  var saved = A.P; A.P = { nextId: 1e9 };
  var tDef = A.newTask(), rDef = A.newResource(), cDef = A.newContract();
  A.P = saved;
  p.tasks.forEach(function (t) { for (var k in tDef) if (t[k] == null && k !== 'id') t[k] = A.clone(tDef[k]); seen(t); });
  p.resources.forEach(function (r) { for (var k in rDef) if (r[k] == null && k !== 'id') r[k] = rDef[k]; seen(r); });
  p.contracts.forEach(function (c) {
    for (var k in cDef) if (c[k] == null && k !== 'id') c[k] = A.clone(cDef[k]); seen(c);
    ['milestones', 'payments', 'guarantees', 'changes'].forEach(function (g) { c[g].forEach(seen); });
  });
  p.categories.forEach(seen); (p.statuses || []).forEach(seen);
  ['stakeholders', 'results', 'kpis', 'risks', 'issues'].forEach(function (k) { if (!Array.isArray(p[k])) p[k] = []; p[k].forEach(seen); });
  p.results.forEach(function (r) { if (!Array.isArray(r.indicators)) r.indicators = []; r.indicators.forEach(seen); });
  p.risks.forEach(function (r) { if (!Array.isArray(r.actions)) r.actions = []; r.actions.forEach(seen); });
  /* baselines: version 1 files have a single p.baseline */
  if (!Array.isArray(p.baselines)) p.baselines = [];
  if (p.baseline && !p.baselines.length) { p.baselines.push(Object.assign({ id: maxId + 1, name: A.L('Baseline', 'Référence') }, p.baseline)); p.baselineId = maxId + 1; }
  p.baselines.forEach(function (b) { if (!b.id) b.id = ++maxId; if (!b.name) b.name = A.L('Baseline', 'Référence'); seen(b); });
  if (!p.baselines.some(function (b) { return b.id === p.baselineId; })) p.baselineId = p.baselines.length ? p.baselines[p.baselines.length - 1].id : 0;
  p.baseline = A.activeBaseline(p);
  if (!(p.nextId > maxId)) p.nextId = maxId + 1;
  return p;
};
A.activeBaseline = function (p) { p = p || A.P; return (p.baselines || []).find(function (b) { return b.id === p.baselineId; }) || null; };
/* unit used to display durations: the project setting, or each task's own unit */
A.dUnit = function (t) { var u = A.P && A.P.durUnit; return u && u !== 'auto' ? u : (t && t.unit) || 'd'; };
A.catLabel = function (plural) { return plural ? A.L('Budget lines', 'Lignes budgétaires') : A.L('Budget line', 'Ligne budgétaire'); };
A.newProjectShell = function () { var l = A.lang; var p = A.newProject(''); A.lang = l; return p; };

/* ---------- store: current project, undo, autosave ---------- */
A.P = null;           // current project
A.S = null;           // current schedule (computed)
A.undoStack = []; A.redoStack = [];
A.onChange = null;    // set by the UI
A.storageKey = 'project-atlas.v2.current';
A.storageKeyV1 = 'project-atlas.current';
A.APP_VERSION = '2.1';

A.setProject = function (p, keepUndo) {
  A.P = A.normalize(p);
  if (!keepUndo) { A.undoStack = []; A.redoStack = []; }
  A.recalc(); A.persist();
  if (A.onChange) A.onChange();
};
A.recalc = function () { A.S = A.schedule(A.P); return A.S; };
A.persist = function () {
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(A.storageKey, JSON.stringify(A.P)); } catch (e) { /* storage unavailable */ }
};
/* every change to the project goes through edit() so it can be undone */
A.edit = function (fn) {
  var before = JSON.stringify(A.P);
  var res = fn(A.P);
  if (res === false) { A.P = JSON.parse(before); A.recalc(); if (A.onChange) A.onChange(); return false; }
  A.undoStack.push(before); if (A.undoStack.length > 60) A.undoStack.shift();
  A.redoStack = [];
  A.recalc(); A.persist();
  if (A.onChange) A.onChange();
  return true;
};
A.undo = function () {
  if (!A.undoStack.length) return;
  A.redoStack.push(JSON.stringify(A.P));
  A.P = JSON.parse(A.undoStack.pop()); A.recalc(); A.persist(); if (A.onChange) A.onChange();
};
A.redo = function () {
  if (!A.redoStack.length) return;
  A.undoStack.push(JSON.stringify(A.P));
  A.P = JSON.parse(A.redoStack.pop()); A.recalc(); A.persist(); if (A.onChange) A.onChange();
};

/* ---------- small lookups ---------- */
A.taskById = function (id) { var ts = A.P.tasks; for (var i = 0; i < ts.length; i++) if (ts[i].id === id) return ts[i]; return null; };
A.taskIndex = function (id) { var ts = A.P.tasks; for (var i = 0; i < ts.length; i++) if (ts[i].id === id) return i; return -1; };
A.resById = function (id) { return A.P.resources.find(function (r) { return r.id === id; }) || null; };
A.contractById = function (id) { return A.P.contracts.find(function (c) { return c.id === id; }) || null; };
A.catById = function (id) { return A.P.categories.find(function (c) { return c.id === id; }) || null; };
/* index just past the last descendant of the task at index i */
A.blockEnd = function (i) {
  var ts = A.P.tasks, lv = ts[i].level, j = i + 1;
  while (j < ts.length && ts[j].level > lv) j++;
  return j;
};
