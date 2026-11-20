/* Project Atlas — procurement planning and contract management logic (no DOM). */
var A = globalThis.A = globalThis.A || {};

/* ---------- reference lists ---------- */
A.pcats = function () {
  return [
    { id: 'works', name: A.L('Works', 'Travaux') },
    { id: 'goods', name: A.L('Goods', 'Biens / fournitures') },
    { id: 'nonconsult', name: A.L('Non-consulting services', 'Services autres que consultants') },
    { id: 'firm', name: A.L('Consulting firm', 'Firme de consultants') },
    { id: 'indiv', name: A.L('Individual consultant', 'Consultant individuel') }
  ];
};
A.ctypes = function () {
  return [
    { id: 'lump', name: A.L('Lump sum', 'Forfait') },
    { id: 'unit', name: A.L('Unit prices', 'Prix unitaires') },
    { id: 'time', name: A.L('Time-based', 'Temps passé') },
    { id: 'hybrid', name: A.L('Time-based / lump sum hybrid', 'Hybride temps passé / forfait') },
    { id: 'turnkey', name: A.L('Turnkey', 'Clé en main') },
    { id: 'reimb', name: A.L('Cost reimbursable', 'Dépenses contrôlées') },
    { id: 'framework', name: A.L('Framework agreement', 'Accord-cadre') }
  ];
};
A.cstatuses = function () {
  return [
    { id: 'planned', name: A.L('Planned', 'Planifié') },
    { id: 'procurement', name: A.L('In procurement', 'En passation') },
    { id: 'signed', name: A.L('Signed', 'Signé') },
    { id: 'ongoing', name: A.L('In progress', 'En cours') },
    { id: 'completed', name: A.L('Completed', 'Terminé') },
    { id: 'terminated', name: A.L('Terminated', 'Résilié') }
  ];
};
/* procurement methods. steps: [english, french, weight, only when prior review] */
var NO = true;
var BID = [
  ['Prepare bidding documents', "Préparation du dossier d'appel d'offres", 20],
  ['No-objection on bidding documents', "Non-objection sur le dossier d'appel d'offres", 8, NO],
  ['Advertisement and bid preparation', 'Publication et préparation des offres', 32],
  ['Bid opening and evaluation', 'Ouverture et évaluation des offres', 18],
  ['No-objection on evaluation report', "Non-objection sur le rapport d'évaluation", 8, NO],
  ['Award notification and standstill', "Notification d'attribution et délai d'attente", 9],
  ['Contract preparation and signature', 'Préparation et signature du contrat', 5]
];
var RFQ = [
  ['Prepare request for quotations', 'Préparation de la demande de cotations', 25],
  ['Quotation period', 'Délai de remise des cotations', 35],
  ['Evaluation of quotations', 'Évaluation des cotations', 20],
  ['No-objection', 'Non-objection', 10, NO],
  ['Purchase order / contract signature', 'Bon de commande / signature du contrat', 10]
];
var DIRECT = [
  ['Justification and technical specifications', 'Justification et spécifications techniques', 25],
  ['No-objection on direct selection', "Non-objection sur l'entente directe", 15, NO],
  ['Invitation and proposal', 'Invitation et proposition', 25],
  ['Negotiation', 'Négociation', 20],
  ['Contract signature', 'Signature du contrat', 15]
];
var CONSULT = [
  ['Terms of reference and expressions of interest', "Termes de référence et manifestations d'intérêt", 18],
  ['Shortlist and request for proposals', 'Liste restreinte et demande de propositions', 10],
  ['No-objection on shortlist and RFP', 'Non-objection sur la liste restreinte et la DP', 7, NO],
  ['Preparation of proposals', 'Préparation des propositions', 25],
  ['Technical evaluation', 'Évaluation technique', 12],
  ['No-objection on technical evaluation', "Non-objection sur l'évaluation technique", 6, NO],
  ['Financial evaluation and combined ranking', 'Évaluation financière et classement combiné', 7],
  ['Negotiations', 'Négociations', 8],
  ['No-objection on draft contract', 'Non-objection sur le projet de contrat', 5, NO],
  ['Contract signature', 'Signature du contrat', 2]
];
var INDIV = [
  ['Terms of reference and advertisement', 'Termes de référence et publication', 30],
  ['Comparison of CVs', 'Comparaison des CV', 30],
  ['No-objection', 'Non-objection', 10, NO],
  ['Negotiation and contract signature', 'Négociation et signature du contrat', 30]
];
A.METHODS = [
  { id: 'ICB', en: 'International competitive bidding (ICB)', fr: "Appel d'offres international (AOI)", for: ['works', 'goods', 'nonconsult'], lead: 100, steps: BID },
  { id: 'NCB', en: 'National competitive bidding (NCB)', fr: "Appel d'offres national (AON)", for: ['works', 'goods', 'nonconsult'], lead: 80, steps: BID },
  { id: 'RFQ', en: 'Request for quotations / shopping', fr: 'Demande de cotations / consultation de fournisseurs', for: ['works', 'goods', 'nonconsult'], lead: 40, steps: RFQ },
  { id: 'DC', en: 'Direct contracting (DC)', fr: 'Entente directe (ED)', for: ['works', 'goods', 'nonconsult'], lead: 40, steps: DIRECT },
  { id: 'QCBS', en: 'Quality- and cost-based selection (QCBS)', fr: 'Sélection fondée sur la qualité et le coût (SFQC)', for: ['firm'], lead: 100, steps: CONSULT },
  { id: 'QBS', en: 'Quality-based selection (QBS)', fr: 'Sélection fondée sur la qualité (SFQ)', for: ['firm'], lead: 100, steps: CONSULT },
  { id: 'FBS', en: 'Fixed-budget selection (FBS)', fr: 'Sélection dans le cadre d’un budget déterminé (SBD)', for: ['firm'], lead: 90, steps: CONSULT },
  { id: 'LCS', en: 'Least-cost selection (LCS)', fr: 'Sélection au moindre coût (SMC)', for: ['firm'], lead: 80, steps: CONSULT },
  { id: 'CQS', en: "Consultants' qualifications selection (CQS)", fr: 'Sélection fondée sur les qualifications des consultants (QC)', for: ['firm'], lead: 60, steps: CONSULT },
  { id: 'SSS', en: 'Single-source selection (SSS)', fr: 'Sélection par entente directe (SED)', for: ['firm', 'indiv'], lead: 40, steps: DIRECT },
  { id: 'IC', en: 'Individual consultant selection (IC)', fr: 'Sélection de consultants individuels (CI)', for: ['indiv'], lead: 40, steps: INDIV }
];
A.methodById = function (id) { return A.METHODS.find(function (m) { return m.id === id; }) || null; };
A.methodName = function (id) { var m = A.methodById(id); return m ? A.L(m.en, m.fr) : (id || ''); };
A.methodShort = function (id) {
  if (A.lang !== 'fr') return id || '';
  return { ICB: 'AOI', NCB: 'AON', RFQ: 'DC', DC: 'ED', QCBS: 'SFQC', QBS: 'SFQ', FBS: 'SBD', LCS: 'SMC', CQS: 'QC', SSS: 'SED', IC: 'CI' }[id] || id || '';
};

