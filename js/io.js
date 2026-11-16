/* Project Atlas — files: Atlas project files, MS Project XML, Excel / CSV. */
var A = globalThis.A = globalThis.A || {};

/* ---------- tiny XML reader/writer (enough for MS Project XML; works in the browser and under Node) ---------- */
A.xmlEsc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
A.xmlUnesc = function (s) {
  return s.replace(/&(#x?[0-9a-fA-F]+|lt|gt|amp|quot|apos);/g, function (m, e) {
    if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" }[e];
  });
};
A.parseXML = function (text) {
  var root = { name: '#root', kids: [], text: '' }, stack = [root];
  var re = /<!\[CDATA\[([\s\S]*?)\]\]>|<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!DOCTYPE[^>]*>|<\/([^\s>]+)\s*>|<([^\s>\/]+)([^>]*?)(\/?)>|([^<]+)/g, m;
  while ((m = re.exec(text))) {
    var top = stack[stack.length - 1];
    if (m[1] != null) top.text += m[1];
    else if (m[2]) { if (stack.length > 1) stack.pop(); }
    else if (m[3]) {
      var node = { name: m[3].replace(/^.*:/, ''), kids: [], text: '' };
      top.kids.push(node);
      if (!m[5]) stack.push(node);
    } else if (m[6]) top.text += A.xmlUnesc(m[6]);
  }
  return root;
};
function kid(n, name) { for (var i = 0; n && i < n.kids.length; i++) if (n.kids[i].name === name) return n.kids[i]; return null; }
function kids(n, name) { return n ? n.kids.filter(function (k) { return k.name === name; }) : []; }
function txt(n, name, def) { var k = kid(n, name); return k ? k.text.trim() : (def == null ? '' : def); }

