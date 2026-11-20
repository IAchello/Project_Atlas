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
  /* project definition, stakeholders, results and risks (teaching material) */
  p.definition = Object.assign(A.pm.newDefinition(), {
    problem: L('Insufficient and outdated hospital and primary care capacity in Mata-Bai and three regions; long referral distances and poor equipment.', 'Capacités hospitalières et de soins primaires insuffisantes et vétustes à Mata-Bai et dans trois régions ; longues distances de référence et équipements défaillants.'),
    goal: L('Improved health status of the population of the Mata-Bai district and the North, East and West regions.', 'Amélioration de l’état de santé de la population du district de Mata-Bai et des régions Nord, Est et Ouest.'),
    beneficiaries: L('Population of the hospital catchment area (about 450,000 people) and of the three HCC areas; health staff.', 'Population de l’aire de l’hôpital (environ 450 000 personnes) et des trois aires de CSC ; personnel de santé.'),
    scope: L('Construction and equipping of the Mata-Bai hospital; rehabilitation and equipping of three HCCs; project management, procurement and audit.', 'Construction et équipement de l’hôpital de Mata-Bai ; réhabilitation et équipement de trois CSC ; gestion du projet, passation des marchés et audit.'),
    exclusions: L('Recruitment and salaries of clinical staff; drugs and consumables; road access works.', 'Recrutement et salaires du personnel clinique ; médicaments et consommables ; travaux d’accès routier.'),
    success: L('Hospital and HCCs provisionally accepted and in service within 29 months, within the IDA credit of USD 27.9 million, with a clean external audit.', 'Hôpital et CSC réceptionnés et en service en 29 mois, dans l’enveloppe IDA de 27,9 millions USD, avec un audit externe sans réserve.'),
    constraints: L('Bank procurement thresholds and prior reviews; one rainy season per year slows civil works; single national contractor market for ICB works.', 'Seuils de passation et revues a priori de la Banque ; une saison des pluies par an ralentit les travaux ; marché national étroit pour les travaux en AOI.'),
    sponsor: p.client, version: '1.0' });
  function sh(name, kind, interests, interest, power, attitude, support, desired, actions, what, info, means, freq, owner, messages) {
    var s = A.pm.newStakeholder(name); Object.assign(s, { kind: kind, interests: interests, interest: interest, power: power, attitude: attitude, support: support, desired: desired, actions: actions, what: what, info: info, means: means, freq: freq, owner: owner, messages: messages || '' }); p.stakeholders.push(s);
  }
  sh(L('Ministry of Health (owner)', 'Ministère de la Santé (maître d’ouvrage)'), 'internal', L('Delivery within time and budget; political visibility', 'Livraison dans les délais et le budget ; visibilité politique'), 3, 3, 'fav', 2, 3, L('(+) Fast decisions and approvals · (−) Changes of priorities', '(+) Décisions et approbations rapides · (−) Changements de priorités'), L('Monthly steering committee; decisions logged', 'Comité de pilotage mensuel ; décisions consignées'), L('Progress, disbursements, risks, decisions needed', 'Avancement, décaissements, risques, décisions attendues'), L('Steering committee, dashboard', 'Comité de pilotage, tableau de bord'), L('Monthly', 'Mensuel'), L('Project coordinator', 'Coordonnateur du projet'));
  sh(L('World Bank (IDA)', 'Banque mondiale (IDA)'), 'external', L('Compliance with procurement and fiduciary rules; results', 'Respect des règles de passation et fiduciaires ; résultats'), 3, 3, 'fav', 2, 2, L('(+) Timely no-objections · (−) Suspension of disbursements', '(+) Non-objections rapides · (−) Suspension des décaissements'), L('Quality procurement documents; implementation support missions', 'Dossiers de passation de qualité ; missions d’appui'), L('Procurement plan, IFRs, audit, results indicators', 'Plan de passation, rapports financiers, audit, indicateurs'), L('Semi-annual missions, STEP, reports', 'Missions semestrielles, STEP, rapports'), L('Quarterly and per no-objection', 'Trimestriel et à chaque non-objection'), L('Project coordinator', 'Coordonnateur du projet'));
  sh(L('Regional health directorates (N, E, W)', 'Directions régionales de la santé (N, E, O)'), 'internal', L('Functional HCCs; staff involvement', 'CSC fonctionnels ; implication du personnel'), 3, 2, 'fav', 1, 2, L('(+) Site facilitation · (−) Delayed site handover', '(+) Facilitation des sites · (−) Remise tardive des sites'), L('Involve in design review and acceptance', 'Associer à la revue des plans et aux réceptions'), L('Works schedule, acceptance dates', 'Calendrier des travaux, dates de réception'), L('Site meetings, email', 'Réunions de chantier, courriel'), L('Monthly', 'Mensuel'), L('Supervision consultant', 'Consultant superviseur'));
  sh(L('Local communities and patients', 'Communautés locales et patients'), 'external', L('Access to care; jobs during works', 'Accès aux soins ; emplois pendant les travaux'), 3, 1, 'fav', 1, 2, L('(+) Mobilisation of public opinion · (−) Complaints, disruption of works', '(+) Mobilisation de l’opinion · (−) Plaintes, perturbation des travaux'), L('Information campaign via local radio; grievance mechanism', 'Campagne d’information par radio locale ; mécanisme de plaintes'), L('Project purpose, works dates, local hiring', 'Objet du projet, dates des travaux, embauche locale'), L('Local radio, community meetings', 'Radio locale, réunions communautaires'), L('At each phase', 'À chaque phase'), L('Community liaison officer', 'Chargé de liaison communautaire'));
  sh(L('Contractors and suppliers', 'Entreprises et fournisseurs'), 'external', L('Fair competition; timely payment', 'Concurrence loyale ; paiement dans les délais'), 2, 2, 'neutral', 0, 1, L('(+) Quality and schedule compliance · (−) Claims, delays', '(+) Qualité et respect des délais · (−) Réclamations, retards'), L('Clear bidding documents; pay certified invoices within 30 days', 'Dossiers d’appel d’offres clairs ; payer les décomptes certifiés sous 30 jours'), L('Procurement notices, contract milestones', 'Avis de marchés, jalons contractuels'), L('Tender notices, site meetings', 'Avis d’appel d’offres, réunions de chantier'), L('Weekly on site', 'Hebdomadaire sur site'), L('Procurement specialist', 'Spécialiste en passation'));
  sh(L('Media', 'Médias'), 'external', L('Newsworthy stories; accountability', 'Sujets d’actualité ; redevabilité'), 1, 2, 'neutral', 0, 0, L('(−) Negative coverage of delays', '(−) Couverture négative des retards'), L('Press releases at milestones; one spokesperson', 'Communiqués aux jalons ; un seul porte-parole'), L('Milestones reached', 'Jalons atteints'), L('Press releases, site visits', 'Communiqués, visites de chantier'), L('At milestones', 'Aux jalons'), L('Ministry communication unit', 'Cellule de communication du ministère'));
  sh(L('Ministry of Finance', 'Ministère des Finances'), 'internal', L('Counterpart funds; debt management', 'Fonds de contrepartie ; gestion de la dette'), 2, 3, 'neutral', 0, 1, L('(−) Late release of counterpart funds', '(−) Libération tardive des fonds de contrepartie'), L('Annual budget request submitted on time; quarterly briefings', 'Demande budgétaire annuelle déposée à temps ; points trimestriels'), L('Disbursement forecast, counterpart needs', 'Prévision de décaissement, besoins de contrepartie'), L('Briefing notes', 'Notes de synthèse'), L('Quarterly', 'Trimestriel'), L('Financial management specialist', 'Spécialiste en gestion financière'));
  var imp = A.pm.newResult('impact', L('Health status of the population of Mata-Bai district and the three regions improved', 'État de santé de la population du district de Mata-Bai et des trois régions amélioré'));
  imp.assumptions = L('Government keeps funding health staff and operating costs after the project', 'L’État continue de financer le personnel de santé et le fonctionnement après le projet'); imp.risk = 'moderate';
  imp.indicators.push(Object.assign(A.pm.newIndicator(L('Under-five mortality rate in the district', 'Taux de mortalité des moins de cinq ans dans le district')), { unit: '‰', baseline: '68', target: '55', source: L('DHS survey, HMIS', 'Enquête démographique et de santé, SNIS'), method: L('Household survey', 'Enquête auprès des ménages'), freq: L('Every 5 years', 'Tous les 5 ans'), owner: L('Ministry of Health', 'Ministère de la Santé') }));
  var out1 = A.pm.newResult('outcome', L('The population of the district uses quality hospital and primary care services', 'La population du district utilise des services hospitaliers et de soins primaires de qualité'));
  out1.assumptions = L('Clinical staff are recruited and posted by the Ministry before commissioning', 'Le personnel clinique est recruté et affecté par le Ministère avant la mise en service'); out1.risk = 'high';
  out1.indicators.push(Object.assign(A.pm.newIndicator(L('Number of outpatient consultations per year at the new hospital', 'Nombre de consultations externes par an au nouvel hôpital')), { unit: L('consultations', 'consultations'), baseline: '0', target: '120000', source: L('Hospital registers, HMIS', 'Registres de l’hôpital, SNIS'), method: L('Routine data', 'Données de routine'), freq: L('Quarterly', 'Trimestriel'), owner: L('Hospital director', 'Directeur de l’hôpital') }));
  out1.indicators.push(Object.assign(A.pm.newIndicator(L('Percentage of patients satisfied with HCC services', 'Pourcentage de patients satisfaits des services des CSC')), { unit: '%', baseline: '45', target: '80', source: L('Exit survey', 'Enquête de sortie'), method: L('Survey', 'Enquête'), freq: L('Yearly', 'Annuel'), owner: L('M&E specialist', 'Spécialiste en suivi-évaluation') }));
  p.results.push(imp, out1);
  var compOut = { c1: [L('Hospital built, equipped and provisionally accepted', 'Hôpital construit, équipé et réceptionné provisoirement'), L('Number of hospital beds installed and operational', 'Nombre de lits d’hôpital installés et opérationnels'), L('beds', 'lits'), '0', '150', L('Provisional acceptance report', 'Procès-verbal de réception provisoire')],
    c2: [L('Three HCCs rehabilitated and equipped', 'Trois CSC réhabilités et équipés'), L('Number of HCCs rehabilitated, equipped and accepted', 'Nombre de CSC réhabilités, équipés et réceptionnés'), L('HCCs', 'CSC'), '0', '3', L('Acceptance reports', 'Procès-verbaux de réception')],
    c3: [L('Project managed, procured and audited according to the financing agreement', 'Projet géré, marchés passés et audité conformément à l’accord de financement'), L('Percentage of contracts signed within the planned lead time', 'Pourcentage de contrats signés dans le délai prévu'), '%', '0', '80', L('Procurement plan (STEP)', 'Plan de passation (STEP)')] };
  ['c1', 'c2', 'c3'].forEach(function (k) {
    var r = A.pm.newResult('output', compOut[k][0]); r.task = K[k].id; r.parent = out1.id;
    r.assumptions = k === 'c1' ? L('Contractor mobilises within one month of signature; no major design change', 'L’entreprise se mobilise dans le mois suivant la signature ; pas de changement majeur de conception') : k === 'c2' ? L('Sites handed over free of occupants by the regions', 'Sites remis libres d’occupants par les régions') : L('No-objections obtained within 15 working days', 'Non-objections obtenues sous 15 jours ouvrés');
    r.risk = k === 'c1' ? 'moderate' : 'low';
    r.indicators.push(Object.assign(A.pm.newIndicator(compOut[k][1]), { unit: compOut[k][2], baseline: compOut[k][3], target: compOut[k][4], source: compOut[k][5], method: L('Document review', 'Revue documentaire'), freq: L('Quarterly', 'Trimestriel'), owner: L('M&E specialist', 'Spécialiste en suivi-évaluation') }));
    p.results.push(r);
  });
  p.kpis.push(Object.assign(A.pm.newIndicator(L('Disbursement rate of the IDA credit', 'Taux de décaissement du crédit IDA'), 'kpi'), { unit: '%', baseline: '0', target: '100', source: L('Client Connection', 'Client Connection'), freq: L('Quarterly', 'Trimestriel'), owner: L('Financial management specialist', 'Spécialiste en gestion financière'), milestones: L('M12: 15 % · M24: 70 % · M29: 100 %', 'M12 : 15 % · M24 : 70 % · M29 : 100 %') }));
  p.kpis.push(Object.assign(A.pm.newIndicator(L('Average procurement lead time, launch to signature', 'Délai moyen de passation, du lancement à la signature'), 'kpi'), { unit: L('months', 'mois'), baseline: '', target: '4', source: L('Procurement plan', 'Plan de passation'), freq: L('Per contract', 'Par contrat'), owner: L('Procurement specialist', 'Spécialiste en passation'), task: K.pu.id }));
  p.kpis.push(Object.assign(A.pm.newIndicator(L('Physical progress of the hospital works', 'Avancement physique des travaux de l’hôpital'), 'kpi'), { unit: '%', baseline: '0', target: '100', source: L('Supervision reports', 'Rapports de supervision'), freq: L('Monthly', 'Mensuel'), owner: L('Supervision consultant', 'Consultant superviseur'), task: K.hosp.id }));
  function rk(ref, kind, cat, cause, event, cons, pr, im, strat, resp, owner, trig, cost, pct, task, actions) {
    var r = A.pm.newRisk(); Object.assign(r, { ref: ref, kind: kind, category: cat, cause: cause, event: event, consequence: cons, prob: pr, impact: im, strategy: strat, response: resp, owner: owner, trigger: trig, costImpact: cost, probPct: pct, task: task || 0, review: A.toISO(A.toDay(p.start) + 90) });
    (actions || []).forEach(function (a) { var x = A.pm.newAction(a[0]); x.owner = owner; x.due = A.toISO(A.toDay(p.start) + a[1]); r.actions.push(x); }); p.risks.push(r);
  }
  rk('R01', 'threat', 'procurement', L('a single ICB attracts few qualified bidders in the country', 'un seul AOI attire peu de soumissionnaires qualifiés dans le pays'), L('the hospital works tender may fail or be delayed by 3 months', 'l’appel d’offres des travaux de l’hôpital peut échouer ou être retardé de 3 mois'), L('postpone the whole critical path and increase operating costs by USD 360,000', 'repousser tout le chemin critique et augmenter le fonctionnement de 360 000 USD'), 3, 4, 'mitigate', L('International advertising, pre-bid conference, 60-day bidding period', 'Publicité internationale, réunion préparatoire, 60 jours de soumission'), L('Procurement specialist', 'Spécialiste en passation'), L('Fewer than 3 bids received', 'Moins de 3 offres reçues'), 360000, '40', K.hosp.id, [[L('Publish the general procurement notice in UNDB and two regional newspapers', 'Publier l’avis général dans UNDB et deux journaux régionaux'), 150], [L('Hold a pre-bid conference and site visit', 'Tenir une réunion préparatoire et une visite de site'), 260]]);
  rk('R02', 'threat', 'social', L('land titles of the hospital site are contested by two families', 'les titres fonciers du site de l’hôpital sont contestés par deux familles'), L('works may be halted by a court injunction', 'les travaux peuvent être arrêtés par une injonction du tribunal'), L('stop construction for up to 6 months and trigger contractor claims', 'arrêter la construction jusqu’à 6 mois et déclencher des réclamations de l’entreprise'), 2, 5, 'avoid', L('Settle compensation and register the title before works procurement', 'Régler les compensations et enregistrer le titre avant la passation des travaux'), L('Project coordinator', 'Coordonnateur du projet'), L('Formal complaint received', 'Plainte formelle reçue'), 1000000, '15', K.hosp.id, [[L('Obtain the registered land title', 'Obtenir le titre foncier enregistré'), 120]]);
  rk('R03', 'threat', 'economic', L('medical equipment is imported and priced in euros', 'les équipements médicaux sont importés et libellés en euros'), L('the exchange rate may move against the credit currency', 'le taux de change peut évoluer défavorablement'), L('increase the equipment cost by 5 to 10 %', 'augmenter le coût des équipements de 5 à 10 %'), 3, 3, 'transfer', L('Price-adjustment clause capped at 5 %; order in one lot', 'Clause de révision plafonnée à 5 % ; commande en un lot'), L('Financial management specialist', 'Spécialiste en gestion financière'), L('Exchange rate moves by more than 5 %', 'Taux de change varie de plus de 5 %'), 250000, '30', K.medeq.id);
  rk('R04', 'threat', 'hr', L('the Ministry has not yet budgeted the hospital’s 180 clinical posts', 'le Ministère n’a pas encore budgétisé les 180 postes cliniques de l’hôpital'), L('the hospital may be completed without staff to run it', 'l’hôpital peut être achevé sans personnel pour le faire fonctionner'), L('delay the opening and the outcome by a year', 'retarder l’ouverture et l’effet d’un an'), 3, 5, 'escalate', L('Raise at the steering committee; staffing plan as a dated covenant', 'Porter au comité de pilotage ; plan de dotation comme clause datée'), L('Project coordinator', 'Coordonnateur du projet'), L('Posts absent from the next budget law', 'Postes absents de la prochaine loi de finances'), 0, '', 0, [[L('Submit the staffing plan to the Ministry of Finance', 'Soumettre le plan de dotation au Ministère des Finances'), 200]]);
  rk('R05', 'threat', 'environmental', L('the rainy season lasts from June to September', 'la saison des pluies dure de juin à septembre'), L('earthworks and foundations may be delayed', 'les terrassements et fondations peuvent être retardés'), L('extend the works by 1 to 2 months', 'prolonger les travaux de 1 à 2 mois'), 4, 2, 'mitigate', L('Schedule foundations in the dry season; drainage first', 'Programmer les fondations en saison sèche ; drainage en premier'), L('Supervision consultant', 'Consultant superviseur'), L('Works start later than November', 'Début des travaux après novembre'), 120000, '', K.hosp.id);
  rk('R06', 'opportunity', 'financial', L('a bilateral donor has shown interest in primary care', 'un bailleur bilatéral a manifesté son intérêt pour les soins primaires'), L('co-financing may be offered for two more HCCs', 'un cofinancement peut être offert pour deux CSC supplémentaires'), L('extend the project’s reach without IDA funds', 'étendre la portée du projet sans fonds IDA'), 2, 3, 'enhance', L('Prepare a costed proposal; share the HCC designs', 'Préparer une proposition chiffrée ; partager les plans des CSC'), L('Project coordinator', 'Coordonnateur du projet'), L('Donor mission scheduled', 'Mission du bailleur programmée'), 600000, '', K.c2.id);
  rk('R07', 'threat', 'procurement', L('the beds are ordered only after the medical equipment is installed', 'les lits ne sont commandés qu’après l’installation des équipements médicaux'), L('manufacture and delivery (2 months) may push the project end to M31', 'la fabrication et la livraison (2 mois) peuvent repousser la fin du projet à M31'), L('add about USD 240,000 of operating costs', 'ajouter environ 240 000 USD de fonctionnement'), 3, 2, 'avoid', L('Order the beds two months before installation', 'Commander les lits deux mois avant l’installation'), L('Procurement specialist', 'Spécialiste en passation'), L('Purchase order not issued by M26', 'Bon de commande non émis à M26'), 240000, '', K.beds.id);
  A.setBaseline();
  A.P = saved;
  return p;
};