/* ---------- thresholds ---------- */
A.suggestMethod = function (c) {
  var th = A.P.thresholds, v = +c.estimate || +c.amount || 0;
  if (c.pcat === 'firm') return 'QCBS';
  if (c.pcat === 'indiv') return 'IC';
  var t = c.pcat === 'works' ? th.works : th.goods;
  return v >= t.icb ? 'ICB' : v >= t.ncb ? 'NCB' : 'RFQ';
};
A.suggestReview = function (c) {
  var th = A.P.thresholds, v = +c.estimate || +c.amount || 0;
  var lim = c.pcat === 'works' ? th.works.prior : c.pcat === 'firm' ? th.firm.prior : c.pcat === 'indiv' ? th.indiv.prior : th.goods.prior;
  return v >= lim ? 'prior' : 'post';
};
A.effMethod = function (c) { return c.method || A.suggestMethod(c); };
A.effReview = function (c) { return c.review || A.suggestReview(c); };

/* ---------- procurement steps as tasks ---------- */
A.procTasks = function (c) { return A.P.tasks.filter(function (t) { return t.proc === c.id; }); };
A.contractTasks = function (c) { return A.P.tasks.filter(function (t) { return t.contract === c.id && !t.proc; }); };
/* Create (or rebuild) the procurement steps of a contract as linked tasks ending with the signature milestone.
   Must be called inside A.edit. Returns the summary task. */