/* ---------- MS Project XML ---------- */
var CT = ['ASAP', 'ALAP', 'MSO', 'MFO', 'SNET', 'SNLT', 'FNET', 'FNLT'];
var LT = { FF: 0, FS: 1, SF: 2, SS: 3 };
var DF = { d: 7, w: 9, mo: 11 }, DFR = { 3: 'd', 4: 'd', 5: 'd', 6: 'd', 7: 'd', 8: 'd', 9: 'w', 10: 'w', 11: 'mo', 12: 'mo', 35: 'd', 36: 'd', 37: 'd', 38: 'd', 39: 'd', 40: 'd', 41: 'w', 42: 'w', 43: 'mo', 44: 'mo', 53: 'd' };
A.exportMSPXML = function () {
  var p = A.P, S = A.S, c = p.calendar, e = A.xmlEsc, hpd = c.hoursPerDay, x = [];
  function tag(name, v) { x.push('<' + name + '>' + e(v) + '</' + name + '>'); }
  function dt(day, end) { return A.toISO(day) + (end ? 'T17:00:00' : 'T08:00:00'); }
  function pt(days) { return 'PT' + Math.round(days * hpd) + 'H0M0S'; }
  x.push('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>');
  x.push('<Project xmlns="http://schemas.microsoft.com/project">');
  tag('SaveVersion', 14); tag('Name', p.name); tag('Title', p.name); tag('Company', p.client); tag('Manager', p.manager);
  tag('ScheduleFromStart', 1); tag('StartDate', dt(S.start)); tag('FinishDate', dt(S.finish, true));
  tag('CurrencyCode', p.currency); tag('CalendarUID', 1);
  tag('MinutesPerDay', hpd * 60); tag('MinutesPerWeek', hpd * 60 * c.daysPerWeek); tag('DaysPerMonth', c.daysPerMonth);
  x.push('<Calendars><Calendar>'); tag('UID', 1); tag('Name', 'Standard'); tag('IsBaseCalendar', 1); x.push('<WeekDays>');
  for (var wd = 0; wd < 7; wd++) {
    var on = c.workDays.indexOf(wd) >= 0;
    x.push('<WeekDay>'); tag('DayType', wd + 1); tag('DayWorking', on ? 1 : 0);
    if (on) x.push('<WorkingTimes><WorkingTime><FromTime>08:00:00</FromTime><ToTime>12:00:00</ToTime></WorkingTime><WorkingTime><FromTime>13:00:00</FromTime><ToTime>17:00:00</ToTime></WorkingTime></WorkingTimes>');
    x.push('</WeekDay>');
  }
  x.push('</WeekDays>');
  if (c.holidays.length) {
    x.push('<Exceptions>');
    c.holidays.forEach(function (h) {
      if (A.toDay(h.from) == null) return;
      x.push('<Exception><EnteredByOccurrences>0</EnteredByOccurrences><TimePeriod><FromDate>' + h.from + 'T00:00:00</FromDate><ToDate>' + (h.to || h.from) + 'T23:59:00</ToDate></TimePeriod><Occurrences>1</Occurrences><Name>' + e(h.name) + '</Name><Type>1</Type><DayWorking>0</DayWorking></Exception>');
    });
    x.push('</Exceptions>');
  }
  x.push('</Calendar></Calendars>');
  x.push('<Tasks>');
  p.tasks.forEach(function (t, i) {
    var n = S.info.get(t.id);
    x.push('<Task>'); tag('UID', t.id); tag('ID', i + 1); tag('Name', t.name); tag('Type', 1); tag('IsNull', 0);
    tag('WBS', n.wbs); tag('OutlineNumber', n.wbs.slice(p.wbsPrefix ? p.wbsPrefix.length + 1 : 0)); tag('OutlineLevel', t.level + 1);
    tag('Start', dt(n.start)); tag('Finish', dt(n.finish, true)); tag('Duration', pt(n.dur)); tag('DurationFormat', DF[t.unit] || 7);
    tag('Milestone', n.isMs ? 1 : 0); tag('Summary', n.summary ? 1 : 0); tag('Critical', n.crit ? 1 : 0);
    tag('PercentComplete', Math.round(n.pct)); tag('FixedCost', Math.round(n.own * 100)); tag('FixedCostAccrual', t.accrual === 'start' ? 1 : t.accrual === 'end' ? 2 : 3);
    tag('Cost', Math.round(n.cost * 100));
    if (t.as) tag('ActualStart', dt(A.toDay(t.as))); if (t.af) tag('ActualFinish', dt(A.toDay(t.af), true));
    var ct = CT.indexOf(t.ctype); if (ct < 0 || !t.cdate) ct = 0;
    tag('ConstraintType', ct); if (ct) tag('ConstraintDate', dt(A.toDay(t.cdate), ct === 3 || ct >= 6));
    tag('CalendarUID', -1); if (t.notes) tag('Notes', t.notes);
    t.preds.forEach(function (l) {
      x.push('<PredecessorLink>'); tag('PredecessorUID', l.id); tag('Type', LT[l.type]); tag('CrossProject', 0);
      tag('LinkLag', Math.round((l.lag || 0) * hpd * 600)); tag('LagFormat', DF[l.lunit] || 7); x.push('</PredecessorLink>');
    });
    x.push('</Task>');
  });
  x.push('</Tasks><Resources>');
  p.resources.forEach(function (r, i) {
    x.push('<Resource>'); tag('UID', r.id); tag('ID', i + 1); tag('Name', r.name);
    tag('Type', r.type === 'material' ? 0 : r.type === 'cost' ? 2 : 1); tag('Group', r.group || '');
    if (r.type === 'material') tag('MaterialLabel', r.unit || '');
    tag('MaxUnits', (r.max || 100) / 100);
    tag('StandardRate', r.type === 'work' ? Math.round(A.ratePerDay(r) / hpd * 100) / 100 : (r.rate || 0)); tag('StandardRateFormat', r.type === 'work' ? 2 : 8);
    tag('CostPerUse', Math.round((r.perUse || 0) * 100)); x.push('</Resource>');
  });
  x.push('</Resources><Assignments>');
  p.assignments.forEach(function (a, i) {
    var r = A.resById(a.res);
    x.push('<Assignment>'); tag('UID', i + 1); tag('TaskUID', a.task); tag('ResourceUID', a.res);
    tag('Units', r && r.type === 'work' ? (a.units == null ? 100 : a.units) / 100 : (a.units || 0)); x.push('</Assignment>');
  });
  x.push('</Assignments></Project>');
  return x.join('\n');
};
A.importMSPXML = function (text) {
  var root = kid(A.parseXML(text), 'Project');
  if (!root) throw A.L('This is not an MS Project XML file.', "Ce fichier n'est pas un fichier XML MS Project.");
  var saved = A.P, p = A.newProject(txt(root, 'Title') || txt(root, 'Name').replace(/\.(xml|mpp|pod)$/i, '') || 'Project');
  p.nextId = 1; A.P = p;
  try {
    p.client = txt(root, 'Company'); p.manager = txt(root, 'Manager');
    p.start = (txt(root, 'StartDate') || A.todayISO()).slice(0, 10);
    p.currency = txt(root, 'CurrencyCode') || p.currency; p.wbsPrefix = '';
    var mpd = +txt(root, 'MinutesPerDay') || 480, hpd = mpd / 60;
    p.calendar.hoursPerDay = hpd;
    p.calendar.daysPerWeek = Math.round((+txt(root, 'MinutesPerWeek') || mpd * 5) / mpd) || 5;
    p.calendar.daysPerMonth = +txt(root, 'DaysPerMonth') || 20;
    var calUID = txt(root, 'CalendarUID'), cals = kids(kid(root, 'Calendars'), 'Calendar');
    var cal = cals.find(function (c) { return txt(c, 'UID') === calUID; }) || cals[0];
    if (cal) {
      var wds = [];
      kids(kid(cal, 'WeekDays'), 'WeekDay').forEach(function (w) {
        var dtp = +txt(w, 'DayType');
        if (dtp >= 1 && dtp <= 7) { if (txt(w, 'DayWorking') === '1') wds.push(dtp - 1); }
        else if (dtp === 0 && txt(w, 'DayWorking') === '0') { var tp = kid(w, 'TimePeriod'); if (tp) p.calendar.holidays.push({ from: txt(tp, 'FromDate').slice(0, 10), to: txt(tp, 'ToDate').slice(0, 10), name: '' }); }
      });
      if (wds.length) p.calendar.workDays = wds.sort();
      kids(kid(cal, 'Exceptions'), 'Exception').forEach(function (ex) {
        var tp = kid(ex, 'TimePeriod'); if (!tp || txt(ex, 'DayWorking') === '1') return;
        p.calendar.holidays.push({ from: txt(tp, 'FromDate').slice(0, 10), to: txt(tp, 'ToDate').slice(0, 10), name: txt(ex, 'Name') });
      });
    }
    function hours(iso) { var m = /P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?T?(?:([\d.]+)H)?(?:([\d.]+)M)?(?:([\d.]+)S)?/.exec(iso || ''); return m ? (+m[3] || 0) * 24 + (+m[4] || 0) + (+m[5] || 0) / 60 + (+m[6] || 0) / 3600 : 0; }
    var idMap = new Map(), maxId = 0, list = [];
    kids(kid(root, 'Tasks'), 'Task').forEach(function (tk) {
      var uid = +txt(tk, 'UID'), lvl = +txt(tk, 'OutlineLevel');
      if (txt(tk, 'IsNull') === '1' || lvl < 1 || !kid(tk, 'Name')) return;
      list.push({ tk: tk, uid: uid, id: +txt(tk, 'ID') || 0 });
    });
    list.sort(function (a, b) { return a.id - b.id; });
    list.forEach(function (o) {
      var tk = o.tk, elapsed = +txt(tk, 'DurationFormat') >= 35 && +txt(tk, 'DurationFormat') <= 44;
      var days = hours(txt(tk, 'Duration')) / (elapsed ? 24 * 7 / p.calendar.daysPerWeek : hpd);
      var ms = txt(tk, 'Milestone') === '1';
      var t = A.newTask(txt(tk, 'Name'), +txt(tk, 'OutlineLevel') - 1, {
        dur: ms && days < 0.5 ? 0 : Math.max(days > 0 ? 1 : 0, Math.round(days)), unit: DFR[+txt(tk, 'DurationFormat')] || 'd', ms: ms && days < 0.5,
        pct: +txt(tk, 'PercentComplete') || 0, fixed: (+txt(tk, 'FixedCost') || 0) / 100, notes: txt(tk, 'Notes'),
        as: txt(tk, 'ActualStart').slice(0, 10), af: txt(tk, 'ActualFinish').slice(0, 10),
        accrual: { 1: 'start', 2: 'end' }[txt(tk, 'FixedCostAccrual')] || 'prorated'
      });
      if (t.as && t.as < '1985') t.as = ''; if (t.af && t.af < '1985') t.af = '';
      if (!t.dur && !t.ms) { t.ms = true; }
      var ct = CT[+txt(tk, 'ConstraintType')] || 'ASAP', cd = txt(tk, 'ConstraintDate').slice(0, 10);
      if (ct !== 'ASAP' && ct !== 'ALAP' && cd) { t.ctype = ct; t.cdate = cd; }
      t._links = kids(tk, 'PredecessorLink');
      t._cost = (+txt(tk, 'Cost') || 0) / 100; t._summary = txt(tk, 'Summary') === '1';
      idMap.set(o.uid, t); p.tasks.push(t);
    });
    var TL = ['FF', 'FS', 'SF', 'SS'];
    p.tasks.forEach(function (t) {
      t._links.forEach(function (l) {
        var pr = idMap.get(+txt(l, 'PredecessorUID')); if (!pr || pr === t) return;
        var lf = +txt(l, 'LagFormat'), lag = +txt(l, 'LinkLag') || 0;
        if (lf === 19 || lf === 20 || lf === 51 || lf === 52) lag = 0; // percentage lags are not supported
        t.preds.push({ id: pr.id, type: TL[+txt(l, 'Type', '1')] || 'FS', lag: Math.round(lag / 600 / hpd), lunit: DFR[lf] || 'd' });
      });
      delete t._links;
    });
    var rMap = new Map();
    kids(kid(root, 'Resources'), 'Resource').forEach(function (rs) {
      var name = txt(rs, 'Name'); if (!name) return;
      var ty = txt(rs, 'Type'), r = A.newResource(name, ty === '0' ? 'material' : ty === '2' ? 'cost' : 'work');
      r.max = Math.round((+txt(rs, 'MaxUnits') || 1) * 100); r.group = txt(rs, 'Group'); r.unit = txt(rs, 'MaterialLabel');
      r.rate = +txt(rs, 'StandardRate') || 0; r.per = r.type === 'work' ? 'h' : 'd'; r.perUse = (+txt(rs, 'CostPerUse') || 0) / 100;
      rMap.set(+txt(rs, 'UID'), r); p.resources.push(r);
    });
    kids(kid(root, 'Assignments'), 'Assignment').forEach(function (as) {
      var t = idMap.get(+txt(as, 'TaskUID')), r = rMap.get(+txt(as, 'ResourceUID')); if (!t || !r) return;
      var u = +txt(as, 'Units'); if (!isFinite(u)) u = 1;
      p.assignments.push({ task: t.id, res: r.id, units: r.type === 'work' ? Math.round(u * 100) : u });
    });
    /* MS Project stores resource costs in Cost only; when a file carries costs but neither rates nor
       fixed costs explain them, keep the difference as a fixed cost so that totals survive the import */
    var S = A.schedule(p);
    p.tasks.forEach(function (t) {
      var n = S.info.get(t.id);
      if (!n.summary && t._cost > 0 && Math.abs(n.own - t._cost) > 0.5 && n.own < t._cost) t.fixed += t._cost - n.own;
      if (n.summary) { t.ms = false; }
      delete t._cost; delete t._summary;
    });
    p.nextId = Math.max(p.nextId, maxId + 1);
  } finally { A.P = saved; }
  return p;
};

