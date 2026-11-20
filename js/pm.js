/* Project Atlas — stakeholders, results framework and risks: data and calculations (no DOM). */
var A = globalThis.A = globalThis.A || {};
A.pm = {};

/* ---------- stakeholders ---------- */
A.pm.levels = function () { return [{ id: 3, name: A.L('High', 'Élevé') }, { id: 2, name: A.L('Medium', 'Moyen') }, { id: 1, name: A.L('Low', 'Faible') }]; };
A.pm.attitudes = function () { return [{ id: 'fav', name: A.L('Favourable', 'Favorable') }, { id: 'neutral', name: A.L('Neutral', 'Neutre') }, { id: 'unfav', name: A.L('Unfavourable', 'Défavorable') }]; };
A.pm.supportScale = function () {
  return [[-3, A.L('Strongly motivated to block', 'Fortement motivé à bloquer')], [-2, A.L('Strongly opposed', 'Fortement opposé')], [-1, A.L('Somewhat opposed', 'Plutôt opposé')], [0, A.L('Neutral', 'Neutre')],
    [1, A.L('Somewhat supportive', 'Plutôt favorable')], [2, A.L('Strongly supportive', 'Fortement favorable')], [3, A.L('Fully committed, leads the change', 'Pleinement engagé, mène le changement')]];
};
A.pm.strategies = function () {
  return [{ id: 'collaborate', name: A.L('Collaborate', 'Collaborer') }, { id: 'satisfy', name: A.L('Satisfy', 'Satisfaire') }, { id: 'inform', name: A.L('Inform', 'Informer') }, { id: 'monitor', name: A.L('Monitor', 'Surveiller') }];
};
/* PMBOK power / interest grid: high power + high interest = collaborate, high power = satisfy, high interest = inform, else monitor */
A.pm.suggestStrategy = function (s) {
  var hp = (+s.power || 2) >= 3, hi = (+s.interest || 2) >= 3;
  return hp && hi ? 'collaborate' : hp ? 'satisfy' : hi ? 'inform' : 'monitor';
};
A.pm.strategyOf = function (s) { return s.strategy || A.pm.suggestStrategy(s); };
A.pm.priorityOf = function (s) {
  var gap = Math.abs((+s.desired || 0) - (+s.support || 0)), score = (+s.power || 2) + (+s.interest || 2) + gap;
  return score >= 7 ? 3 : score >= 5 ? 2 : 1;
};
A.pm.newStakeholder = function (name) {
  return { id: A.uid(), name: name || '', kind: 'external', interests: '', interest: 2, power: 2, attitude: 'neutral', support: 0, desired: 1, actions: '', strategy: '', what: '',
    info: '', means: '', freq: '', owner: '', notes: '' };
};

/* ---------- results framework (logical framework) ---------- */
A.pm.resultLevels = function () {
  return [{ id: 'impact', name: A.L('Impact (overall objective)', 'Impact (objectif global)') }, { id: 'outcome', name: A.L('Outcome (project objective)', 'Effet (objectif du projet)') },
    { id: 'output', name: A.L('Output', 'Extrant (produit)') }, { id: 'activity', name: A.L('Inputs and activities', 'Intrants et activités') }];
};
A.pm.levelName = function (id) { var l = A.pm.resultLevels().find(function (x) { return x.id === id; }); return l ? l.name : id; };
A.pm.newResult = function (level, text) {
  return { id: A.uid(), level: level || 'output', text: text || '', parent: 0, task: 0, assumptions: '', risk: 'low', indicators: [] };
};
A.pm.newIndicator = function (text, kind) {
  return { id: A.uid(), kind: kind || 'result', text: text || '', unit: '', baseline: '', target: '', actual: '', source: '', method: '', freq: '', owner: '', task: 0, milestones: '' };
};
/* KPIs that are not attached to a result live at the project level */
A.pm.kpis = function () { return A.P.kpis || (A.P.kpis = []); };
A.pm.allIndicators = function () {
  var out = [];
  (A.P.results || []).forEach(function (r) { (r.indicators || []).forEach(function (i) { out.push({ ind: i, result: r }); }); });
  A.pm.kpis().forEach(function (i) { out.push({ ind: i, result: null }); });
  return out;
};
A.pm.newDefinition = function () {
  return { problem: '', goal: '', beneficiaries: '', scope: '', exclusions: '', success: '', constraints: '', sponsor: '', version: '', approved: '' };
};
A.pm.definition = function () { if (!A.P.definition) A.P.definition = A.pm.newDefinition(); return A.P.definition; };
/* progress of an indicator towards its target, in % (null when it cannot be computed) */
A.pm.indicatorProgress = function (ind) {
  var b = A.num(ind.baseline), t = A.num(ind.target), a = ind.actual === '' || ind.actual == null ? null : A.num(ind.actual);
  if (a == null || t === b) return null;
  return Math.max(0, Math.min(100, (a - b) / (t - b) * 100));
};
/* outputs from the WBS components: one output per top-level task, linked to it */
A.pm.resultsFromWBS = function () {
  var p = A.P, S = A.S, made = 0;
  p.results = p.results || [];
  if (!p.results.some(function (r) { return r.level === 'impact'; })) p.results.push(A.pm.newResult('impact', ''));
  var outcome = p.results.find(function (r) { return r.level === 'outcome'; });
  if (!outcome) { outcome = A.pm.newResult('outcome', ''); p.results.push(outcome); }
  S.nodes.forEach(function (n) {
    if (n.parent || n.t.proc) return;
    if (p.results.some(function (r) { return r.task === n.id; })) return;
    var r = A.pm.newResult('output', n.t.name); r.task = n.id; r.parent = outcome.id; p.results.push(r); made++;
  });
  return made;
};
A.pm.sortedResults = function () {
  var order = { impact: 0, outcome: 1, output: 2, activity: 3 };
  return (A.P.results || []).slice().sort(function (a, b) { return (order[a.level] - order[b.level]) || 0; });
};