A.generateProcurement = function (c) {
  var p = A.P, m = A.methodById(A.effMethod(c)); if (!m) return null;
  var prior = A.effReview(c) === 'prior';
  var old = A.procTasks(c), keep = null, place = null, oldSigId = null;
  if (old.length) {
    var first = old.find(function (t) { return t.procStep === 1; });
    if (first) keep = { ctype: first.ctype, cdate: first.cdate, preds: first.preds };
    var sig = old.find(function (t) { return t.procSig; }); if (sig) oldSigId = sig.id;
    var i0 = A.taskIndex(old[0].id);
    place = { index: i0, level: p.tasks[i0].level };
    var ids = new Set(old.map(function (t) { return t.id; }));
    p.tasks = p.tasks.filter(function (t) { return !ids.has(t.id); });
    p.tasks.forEach(function (t) { t.preds = t.preds.filter(function (l) { return !ids.has(l.id); }); });
    if (place.index > p.tasks.length) place.index = p.tasks.length;
  }
  var linked = A.contractTasks(c);
  if (!place) {
    var pi = c.procParent ? A.taskIndex(c.procParent) : -1;
    if (pi >= 0) place = { index: A.blockEnd(pi), level: p.tasks[pi].level + 1 };
    else if (linked.length) { var li = A.taskIndex(linked[0].id); place = { index: li, level: p.tasks[li].level }; }
    else place = { index: p.tasks.length, level: 0 };
  }
  var steps = m.steps.filter(function (s) { return prior || !s[3]; });
  var total = +c.lead > 0 ? Math.round(c.lead) : m.lead;
  var wsum = steps.reduce(function (a, s) { return a + s[2]; }, 0);
  var durs = steps.map(function (s) { return Math.max(1, Math.round(total * s[2] / wsum)); });
  var diff = total - durs.reduce(function (a, b) { return a + b; }, 0), k = 0;
  while (diff !== 0 && k < 500) { // make the steps add up exactly to the lead time
    var j = k % durs.length;
    if (diff > 0) { durs[j]++; diff--; } else if (durs[j] > 1) { durs[j]--; diff++; }
    k++;
  }
  var at = place.index, lv = place.level;
  var sum = A.ops.insert(at++, A.L('Procurement: ', 'Passation : ') + c.title, lv, { proc: c.id, procSum: true, cat: 0 });
  var prev = null;
  steps.forEach(function (s, i) {
    var t = A.ops.insert(at++, A.L(s[0], s[1]), lv + 1, { proc: c.id, procStep: i + 1, dur: durs[i], unit: 'd' });
    if (prev) t.preds = [{ id: prev.id, type: 'FS', lag: 0, lunit: 'd' }];
    else if (keep) { t.ctype = keep.ctype; t.cdate = keep.cdate; t.preds = keep.preds.filter(function (l) { return A.taskById(l.id); }); }
    prev = t;
  });
  var sigT = A.ops.insert(at++, A.L('Contract signed: ', 'Contrat signé : ') + c.title, lv + 1, { proc: c.id, procSig: true, ms: true, dur: 0 });
  sigT.preds = [{ id: prev.id, type: 'FS', lag: 0, lunit: 'd' }];
  /* the contract's tasks start after signature (plus mobilisation) */
  var linkedSet = new Set(linked.map(function (t) { return t.id; }));
  linked.forEach(function (t) {
    var i = A.taskIndex(t.id), parentInContract = false;
    for (var q = i - 1, l = t.level; q >= 0 && l > 0; q--) if (p.tasks[q].level < l) { l = p.tasks[q].level; if (linkedSet.has(p.tasks[q].id)) parentInContract = true; }
    if (parentInContract) return;
    t.preds = t.preds.filter(function (x) { return x.id !== oldSigId; });
    t.preds.push({ id: sigT.id, type: 'FS', lag: Math.round(+c.mobil || 0), lunit: (+c.mobil || 0) % A.P.calendar.daysPerMonth === 0 && c.mobil ? 'mo' : 'd' });
  });
  if (c.status === 'planned') c.status = 'planned';
  return sum;
};
A.removeProcurement = function (c) {
  var ids = A.procTasks(c).map(function (t) { return t.id; });
  if (ids.length) A.ops.remove(ids);
};

