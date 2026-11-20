/* Project Atlas — built-in example: Azuriya Health Project (solved case study). */
var A = globalThis.A = globalThis.A || {};

A.buildAzuriya = function () {
  var L = A.L, saved = A.P;
  var p = A.newProject(L('Azuriya Health Project (IDA)', 'Projet Santé Azuriya (IDA)'));
  A.P = p;
  p.client = L('Ministry of Health, Republic of Azuriya', "Ministère de la Santé, République d'Azuriya");
  p.financier = L('World Bank (IDA)', 'Banque mondiale (IDA)');
  p.start = '2027-01-04'; p.currency = 'USD'; p.wbsPrefix = '1';
  p.categories = [
    { id: 1, name: L('Cat. 1 Construction', 'Cat. 1 Construction') },
    { id: 2, name: L('Cat. 2 Goods', 'Cat. 2 Biens') },
    { id: 3, name: L('Cat. 3 Consultants', 'Cat. 3 Consultants') },
    { id: 4, name: L('Cat. 4 Operating costs', 'Cat. 4 Fonctionnement') },
    { id: 5, name: L('Cat. 5 Unallocated', 'Cat. 5 Non alloué') }
  ];
  var MO = 20, K = {};
  function add(key, level, name, extra) { var t = A.ops.insert(null, name, level, extra); K[key] = t; return t; }
  function work(key, name, months, cost, extra) {
    var e = { dur: Math.round(months * MO), unit: months % 1 ? 'd' : 'mo', fixed: cost };
    if (extra) for (var k in extra) e[k] = extra[k];
    return add(key, 2, name, e);
  }

  add('c1', 0, L('Construction and equipping of the hospital in Mata-Bai', "Construction et équipement de l'hôpital de Mata-Bai"));
  add('c1k1', 1, L('Category 1: Construction', 'Catégorie 1 : Construction'), { cat: 1 });
  work('hosp', L('Hospital construction works', "Travaux de construction de l'hôpital"), 12, 18965450);
  add('c1k2', 1, L('Category 2: Goods', 'Catégorie 2 : Biens'), { cat: 2 });
  work('medeq', L('Medical equipment and materials', 'Équipements et matériels médicaux'), 3, 3000000);
  work('beds', L('Hospital beds', "Lits d'hôpital"), 2.75, 75000);
  work('amb', L('Ambulances (5)', 'Ambulances (5)'), 2.25, 300000);
  add('c1k3', 1, L('Category 3: Consultants', 'Catégorie 3 : Consultants'), { cat: 3 });
  work('design', L('Architectural design and CAD drawings', 'Plans architecturaux et dessins DAO'), 3, 300000);
  work('sup', L('Construction supervision', 'Supervision de la construction'), 14, 250000);

  add('c2', 0, L('Rehabilitation of 3 community health centres (HCCs)', 'Réhabilitation de 3 centres de santé communautaires (CSC)'));
  add('c2k1', 1, L('Category 1: Construction', 'Catégorie 1 : Construction'), { cat: 1 });
  var R = [['N', L('North', 'Nord')], ['E', L('East', 'Est')], ['W', L('West', 'Ouest')]];
  R.forEach(function (r) { work('ren' + r[0], L('Renovation works HCC ', 'Travaux de rénovation CSC ') + r[1], 6, 300000); });
  add('c2k2', 1, L('Category 2: Goods', 'Catégorie 2 : Biens'), { cat: 2 });
  R.forEach(function (r) { work('eq' + r[0], L('Equipment HCC ', 'Équipements CSC ') + r[1], 5, 80000); });
  add('c2k3', 1, L('Category 3: Consultants', 'Catégorie 3 : Consultants'), { cat: 3 });
  work('studies', L('Studies and plans for the renovations', 'Études et plans des rénovations'), 3, 200000);
  R.forEach(function (r) { work('sv' + r[0], L('Supervision HCC ', 'Supervision CSC ') + r[1], 8, 50000); });

  add('c3', 0, L('Project management', 'Gestion du projet'));
  add('c3k3', 1, L('Category 3: Consultants', 'Catégorie 3 : Consultants'), { cat: 3 });
  work('audit', L('External audit', 'Audit externe'), 2, 25000);
  add('c3k4', 1, L('Category 4: Operating costs', 'Catégorie 4 : Fonctionnement'), { cat: 4 });
  add('pu', 2, L('Procurement Unit', 'Unité de passation des marchés'));
  add('pmu', 2, L('Monitoring and evaluation, Project Management Unit', "Suivi-évaluation, Unité de gestion du projet"), { loe: true, rate: 90000 });

  function link(key, pkey, type, lagMonths) {
    K[key].preds.push({ id: K[pkey].id, type: type || 'FS', lag: Math.round((lagMonths || 0) * MO), lunit: 'mo' });
  }
  link('sup', 'hosp', 'SS', -1);
  link('medeq', 'hosp', 'FS', 0);
  link('beds', 'medeq', 'FS', -2);
  link('amb', 'hosp', 'FS', -1);
  link('audit', 'hosp', 'FS', 2);
  R.forEach(function (r) { link('sv' + r[0], 'ren' + r[0], 'SS', -1); link('eq' + r[0], 'ren' + r[0], 'FS', 0); });

  /* contracts: [task key, category, method, type, lead (months), mobilisation (months), start month, advance %, retention %] */
  var cal = new A.Calendar(p);
  var defs = [
    ['hosp', 'works', 'ICB', 'unit', 5, 0, null, 10, 10, 'design'],
    ['medeq', 'goods', 'ICB', 'unit', 4, 0, 21, 20, 10],
    ['beds', 'goods', 'RFQ', 'unit', 3, 0, 23, 0, 0],
    ['amb', 'goods', 'NCB', 'unit', 4, 0, 20, 20, 0],
    ['design', 'firm', 'QCBS', 'lump', 5, 0, null, 10, 0],
    ['sup', 'firm', 'QCBS', 'time', 5, 1, 6, 10, 0],
    ['renN', 'works', 'NCB', 'unit', 4, 0, null, 10, 5, 'studies'],
    ['renE', 'works', 'NCB', 'unit', 4, 0, null, 10, 5, 'studies'],
    ['renW', 'works', 'NCB', 'unit', 4, 0, null, 10, 5, 'studies'],
    ['eqN', 'goods', 'NCB', 'unit', 3, 0, 14, 20, 0],
    ['eqE', 'goods', 'NCB', 'unit', 3, 0, 14, 20, 0],
    ['eqW', 'goods', 'NCB', 'unit', 3, 0, 14, 20, 0],
    ['studies', 'firm', 'QCBS', 'lump', 4, 0, null, 10, 0],
    ['svN', 'firm', 'QCBS', 'time', 4, 1, 5, 10, 0],
    ['svE', 'firm', 'QCBS', 'time', 4, 1, 5, 10, 0],
    ['svW', 'firm', 'QCBS', 'time', 4, 1, 5, 10, 0],
    ['audit', 'firm', 'LCS', 'lump', 4, 0, null, 0, 0]
  ];
  var prefix = { works: 'W', goods: 'G', firm: 'C' }, count = { works: 0, goods: 0, firm: 0 };
  defs.forEach(function (d) {
    var t = K[d[0]], c = A.newContract(t.name);
    c.pcat = d[1]; c.method = d[2]; c.ctype = d[3]; c.lead = d[4] * MO; c.mobil = d[5] * MO;
    c.estimate = t.fixed; c.advPct = d[7]; c.retPct = d[8]; c.procParent = K.pu.id;
    c.ref = prefix[d[1]] + '-' + String(++count[d[1]]).padStart(2, '0');
    p.contracts.push(c); t.contract = c.id;
    A.generateProcurement(c);
    var first = A.procTasks(c).find(function (x) { return x.procStep === 1; });
    if (d[6] != null) { first.ctype = 'SNET'; first.cdate = A.toISO(cal.dateOf(d[6] * MO)); }
    if (d[9]) first.preds.push({ id: K[d[9]].id, type: 'FS', lag: 0, lunit: 'd' });
    K['c_' + d[0]] = c;
  });
  A.ops.addChild(K.pu.id, L('Procurement Unit operations (salaries, supplies, advertising)', "Fonctionnement de l'unité (salaires, fournitures, publicité)"));
  var puOps = p.tasks[A.blockEnd(A.taskIndex(K.pu.id)) - 1];
  puOps.loe = true; puOps.rate = 30000;
  /* procurement step groups start folded so the plan opens on the big picture */
  p.tasks.forEach(function (t) { if (t.procSum) t.collapsed = true; });

  /* project team (their cost is inside the monthly operating budgets, so rates are left at zero) */
  function res(name, group) { var r = A.newResource(name, 'work'); r.group = group; r.per = 'mo'; p.resources.push(r); return r; }
  var pmuG = L('Project Management Unit', 'Unité de gestion du projet'), puG = L('Procurement Unit', 'Unité de passation des marchés');
  [res(L('Project coordinator', 'Coordonnateur du projet'), pmuG), res(L('Monitoring and evaluation specialist', 'Spécialiste en suivi-évaluation'), pmuG),
    res(L('Financial management specialist', 'Spécialiste en gestion financière'), pmuG)]
    .forEach(function (r) { p.assignments.push({ task: K.pmu.id, res: r.id, units: 100 }); });
  [res(L('Procurement specialist', 'Spécialiste en passation des marchés'), puG), res(L('Procurement assistant', 'Assistant en passation des marchés'), puG)]
    .forEach(function (r) { p.assignments.push({ task: puOps.id, res: r.id, units: 100 }); });

  /* contract management records on the planned dates */
  A.recalc();
  p.contracts.forEach(function (c) {
    A.generatePayments(c);
    var o = A.contractInfo(c);
    if (c.pcat === 'works') {
      c.guarantees.push({ id: A.uid(), type: 'performance', amount: Math.round(o.base * 0.1), issuer: '', issued: A.toISO(o.signPlan), expiry: A.toISO(o.planEnd + 365), status: 'planned' });
      if (c.advPct) c.guarantees.push({ id: A.uid(), type: 'advance', amount: Math.round(o.base * c.advPct / 100), issuer: '', issued: A.toISO(o.signPlan), expiry: A.toISO(o.planEnd), status: 'planned' });
      c.milestones.push({ id: A.uid(), name: L('Site handover', 'Remise du site'), due: A.toISO(o.planStart), actual: '', status: 'planned' });
      c.milestones.push({ id: A.uid(), name: L('Provisional acceptance', 'Réception provisoire'), due: A.toISO(o.planEnd), actual: '', status: 'planned' });
      c.milestones.push({ id: A.uid(), name: L('Final acceptance (end of defects liability period)', 'Réception définitive (fin du délai de garantie)'), due: A.toISO(o.planEnd + 365), actual: '', status: 'planned' });
    } else if (c.pcat === 'goods') {
      c.milestones.push({ id: A.uid(), name: L('Delivery and installation accepted', 'Livraison et installation acceptées'), due: A.toISO(o.planEnd), actual: '', status: 'planned' });
    } else {
      c.milestones.push({ id: A.uid(), name: L('Final report accepted', 'Rapport final accepté'), due: A.toISO(o.planEnd), actual: '', status: 'planned' });
    }
  });
  A.setBaseline();
  A.P = saved;
  return p;
};