/* ---------- risks ---------- */
A.pm.riskCategories = function () {
  return [['strategic', A.L('Strategic', 'Stratégique')], ['operational', A.L('Operational', 'Opérationnel')], ['management', A.L('Management and information', 'Gestion et information')], ['hr', A.L('Human capital / personnel', 'Capital humain / personnel')],
    ['financial', A.L('Financial', 'Financier')], ['integrity', A.L('Integrity', 'Intégrité')], ['it', A.L('Information technology', 'Technologies de l’information')], ['procurement', A.L('Procurement and contracts', 'Passation et contrats')],
    ['political', A.L('Political', 'Politique')], ['economic', A.L('Economic', 'Économique')], ['social', A.L('Sociocultural', 'Socioculturel')], ['technological', A.L('Technological', 'Technologique')],
    ['legal', A.L('Legal or regulatory', 'Juridique ou réglementaire')], ['environmental', A.L('Environmental', 'Environnemental')], ['safety', A.L('Staff safety', 'Sécurité du personnel')]].map(function (c) { return { id: c[0], name: c[1] }; });
};
A.pm.riskStrategies = function (kind) {
  return kind === 'opportunity'
    ? [{ id: 'escalate', name: A.L('Escalate', 'Escalader') }, { id: 'exploit', name: A.L('Exploit', 'Exploiter') }, { id: 'share', name: A.L('Share', 'Partager') }, { id: 'enhance', name: A.L('Enhance', 'Améliorer') }, { id: 'accept', name: A.L('Accept', 'Accepter') }]
    : [{ id: 'escalate', name: A.L('Escalate', 'Escalader') }, { id: 'avoid', name: A.L('Avoid', 'Éviter') }, { id: 'transfer', name: A.L('Transfer', 'Transférer') }, { id: 'mitigate', name: A.L('Mitigate', 'Atténuer') }, { id: 'accept', name: A.L('Accept', 'Accepter') }];
};
A.pm.riskStatuses = function () { return [{ id: 'open', name: A.L('Open', 'Ouvert') }, { id: 'monitored', name: A.L('Monitored', 'Surveillé') }, { id: 'occurred', name: A.L('Occurred (issue)', 'Survenu (problème)') }, { id: 'closed', name: A.L('Closed', 'Fermé') }]; };
A.pm.probScale = function () {
  return [[5, A.L('Very high', 'Très élevée'), '> 80 %', 0.9], [4, A.L('High', 'Élevée'), '60–80 %', 0.7], [3, A.L('Medium', 'Moyenne'), '40–60 %', 0.5], [2, A.L('Low', 'Faible'), '20–40 %', 0.3], [1, A.L('Very low', 'Très faible'), '< 20 %', 0.1]];
};
A.pm.impactScale = function () {
  return [[5, A.L('Very high', 'Très élevé'), A.L('cost > 15 %, delay > 12 months', 'coût > 15 %, retard > 12 mois')], [4, A.L('High', 'Élevé'), A.L('cost 5–15 %, delay 6–12 months', 'coût 5–15 %, retard 6–12 mois')],
    [3, A.L('Moderate', 'Modéré'), A.L('cost 2–5 %, delay 3–6 months', 'coût 2–5 %, retard 3–6 mois')], [2, A.L('Low', 'Faible'), A.L('cost 0.5–2 %, delay 1–3 months', 'coût 0,5–2 %, retard 1–3 mois')], [1, A.L('Very low', 'Très faible'), A.L('cost < 0.5 %, delay < 1 month', 'coût < 0,5 %, retard < 1 mois')]];
};
A.pm.newAction = function (text) { return { id: A.uid(), text: text || '', owner: '', due: '', status: 'planned', cost: 0, effect: '' }; };
A.pm.actionStatuses = function () { return [{ id: 'planned', name: A.L('Planned', 'Planifiée') }, { id: 'ongoing', name: A.L('In progress', 'En cours') }, { id: 'done', name: A.L('Done', 'Réalisée') }, { id: 'dropped', name: A.L('Dropped', 'Abandonnée') }]; };
A.pm.newIssue = function (fromRisk) {
  var n = (A.P.issues || []).length + 1, k = fromRisk || {};
  return { id: A.uid(), ref: 'I' + String(n).padStart(2, '0'), date: A.P.statusDate || A.todayISO(), title: k.event || '', desc: k.consequence ? A.L('Consequence: ', 'Conséquence : ') + k.consequence : '', risk: k.id || 0, task: k.task || 0,
    owner: k.owner || '', priority: 'medium', status: 'open', action: '', resolution: '', closed: '' };
};
A.pm.issuePriorities = function () { return [{ id: 'high', name: A.L('High', 'Élevée') }, { id: 'medium', name: A.L('Medium', 'Moyenne') }, { id: 'low', name: A.L('Low', 'Faible') }]; };
A.pm.issueStatuses = function () { return [{ id: 'open', name: A.L('Open', 'Ouvert') }, { id: 'ongoing', name: A.L('Being resolved', 'En résolution') }, { id: 'escalated', name: A.L('Escalated', 'Escaladé') }, { id: 'closed', name: A.L('Closed', 'Clos') }]; };
A.pm.newRisk = function () {
  var n = (A.P.risks || []).length + 1;
  return { id: A.uid(), ref: 'R' + String(n).padStart(2, '0'), kind: 'threat', category: 'operational', cause: '', event: '', consequence: '', prob: 3, impact: 3, probPct: '',
    costImpact: 0, strategy: 'mitigate', response: '', owner: '', trigger: '', contingency: '', residualProb: 0, residualImpact: 0, status: 'open', task: 0, review: '', notes: '', actions: [] };
};
A.pm.score = function (p, i) { return (+p || 0) * (+i || 0); };
/* score bands of the P x I matrix: very low 1-2, low 3-4, moderate 5-8, high 9-12, very high 15-25 */
A.pm.band = function (score) { return score >= 15 ? 'vh' : score >= 9 ? 'h' : score >= 5 ? 'm' : score >= 3 ? 'l' : score >= 1 ? 'vl' : ''; };
A.pm.bandName = function (b) { return { vh: A.L('Very high', 'Très élevé'), h: A.L('High', 'Élevé'), m: A.L('Moderate', 'Modéré'), l: A.L('Low', 'Faible'), vl: A.L('Very low', 'Très faible') }[b] || ''; };
A.pm.bandAction = function (b) {
  return { vh: A.L('Eliminate or reduce before the project starts; escalate if needed', 'Éliminer ou réduire avant le démarrage ; escalader si nécessaire'), h: A.L('Immediate mitigation action required', 'Action d’atténuation immédiate requise'),
    m: A.L('Proactive management', 'Gestion proactive'), l: A.L('Focused monitoring', 'Surveillance ciblée'), vl: A.L('No immediate action, keep on the watch list', 'Pas d’action immédiate, garder sur la liste de veille') }[b] || '';
};
A.pm.riskStatement = function (r) {
  var parts = [];
  if (r.cause) parts.push(A.L('Because ', 'Parce que ') + r.cause);
  if (r.event) parts.push((parts.length ? ', ' : '') + r.event);
  if (r.consequence) parts.push(A.L(', which would ', ', ce qui ') + r.consequence);
  return parts.join('') || A.L('(risk not described)', '(risque non décrit)');
};
/* expected monetary value: probability (% typed, else the scale's mid-point) x cost impact; opportunities count negative */
A.pm.emv = function (r) {
  var pct = r.probPct !== '' && r.probPct != null ? A.num(r.probPct) / 100 : (A.pm.probScale().find(function (s) { return s[0] === +r.prob; }) || [0, 0, 0, 0.5])[3];
  var v = pct * (+r.costImpact || 0);
  return r.kind === 'opportunity' ? -v : v;
};
A.pm.riskSummary = function () {
  var rs = (A.P.risks || []), out = { total: rs.length, open: 0, byBand: { vh: 0, h: 0, m: 0, l: 0, vl: 0 }, reserve: 0, threats: 0, opps: 0, overdue: 0 };
  var today = A.toDay(A.P.statusDate) || A.toDay(A.todayISO());
  out.actions = 0; out.actionsLate = 0; out.issuesOpen = (A.P.issues || []).filter(function (i) { return i.status !== 'closed'; }).length;
  rs.forEach(function (r) {
    (r.actions || []).forEach(function (a) { if (a.status === 'planned' || a.status === 'ongoing') { out.actions++; if (a.due && A.toDay(a.due) < today) out.actionsLate++; } });
    var active = r.status !== 'closed';
    if (active) { out.open++; out.byBand[A.pm.band(A.pm.score(r.prob, r.impact))]++; out.reserve += A.pm.emv(r); if (r.kind === 'opportunity') out.opps++; else out.threats++; }
    if (active && r.review && A.toDay(r.review) < today) out.overdue++;
  });
  return out;
};
/* risks seeded from the results framework: every assumption that could prove false is a risk */
A.pm.risksFromAssumptions = function () {
  var p = A.P, made = 0; p.risks = p.risks || [];
  (p.results || []).forEach(function (r) {
    if (!r.assumptions || p.risks.some(function (k) { return k.fromResult === r.id; })) return;
    var k = A.pm.newRisk(); k.cause = A.L('the assumption “', 'l’hypothèse « ') + r.assumptions + A.L('” may not hold', ' » peut ne pas se vérifier'); k.event = A.L('the expected result is not achieved', 'le résultat attendu n’est pas atteint');
    k.consequence = A.L('affect: ', 'affecter : ') + (r.text || A.pm.levelName(r.level)); k.fromResult = r.id; k.task = r.task || 0; k.category = 'strategic';
    k.prob = r.risk === 'high' ? 4 : r.risk === 'moderate' ? 3 : 2; k.impact = r.level === 'impact' ? 5 : r.level === 'outcome' ? 4 : 3;
    p.risks.push(k); made++;
  });
  return made;
};
A.pm.tables = function () {
  var L = A.L, P = A.P, out = {};
  var name = function (list, id) { var o = list.find(function (x) { return x.id === id; }); return o ? o.name : ''; };
  out.stakeholders = [[L('Stakeholder', 'Partie prenante'), L('Internal / external', 'Interne / externe'), L('Interests / expectations', 'Intérêts / attentes'), L('Interest', 'Intérêt'), L('Power', 'Pouvoir'), L('Attitude', 'Attitude'),
    L('Current support', 'Soutien actuel'), L('Desired support', 'Soutien souhaité'), L('Gap', 'Écart'), L('Potential actions', 'Actions potentielles'), L('Strategy', 'Stratégie'), L('What we can do', 'Ce que nous pouvons faire'), L('Priority', 'Priorité'),
    L('Information needs', 'Besoins d’information'), L('Means', 'Moyens'), L('Frequency', 'Fréquence'), L('Person in charge', 'Responsable')]]
    .concat((P.stakeholders || []).map(function (s) {
      return [s.name, s.kind === 'internal' ? L('Internal', 'Interne') : L('External', 'Externe'), s.interests, name(A.pm.levels(), +s.interest), name(A.pm.levels(), +s.power), name(A.pm.attitudes(), s.attitude), s.support, s.desired, (+s.desired || 0) - (+s.support || 0),
        s.actions, name(A.pm.strategies(), A.pm.strategyOf(s)), s.what, name(A.pm.levels(), A.pm.priorityOf(s)), s.info, s.means, s.freq, s.owner];
    }));
  out.results = [[L('Level', 'Niveau'), L('Expected result', 'Résultat attendu'), L('WBS element', 'Élément du WBS'), L('Indicator', 'Indicateur'), L('Unit', 'Unité'), L('Baseline', 'Base'), L('Target', 'Cible'), L('Actual', 'Réel'), L('Progress %', 'Progrès %'),
    L('Data source / means of verification', 'Source / moyen de vérification'), L('Collection method', 'Méthode de collecte'), L('Frequency', 'Fréquence'), L('Responsibility', 'Responsable'), L('Critical assumptions', 'Hypothèses critiques')]];
  A.pm.sortedResults().forEach(function (r) {
    var n = r.task ? A.S.info.get(r.task) : null, wbs = n ? n.wbs + ' ' + n.t.name : '';
    if (!r.indicators.length) out.results.push([A.pm.levelName(r.level), r.text, wbs, '', '', '', '', '', '', '', '', '', '', r.assumptions]);
    r.indicators.forEach(function (i, k) { var pr = A.pm.indicatorProgress(i); out.results.push([k ? '' : A.pm.levelName(r.level), k ? '' : r.text, k ? '' : wbs, i.text, i.unit, i.baseline, i.target, i.actual, pr == null ? '' : Math.round(pr), i.source, i.method, i.freq, i.owner, k ? '' : r.assumptions]); });
  });
  out.actions = [[L('Risk', 'Risque'), L('Action', 'Action'), L('Owner', 'Responsable'), L('Due', 'Échéance'), L('Status', 'Statut'), L('Cost', 'Coût'), L('Effect observed', 'Effet constaté')]];
  (P.risks || []).forEach(function (r) { (r.actions || []).forEach(function (a) { out.actions.push([r.ref + ' ' + (r.event || ''), a.text, a.owner, a.due, name(A.pm.actionStatuses(), a.status), +a.cost || 0, a.effect]); }); });
  out.issues = [[L('ID', 'ID'), L('Date', 'Date'), L('Issue', 'Problème'), L('Description', 'Description'), L('From risk', 'Issu du risque'), L('WBS element', 'Élément du WBS'), L('Owner', 'Responsable'), L('Priority', 'Priorité'), L('Status', 'Statut'), L('Action', 'Action'), L('Resolution', 'Résolution'), L('Closed on', 'Clos le')]]
    .concat((P.issues || []).map(function (i) {
      var r = (P.risks || []).find(function (k) { return k.id === i.risk; }), n = i.task ? A.S.info.get(i.task) : null;
      return [i.ref, i.date, i.title, i.desc, r ? r.ref : '', n ? n.wbs + ' ' + n.t.name : '', i.owner, name(A.pm.issuePriorities(), i.priority), name(A.pm.issueStatuses(), i.status), i.action, i.resolution, i.closed];
    }));
  out.kpis = [[L('KPI', 'KPI'), L('Unit', 'Unité'), L('Baseline', 'Base'), L('Target', 'Cible'), L('Actual', 'Réel'), L('Progress %', 'Progrès %'), L('WBS element', 'Élément du WBS'), L('Data source', 'Source'), L('Frequency', 'Fréquence'), L('Responsibility', 'Responsable')]]
    .concat(A.pm.kpis().map(function (i) { var n = i.task ? A.S.info.get(i.task) : null, pr = A.pm.indicatorProgress(i); return [i.text, i.unit, i.baseline, i.target, i.actual, pr == null ? '' : Math.round(pr), n ? n.wbs + ' ' + n.t.name : '', i.source, i.freq, i.owner]; }));
  out.risks = [[L('ID', 'ID'), L('Type', 'Type'), L('Category', 'Catégorie'), L('Risk (cause → event → consequence)', 'Risque (cause → événement → conséquence)'), 'P', 'I', L('Score', 'Score'), L('Level', 'Niveau'), L('Strategy', 'Stratégie'), L('Response', 'Réponse'),
    L('Owner', 'Responsable'), L('Trigger', 'Déclencheur'), L('Cost impact', 'Impact financier'), L('Probability %', 'Probabilité %'), L('EMV', 'VMA'), L('Residual P', 'P résiduelle'), L('Residual I', 'I résiduel'), L('WBS element', 'Élément du WBS'), L('Status', 'Statut'), L('Next review', 'Prochaine revue')]]
    .concat((P.risks || []).map(function (r) {
      var n = r.task ? A.S.info.get(r.task) : null, sc = A.pm.score(r.prob, r.impact);
      return [r.ref, r.kind === 'opportunity' ? L('Opportunity', 'Opportunité') : L('Threat', 'Menace'), name(A.pm.riskCategories(), r.category), A.pm.riskStatement(r), +r.prob, +r.impact, sc, A.pm.bandName(A.pm.band(sc)), name(A.pm.riskStrategies(r.kind), r.strategy), r.response,
        r.owner, r.trigger, +r.costImpact || 0, r.probPct, Math.round(A.pm.emv(r)), +r.residualProb || '', +r.residualImpact || '', n ? n.wbs + ' ' + n.t.name : '', name(A.pm.riskStatuses(), r.status), r.review];
    }));
  return out;
};