/* ---------- contract figures derived from the schedule and the records ---------- */
A.contractInfo = function (c) {
  var S = A.S, today = A.toDay(A.P.statusDate) || A.toDay(A.todayISO());
  var o = { c: c, planStart: null, planEnd: null, launch: null, signPlan: null, pct: 0, alerts: [] };
  var w = 0, d = 0;
  A.contractTasks(c).forEach(function (t) {
    var n = S.info.get(t.id); if (!n) return;
    if (o.planStart == null || n.start < o.planStart) o.planStart = n.start;
    if (o.planEnd == null || n.finish > o.planEnd) o.planEnd = n.finish;
    if (!n.summary) { w += n.w || 1; d += (n.w || 1) * n.pct; }
  });
  o.pct = w ? d / w : 0;
  A.procTasks(c).forEach(function (t) {
    var n = S.info.get(t.id); if (!n) return;
    if (t.procSum) o.launch = n.start;
    if (t.procSig) o.signPlan = n.start;
  });
  o.base = +c.amount || +c.estimate || 0;
  o.delta = 0; o.days = 0; o.penalties = 0; o.pendingClaims = 0;
  c.changes.forEach(function (ch) {
    if (ch.status === 'approved') {
      if (ch.type === 'penalty') o.penalties += Math.abs(+ch.amount || 0);
      else { o.delta += +ch.amount || 0; o.days += +ch.days || 0; }
    } else if (ch.status !== 'rejected') o.pendingClaims += Math.abs(+ch.amount || 0);
  });
  o.revised = o.base + o.delta;
  o.start = A.toDay(c.start) != null ? A.toDay(c.start) : o.planStart;
  var end0 = A.toDay(c.end) != null ? A.toDay(c.end) : o.planEnd;
  o.end = end0; o.revEnd = end0 != null ? end0 + o.days : null;
  o.invoiced = 0; o.paid = 0; o.scheduled = 0;
  c.payments.forEach(function (pm) {
    o.scheduled += +pm.amount || 0;
    if (pm.status === 'invoiced' || pm.status === 'paid') o.invoiced += +pm.invoiced || +pm.amount || 0;
    if (pm.status === 'paid') o.paid += +pm.paid || +pm.amount || 0;
    var due = A.toDay(pm.due);
    if (pm.status !== 'paid' && due != null && due < today)
      o.alerts.push({ level: pm.status === 'invoiced' ? 'bad' : 'warn', text: A.L('Payment overdue: ', 'Paiement en retard : ') + pm.label + ' (' + A.fmtDate(due) + ')' });
  });
  o.balance = o.revised - o.paid;
  c.milestones.forEach(function (ms) {
    var due = A.toDay(ms.due);
    if (ms.status !== 'done' && !ms.actual && due != null && due < today)
      o.alerts.push({ level: 'bad', text: A.L('Milestone overdue: ', 'Jalon en retard : ') + ms.name + ' (' + A.fmtDate(due) + ')' });
  });
  c.guarantees.forEach(function (g) {
    var ex = A.toDay(g.expiry); if (ex == null || g.status === 'released') return;
    var gname = A.guaranteeName(g.type);
    if (ex < today) o.alerts.push({ level: 'bad', text: gname + A.L(' has expired (', ' expirée (') + A.fmtDate(ex) + ')' });
    else if (ex - today <= 30) o.alerts.push({ level: 'warn', text: gname + A.L(' expires in ', ' expire dans ') + (ex - today) + A.L(' days', ' jours') });
    else if (g.type !== 'bid' && o.revEnd != null && ex < o.revEnd) o.alerts.push({ level: 'warn', text: gname + A.L(' expires before the contract end date', ' expire avant la fin du contrat') });
  });
  if (o.revEnd != null && o.revEnd < today && c.status !== 'completed' && c.status !== 'terminated' && (c.status === 'ongoing' || c.status === 'signed'))
    o.alerts.push({ level: 'bad', text: A.L('Contract end date has passed', 'La date de fin du contrat est dépassée') });
  if (o.scheduled && Math.abs(o.scheduled - o.revised) > 0.5)
    o.alerts.push({ level: 'info', text: A.L('Payment schedule differs from the revised amount by ', "L'échéancier diffère du montant révisé de ") + A.money(o.scheduled - o.revised) });
  return o;
};
A.guaranteeName = function (type) {
  return {
    bid: A.L('Bid security', 'Garantie de soumission'),
    advance: A.L('Advance payment guarantee', "Garantie de restitution d'avance"),
    performance: A.L('Performance guarantee', 'Garantie de bonne exécution'),
    retention: A.L('Retention money guarantee', 'Garantie de retenue')
  }[type] || type;
};
A.changeName = function (type) {
  return {
    amendment: A.L('Amendment', 'Avenant'),
    variation: A.L('Variation order', 'Ordre de modification'),
    extension: A.L('Extension of time', 'Prolongation de délai'),
    claim: A.L('Claim', 'Réclamation'),
    penalty: A.L('Penalty / liquidated damages', 'Pénalité de retard')
  }[type] || type;
};
/* Build a standard payment schedule: advance at start, equal interim payments, retention released at the end.
   Called inside A.edit. */
