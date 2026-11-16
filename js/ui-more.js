/* Project Atlas — Dashboard, Resources, Budget & cash flow, Reports, Project settings. */
var A = globalThis.A = globalThis.A || {};
(function () {
  var h = A.h, L = A.L, kpi = function () { return A.kpi.apply(null, arguments); };
  function months(days) { return A.fmtNum(days / A.P.calendar.daysPerMonth, 1).replace(/[.,]0$/, ''); }
  function cumBaseline(per) {
    var b = A.P.baseline; if (!b) return null;
    var S = A.S, cal = S.cal, out = per.map(function () { return 0; });
    S.nodes.forEach(function (n) {
      var bt = b.tasks[n.id]; if (!bt || !bt.own) return;
      var dur = bt.EF - bt.ES;
      per.forEach(function (p, j) {
        var i0 = cal.idxOf(p.d0), i1 = cal.idxOf(p.d1);
        if (dur <= 0 || n.summary) { if (bt.start >= p.d0 && bt.start < p.d1) out[j] += bt.own; }
        else { var lo = Math.max(bt.ES, i0), hi = Math.min(bt.EF, i1); if (hi > lo) out[j] += bt.own * (hi - lo) / dur; }
      });
    });
    var run = 0; return out.map(function (v) { run += v; return run; });
  }
  function sCurve(step, height) {
    var cf = A.tableCashflow(step, 'category'), per = cf.periods, labels = per.map(function (p) { return p.label; });
    var series = [{ name: L('Planned cost (current plan)', 'Coût prévu (plan actuel)'), color: A.SERIES[0], values: cf.cum }];
    var base = cumBaseline(per);
    if (base && base.some(function (v, i) { return Math.abs(v - cf.cum[i]) > 1; })) series.push({ name: L('Baseline', 'Référence'), color: A.cssVar('--muted'), values: base, dash: true });
    var pay = A.phasePayments(per), run = 0, paidCum = pay.paid.map(function (v) { run += v; return run; });
    if (run > 0) {
      var today = A.toDay(A.P.statusDate) || A.toDay(A.todayISO()), upTo = 0; per.forEach(function (p, i) { if (p.d0 <= today) upTo = i + 1; });
      series.push({ name: L('Paid to contractors', 'Payé aux titulaires'), color: A.SERIES[2], values: paidCum, upTo: upTo });
    }
    return A.lineChart({ labels: labels, series: series, height: height || 240, title: L('Cumulative cost', 'Coût cumulé') });
  }

  /* ---------- Dashboard ---------- */
  A.views.dashboard = function (root) {
    var P = A.P, S = A.S, cur = P.currency;
    if (!P.tasks.length) {
      root.appendChild(h('div.welcome',
        h('h1', L('Welcome to Project Atlas', 'Bienvenue dans Project Atlas')),
        h('p', L('Plan a project from its work breakdown structure to its Gantt chart, resources, budget, procurement plan and contracts.', "Planifier un projet depuis sa structure de découpage (WBS) jusqu'à son diagramme de Gantt, ses ressources, son budget, son plan de passation et ses contrats.")),
        h('div.welcome-actions',
          A.btn('child', L('Start with the WBS', 'Commencer par le WBS'), function () { A.go('wbs'); }, { primary: true }),
          A.btn('plus', L('Start with the task list', 'Commencer par la liste des tâches'), function () { A.go('gantt'); }),
          A.btn('book', L('Load the example: Azuriya Health Project', "Charger l'exemple : Projet Santé Azuriya"), function () { A.loadExample(); }),
          A.btn('open', L('Open a file…', 'Ouvrir un fichier…'), function () { A.fileOpen(); })),
        h('ol.steps',
          h('li', h('b', L('Project', 'Projet')), L(' — name, start date, currency, working days, expense categories.', ' — nom, date de début, devise, jours ouvrés, catégories de dépenses.')),
          h('li', h('b', 'WBS'), L(' — break the project into components and work packages. Each box is a task.', ' — découper le projet en composantes et lots de travaux. Chaque case est une tâche.')),
          h('li', h('b', 'Gantt'), L(' — durations, links, costs and resources; Atlas computes dates and the critical path.', ' — durées, liens, coûts et ressources ; Atlas calcule les dates et le chemin critique.')),
          h('li', h('b', L('Procurement and contracts', 'Passation et contrats')), L(' — methods, procurement steps, then milestones, payments, guarantees and amendments.', ' — méthodes, étapes de passation, puis jalons, paiements, garanties et avenants.')),
          h('li', h('b', L('Budget and reports', 'Budget et rapports')), L(' — budget by component and category, cash-flow plan, printable reports.', ' — budget par composante et catégorie, plan de trésorerie, rapports imprimables.')))));
      return;
    }
    var crit = S.nodes.filter(function (n) { return n.crit && !n.summary && !n.isMs; }).sort(function (a, b) { return a.ES - b.ES; }), alerts = A.allAlerts(), over = A.overallocations(S);
    var b = P.baseline, slip = b ? S.finish - b.finish : 0, dcost = b ? S.total - b.total : 0;
    var today = A.toDay(P.statusDate) || A.toDay(A.todayISO()), late = S.nodes.filter(function (n) { return !n.summary && !n.isLoe && n.pct < 100 && n.finish < today; });
    root.appendChild(h('div.kpis',
      kpi(L('Start', 'Début'), A.fmtDate(S.start), P.financier || P.client || ''),
      kpi(L('Finish', 'Fin'), A.fmtDate(S.finish), b ? (slip === 0 ? L('on baseline', 'conforme à la référence') : (slip > 0 ? '+' : '') + slip + L(' days vs baseline', ' jours / référence')) : months(S.PF) + L(' months', ' mois')),
      kpi(L('Duration', 'Durée'), months(S.PF) + L(' months', ' mois'), A.fmtNum(S.PF) + L(' working days', ' jours ouvrés')),
      kpi(L('Total cost', 'Coût total'), A.money(S.total), cur + (b && Math.abs(dcost) > 0.5 ? ' · ' + (dcost > 0 ? '+' : '') + A.money(dcost) + L(' vs baseline', ' / référence') : '')),
      kpi(L('Progress', 'Avancement'), Math.round(S.pct) + ' %', late.length ? late.length + L(' tasks late', ' tâches en retard') : L('no task late', 'aucune tâche en retard')),
      kpi(L('Contracts', 'Contrats'), String(P.contracts.length), alerts.length ? alerts.length + L(' alerts', ' alertes') : L('no alert', 'aucune alerte'))));
    var grid = h('div.dash'); root.appendChild(grid);
    grid.appendChild(h('div.card.wide', h('div.card-head', h('h2', L('Cumulative cost', 'Coût cumulé') + ' (' + cur + ')'), h('span.sp'), A.btn(null, L('Budget and cash flow', 'Budget et trésorerie'), function () { A.go('finance'); }, { ghost: true })), sCurve(A.ui.cfStep === 'month' ? 'month' : 'quarter', 230)));
    /* budget by component */
    var comps = S.nodes.filter(function (n) { return !n.parent; });
    grid.appendChild(h('div.card', h('div.card-head', h('h2', L('Components', 'Composantes'))),
      h('table.data', h('thead', h('tr', h('th', ''), h('th.r', L('Cost', 'Coût')), h('th', L('Progress', 'Avancement')))),
        h('tbody', comps.map(function (n) {
          return h('tr', h('td', n.wbs + '  ' + n.t.name), h('td.r', A.money(n.cost)), h('td', h('div.meter', { title: Math.round(n.pct) + ' %' }, h('i', { style: { width: Math.round(n.pct) + '%' } }))));
        })))));
    /* critical path */
    grid.appendChild(h('div.card', h('div.card-head', h('h2', L('Critical path', 'Chemin critique')), h('span.muted', crit.length + L(' tasks', ' tâches'))),
      crit.length ? h('ul.tasklist', crit.slice(0, 9).map(function (n) {
        return h('li', h('a', { href: '#', onclick: function (e) { e.preventDefault(); A.goToTask(n.id); } }, n.wbs + '  ' + n.t.name), h('span.muted', '  ' + A.fmtDate(n.start) + ' → ' + A.fmtDate(n.finish)));
      }), crit.length > 9 ? h('li.muted', '… +' + (crit.length - 9)) : null) : h('p.muted', L('No critical task.', 'Aucune tâche critique.'))));
    /* attention */
    var items = [];
    if (S.cycle) items.push(h('div.alert.bad', A.icon('warn'), L('Tasks depend on each other in a loop: see the Gantt.', 'Des tâches dépendent les unes des autres en boucle : voir le Gantt.')));
    S.nodes.forEach(function (n) { if (n.conflict) items.push(h('div.alert.warn', A.icon('warn'), n.wbs + ' ' + n.t.name + L(': the date constraint conflicts with its links.', ' : la contrainte de date est en conflit avec ses liens.'))); });
    alerts.slice(0, 8).forEach(function (a) { items.push(h('div.alert.' + a.level, A.icon('warn'), h('a', { href: '#', onclick: function (e) { e.preventDefault(); A.ui.contractId = a.contract.id; A.go('contracts'); } }, a.contract.ref || a.contract.title), ' — ' + a.text)); });
    over.forEach(function (o) { items.push(h('div.alert.warn', A.icon('warn'), o.res.name + L(' is over-allocated (', ' est en surcharge (') + Math.round(o.peak) + ' % ' + L('from ', 'à partir du ') + A.fmtDate(o.day) + ')')); });
    late.slice(0, 5).forEach(function (n) { items.push(h('div.alert.warn', A.icon('warn'), n.wbs + ' ' + n.t.name + L(' should have finished on ', ' aurait dû finir le ') + A.fmtDate(n.finish))); });
    grid.appendChild(h('div.card', h('div.card-head', h('h2', L('Needs attention', 'Points d’attention'))), items.length ? h('div.alerts', items) : h('p.muted', L('Nothing to report.', 'Rien à signaler.'))));
  };

  /* ---------- Resources ---------- */
  A.views.resources = function (root) {
    var P = A.P, S = A.S, ui = A.ui, cur = P.currency;
    var costOf = new Map(), countOf = new Map();
    P.assignments.forEach(function (a) {
      var n = S.info.get(a.task), r = A.resById(a.res); if (!n || !r || n.summary) return;
      costOf.set(r.id, (costOf.get(r.id) || 0) + A.assignCost(a, r, n.dur)); countOf.set(r.id, (countOf.get(r.id) || 0) + 1);
    });
    var over = A.overallocations(S), overIds = new Set(over.map(function (o) { return o.res.id; }));
    root.appendChild(h('div.card', h('div.card-head', h('h2', L('Resource sheet', 'Tableau des ressources')), h('span.muted', L('people, equipment, materials and cost items', 'personnes, équipements, matériaux et postes de coût'))),
      A.listEditor({
        id: 'res', rows: function () { return A.P.resources; },
        cols: [{ k: 'name', label: L('Name', 'Nom') },
          { k: 'type', label: L('Type', 'Type'), type: 'select', w: 130, options: [{ id: 'work', name: L('Work (people, equipment)', 'Travail (personnes, équipements)') }, { id: 'material', name: L('Material', 'Matériau') }, { id: 'cost', name: L('Cost item', 'Poste de coût') }] },
          { k: 'group', label: L('Group', 'Groupe'), w: 190 }, { k: 'max', label: L('Capacity %', 'Capacité %'), type: 'num', w: 90 },
          { k: 'rate', label: L('Rate', 'Taux') + ' (' + cur + ')', type: 'num', w: 110 },
          { k: 'per', label: L('Per', 'Par'), type: 'select', w: 100, options: [{ id: 'h', name: L('hour', 'heure') }, { id: 'd', name: L('day', 'jour') }, { id: 'w', name: L('week', 'semaine') }, { id: 'mo', name: L('month', 'mois') }] },
          { k: 'perUse', label: L('Cost per use', 'Coût par utilisation'), type: 'num', w: 120 }, { k: 'unit', label: L('Unit (materials)', 'Unité (matériaux)'), w: 110 },
          { k: 'x', label: L('Tasks', 'Tâches'), ro: true, w: 60, get: function (r) { return countOf.get(r.id) || ''; } },
          { k: 'y', label: L('Cost', 'Coût'), ro: true, w: 110, get: function (r) { return costOf.get(r.id) ? A.money(costOf.get(r.id)) : ''; } }],
        rowClass: function (r) { return overIds.has(r.id) ? '.late' : ''; },
        add: function () { return A.newResource(L('New resource', 'Nouvelle ressource'), 'work'); },
        del: function (r) { A.P.assignments = A.P.assignments.filter(function (a) { return a.res !== r.id; }); },
        addLabel: L('Add resource', 'Ajouter une ressource')
      }),
      h('p.muted', L('For work resources the rate applies to the time assigned (units % × task duration). For materials it is the price of one unit; assign a quantity. Assign resources in the Resources column of the Gantt, e.g. “Engineer[50%]; Cement[20]”.',
        'Pour les ressources de travail, le taux s’applique au temps affecté (unités % × durée de la tâche). Pour les matériaux, c’est le prix unitaire ; affecter une quantité. Affecter les ressources dans la colonne Ressources du Gantt, p. ex. « Ingénieur[50%]; Ciment[20] ».'))));
    if (over.length) root.appendChild(h('div.banner.warn', A.icon('warn'), L('Over-allocated: ', 'En surcharge : ') + over.map(function (o) { return o.res.name + ' (' + Math.round(o.peak) + ' % ' + L('from ', 'dès le ') + A.fmtDate(o.day) + ')'; }).join(' · ')));
    var work = P.resources.filter(function (r) { return r.type === 'work'; });
    if (!work.length) return;
    if (!work.some(function (r) { return r.id === ui.resId; })) ui.resId = (over[0] ? over[0].res : work[0]).id;
    var r = A.resById(ui.resId), per = A.periods(S, ui.resStep || 'month'), load = A.resourceLoad(S, r.id, per), cap = r.max || 100;
    var sel = h('select.in.sm', { onchange: function () { ui.resId = +sel.value; A.refresh(); } }, work.map(function (x) { return h('option', { value: x.id, selected: x.id === r.id }, x.name + (overIds.has(x.id) ? ' ⚠' : '')); }));
    var within = load.map(function (l) { return Math.min(l.peak, cap); }), excess = load.map(function (l) { return Math.max(0, l.peak - cap); });
    var chart = A.stackedBars({ labels: per.map(function (p) { return p.label; }), height: 220, title: L('Resource load', 'Charge de la ressource'),
      series: [{ name: L('Allocated, within capacity (%)', 'Affecté, dans la capacité (%)'), color: A.SERIES[0], values: within }, { name: L('Over capacity (%)', 'Au-delà de la capacité (%)'), color: A.SERIES[7], values: excess }] });
    var rows = P.assignments.filter(function (a) { return a.res === r.id; }).map(function (a) { return { a: a, n: S.info.get(a.task) }; }).filter(function (x) { return x.n; }).sort(function (x, y) { return x.n.ES - y.n.ES; });
    root.appendChild(h('div.card', h('div.card-head', h('h2', L('Workload', 'Plan de charge')), sel, h('span.muted', L('highest allocation in each month, capacity ', 'affectation maximale de chaque mois, capacité ') + cap + ' %')),
      chart,
      h('table.data', h('thead', h('tr', h('th', L('Task', 'Tâche')), h('th', L('Start', 'Début')), h('th', L('Finish', 'Fin')), h('th.r', L('Units', 'Unités')), h('th.r', L('Work (days)', 'Travail (jours)')))),
        h('tbody', rows.length ? rows.map(function (x) {
          return h('tr', h('td', h('a', { href: '#', onclick: function (e) { e.preventDefault(); A.goToTask(x.n.id); } }, x.n.wbs + '  ' + x.n.t.name)), h('td', A.fmtDate(x.n.start)), h('td', A.fmtDate(x.n.finish)), h('td.r', x.a.units + ' %'), h('td.r', A.fmtNum(x.n.dur * x.a.units / 100, 1)));
        }) : h('tr', h('td.empty', { colspan: 5 }, L('Not assigned to any task.', 'Affectée à aucune tâche.')))))));
  };

  /* ---------- Budget & cash flow ---------- */
  function seg(cur, opts, set) {
    return h('div.seg', opts.map(function (o) { return h('button' + (cur === o[0] ? '.on' : ''), { type: 'button', onclick: function () { set(o[0]); A.refresh(); } }, o[1]); }));
  }
  A.views.finance = function (root) {
    var P = A.P, S = A.S, ui = A.ui, cur = P.currency;
    if (!P.tasks.length) { root.appendChild(h('div.empty-state', h('h3', L('No cost yet', 'Aucun coût pour le moment')), h('p', L('Enter costs in the Cost column of the Gantt.', 'Saisir les coûts dans la colonne Coût du Gantt.')))); return; }
    root.appendChild(h('div.card', h('div.card-head', h('h2', L('Budget by component and expense category', 'Budget par composante et catégorie de dépense') + ' (' + cur + ')')),
      h('div.scroll-x', A.simpleTable(A.tableBudget(), { totalRows: 1, dash: true })),
      h('p.muted', L('A task takes the category of its nearest parent unless it has its own. Categories are defined in the Project tab.', 'Une tâche prend la catégorie de son parent le plus proche, sauf si elle a la sienne. Les catégories sont définies dans l’onglet Projet.'))));
    var cf = A.tableCashflow(ui.cfStep, ui.cfBy), labels = cf.periods.map(function (p) { return p.label; });
    var controls = h('div.tg', seg(ui.cfStep, [['month', L('Monthly', 'Mensuel')], ['quarter', L('Quarterly', 'Trimestriel')], ['year', L('Yearly', 'Annuel')]], function (v) { ui.cfStep = v; }),
      seg(ui.cfBy, [['category', L('By category', 'Par catégorie')], ['component', L('By component', 'Par composante')]], function (v) { ui.cfBy = v; }));
    root.appendChild(h('div.card', h('div.card-head', h('h2', L('Cash-flow plan', 'Plan de trésorerie') + ' (' + cur + ')'), h('span.sp'), controls),
      h('h3.ch-title', L('Planned spending per period', 'Dépenses prévues par période')),
      A.stackedBars({ labels: labels, height: 250, title: L('Planned spending per period', 'Dépenses prévues par période'), series: cf.groups.map(function (g, i) { return { name: g.label, color: A.SERIES[i % A.SERIES.length], values: g.v }; }) }),
      h('h3.ch-title', L('Cumulative', 'Cumul')),
      sCurve(ui.cfStep, 230),
      h('div.scroll-x', A.simpleTable(A.tableCashflowRows(ui.cfStep, ui.cfBy), { totalRows: 2, dash: true, cls: 'tight' })),
      h('p.muted', L('Costs are spread over each task’s working days (or placed at its start or end, as set in the task details). Contract payment schedules are managed in the Contracts tab.',
        'Les coûts sont répartis sur les jours ouvrés de chaque tâche (ou placés au début ou à la fin, selon les détails de la tâche). Les échéanciers de paiement des contrats sont gérés dans l’onglet Contrats.'))));
  };

  /* ---------- Reports ---------- */
  function dictRows() {
    var rows = [[L('Code', 'Code'), L('WBS element', 'Élément du WBS'), L('Duration', 'Durée'), L('Start', 'Début'), L('Finish', 'Fin'), L('Cost', 'Coût') + ' (' + A.P.currency + ')', L('Category', 'Catégorie'), L('Contract', 'Contrat')]];
    A.S.nodes.forEach(function (n) {
      if (n.t.proc && !n.t.procSum) return;
      var c = A.contractById(n.t.contract || n.t.proc), cat = A.catById(n.cat);
      rows.push([n.wbs, n.t.name, n.isMs ? '' : A.fmtDur(n.dur, n.t.unit), A.fmtDate(n.start), A.fmtDate(n.finish), Math.round(n.cost), cat ? cat.name : '', c ? (c.ref || '') : '']);
    });
    return rows;
  }
  A.buildReport = function () {
    var P = A.P, S = A.S, r = A.ui.report, cur = P.currency, out = h('div.report');
    function page(title, content, land) { out.appendChild(h('section.page' + (land ? '.land' : ''), h('header.rh', h('span.brand', 'Project Atlas'), h('span', P.name), h('span', A.fmtDate(P.statusDate || A.todayISO()))), h('h2', title), content)); }
    if (r.summary) {
      var crit = S.nodes.filter(function (n) { return n.crit && !n.summary && !n.isMs; }).sort(function (a, b) { return a.ES - b.ES; });
      page(L('Project summary', 'Synthèse du projet'), h('div',
        h('div.kpis', kpi(L('Start', 'Début'), A.fmtDate(S.start)), kpi(L('Finish', 'Fin'), A.fmtDate(S.finish)), kpi(L('Duration', 'Durée'), months(S.PF) + L(' months', ' mois')),
          kpi(L('Total cost', 'Coût total'), A.money(S.total), cur), kpi(L('Progress', 'Avancement'), Math.round(S.pct) + ' %'), kpi(L('Contracts', 'Contrats'), String(P.contracts.length))),
        P.client || P.financier || P.manager ? h('p', [P.client, P.financier, P.manager].filter(Boolean).join(' · ')) : null,
        h('h3', L('Critical path', 'Chemin critique')),
        A.simpleTable([[L('Code', 'Code'), L('Task', 'Tâche'), L('Duration', 'Durée'), L('Start', 'Début'), L('Finish', 'Fin')]].concat(crit.map(function (n) { return [n.wbs, n.t.name, A.fmtDur(n.dur, n.t.unit), A.fmtDate(n.start), A.fmtDate(n.finish)]; })), { num: false })));
    }
    if (r.wbs) page(L('Work breakdown structure', 'Structure de découpage du projet (WBS)'), h('div.fit', { html: A.wbsSVG({ dir: 'h', depth: A.ui.wbsDepth, cost: true, steps: false, sel: null }).svg.replace(/ width="[^"]*" height="[^"]*"/, '') }), true);
    if (r.dictionary) page(L('WBS dictionary', 'Dictionnaire du WBS'), A.simpleTable(dictRows(), { num: false, cls: 'tight' }), true);
    if (r.gantt) {
      var rows = A.visibleRows(), per = 34;
      for (var i = 0; i < rows.length; i += per)
        page(L('Gantt chart', 'Diagramme de Gantt') + (rows.length > per ? ' (' + (i / per + 1) + '/' + Math.ceil(rows.length / per) + ')' : ''), h('div.fit', { html: A.ganttSVG(rows.slice(i, i + per), { base: A.ui.showBase }) }), true);
    }
    if (r.budget) page(L('Budget by component and expense category', 'Budget par composante et catégorie de dépense') + ' (' + cur + ')', A.simpleTable(A.tableBudget(), { totalRows: 1, dash: true }));
    if (r.cashflow) {
      var cf = A.tableCashflow('quarter', 'category');
      page(L('Cash-flow plan by quarter', 'Plan de trésorerie trimestriel') + ' (' + cur + ')', h('div',
        A.stackedBars({ labels: cf.periods.map(function (p) { return p.label; }), height: 240, series: cf.groups.map(function (g, i) { return { name: g.label, color: A.SERIES[i % A.SERIES.length], values: g.v }; }) }),
        A.simpleTable(A.tableCashflowRows('quarter', 'category'), { totalRows: 2, dash: true, cls: 'tight' })), true);
    }
    if (r.procurement && P.contracts.length) {
      var name = function (list, id) { var o = list.find(function (x) { return x.id === id; }); return o ? o.name : ''; };
      page(L('Procurement plan', 'Plan de passation des marchés'), A.simpleTable([[L('Ref.', 'Réf.'), L('Contract', 'Contrat'), L('Category', 'Catégorie'), L('Estimate', 'Estimation') + ' (' + cur + ')', L('Method', 'Méthode'), L('Review', 'Revue'), L('Contract type', 'Type de contrat'), L('Launch', 'Lancement'), L('Signature', 'Signature'), L('Start', 'Début'), L('End', 'Fin')]]
        .concat(P.contracts.map(function (c) {
          var o = A.contractInfo(c);
          return [c.ref, c.title, name(A.pcats(), c.pcat), A.money(c.estimate), A.methodShort(A.effMethod(c)), A.effReview(c) === 'prior' ? L('Prior', 'A priori') : L('Post', 'A posteriori'), name(A.ctypes(), c.ctype), A.fmtDate(o.launch), c.sign ? A.fmtDate(c.sign) : A.fmtDate(o.signPlan), A.fmtDate(o.start), A.fmtDate(o.revEnd)];
        })), { num: false, cls: 'tight' }), true);
    }
    if (r.contracts && P.contracts.length) {
      var al = A.allAlerts();
      page(L('Contract status', 'Suivi des contrats') + ' (' + cur + ')', h('div', A.simpleTable([[L('Ref.', 'Réf.'), L('Contract', 'Contrat'), L('Contractor', 'Titulaire'), L('Original', 'Initial'), L('Revised', 'Révisé'), L('Paid', 'Payé'), L('Balance', 'Solde'), L('End', 'Fin'), L('Revised end', 'Fin révisée'), L('Progress', 'Avancement'), L('Status', 'Statut')]]
        .concat(P.contracts.map(function (c) {
          var o = A.contractInfo(c), st = A.cstatuses().find(function (x) { return x.id === c.status; });
          return [c.ref, c.title, c.contractor || '—', A.money(o.base), A.money(o.revised), A.money(o.paid), A.money(o.balance), A.fmtDate(o.end), A.fmtDate(o.revEnd), Math.round(o.pct) + ' %', st ? st.name : ''];
        })), { num: false, cls: 'tight' }),
        al.length ? h('div', h('h3', L('Alerts', 'Alertes')), h('ul', al.map(function (a) { return h('li', (a.contract.ref || a.contract.title) + ' — ' + a.text); }))) : null), true);
    }
    if (!out.children.length) out.appendChild(h('p.muted.pad', L('Tick at least one section.', 'Cocher au moins une section.')));
    return out;
  };
  A.views.reports = function (root) {
    var r = A.ui.report;
    var opts = [['summary', L('Project summary', 'Synthèse du projet')], ['wbs', L('WBS diagram', 'Diagramme WBS')], ['dictionary', L('WBS dictionary', 'Dictionnaire du WBS')], ['gantt', L('Gantt chart', 'Diagramme de Gantt')],
      ['budget', L('Budget', 'Budget')], ['cashflow', L('Cash-flow plan', 'Plan de trésorerie')], ['procurement', L('Procurement plan', 'Plan de passation')], ['contracts', L('Contract status', 'Suivi des contrats')]];
    root.appendChild(h('div.toolbar.noprint',
      h('div.tg', A.btn('print', L('Print or save as PDF', 'Imprimer ou enregistrer en PDF'), function () { window.print(); }, { primary: true })),
      h('div.tg', opts.map(function (o) { return h('label.chk', h('input', { type: 'checkbox', checked: r[o[0]], onchange: function (e) { r[o[0]] = e.target.checked; A.refresh(); } }), o[1]); })),
      h('div.tg', A.btn('down2', 'Excel', function () { A.exportXLSX(); }), A.btn('down2', 'CSV', function () { A.download(A.fileName('.csv'), A.toCSV(A.tableTasks()), 'text/csv'); }, { title: L('Task list as CSV', 'Liste des tâches en CSV') }))));
    root.appendChild(h('p.muted.pad.noprint', L('Preview of the printed report. The Gantt chart follows what is folded or unfolded in the Gantt tab. In the print dialog choose “Save as PDF” to get a PDF file.',
      'Aperçu du rapport imprimé. Le Gantt suit ce qui est réduit ou développé dans l’onglet Gantt. Dans la boîte d’impression, choisir « Enregistrer au format PDF » pour obtenir un fichier PDF.')));
    root.appendChild(A.buildReport());
  };

  /* ---------- Project settings ---------- */
  A.views.project = function (root) {
    var P = A.P, g = function () { return A.P; }, F = A.field;
    var I = function (k, type, opts) { return A.live(g, k, type, Object.assign({ fk: 'p:' + k }, opts || {})); };
    var C = function (k, type, opts) { return A.live(function () { return A.P.calendar; }, k, type, Object.assign({ fk: 'cal:' + k }, opts || {})); };
    var dn = A.lang === 'fr' ? ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    root.appendChild(h('div.card', h('div.card-head', h('h2', L('Project', 'Projet'))),
      h('div.form',
        h('div.cols4', F(L('Project name', 'Nom du projet'), I('name'), null, 'span2'), F(L('Start date', 'Date de début'), I('start', 'date')), F(L('Currency', 'Devise'), I('currency'))),
        h('div.cols4', F(L('Client / executing agency', 'Maître d’ouvrage / agence d’exécution'), I('client'), null, 'span2'), F(L('Financing', 'Financement'), I('financier')), F(L('Project manager', 'Chef de projet'), I('manager'))),
        h('div.cols4', F(L('Status date', 'Date d’état'), I('statusDate', 'date'), L('for progress and alerts; today if empty', 'pour l’avancement et les alertes ; aujourd’hui si vide')),
          F(L('WBS code of the project', 'Code WBS du projet'), I('wbsPrefix'), L('“1” gives 1.1, 1.2…; empty gives 1, 2…', '« 1 » donne 1.1, 1.2… ; vide donne 1, 2…')), h('div'), h('div')))));
    root.appendChild(h('div.card', h('div.card-head', h('h2', L('Working time', 'Temps de travail'))),
      h('div.form',
        h('div.field', h('span.lbl', L('Working days', 'Jours ouvrés')), h('div.days', [1, 2, 3, 4, 5, 6, 0].map(function (d) {
          return h('label.chk', h('input', { type: 'checkbox', checked: P.calendar.workDays.indexOf(d) >= 0, onchange: function (e) {
            var on = e.target.checked; A.edit(function () { var w = A.P.calendar.workDays.filter(function (x) { return x !== d; }); if (on) w.push(d); if (!w.length) return false; A.P.calendar.workDays = w.sort(); });
          } }), dn[d]);
        }))),
        h('div.cols4', F(L('Hours per day', 'Heures par jour'), C('hoursPerDay', 'num')), F(L('Days per week', 'Jours par semaine'), C('daysPerWeek', 'num'), L('1 week of duration', '1 semaine de durée')), F(L('Days per month', 'Jours par mois'), C('daysPerMonth', 'num'), L('1 month of duration = 20 working days, as in MS Project', '1 mois de durée = 20 jours ouvrés, comme dans MS Project')), h('div'))),
      h('h3', L('Holidays and non-working periods', 'Jours fériés et périodes non travaillées')),
      A.listEditor({ id: 'hol', rows: function () { return A.P.calendar.holidays; },
        cols: [{ k: 'name', label: L('Name', 'Nom') }, { k: 'from', label: L('From', 'Du'), type: 'date', w: 170 }, { k: 'to', label: L('To (included)', 'Au (inclus)'), type: 'date', w: 170 }],
        add: function () { return { name: L('Holiday', 'Jour férié'), from: A.P.start, to: A.P.start }; }, addLabel: L('Add holiday', 'Ajouter un jour férié'), empty: L('No holiday defined.', 'Aucun jour férié défini.') })));
    root.appendChild(h('div.card', h('div.card-head', h('h2', L('Expense categories', 'Catégories de dépenses')), h('span.muted', L('as in the financing agreement', 'comme dans l’accord de financement'))),
      A.listEditor({ id: 'cat', rows: function () { return A.P.categories; }, cols: [{ k: 'name', label: L('Category', 'Catégorie') }],
        add: function () { return { id: A.uid(), name: L('New category', 'Nouvelle catégorie') }; }, del: function (c) { A.P.tasks.forEach(function (t) { if (t.cat === c.id) t.cat = 0; }); }, addLabel: L('Add category', 'Ajouter une catégorie') })));
    var warn = P.calendar.daysPerWeek !== P.calendar.workDays.length;
    if (warn) root.insertBefore(h('div.banner.warn', A.icon('warn'), L('“Days per week” differs from the number of working days ticked: durations typed in weeks will not match calendar weeks.', '« Jours par semaine » diffère du nombre de jours ouvrés cochés : les durées saisies en semaines ne correspondront pas aux semaines du calendrier.')), root.children[1]);
  };
})();