/* ---------- tables used by Excel / CSV export and by the reports ---------- */
A.tableTasks = function () {
  var L = A.L, S = A.S;
  var head = ['#', L('WBS', 'WBS'), L('Name', 'Nom'), L('Level', 'Niveau'), L('Duration (days)', 'Durée (jours)'), L('Start', 'Début'), L('Finish', 'Fin'),
    L('Predecessors', 'Prédécesseurs'), L('Resources', 'Ressources'), L('Cost', 'Coût'), L('Category', 'Catégorie'), L('Contract', 'Contrat'),
    L('% complete', '% achevé'), L('Total float (days)', 'Marge totale (jours)'), L('Critical', 'Critique'), L('Notes', 'Notes')];
  var rows = A.P.tasks.map(function (t, i) {
    var n = S.info.get(t.id), cat = A.catById(n.cat), c = A.contractById(t.contract || t.proc);
    return [i + 1, n.wbs, t.name, t.level + 1, n.dur, A.toISO(n.start), A.toISO(n.finish), A.fmtPreds(t), A.fmtResources(t.id), Math.round(n.cost * 100) / 100,
      cat ? cat.name : '', c ? (c.ref || c.title) : '', Math.round(n.pct), n.TF, n.crit ? L('Yes', 'Oui') : L('No', 'Non'), t.notes || ''];
  });
  return [head].concat(rows);
};
A.tableResources = function () {
  var L = A.L;
  return [[L('Name', 'Nom'), L('Type', 'Type'), L('Group', 'Groupe'), L('Max units %', 'Capacité max %'), L('Rate', 'Taux'), L('Per', 'Par'), L('Cost per use', 'Coût par utilisation'), L('Unit', 'Unité')]]
    .concat(A.P.resources.map(function (r) { return [r.name, r.type, r.group, r.max, r.rate, r.per, r.perUse, r.unit]; }));
};
A.tableContracts = function () {
  var L = A.L;
  var head = [L('Ref.', 'Réf.'), L('Contract', 'Contrat'), L('Contractor', 'Titulaire'), L('Category', 'Catégorie'), L('Method', 'Méthode'), L('Review', 'Revue'), L('Type', 'Type'),
    L('Estimate', 'Estimation'), L('Signed amount', 'Montant signé'), L('Revised amount', 'Montant révisé'), L('Paid', 'Payé'), L('Balance', 'Solde'),
    L('Procurement start', 'Lancement'), L('Signature', 'Signature'), L('Start', 'Début'), L('End', 'Fin'), L('Revised end', 'Fin révisée'), L('Progress %', 'Avancement %'), L('Status', 'Statut')];
  var name = function (list, id) { var o = list.find(function (x) { return x.id === id; }); return o ? o.name : id; };
  return [head].concat(A.P.contracts.map(function (c) {
    var o = A.contractInfo(c);
    return [c.ref, c.title, c.contractor, name(A.pcats(), c.pcat), A.methodShort(A.effMethod(c)), A.effReview(c) === 'prior' ? L('Prior', 'A priori') : L('Post', 'A posteriori'), name(A.ctypes(), c.ctype),
      c.estimate, c.amount, o.revised, o.paid, o.balance, A.toISO(o.launch), c.sign || A.toISO(o.signPlan), A.toISO(o.start), A.toISO(o.end), A.toISO(o.revEnd), Math.round(o.pct), name(A.cstatuses(), c.status)];
  }));
};
A.tablePayments = function () {
  var L = A.L, rows = [[L('Contract', 'Contrat'), L('Payment', 'Paiement'), L('Due date', 'Échéance'), L('Amount', 'Montant'), L('Status', 'Statut'), L('Paid on', 'Payé le'), L('Amount paid', 'Montant payé')]];
  A.P.contracts.forEach(function (c) { c.payments.forEach(function (pm) { rows.push([(c.ref ? c.ref + ' ' : '') + c.title, pm.label, pm.due, pm.amount, pm.status, pm.paidDate, pm.status === 'paid' ? (pm.paid || pm.amount) : '']); }); });
  return rows;
};
A.tableBudget = function () {
  var L = A.L, b = A.budgetMatrix(A.P, A.S), used = b.cats.map(function (c, j) { return c !== 0 || b.m.some(function (r) { return r[j]; }); });
  var head = [L('Component', 'Composante')];
  b.cats.forEach(function (c, j) { if (used[j]) head.push(c ? A.catById(c).name : L('No category', 'Sans catégorie')); });
  head.push(L('Total', 'Total'));
  var rows = [head], tot = b.cats.map(function () { return 0; }), grand = 0;
  b.comps.forEach(function (n, i) {
    var row = [n.wbs + ' ' + n.t.name], s = 0;
    b.cats.forEach(function (c, j) { tot[j] += b.m[i][j]; s += b.m[i][j]; if (used[j]) row.push(Math.round(b.m[i][j])); });
    row.push(Math.round(s)); grand += s; rows.push(row);
  });
  var last = [L('Total', 'Total')]; b.cats.forEach(function (c, j) { if (used[j]) last.push(Math.round(tot[j])); }); last.push(Math.round(grand)); rows.push(last);
  return rows;
};
/* cash flow by 'category' or 'component', per period */
A.tableCashflow = function (step, by) {
  var L = A.L, S = A.S, per = A.periods(S, step || 'month'), ph = A.phaseCosts(S, per), groups = [], idx = new Map();
  function g(key, label) { if (!idx.has(key)) { idx.set(key, groups.length); groups.push({ label: label, v: per.map(function () { return 0; }) }); } return groups[idx.get(key)]; }
  if (by === 'component') S.nodes.forEach(function (n) { if (!n.parent) g(n.id, n.wbs + ' ' + n.t.name); });
  else A.P.categories.forEach(function (c) { g(c.id, c.name); });
  ph.forEach(function (r) {
    var grp = by === 'component' ? g(r.node.comp.id, '') : g(r.node.cat || 0, L('No category', 'Sans catégorie'));
    r.values.forEach(function (v, i) { grp.v[i] += v; });
  });
  groups = groups.filter(function (x) { return x.v.some(function (v) { return v; }) || by === 'component'; });
  var total = per.map(function (_, i) { return groups.reduce(function (a, x) { return a + x.v[i]; }, 0); }), cum = [], run = 0;
  total.forEach(function (v) { run += v; cum.push(run); });
  return { periods: per, groups: groups, total: total, cum: cum };
};
A.tableCashflowRows = function (step, by) {
  var L = A.L, cf = A.tableCashflow(step, by), r = function (v) { return Math.round(v); };
  var rows = [[by === 'component' ? L('Component', 'Composante') : L('Category', 'Catégorie')].concat(cf.periods.map(function (p) { return p.label; })).concat([L('Total', 'Total')])];
  cf.groups.forEach(function (g) { rows.push([g.label].concat(g.v.map(r)).concat([r(g.v.reduce(function (a, b) { return a + b; }, 0))])); });
  rows.push([L('Total', 'Total')].concat(cf.total.map(r)).concat([r(cf.cum[cf.cum.length - 1] || 0)]));
  rows.push([L('Cumulative', 'Cumul')].concat(cf.cum.map(r)).concat(['']));
  return rows;
};