A.generatePayments = function (c, nInterim) {
  var o = A.contractInfo(c), base = o.revised;
  var start = A.toDay(c.sign) != null ? A.toDay(c.sign) : (o.signPlan != null ? o.signPlan : o.start);
  var s = o.start != null ? o.start : start, e = o.revEnd != null ? o.revEnd : s;
  if (s == null) { s = A.S.start; e = A.S.finish; start = s; }
  var adv = Math.max(0, +c.advPct || 0) / 100, ret = Math.max(0, +c.retPct || 0) / 100;
  nInterim = Math.max(1, Math.round(nInterim || Math.max(1, Math.round((e - s) / 91))));
  var list = [];
  function add(label, type, day, amount) { list.push({ id: A.uid(), label: label, type: type, due: A.toISO(Math.round(day)), amount: Math.round(amount * 100) / 100, status: 'planned', invoiced: 0, paid: 0, paidDate: '' }); }
  if (adv) add(A.L('Advance payment', 'Avance de démarrage') + ' (' + (+c.advPct) + ' %)', 'advance', start != null ? start : s, base * adv);
  var rest = base * (1 - adv - ret);
  for (var i = 1; i <= nInterim; i++)
    add(i === nInterim && !ret ? A.L('Final payment', 'Paiement final') : A.L('Interim payment ', 'Décompte ') + i, i === nInterim && !ret ? 'final' : 'interim', s + (e - s) * i / nInterim, rest / nInterim);
  if (ret) add(A.L('Release of retention', 'Libération de la retenue') + ' (' + (+c.retPct) + ' %)', 'retention', e, base * ret);
  c.payments = list;
};
/* all contract alerts of the project */
A.allAlerts = function () {
  var out = [];
  A.P.contracts.forEach(function (c) { A.contractInfo(c).alerts.forEach(function (a) { if (a.level !== 'info') out.push({ contract: c, level: a.level, text: a.text }); }); });
  return out;
};
/* payments per period, planned and paid: used for the disbursement curve */
A.phasePayments = function (periods) {
  var plan = periods.map(function () { return 0; }), paid = periods.map(function () { return 0; });
  function slot(day) { var k = -1; for (var i = 0; i < periods.length; i++) if (day >= periods[i].d0 && day < periods[i].d1) k = i; return k; }
  A.P.contracts.forEach(function (c) {
    c.payments.forEach(function (pm) {
      var d = A.toDay(pm.due), k = d != null ? slot(d) : -1;
      if (k >= 0) plan[k] += +pm.amount || 0;
      if (pm.status === 'paid') { var pd = A.toDay(pm.paidDate) != null ? A.toDay(pm.paidDate) : d, j = pd != null ? slot(pd) : -1; if (j >= 0) paid[j] += +pm.paid || +pm.amount || 0; }
    });
  });
  return { plan: plan, paid: paid };
};
