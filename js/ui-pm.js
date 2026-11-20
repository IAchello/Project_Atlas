/* Project Atlas — Stakeholders, Results framework and Risks screens. */
var A = globalThis.A = globalThis.A || {};
(function () {
  var h = A.h, L = A.L;
  function nameOf(list, id) { var o = list.find(function (x) { return x.id === id; }); return o ? o.name : ''; }
  function lv(list, i, k, type, opts) { return A.live(function () { return list()[i]; }, k, type, Object.assign({ fk: opts && opts.fk }, opts || {})); }
  function wbsOptions(withNone) {
    var o = A.S.nodes.filter(function (n) { return !n.t.proc; }).map(function (n) { return { id: n.id, name: n.wbs + '  ' + n.t.name }; });
    return withNone === false ? o : [{ id: 0, name: '—' }].concat(o);
  }
  function taskLink(id) {
    var n = id ? A.S.info.get(id) : null; if (!n) return h('span.muted', '—');
    return h('a', { href: '#', title: A.fmtDate(n.start) + ' → ' + A.fmtDate(n.finish) + ' · ' + Math.round(n.pct) + ' %', onclick: function (e) { e.preventDefault(); A.goToTask(id); } }, n.wbs + ' ' + n.t.name);
  }
  function area(get, k, fk, rows) { var el = A.live(get, k, 'area', { fk: fk, rows: rows || 2 }); el.rows = rows || 2; return el; }
  function emptyState(title, text, btn) { return h('div.empty-state', h('h3', title), h('p', text), btn || null); }

  /* ===================== Stakeholders ===================== */
  A.views.stakeholders = function (root) {
    var P = A.P, ui = A.ui; P.stakeholders = P.stakeholders || [];
    ui.shTab = ui.shTab || 'register';
    var tabs = [['register', L('Analysis grid', 'Grille d’analyse')], ['matrix', L('Power / interest matrix', 'Matrice pouvoir / intérêt')], ['advocacy', L('Engagement & advocacy', 'Engagement et plaidoyer')], ['comm', L('Communication plan', 'Plan de communication')]];
    root.appendChild(h('div.toolbar',
      h('div.tg', A.btn('plus', L('Stakeholder', 'Partie prenante'), function () {
        var s; A.edit(function () { s = A.pm.newStakeholder(L('New stakeholder', 'Nouvelle partie prenante')); A.P.stakeholders.push(s); });
        ui.shTab = 'register'; ui.shEdit = s.id; A.refresh();
      }, { primary: true })),
      h('div.seg', tabs.map(function (t) { return h('button' + (ui.shTab === t[0] ? '.on' : ''), { type: 'button', onclick: function () { ui.shTab = t[0]; A.refresh(); } }, t[1]); })),
      h('div.tg.muted', P.stakeholders.length + L(' stakeholders', ' parties prenantes'))));
    if (!P.stakeholders.length) {
      root.appendChild(emptyState(L('No stakeholder yet', 'Aucune partie prenante'), L('List the people, groups and institutions that affect the project or are affected by it. Atlas places them on the power / interest matrix, suggests an engagement strategy and builds the communication plan.',
        'Lister les personnes, groupes et institutions qui influencent le projet ou sont touchés par lui. Atlas les place sur la matrice pouvoir / intérêt, propose une stratégie d’engagement et construit le plan de communication.')));
      return;
    }
    var get = function () { return A.P.stakeholders; };
    if (ui.shTab === 'register') {
      var lvls = A.pm.levels(), atts = A.pm.attitudes(), strats = [{ id: '', name: L('Auto (from the matrix)', 'Auto (selon la matrice)') }].concat(A.pm.strategies());
      var supportOpts = A.pm.supportScale().map(function (x) { return { id: x[0], name: (x[0] > 0 ? '+' : '') + x[0] + '  ' + x[1] }; });
      var table = h('table.list.pm');
      table.appendChild(h('thead', h('tr', [[L('Stakeholder', 'Partie prenante'), 200], [L('Type', 'Type'), 100], [L('Interests / expectations', 'Intérêts / attentes'), 220], [L('Interest', 'Intérêt'), 90], [L('Power', 'Pouvoir'), 90], [L('Attitude', 'Attitude'), 110],
        [L('Support now', 'Soutien actuel'), 170], [L('Desired', 'Souhaité'), 170], [L('Gap', 'Écart'), 50], [L('Potential actions (+ / −)', 'Actions potentielles (+ / −)'), 220], [L('Strategy', 'Stratégie'), 150], [L('What we can do', 'Ce que nous pouvons faire'), 220], [L('Priority', 'Priorité'), 80], ['', 40]]
        .map(function (c) { return h('th', { style: { width: c[1] + 'px' } }, c[0]); }))));
      var tb = h('tbody');
      P.stakeholders.forEach(function (s, i) {
        var fk = 'sh' + s.id + ':', gap = (+s.desired || 0) - (+s.support || 0), pr = A.pm.priorityOf(s), st = A.pm.strategyOf(s);
        tb.appendChild(h('tr' + (ui.shEdit === s.id ? '.hl' : ''),
          h('td', lv(get, i, 'name', 'text', { fk: fk + 'name' })),
          h('td', lv(get, i, 'kind', 'select', { fk: fk + 'kind', options: [{ id: 'internal', name: L('Internal', 'Interne') }, { id: 'external', name: L('External', 'Externe') }] })),
          h('td', area(function () { return get()[i]; }, 'interests', fk + 'interests')),
          h('td', lv(get, i, 'interest', 'select', { fk: fk + 'interest', options: lvls })), h('td', lv(get, i, 'power', 'select', { fk: fk + 'power', options: lvls })),
          h('td', lv(get, i, 'attitude', 'select', { fk: fk + 'attitude', options: atts })),
          h('td', lv(get, i, 'support', 'select', { fk: fk + 'support', options: supportOpts })), h('td', lv(get, i, 'desired', 'select', { fk: fk + 'desired', options: supportOpts })),
          h('td.r' + (gap > 1 ? '.warn' : ''), (gap > 0 ? '+' : '') + gap),
          h('td', area(function () { return get()[i]; }, 'actions', fk + 'actions')),
          h('td', lv(get, i, 'strategy', 'select', { fk: fk + 'strategy', options: strats.map(function (o) { return o.id ? o : { id: '', name: L('Auto: ', 'Auto : ') + nameOf(A.pm.strategies(), A.pm.suggestStrategy(s)) }; }) })),
          h('td', area(function () { return get()[i]; }, 'what', fk + 'what')),
          h('td', h('span.pill.prio' + pr, nameOf(lvls, pr))),
          h('td.act', A.btn('trash', L('Delete', 'Supprimer'), function () { A.edit(function () { A.P.stakeholders.splice(i, 1); }); }, { iconOnly: true, ghost: true }))));
      });
      table.appendChild(tb);
      root.appendChild(h('div.card.flush', h('div.scroll-x', table)));
      root.appendChild(h('p.muted.pad', L('Support scale from −3 (strongly motivated to block) to +3 (fully committed). Strategy follows the PMBOK grid: high power and high interest → collaborate; high power → satisfy; high interest → inform; otherwise monitor. Priority combines power, interest and the gap between desired and current support.',
        'Échelle de soutien de −3 (fortement motivé à bloquer) à +3 (pleinement engagé). La stratégie suit la grille PMBOK : pouvoir et intérêt élevés → collaborer ; pouvoir élevé → satisfaire ; intérêt élevé → informer ; sinon surveiller. La priorité combine pouvoir, intérêt et écart entre soutien souhaité et actuel.')));
    } else if (ui.shTab === 'matrix') {
      root.appendChild(h('div.card', h('div.card-head', h('h2', L('Power / interest matrix', 'Matrice pouvoir / intérêt')), h('span.muted', L('green = favourable, grey = neutral, red = unfavourable; the number is the row in the grid', 'vert = favorable, gris = neutre, rouge = défavorable ; le numéro est la ligne de la grille'))),
        h('div', { html: A.stakeholderMatrixSVG() }),
        h('ol.sh-legend', P.stakeholders.map(function (s) { return h('li', s.name, h('span.muted', ' · ' + nameOf(A.pm.strategies(), A.pm.strategyOf(s)))); }))));
    } else if (ui.shTab === 'advocacy') {
      root.appendChild(h('p.muted.pad', L('One sheet per stakeholder: where they stand, where the project needs them, and the arguments and actions to move them. Printable from the Reports tab.', 'Une fiche par partie prenante : sa position, celle dont le projet a besoin, et les arguments et actions pour la faire évoluer. Imprimable depuis l’onglet Rapports.')));
      root.appendChild(h('div.adv', P.stakeholders.map(function (s, i) { return A.advocacyCard(s, i, true); })));
    } else {
      var table2 = h('table.list.pm');
      table2.appendChild(h('thead', h('tr', [[L('Who?', 'Qui ?'), 200], [L('Management approach', 'Approche de gestion'), 130], [L('What? Information needs', 'Quoi ? Besoins d’information'), 260], [L('How? Means', 'Comment ? Moyens'), 220], [L('When? Frequency', 'Quand ? Fréquence'), 140], [L('Who is in charge?', 'Qui en est responsable ?'), 180]]
        .map(function (c) { return h('th', { style: { width: c[1] + 'px' } }, c[0]); }))));
      var tb2 = h('tbody');
      P.stakeholders.forEach(function (s, i) {
        var fk = 'shc' + s.id + ':';
        tb2.appendChild(h('tr', h('td.b', s.name), h('td', nameOf(A.pm.strategies(), A.pm.strategyOf(s))),
          h('td', area(function () { return get()[i]; }, 'info', fk + 'info')), h('td', area(function () { return get()[i]; }, 'means', fk + 'means')),
          h('td', lv(get, i, 'freq', 'text', { fk: fk + 'freq', placeholder: L('monthly, at each phase…', 'mensuel, à chaque phase…') })), h('td', lv(get, i, 'owner', 'text', { fk: fk + 'owner' }))));
      });
      table2.appendChild(tb2);
      root.appendChild(h('div.card.flush', h('div.scroll-x', table2)));
    }
  };
  /* engagement sheet of one stakeholder (editable on screen, static in reports) */
  A.advocacyCard = function (s, i, editable) {
    var get = function () { return A.P.stakeholders; }, fk = 'adv' + s.id + ':', cur = +s.support || 0, want = +s.desired || 0;
    var seg = h('span.seg7', A.pm.supportScale().map(function (x) { var v = x[0]; return h('i' + (v === cur && v === want ? '.both' : v === cur ? '.cur' : v === want ? '.want' : ''), { title: (v > 0 ? '+' : '') + v + ' ' + x[1] }); }));
    var pos = h('div.pos', h('span.small', '−3'), seg, h('span.small', '+3'), h('span.muted.small', '  ' + L('now ', 'actuel ') + (cur > 0 ? '+' : '') + cur + ' → ' + L('desired ', 'souhaité ') + (want > 0 ? '+' : '') + want));
    var f = function (label, k, rows) { return h('div.field', h('span.lbl', label), editable ? area(function () { return get()[i]; }, k, fk + k, rows || 2) : h('div', s[k] || h('span.muted', '—'))); };
    return h('div.card', h('div.card-head', h('h2', s.name), h('span.pill.prio' + A.pm.priorityOf(s), nameOf(A.pm.levels(), A.pm.priorityOf(s))), h('span.muted', nameOf(A.pm.strategies(), A.pm.strategyOf(s)))),
      pos,
      h('div.small.muted', L('Interest ', 'Intérêt ') + nameOf(A.pm.levels(), +s.interest) + ' · ' + L('power ', 'pouvoir ') + nameOf(A.pm.levels(), +s.power) + ' · ' + nameOf(A.pm.attitudes(), s.attitude)),
      f(L('Their interests and expectations', 'Ses intérêts et attentes'), 'interests'), f(L('What they could do for or against the project', 'Ce qu’elle pourrait faire pour ou contre le projet'), 'actions'),
      f(L('Key messages and arguments', 'Messages clés et arguments'), 'messages'), f(L('Engagement actions (what we can do)', 'Actions d’engagement (ce que nous pouvons faire)'), 'what'),
      h('div.cols3', h('div.field', h('span.lbl', L('Led by', 'Mené par')), editable ? lv(get, i, 'owner', 'text', { fk: fk + 'owner' }) : h('div', s.owner || '—')),
        h('div.field', h('span.lbl', L('By when', 'Pour quand')), editable ? lv(get, i, 'deadline', 'date', { fk: fk + 'deadline' }) : h('div', A.fmtDate(s.deadline) || '—')),
        h('div.field', h('span.lbl', L('Position', 'Position')), editable ? lv(get, i, 'confirmed', 'select', { fk: fk + 'confirmed', options: [{ id: 'assumed', name: L('Assumed', 'Présumée') }, { id: 'confirmed', name: L('Confirmed through engagement', 'Confirmée par l’échange') }] }) : h('div', s.confirmed === 'confirmed' ? L('Confirmed', 'Confirmée') : L('Assumed', 'Présumée')))));
  };
  A.stakeholderMatrixSVG = function () {
    var W = 760, H = 460, m = { l: 70, r: 20, t: 20, b: 50 }, pw = W - m.l - m.r, ph = H - m.t - m.b, s = '';
    var X = function (v) { return m.l + (v - 0.5) / 3 * pw; }, Y = function (v) { return m.t + ph - (v - 0.5) / 3 * ph; };
    var ink = A.cssVar('--text'), muted = A.cssVar('--muted');
    s += '<svg viewBox="0 0 ' + W + ' ' + H + '" class="sh-matrix" role="img">';
    var quads = [[X(2), m.t, L('INFORM', 'INFORMER'), L('communicate project progress', 'communiquer l’avancement')], [X(2), m.t, '', ''], [m.l, Y(2), L('MONITOR', 'SURVEILLER'), L('minimum effort', 'effort minimum')], [X(2), Y(2), L('SATISFY', 'SATISFAIRE'), L('make sure their needs are met', 's’assurer que leurs besoins sont satisfaits')]];
    var boxes = [[m.l, m.t, L('INFORM', 'INFORMER'), L('communicate project progress', 'communiquer l’avancement')], [X(2), m.t, L('COLLABORATE', 'COLLABORER'), L('maximum effort: involve them', 'effort maximum : les impliquer')],
      [m.l, Y(2), L('MONITOR', 'SURVEILLER'), L('minimum effort', 'effort minimum')], [X(2), Y(2), L('SATISFY', 'SATISFAIRE'), L('make sure their needs are met', 's’assurer que leurs besoins sont satisfaits')]];
    boxes.forEach(function (b, i) {
      s += '<rect x="' + (b[0] + 3) + '" y="' + (b[1] + 3) + '" width="' + (pw / 2 - 6) + '" height="' + (ph / 2 - 6) + '" rx="14" fill="' + (i === 1 ? '#dbe7f6' : '#e9edf2') + '"/>';
      s += '<text x="' + (b[0] + 14) + '" y="' + (b[1] + 26) + '" font-size="15" font-weight="700" fill="' + A.cssVar('--navy') + '">' + A.esc(b[2]) + '</text><text x="' + (b[0] + 14) + '" y="' + (b[1] + 44) + '" font-size="11" fill="' + muted + '">' + A.esc(b[3]) + '</text>';
    });
    s += '<text x="' + (m.l + pw / 4) + '" y="' + (H - 14) + '" text-anchor="middle" font-size="12" fill="' + ink + '">' + A.esc(L('Low power / influence', 'Pouvoir / influence faible')) + '</text><text x="' + (m.l + pw * 3 / 4) + '" y="' + (H - 14) + '" text-anchor="middle" font-size="12" fill="' + ink + '">' + A.esc(L('High power / influence', 'Pouvoir / influence élevé')) + '</text>';
    s += '<text transform="translate(22,' + (m.t + ph / 4) + ') rotate(-90)" text-anchor="middle" font-size="12" fill="' + ink + '">' + A.esc(L('High interest', 'Intérêt élevé')) + '</text><text transform="translate(22,' + (m.t + ph * 3 / 4) + ') rotate(-90)" text-anchor="middle" font-size="12" fill="' + ink + '">' + A.esc(L('Low interest', 'Intérêt faible')) + '</text>';
    /* dots: jitter stakeholders that share a cell so that they stay visible */
    var seen = {};
    A.P.stakeholders.forEach(function (st, i) {
      var key = st.power + '/' + st.interest, k = seen[key] = (seen[key] || 0) + 1;
      var cx = X(+st.power || 2) + ((k - 1) % 4) * 30 - 45, cy = Y(+st.interest || 2) + Math.floor((k - 1) / 4) * 30 - 10;
      var col = st.attitude === 'fav' ? '#2F7D32' : st.attitude === 'unfav' ? '#C0392B' : '#6d6e6f';
      s += '<g><title>' + A.esc(st.name + ' — ' + nameOf(A.pm.strategies(), A.pm.strategyOf(st))) + '</title>';
      if (st.attitude === 'unfav') s += '<rect x="' + (cx - 12) + '" y="' + (cy - 12) + '" width="24" height="24" fill="' + col + '"/>'; else s += '<circle cx="' + cx + '" cy="' + cy + '" r="13" fill="' + col + '"/>';
      s += '<text x="' + cx + '" y="' + (cy + 4) + '" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">' + (i + 1) + '</text></g>';
    });
    return s + '</svg>';
  };

  /* ===================== Project definition and results framework ===================== */
  A.views.definition = function (root) {
    var P = A.P, ui = A.ui; P.results = P.results || []; P.kpis = P.kpis || [];
    ui.rfTab = ui.rfTab || 'definition';
    var tabs = [['definition', L('Project definition', 'Définition du projet')], ['frame', L('Logical framework', 'Cadre logique')], ['indicators', L('Results indicators', 'Indicateurs de résultats')], ['kpis', L('KPIs', 'KPI')]];
    if (ui.rfTab === 'definition') {
      var d = A.pm.definition(), g = function () { return A.pm.definition(); }, S = A.S, cur = P.currency;
      root.appendChild(h('div.toolbar', h('div.seg', tabs.map(function (t) { return h('button' + (ui.rfTab === t[0] ? '.on' : ''), { type: 'button', onclick: function () { ui.rfTab = t[0]; A.refresh(); } }, t[1]); }))));
      var fld = function (label, k, hint) { return h('div.field', h('span.lbl', label), area(g, k, 'def:' + k, 3), hint ? h('span.hint', hint) : null); };
      root.appendChild(h('div.card', h('div.card-head', h('h2', L('Project definition', 'Définition du projet')), h('span.muted', L('what the project is, for whom, and what success looks like', 'ce qu’est le projet, pour qui, et à quoi ressemble le succès'))),
        h('div.kpis.small', A.kpi(L('Project', 'Projet'), P.name, [P.client, P.financier].filter(Boolean).join(' · ')), A.kpi(L('Duration', 'Durée'), A.fmtNum(S.PF / P.calendar.daysPerMonth, 1).replace(/[.,]0$/, '') + L(' months', ' mois'), A.fmtDate(S.start) + ' → ' + A.fmtDate(S.finish)),
          A.kpi(L('Budget', 'Budget'), A.money(S.total), cur), A.kpi(L('Components', 'Composantes'), String(S.nodes.filter(function (n) { return !n.parent; }).length), L('from the WBS', 'd’après le WBS')), A.kpi(L('Contracts', 'Contrats'), String(P.contracts.length), '')),
        h('div.defgrid',
          fld(L('Problem or need addressed', 'Problème ou besoin traité'), 'problem', L('the situation the project changes', 'la situation que le projet change')),
          fld(L('Goal (impact sought)', 'Finalité (impact recherché)'), 'goal', L('the strategic objective the project contributes to', 'l’objectif stratégique auquel le projet contribue')),
          fld(L('Beneficiaries and target groups', 'Bénéficiaires et groupes cibles'), 'beneficiaries'),
          fld(L('Scope: what is included', 'Périmètre : ce qui est inclus'), 'scope', L('deliverables and components, as in the WBS', 'livrables et composantes, comme dans le WBS')),
          fld(L('Out of scope', 'Hors périmètre'), 'exclusions'),
          fld(L('Success criteria', 'Critères de succès'), 'success', L('how the sponsor will judge the project finished and successful', 'comment le promoteur jugera le projet terminé et réussi')),
          fld(L('Constraints and dependencies', 'Contraintes et dépendances'), 'constraints'),
          h('div', h('div.field', h('span.lbl', L('Sponsor / executing agency', 'Promoteur / agence d’exécution')), lv(function () { return [A.pm.definition()]; }, 0, 'sponsor', 'text', { fk: 'def:sponsor' })),
            h('div.cols3', h('div.field', h('span.lbl', L('Document version', 'Version du document')), lv(function () { return [A.pm.definition()]; }, 0, 'version', 'text', { fk: 'def:version' })), h('div.field', h('span.lbl', L('Approved on', 'Approuvé le')), lv(function () { return [A.pm.definition()]; }, 0, 'approved', 'date', { fk: 'def:approved' })), h('div'))))));
      root.appendChild(h('div.card', h('div.card-head', h('h2', L('Results chain', 'Chaîne de résultats'))), A.resultsChain()));
      return;
    }
    if (ui.rfTab === 'kpis') {
      root.appendChild(h('div.toolbar', h('div.tg', A.btn('plus', L('KPI', 'KPI'), function () { A.edit(function () { A.pm.kpis().push(A.pm.newIndicator('', 'kpi')); }); }, { primary: true })),
        h('div.seg', tabs.map(function (t) { return h('button' + (ui.rfTab === t[0] ? '.on' : ''), { type: 'button', onclick: function () { ui.rfTab = t[0]; A.refresh(); } }, t[1]); }))));
      var ks = A.pm.kpis(), gk = function () { return A.pm.kpis(); };
      if (!ks.length) { root.appendChild(emptyState(L('No KPI yet', 'Aucun KPI'), L('Key performance indicators follow the implementation itself: disbursement rate, procurement lead times, physical progress of a component, beneficiaries reached per quarter. Results indicators belong to the logical framework.', 'Les indicateurs clés de performance suivent la mise en œuvre elle-même : taux de décaissement, délais de passation, avancement physique d’une composante, bénéficiaires atteints par trimestre. Les indicateurs de résultats appartiennent au cadre logique.'))); return; }
      var t = h('table.list.pm');
      t.appendChild(h('thead', h('tr', [[L('KPI', 'KPI'), 260], [L('Unit', 'Unité'), 80], [L('Baseline', 'Base'), 90], [L('Target', 'Cible'), 90], [L('Actual', 'Réel'), 90], [L('Progress', 'Progrès'), 120], [L('WBS element', 'Élément du WBS'), 190], [L('Data source', 'Source'), 170], [L('Frequency', 'Fréquence'), 110], [L('Responsibility', 'Responsable'), 140], [L('Intermediate targets', 'Cibles intermédiaires'), 180], ['', 40]]
        .map(function (c) { return h('th', { style: { width: c[1] + 'px' } }, c[0]); }))));
      var tb = h('tbody');
      ks.forEach(function (ind, j) {
        var fk = 'kpi' + ind.id + ':', pr = A.pm.indicatorProgress(ind);
        tb.appendChild(h('tr', h('td', area(function () { return gk()[j]; }, 'text', fk + 'text')), h('td', lv(gk, j, 'unit', 'text', { fk: fk + 'unit' })),
          h('td', lv(gk, j, 'baseline', 'text', { fk: fk + 'baseline' })), h('td', lv(gk, j, 'target', 'text', { fk: fk + 'target' })), h('td', lv(gk, j, 'actual', 'text', { fk: fk + 'actual' })),
          h('td', pr == null ? h('span.muted', '—') : h('div.meterwrap', h('div.meter', h('i', { style: { width: Math.round(pr) + '%' } })), h('span.small', Math.round(pr) + ' %'))),
          h('td', lv(gk, j, 'task', 'select', { fk: fk + 'task', options: wbsOptions() })), h('td', lv(gk, j, 'source', 'text', { fk: fk + 'source' })), h('td', lv(gk, j, 'freq', 'text', { fk: fk + 'freq' })), h('td', lv(gk, j, 'owner', 'text', { fk: fk + 'owner' })),
          h('td', area(function () { return gk()[j]; }, 'milestones', fk + 'ms')),
          h('td.act', A.btn('trash', L('Delete', 'Supprimer'), function () { A.edit(function () { A.pm.kpis().splice(j, 1); }); }, { iconOnly: true, ghost: true }))));
      });
      t.appendChild(tb); root.appendChild(h('div.card.flush', h('div.scroll-x', t)));
      return;
    }
    root.appendChild(h('div.toolbar',
      h('div.tg', A.btn('plus', L('Result', 'Résultat'), function () { var r; A.edit(function () { r = A.pm.newResult('output', ''); A.P.results.push(r); }); ui.rfEdit = r.id; A.refresh(); }, { primary: true }),
        A.btn('child', L('Outputs from the WBS', 'Extrants depuis le WBS'), function () {
          var n = 0; A.edit(function () { n = A.pm.resultsFromWBS(); }); A.toast(n ? n + L(' outputs created from the components', ' extrants créés depuis les composantes') : L('Every component already has an output.', 'Chaque composante a déjà un extrant.'), n ? 'ok' : undefined);
        }, { title: L('One output per top-level component, linked to it', 'Un extrant par composante de premier niveau, lié à celle-ci') })),
      h('div.seg', tabs.map(function (t) { return h('button' + (ui.rfTab === t[0] ? '.on' : ''), { type: 'button', onclick: function () { ui.rfTab = t[0]; A.refresh(); } }, t[1]); }))));
    if (!P.results.length) {
      root.appendChild(emptyState(L('No result yet', 'Aucun résultat'), L('Describe the vertical logic of the project: impact, outcome, outputs linked to the WBS components, with indicators, means of verification and critical assumptions.',
        'Décrire la logique verticale du projet : impact, effet, extrants liés aux composantes du WBS, avec indicateurs, moyens de vérification et hypothèses critiques.'),
        A.btn('child', L('Start from the WBS components', 'Partir des composantes du WBS'), function () { A.edit(function () { A.pm.resultsFromWBS(); }); }, { primary: true })));
      return;
    }
    var get = function () { return A.P.results; }, sorted = A.pm.sortedResults(), levels = A.pm.resultLevels();
    var parentOpts = function (r) { return [{ id: 0, name: '—' }].concat(P.results.filter(function (x) { return x.id !== r.id && x.level !== 'activity' && x.level !== r.level; }).map(function (x) { return { id: x.id, name: A.pm.levelName(x.level).split(' (')[0] + ': ' + (x.text || '…').slice(0, 50) }; })); };
    if (ui.rfTab === 'frame') {
      var table = h('table.list.pm.lf');
      table.appendChild(h('thead', h('tr', [[L('Level', 'Niveau'), 150], [L('Narrative summary', 'Résumé narratif'), 260], [L('Indicators (OVI)', 'Indicateurs (IOV)'), 260], [L('Means of verification', 'Moyens de vérification'), 200], [L('Critical assumptions', 'Hypothèses critiques'), 220], [L('Risk', 'Risque'), 90], [L('WBS element', 'Élément du WBS'), 180], [L('Contributes to', 'Contribue à'), 180], ['', 40]]
        .map(function (c) { return h('th', { style: { width: c[1] + 'px' } }, c[0]); }))));
      var tb = h('tbody'), lastLevel = null;
      sorted.forEach(function (r) {
        var i = P.results.indexOf(r), fk = 'rf' + r.id + ':';
        if (r.level !== lastLevel) { tb.appendChild(h('tr.group', h('td', { colspan: 9 }, A.pm.levelName(r.level)))); lastLevel = r.level; }
        var n = r.task ? A.S.info.get(r.task) : null;
        tb.appendChild(h('tr' + (ui.rfEdit === r.id ? '.hl' : ''),
          h('td', lv(get, i, 'level', 'select', { fk: fk + 'level', options: levels })),
          h('td', area(function () { return get()[i]; }, 'text', fk + 'text', 3)),
          h('td', h('ul.ind', r.indicators.map(function (ind) { return h('li', ind.text || h('em.muted', L('(untitled)', '(sans titre)'))); })), h('button.btn.ghost.sm', { type: 'button', onclick: function () { ui.rfTab = 'indicators'; ui.rfEdit = r.id; A.refresh(); } }, A.icon('plus'), L('Indicators…', 'Indicateurs…'))),
          h('td', h('ul.ind', r.indicators.map(function (ind) { return h('li', ind.source || h('em.muted', '—')); }))),
          h('td', area(function () { return get()[i]; }, 'assumptions', fk + 'assumptions', 3)),
          h('td', lv(get, i, 'risk', 'select', { fk: fk + 'risk', options: [{ id: 'low', name: L('Low', 'Faible') }, { id: 'moderate', name: L('Moderate', 'Modéré') }, { id: 'high', name: L('High', 'Élevé') }] })),
          h('td', lv(get, i, 'task', 'select', { fk: fk + 'task', options: wbsOptions() }), n ? h('div.muted.small', A.fmtDate(n.start) + ' → ' + A.fmtDate(n.finish) + ' · ' + Math.round(n.pct) + ' %') : null),
          h('td', lv(get, i, 'parent', 'select', { fk: fk + 'parent', options: parentOpts(r) })),
          h('td.act', A.btn('trash', L('Delete', 'Supprimer'), function () { A.edit(function () { A.P.results.splice(i, 1); A.P.results.forEach(function (x) { if (x.parent === r.id) x.parent = 0; }); }); }, { iconOnly: true, ghost: true }))));
      });
      table.appendChild(tb);
      root.appendChild(h('div.card.flush', h('div.scroll-x', table)));
      root.appendChild(h('div.toolbar', h('div.tg', A.btn('warn', L('Risks from the assumptions', 'Risques depuis les hypothèses'), function () {
        var n = 0; A.edit(function () { n = A.pm.risksFromAssumptions(); }); A.toast(n ? n + L(' risks added to the register', ' risques ajoutés au registre') : L('Every assumption already has its risk.', 'Chaque hypothèse a déjà son risque.'), n ? 'ok' : undefined); if (n) A.go('risks');
      }, { title: L('Every assumption that could prove false is a risk: add one per assumption to the risk register', 'Toute hypothèse qui pourrait se révéler fausse est un risque : en ajouter un par hypothèse au registre') })),
        h('div.tg.muted', L('Vertical logic: IF the result is achieved AND its assumptions hold, THEN the next level up can be achieved.', 'Logique verticale : SI le résultat est atteint ET que ses hypothèses se vérifient, ALORS le niveau supérieur peut être atteint.'))));
    } else {
      sorted.forEach(function (r) {
        var i = P.results.indexOf(r), n = r.task ? A.S.info.get(r.task) : null;
        var card = h('div.card' + (ui.rfEdit === r.id ? '.hl' : ''), h('div.card-head', h('span.pill', A.pm.levelName(r.level).split(' (')[0]), h('h2', r.text || L('(untitled result)', '(résultat sans titre)')), n ? h('span.muted', '· ' + n.wbs + ' ' + n.t.name) : null, h('span.sp'),
          A.btn('plus', L('Indicator', 'Indicateur'), function () { A.edit(function () { A.P.results[i].indicators.push(A.pm.newIndicator('')); }); })));
        if (!r.indicators.length) card.appendChild(h('p.muted', L('No indicator yet. A good indicator names a unit, a variable, the desired condition and a date: “Number of km of streetlight network built as of Dec. 2027”.', 'Aucun indicateur. Un bon indicateur nomme une unité, une variable, la condition souhaitée et une date : « Nombre de km de réseau d’éclairage construits au 31 déc. 2027 ».')));
        else {
          var t = h('table.list.pm');
          t.appendChild(h('thead', h('tr', [[L('Indicator', 'Indicateur'), 240], [L('Unit', 'Unité'), 80], [L('Baseline', 'Base'), 90], [L('Target', 'Cible'), 90], [L('Actual', 'Réel'), 90], [L('Progress', 'Progrès'), 110], [L('Data source / means of verification', 'Source / moyen de vérification'), 200], [L('Collection method', 'Méthode de collecte'), 160], [L('Frequency', 'Fréquence'), 110], [L('Responsibility', 'Responsable'), 140], ['', 40]]
            .map(function (c) { return h('th', { style: { width: c[1] + 'px' } }, c[0]); }))));
          var tb = h('tbody');
          r.indicators.forEach(function (ind, j) {
            var g = function () { return A.P.results[i].indicators; }, fk = 'ind' + ind.id + ':', pr = A.pm.indicatorProgress(ind);
            tb.appendChild(h('tr', h('td', area(function () { return g()[j]; }, 'text', fk + 'text')), h('td', lv(g, j, 'unit', 'text', { fk: fk + 'unit' })),
              h('td', lv(g, j, 'baseline', 'text', { fk: fk + 'baseline' })), h('td', lv(g, j, 'target', 'text', { fk: fk + 'target' })), h('td', lv(g, j, 'actual', 'text', { fk: fk + 'actual' })),
              h('td', pr == null ? h('span.muted', '—') : h('div.meterwrap', h('div.meter', h('i', { style: { width: Math.round(pr) + '%' } })), h('span.small', Math.round(pr) + ' %'))),
              h('td', lv(g, j, 'source', 'text', { fk: fk + 'source' })), h('td', lv(g, j, 'method', 'text', { fk: fk + 'method', placeholder: L('survey, report, site visit…', 'enquête, rapport, visite…') })),
              h('td', lv(g, j, 'freq', 'text', { fk: fk + 'freq' })), h('td', lv(g, j, 'owner', 'text', { fk: fk + 'owner' })),
              h('td.act', A.btn('trash', L('Delete', 'Supprimer'), function () { A.edit(function () { A.P.results[i].indicators.splice(j, 1); }); }, { iconOnly: true, ghost: true }))));
          });
          t.appendChild(tb); card.appendChild(h('div.scroll-x', t));
        }
        root.appendChild(card);
      });
      root.appendChild(h('p.muted.pad', L('SMART indicators: specific, measurable, achievable, relevant, time-bound. Progress = (actual − baseline) / (target − baseline).', 'Indicateurs SMART : spécifiques, mesurables, atteignables, pertinents, temporellement définis. Progrès = (réel − base) / (cible − base).')));
    }
  };

  A.resultsChain = function () {
    var rs = A.pm.sortedResults(); if (!rs.length) return h('p.muted', L('No result defined yet: see the Logical framework tab.', 'Aucun résultat défini : voir l’onglet Cadre logique.'));
    var lvls = ['impact', 'outcome', 'output', 'activity'], cols = { impact: 'var(--wbs0)', outcome: 'var(--wbs1)', output: 'var(--wbs2)', activity: 'var(--wbs3)' }, ink = { impact: '#fff', outcome: '#fff', output: 'var(--wbs-ink)', activity: 'var(--wbs-ink)' };
    return h('div.chain', lvls.map(function (lvl) {
      var items = rs.filter(function (r) { return r.level === lvl; }); if (!items.length) return null;
      return h('div.chain-row', h('div.chain-lbl', A.pm.levelName(lvl).split(' (')[0]), h('div.chain-items', items.map(function (r) {
        var n = r.task ? A.S.info.get(r.task) : null;
        return h('div.chain-box', { style: { background: cols[lvl], color: ink[lvl] } }, h('b', r.text || L('(untitled)', '(sans titre)')), n ? h('span.small', n.wbs + ' · ' + Math.round(n.pct) + ' %') : null, r.assumptions ? h('span.small', L('IF ', 'SI ') + r.assumptions) : null);
      })));
    }));
  };

  /* ===================== Risks ===================== */
  function bandCls(score) { var b = A.pm.band(score); return b ? '.band-' + b : ''; }
  A.riskMatrixSVG = function (opts) {
    opts = opts || {};
    var rs = (A.P.risks || []).filter(function (r) { return r.status !== 'closed'; }), cell = 72, W = 90 + 5 * cell + 10, H = 30 + 5 * cell + 50, s = '';
    var cols = { vh: '#C0392B', h: '#E8711D', m: '#F2C230', l: '#9CC45A', vl: '#4E9A3C' };
    s += '<svg viewBox="0 0 ' + W + ' ' + H + '" class="risk-matrix" role="img">';
    for (var p = 5; p >= 1; p--) for (var i = 1; i <= 5; i++) {
      var sc = p * i, x = 90 + (i - 1) * cell, y = 30 + (5 - p) * cell, inCell = rs.filter(function (r) { return +r.prob === p && +r.impact === i; });
      s += '<g class="rm-cell' + (opts.sel && opts.sel[0] === p && opts.sel[1] === i ? ' sel' : '') + '" data-p="' + p + '" data-i="' + i + '"><rect x="' + x + '" y="' + y + '" width="' + (cell - 3) + '" height="' + (cell - 3) + '" rx="6" fill="' + cols[A.pm.band(sc)] + '"/>';
      s += '<text x="' + (x + 8) + '" y="' + (y + 18) + '" font-size="12" font-weight="700" fill="#fff" opacity=".9">' + sc + '</text>';
      if (inCell.length) {
        s += '<title>' + A.esc(inCell.map(function (r) { return r.ref + ' ' + (r.event || A.pm.riskStatement(r)); }).join('\n')) + '</title>';
        var label = inCell.slice(0, 3).map(function (r) { return r.ref; }).join(' ') + (inCell.length > 3 ? ' +' + (inCell.length - 3) : '');
        s += '<rect x="' + (x + 6) + '" y="' + (y + cell - 32) + '" width="' + (cell - 15) + '" height="22" rx="11" fill="#fff" opacity=".92"/><text x="' + (x + cell / 2 - 1.5) + '" y="' + (y + cell - 17) + '" text-anchor="middle" font-size="11" font-weight="700" fill="#1c2733">' + A.esc(label) + '</text>';
      }
      s += '</g>';
    }
    var pn = A.pm.probScale(), im = A.pm.impactScale(), ink = A.cssVar('--text');
    pn.forEach(function (x, k) { s += '<text x="82" y="' + (30 + k * cell + cell / 2 + 4) + '" text-anchor="end" font-size="11" fill="' + ink + '">' + A.esc(x[1] + ' (' + x[0] + ')') + '</text>'; });
    im.slice().reverse().forEach(function (x, k) { s += '<text x="' + (90 + k * cell + cell / 2) + '" y="' + (30 + 5 * cell + 16) + '" text-anchor="middle" font-size="11" fill="' + ink + '">' + x[0] + '</text>'; });
    s += '<text transform="translate(16,' + (30 + 2.5 * cell) + ') rotate(-90)" text-anchor="middle" font-size="12" font-weight="700" fill="' + ink + '">' + A.esc(L('PROBABILITY', 'PROBABILITÉ')) + '</text>';
    s += '<text x="' + (90 + 2.5 * cell) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="12" font-weight="700" fill="' + ink + '">' + A.esc(L('IMPACT', 'IMPACT')) + '</text>';
    return s + '</svg>';
  };
  A.views.risks = function (root) {
    var P = A.P, ui = A.ui, cur = P.currency; P.risks = P.risks || [];
    ui.rkTab = ui.rkTab || 'register';
    var tabs = [['register', L('Risk register', 'Registre des risques')], ['matrix', L('P × I matrix', 'Matrice P × I')], ['plan', L('Response control plan', 'Plan de contrôle des réponses')], ['issues', L('Issue log', 'Journal des problèmes')], ['reserve', L('Reserves (EMV)', 'Réserves (VMA)')], ['scales', L('Scales', 'Échelles')]];
    var sum = A.pm.riskSummary();
    root.appendChild(h('div.toolbar',
      h('div.tg', A.btn('plus', L('Risk', 'Risque'), function () { var r; A.edit(function () { r = A.pm.newRisk(); A.P.risks.push(r); }); ui.rkTab = 'register'; ui.rkEdit = r.id; ui.rkCell = null; A.refresh(); }, { primary: true }),
        A.btn('plus', L('Opportunity', 'Opportunité'), function () { var r; A.edit(function () { r = A.pm.newRisk(); r.kind = 'opportunity'; r.strategy = 'enhance'; A.P.risks.push(r); }); ui.rkTab = 'register'; ui.rkEdit = r.id; A.refresh(); })),
      h('div.seg', tabs.map(function (t) { return h('button' + (ui.rkTab === t[0] ? '.on' : ''), { type: 'button', onclick: function () { ui.rkTab = t[0]; A.refresh(); } }, t[1]); })),
      h('div.tg', ui.rkCell ? A.btn('close', L('All cells', 'Toutes les cases'), function () { ui.rkCell = null; A.refresh(); }, { ghost: true }) : null)));
    if (P.risks.length) root.appendChild(h('div.kpis.small',
      A.kpi(L('Active risks', 'Risques actifs'), String(sum.open), sum.threats + L(' threats · ', ' menaces · ') + sum.opps + L(' opportunities', ' opportunités')),
      A.kpi(L('Very high / high', 'Très élevé / élevé'), String(sum.byBand.vh + sum.byBand.h), L('score ≥ 9: act now', 'score ≥ 9 : agir maintenant')),
      A.kpi(L('Moderate', 'Modéré'), String(sum.byBand.m), L('score 5–8: proactive management', 'score 5–8 : gestion proactive')),
      A.kpi(L('Contingency reserve', 'Réserve pour aléas'), A.money(sum.reserve), cur + L(' · Σ probability × cost impact', ' · Σ probabilité × impact financier')),
      A.kpi(L('Response actions', 'Actions de réponse'), String(sum.actions), sum.actionsLate ? sum.actionsLate + L(' overdue', ' en retard') : L('none overdue', 'aucune en retard')),
      A.kpi(L('Open issues', 'Problèmes ouverts'), String(sum.issuesOpen), sum.overdue ? sum.overdue + L(' risk reviews overdue', ' revues de risques en retard') : L('risk reviews up to date', 'revues de risques à jour'))));
    if (!P.risks.length && ui.rkTab !== 'issues') {
      root.appendChild(emptyState(L('No risk yet', 'Aucun risque'), L('Write each risk as cause → event → consequence, rate probability and impact from 1 to 5, choose a strategy and an owner. The matrix and the contingency reserve follow.',
        'Rédiger chaque risque sous la forme cause → événement → conséquence, noter probabilité et impact de 1 à 5, choisir une stratégie et un responsable. La matrice et la réserve pour aléas en découlent.'),
        (P.results || []).some(function (r) { return r.assumptions; }) ? A.btn('warn', L('Start from the assumptions of the logical framework', 'Partir des hypothèses du cadre logique'), function () { A.edit(function () { A.pm.risksFromAssumptions(); }); }, { primary: true }) : null));
      return;
    }
    var get = function () { return A.P.risks; };
    if (ui.rkTab === 'register' || ui.rkTab === 'matrix') {
      if (ui.rkTab === 'matrix') {
        var box = h('div.card', h('div.card-head', h('h2', L('Probability × impact matrix', 'Matrice probabilité × impact')), h('span.muted', L('click a cell to list its risks below', 'cliquer sur une case pour lister ses risques ci-dessous'))),
          h('div.rm-wrap', h('div', { html: A.riskMatrixSVG({ sel: ui.rkCell }) }),
            h('table.data.bands', h('tbody', ['vh', 'h', 'm', 'l', 'vl'].map(function (b) { return h('tr', h('td', h('span.band.band-' + b, A.pm.bandName(b) + ' ' + ({ vh: '15–25', h: '9–12', m: '5–8', l: '3–4', vl: '1–2' })[b])), h('td', A.pm.bandAction(b))); })))));
        box.addEventListener('click', function (e) { var c = e.target.closest('.rm-cell'); if (!c) return; ui.rkCell = [+c.dataset.p, +c.dataset.i]; A.refresh(); });
        root.appendChild(box);
      }
      var list = P.risks.map(function (r, i) { return { r: r, i: i }; }).filter(function (x) { return !ui.rkCell || (+x.r.prob === ui.rkCell[0] && +x.r.impact === ui.rkCell[1]); })
        .sort(function (a, b) { return (a.r.status === 'closed') - (b.r.status === 'closed') || A.pm.score(b.r.prob, b.r.impact) - A.pm.score(a.r.prob, a.r.impact); });
      var scale15 = function (sc) { return sc.map(function (x) { return { id: x[0], name: x[0] + ' · ' + x[1] }; }); };
      var table = h('table.list.pm.risks');
      table.appendChild(h('thead', h('tr', [[L('ID', 'ID'), 74], [L('Type', 'Type'), 120], [L('Category', 'Catégorie'), 160], [L('Because of… (cause)', 'Parce que… (cause)'), 200], [L('…this may happen (event)', '…ceci peut arriver (événement)'), 200], [L('…which would (consequence)', '…ce qui (conséquence)'), 200],
        ['P', 130], ['I', 130], [L('Score', 'Score'), 70], [L('Strategy', 'Stratégie'), 120], [L('Response', 'Réponse'), 220], [L('Owner', 'Responsable'), 130], [L('Trigger', 'Déclencheur'), 160], [L('Cost impact', 'Impact financier') + ' (' + cur + ')', 120], [L('Prob. %', 'Prob. %'), 70], [L('EMV', 'VMA'), 100],
        [L('Residual P / I', 'P / I résiduels'), 150], [L('WBS element', 'Élément du WBS'), 170], [L('Status', 'Statut'), 120], [L('Next review', 'Prochaine revue'), 140], ['', 40]].map(function (c) { return h('th', { style: { width: c[1] + 'px' } }, c[0]); }))));
      var tb = h('tbody');
      list.forEach(function (x) {
        var r = x.r, i = x.i, fk = 'rk' + r.id + ':', sc = A.pm.score(r.prob, r.impact), rsc = A.pm.score(r.residualProb, r.residualImpact);
        tb.appendChild(h('tr' + (ui.rkEdit === r.id ? '.hl' : '') + (r.status === 'closed' ? '.done' : r.status === 'occurred' ? '.late' : ''),
          h('td', lv(get, i, 'ref', 'text', { fk: fk + 'ref' })),
          h('td', lv(get, i, 'kind', 'select', { fk: fk + 'kind', options: [{ id: 'threat', name: L('Threat', 'Menace') }, { id: 'opportunity', name: L('Opportunity', 'Opportunité') }], set: function (o, v) { o.kind = v; if (!A.pm.riskStrategies(v).some(function (s) { return s.id === o.strategy; })) o.strategy = v === 'opportunity' ? 'enhance' : 'mitigate'; } })),
          h('td', lv(get, i, 'category', 'select', { fk: fk + 'category', options: A.pm.riskCategories() })),
          h('td', area(function () { return get()[i]; }, 'cause', fk + 'cause')), h('td', area(function () { return get()[i]; }, 'event', fk + 'event')), h('td', area(function () { return get()[i]; }, 'consequence', fk + 'consequence')),
          h('td', lv(get, i, 'prob', 'select', { fk: fk + 'prob', options: scale15(A.pm.probScale()) })), h('td', lv(get, i, 'impact', 'select', { fk: fk + 'impact', options: scale15(A.pm.impactScale()) })),
          h('td.c', h('span.band' + bandCls(sc), { title: A.pm.bandName(A.pm.band(sc)) + ' — ' + A.pm.bandAction(A.pm.band(sc)) }, String(sc))),
          h('td', lv(get, i, 'strategy', 'select', { fk: fk + 'strategy', options: A.pm.riskStrategies(r.kind) })),
          h('td', area(function () { return get()[i]; }, 'response', fk + 'response')), h('td', lv(get, i, 'owner', 'text', { fk: fk + 'owner' })), h('td', area(function () { return get()[i]; }, 'trigger', fk + 'trigger')),
          h('td', lv(get, i, 'costImpact', 'num', { fk: fk + 'cost' })), h('td', lv(get, i, 'probPct', 'text', { fk: fk + 'pct', placeholder: L('auto', 'auto') })), h('td.r', A.money(A.pm.emv(r))),
          h('td', h('div.cap', lv(get, i, 'residualProb', 'num', { fk: fk + 'rp', zero: true }), h('span.unit', '/'), lv(get, i, 'residualImpact', 'num', { fk: fk + 'ri', zero: true }), rsc ? h('span.band.sm' + bandCls(rsc), String(rsc)) : null)),
          h('td', lv(get, i, 'task', 'select', { fk: fk + 'task', options: wbsOptions() })),
          h('td', lv(get, i, 'status', 'select', { fk: fk + 'status', options: A.pm.riskStatuses() })), h('td', lv(get, i, 'review', 'date', { fk: fk + 'review' })),
          h('td.act', A.btn('trash', L('Delete', 'Supprimer'), function () { A.edit(function () { A.P.risks.splice(i, 1); }); }, { iconOnly: true, ghost: true }))));
      });
      if (!list.length) tb.appendChild(h('tr', h('td.empty', { colspan: 21 }, L('No risk in this cell.', 'Aucun risque dans cette case.'))));
      table.appendChild(tb);
      root.appendChild(h('div.card.flush', h('div.scroll-x', table)));
      root.appendChild(h('p.muted.pad', L('Score = probability × impact (1–5 each). Every risk has one owner, a response, a trigger, a status and a review date. Residual P / I describe what remains after the response.',
        'Score = probabilité × impact (1 à 5 chacun). Chaque risque a un responsable, une réponse, un déclencheur, un statut et une date de revue. P / I résiduels décrivent ce qui reste après la réponse.')));
    } else if (ui.rkTab === 'plan') {
      root.appendChild(h('p.muted.pad', L('Each risk response broken into actions with an owner, a due date and a status. A plan that is not implemented is only a wish.', 'Chaque réponse à un risque déclinée en actions avec un responsable, une échéance et un statut. Un plan non mis en œuvre n’est qu’un vœu.')));
      var today = A.toDay(P.statusDate) || A.toDay(A.todayISO());
      P.risks.filter(function (r) { return r.status !== 'closed'; }).sort(function (a, b) { return A.pm.score(b.prob, b.impact) - A.pm.score(a.prob, a.impact); }).forEach(function (r) {
        var i = P.risks.indexOf(r), sc = A.pm.score(r.prob, r.impact), ga = function () { return A.P.risks[i].actions; };
        var card = h('div.card', h('div.card-head', h('span.band' + bandCls(sc), String(sc)), h('h2', r.ref + ' · ' + (r.event || A.pm.riskStatement(r))), h('span.muted', nameOf(A.pm.riskStrategies(r.kind), r.strategy) + (r.owner ? ' · ' + r.owner : '')), h('span.sp'),
          A.btn('plus', L('Action', 'Action'), function () { A.edit(function () { A.P.risks[i].actions.push(A.pm.newAction('')); }); }),
          A.btn('warn', L('It happened: open an issue', 'C’est arrivé : ouvrir un problème'), function () { A.edit(function () { var k = A.P.risks[i]; k.status = 'occurred'; A.P.issues = A.P.issues || []; A.P.issues.push(A.pm.newIssue(k)); }); ui.rkTab = 'issues'; A.refresh(); }, { ghost: true })));
        if (r.response) card.appendChild(h('p.small.muted', L('Planned response: ', 'Réponse prévue : ') + r.response + (r.trigger ? ' · ' + L('Trigger: ', 'Déclencheur : ') + r.trigger : '')));
        if (!r.actions.length) card.appendChild(h('p.muted', L('No action yet.', 'Aucune action.')));
        else {
          var t = h('table.list.pm'); t.appendChild(h('thead', h('tr', [[L('Action', 'Action'), 320], [L('Owner', 'Responsable'), 150], [L('Due', 'Échéance'), 150], [L('Status', 'Statut'), 130], [L('Cost', 'Coût') + ' (' + cur + ')', 110], [L('Effect observed', 'Effet constaté'), 240], ['', 40]].map(function (c) { return h('th', { style: { width: c[1] + 'px' } }, c[0]); }))));
          var tb = h('tbody');
          r.actions.forEach(function (a, j) {
            var fk = 'act' + a.id + ':', late = (a.status === 'planned' || a.status === 'ongoing') && a.due && A.toDay(a.due) < today;
            tb.appendChild(h('tr' + (a.status === 'done' ? '.done' : late ? '.late' : ''), h('td', area(function () { return ga()[j]; }, 'text', fk + 'text')), h('td', lv(ga, j, 'owner', 'text', { fk: fk + 'owner' })), h('td', lv(ga, j, 'due', 'date', { fk: fk + 'due' })),
              h('td', lv(ga, j, 'status', 'select', { fk: fk + 'status', options: A.pm.actionStatuses() })), h('td', lv(ga, j, 'cost', 'num', { fk: fk + 'cost' })), h('td', area(function () { return ga()[j]; }, 'effect', fk + 'effect')),
              h('td.act', A.btn('trash', L('Delete', 'Supprimer'), function () { A.edit(function () { A.P.risks[i].actions.splice(j, 1); }); }, { iconOnly: true, ghost: true }))));
          });
          t.appendChild(tb); card.appendChild(h('div.scroll-x', t));
        }
        root.appendChild(card);
      });
    } else if (ui.rkTab === 'issues') {
      P.issues = P.issues || [];
      root.appendChild(h('div.toolbar', h('div.tg', A.btn('plus', L('Issue', 'Problème'), function () { A.edit(function () { A.P.issues.push(A.pm.newIssue()); }); }, { primary: true }),
        h('span.muted', L('A problem that has already occurred: resolve now. Risks that materialise become issues from the response plan.', 'Un problème déjà survenu : à résoudre maintenant. Les risques qui se matérialisent deviennent des problèmes depuis le plan de réponses.')))));
      if (!P.issues.length) { root.appendChild(emptyState(L('No issue', 'Aucun problème'), L('Nothing has gone wrong yet, or nothing has been logged.', 'Rien n’a encore mal tourné, ou rien n’a été consigné.'))); return; }
      var gi = function () { return A.P.issues; }, riskOpts = [{ id: 0, name: '—' }].concat(P.risks.map(function (r) { return { id: r.id, name: r.ref + ' ' + (r.event || '').slice(0, 40) }; }));
      var ti = h('table.list.pm');
      ti.appendChild(h('thead', h('tr', [[L('ID', 'ID'), 60], [L('Date', 'Date'), 140], [L('Issue', 'Problème'), 220], [L('Description', 'Description'), 240], [L('From risk', 'Issu du risque'), 160], [L('WBS element', 'Élément du WBS'), 170], [L('Owner', 'Responsable'), 130], [L('Priority', 'Priorité'), 100], [L('Status', 'Statut'), 130], [L('Action taken', 'Action engagée'), 220], [L('Resolution', 'Résolution'), 220], [L('Closed on', 'Clos le'), 140], ['', 40]]
        .map(function (c) { return h('th', { style: { width: c[1] + 'px' } }, c[0]); }))));
      var tbi = h('tbody');
      P.issues.forEach(function (is, j) {
        var fk = 'iss' + is.id + ':';
        tbi.appendChild(h('tr' + (is.status === 'closed' ? '.done' : is.priority === 'high' ? '.late' : ''), h('td', lv(gi, j, 'ref', 'text', { fk: fk + 'ref' })), h('td', lv(gi, j, 'date', 'date', { fk: fk + 'date' })),
          h('td', area(function () { return gi()[j]; }, 'title', fk + 'title')), h('td', area(function () { return gi()[j]; }, 'desc', fk + 'desc')),
          h('td', lv(gi, j, 'risk', 'select', { fk: fk + 'risk', options: riskOpts })), h('td', lv(gi, j, 'task', 'select', { fk: fk + 'task', options: wbsOptions() })), h('td', lv(gi, j, 'owner', 'text', { fk: fk + 'owner' })),
          h('td', lv(gi, j, 'priority', 'select', { fk: fk + 'priority', options: A.pm.issuePriorities() })), h('td', lv(gi, j, 'status', 'select', { fk: fk + 'status', options: A.pm.issueStatuses(), set: function (o, v) { o.status = v; if (v === 'closed' && !o.closed) o.closed = A.P.statusDate || A.todayISO(); } })),
          h('td', area(function () { return gi()[j]; }, 'action', fk + 'action')), h('td', area(function () { return gi()[j]; }, 'resolution', fk + 'resolution')), h('td', lv(gi, j, 'closed', 'date', { fk: fk + 'closed' })),
          h('td.act', A.btn('trash', L('Delete', 'Supprimer'), function () { A.edit(function () { A.P.issues.splice(j, 1); }); }, { iconOnly: true, ghost: true }))));
      });
      ti.appendChild(tbi); root.appendChild(h('div.card.flush', h('div.scroll-x', ti)));
    } else if (ui.rkTab === 'reserve') {
      var rows = [[L('ID', 'ID'), L('Risk', 'Risque'), L('Cost impact', 'Impact financier'), L('Probability', 'Probabilité'), L('EMV', 'VMA')]], tot = 0;
      P.risks.filter(function (r) { return r.status !== 'closed' && (+r.costImpact || 0); }).forEach(function (r) {
        var pct = r.probPct !== '' && r.probPct != null ? A.num(r.probPct) : (A.pm.probScale().find(function (s) { return s[0] === +r.prob; }) || [0, 0, 0, 0.5])[3] * 100, e = A.pm.emv(r); tot += e;
        rows.push([r.ref, (r.kind === 'opportunity' ? L('(opportunity) ', '(opportunité) ') : '') + (r.event || A.pm.riskStatement(r)), (r.kind === 'opportunity' ? -1 : 1) * (+r.costImpact || 0), Math.round(pct) + ' %', Math.round(e)]);
      });
      rows.push([L('Contingency reserve', 'Réserve pour aléas'), '', '', '', Math.round(tot)]);
      root.appendChild(h('div.card', h('div.card-head', h('h2', L('From risks to reserves', 'Des risques aux réserves') + ' (' + cur + ')')),
        rows.length > 2 ? A.simpleTable(rows, { totalRows: 1, num: false }) : h('p.muted', L('Enter a cost impact on the risks to compute their expected monetary value.', 'Saisir un impact financier sur les risques pour calculer leur valeur monétaire attendue.')),
        h('p.muted', L('Expected monetary value = probability × cost impact. Opportunities reduce the reserve. The contingency reserve covers identified risks and belongs to the project budget; a management reserve for unknown risks is held by the sponsor.',
          'Valeur monétaire attendue = probabilité × impact financier. Les opportunités réduisent la réserve. La réserve pour aléas couvre les risques identifiés et fait partie du budget du projet ; une réserve de gestion pour les risques inconnus est détenue par le promoteur.'))));
    } else {
      root.appendChild(h('div.card', h('div.card-head', h('h2', L('Probability scale', 'Échelle de probabilité'))),
        A.simpleTable([[L('Score', 'Score'), L('Probability', 'Probabilité'), L('Range', 'Plage')]].concat(A.pm.probScale().map(function (x) { return [String(x[0]), x[1], x[2]]; })), { num: false })));
      root.appendChild(h('div.card', h('div.card-head', h('h2', L('Impact scale', 'Échelle d’impact')), h('span.muted', L('after Infrastructure Québec, 2013', 'd’après Infrastructure Québec, 2013'))),
        A.simpleTable([[L('Score', 'Score'), L('Impact', 'Impact'), L('Typical thresholds', 'Seuils typiques')]].concat(A.pm.impactScale().map(function (x) { return [String(x[0]), x[1], x[2]]; })), { num: false })));
      root.appendChild(h('div.card', h('div.card-head', h('h2', L('Response strategies', 'Stratégies de réponse'))),
        A.simpleTable([[L('Threats', 'Menaces'), L('Opportunities', 'Opportunités'), L('Meaning', 'Signification')],
          [L('Escalate', 'Escalader'), L('Escalate', 'Escalader'), L('Beyond the project’s authority: refer to the programme, ministry or board', 'Au-delà de l’autorité du projet : renvoyer au programme, au ministère ou au conseil')],
          [L('Avoid', 'Éviter'), L('Exploit', 'Exploiter'), L('Change the plan so the threat cannot occur / make sure the opportunity happens', 'Modifier le plan pour que la menace ne survienne pas / s’assurer que l’opportunité se réalise')],
          [L('Transfer', 'Transférer'), L('Share', 'Partager'), L('Shift impact and ownership to a third party (insurance, fixed price) / partner with whoever can seize it', 'Transférer l’impact et la responsabilité à un tiers (assurance, prix forfaitaire) / s’associer à qui peut la saisir')],
          [L('Mitigate', 'Atténuer'), L('Enhance', 'Améliorer'), L('Reduce / increase probability or impact', 'Réduire / augmenter la probabilité ou l’impact')],
          [L('Accept', 'Accepter'), L('Accept', 'Accepter'), L('Acknowledge it: active (contingency reserve) or passive', 'En prendre acte : actif (réserve pour aléas) ou passif')]], { num: false })));
    }
  };
  A.views.results = A.views.definition;
})();