/* ---------- import a task list from rows (Excel sheet or CSV) ---------- */
A.importTaskRows = function (rows) {
  var L = A.L;
  rows = rows.filter(function (r) { return r && r.some(function (c) { return c != null && String(c).trim() !== ''; }); });
  if (!rows.length) throw L('The sheet is empty.', 'La feuille est vide.');
  function norm(s) { return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(); }
  var hi = rows.findIndex(function (r) { return r.some(function (c) { return /^(name|nom|task|tache|activity|activite)/.test(norm(c)); }); });
  if (hi < 0) throw L('No "Name" column was found in the first sheet.', 'Aucune colonne « Nom » dans la première feuille.');
  var H = rows[hi].map(norm);
  function col() { for (var a = 0; a < arguments.length; a++) { var re = arguments[a]; for (var i = 0; i < H.length; i++) if (re.test(H[i])) return i; } return -1; }
  var cName = col(/^(name|nom|task|tache|activity|activite)/), cWbs = col(/^(wbs|otp|sdp|code|outline)/), cLvl = col(/^(level|niveau)/),
    cDur = col(/^(duration|duree)/), cPred = col(/^pred/), cCost = col(/^(cost|cout|amount|montant|budget)/), cCat = col(/^categ/),
    cRes = col(/^ress?ource/), cNotes = col(/^note/), cStart = col(/^(start|debut)/), cNum = col(/^(#|id|no\.?|n°|num(ero)?)$/);
  var p = A.P, base = p.tasks.length, made = [], rowToTask = new Map();
  rows.slice(hi + 1).forEach(function (r, k) {
    var name = String(r[cName] == null ? '' : r[cName]).trim(); if (!name) return;
    var level = 0;
    if (cLvl >= 0 && r[cLvl] !== '' && r[cLvl] != null) level = Math.max(0, Math.round(A.num(r[cLvl])) - 1);
    else if (cWbs >= 0 && r[cWbs] != null) { var parts = String(r[cWbs]).trim().split('.').filter(Boolean).length; level = Math.max(0, parts - 1 - (p.wbsPrefix ? 1 : 0)); }
    else { var lead = /^(\s*)/.exec(String(r[cName]))[1].length; level = Math.floor(lead / 2); }
    var t = A.ops.insert(null, name, level);
    if (made.length === 0) t.level = Math.min(t.level, base ? t.level : 0);
    if (cDur >= 0 && r[cDur] !== '' && r[cDur] != null) { var d = A.parseDur(r[cDur]); if (d) { t.dur = Math.abs(d.dur); t.unit = d.unit; t.ms = d.dur === 0; } }
    if (cCost >= 0) t.fixed = A.num(r[cCost]);
    if (cNotes >= 0 && r[cNotes] != null) t.notes = String(r[cNotes]);
    if (cCat >= 0 && r[cCat]) {
      var cn = norm(r[cCat]), cat = p.categories.find(function (c) { return norm(c.name) === cn || norm(c.name).indexOf(cn) >= 0; });
      if (!cat) { cat = { id: A.uid(), name: String(r[cCat]).trim() }; p.categories.push(cat); }
      t.cat = cat.id;
    }
    if (cStart >= 0 && r[cStart] && cPred >= 0 && !String(r[cPred] || '').trim() && typeof r[cStart] === 'string' && /^\d{4}-\d\d-\d\d/.test(r[cStart])) t._start = r[cStart].slice(0, 10);
    t._pred = cPred >= 0 ? r[cPred] : ''; t._res = cRes >= 0 ? r[cRes] : '';
    rowToTask.set(cNum >= 0 && r[cNum] !== '' && r[cNum] != null ? Math.round(A.num(r[cNum])) : made.length + 1, t);
    made.push(t);
  });
  if (!made.length) throw L('No task was found.', "Aucune tâche n'a été trouvée.");
  var S = A.schedule(p);
  made.forEach(function (t) {
    var n = S.info.get(t.id);
    if (n.summary) { t.fixed = 0; } // summary amounts are totals of their children
    if (t._res) A.ops.setResources(t.id, String(t._res));
    String(t._pred == null ? '' : t._pred).split(/[;,]+/).forEach(function (tok) {
      var m = /^\s*(\d+)\s*(FS|SS|FF|SF|FD|DD|DF)?\s*(?:([+-])\s*([\d.,]+\s*[a-zA-Zéû]*))?\s*$/i.exec(tok); if (!m) return;
      var pr = rowToTask.get(+m[1]); if (!pr || pr === t) return;
      var type = (m[2] || 'FS').toUpperCase(); type = { FD: 'FS', DD: 'SS', DF: 'SF' }[type] || type;
      var lag = 0, lunit = 'd'; if (m[4]) { var d = A.parseDur(m[4]); if (d) { lag = d.dur * (m[3] === '-' ? -1 : 1); lunit = d.unit; } }
      var np = t.preds.concat([{ id: pr.id, type: type, lag: lag, lunit: lunit }]);
      if (!A.wouldCycle(t.id, np)) t.preds = np;
    });
    if (t._start && !t.preds.length && A.toDay(t._start) > A.toDay(p.start)) { t.ctype = 'SNET'; t.cdate = t._start; }
    delete t._pred; delete t._res; delete t._start;
  });
  return made.length;
};
A.toCSV = function (rows) {
  var sep = A.lang === 'fr' ? ';' : ',';
  return '﻿' + rows.map(function (r) {
    return r.map(function (c) { c = c == null ? '' : String(c); return /[",;\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(sep);
  }).join('\r\n');
};
A.parseCSV = function (text) {
  text = text.replace(/^﻿/, '');
  var first = text.split(/\r?\n/)[0] || '', sep = (first.split(';').length > first.split(',').length) ? ';' : (first.split('\t').length > first.split(',').length ? '\t' : ',');
  var rows = [], row = [], cur = '', q = false;
  for (var i = 0; i < text.length; i++) {
    var ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === sep) { row.push(cur); cur = ''; }
    else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (ch !== '\r') cur += ch;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows;
};

/* ---------- browser-only helpers ---------- */
A.download = function (name, data, mime) {
  var blob = data instanceof Blob ? data : new Blob([data], { type: mime || 'application/octet-stream' });
  var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
};
A.fileName = function (ext) { return (A.P.name || 'project').replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 80) + ext; };
A.pickFile = function (accept, cb, binary) {
  var inp = document.createElement('input'); inp.type = 'file'; inp.accept = accept;
  inp.onchange = function () {
    var f = inp.files[0]; if (!f) return;
    var rd = new FileReader();
    rd.onload = function () { cb(rd.result, f.name); };
    if (binary) rd.readAsArrayBuffer(f); else rd.readAsText(f);
  };
  inp.click();
};
A.exportXLSX = function () {
  var L = A.L, wb = XLSX.utils.book_new();
  function sheet(name, rows, widths) {
    var ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = rows[0].map(function (h, i) { return { wch: (widths && widths[i]) || Math.min(50, Math.max(10, String(h).length + 2)) }; });
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  }
  sheet(L('Tasks', 'Tâches'), A.tableTasks(), [5, 12, 50, 7, 12, 12, 12, 16, 30, 14, 24, 14, 10, 12, 9, 30]);
  sheet(L('Resources', 'Ressources'), A.tableResources(), [34]);
  sheet(L('Contracts', 'Contrats'), A.tableContracts(), [8, 44, 24]);
  sheet(L('Payments', 'Paiements'), A.tablePayments(), [44, 30]);
  sheet(L('Budget', 'Budget'), A.tableBudget(), [50]);
  sheet(L('Cash flow by category', 'Trésorerie par catégorie'), A.tableCashflowRows('month', 'category'), [30]);
  sheet(L('Cash flow by component', 'Trésorerie par composante'), A.tableCashflowRows('month', 'component'), [50]);
  if ((A.P.statuses || []).length) sheet(L('Earned value', 'Valeur acquise'), A.evm.table(), [14]);
  XLSX.writeFile(wb, A.fileName('.xlsx'));
};
