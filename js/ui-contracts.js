/* Project Atlas — Contracts and Procurement views. */
var A = globalThis.A = globalThis.A || {};
(function () {
  var h = A.h, L = A.L;
  function nameOf(list, id) { var o = list.find(function (x) { return x.id === id; }); return o ? o.name : ''; }
  function cGet(id) { return function () { return A.contractById(id); }; }
  function statusPill(c) { return h('span.pill.' + c.status, nameOf(A.cstatuses(), c.status)); }

  /* pick tasks for a contract */
  function linkTasksDialog(c) {
    var chosen = new Set(A.contractTasks(c).map(function (t) { return t.id; }));
    var list = h('div.picklist');
    A.P.tasks.forEach(function (t) {
      if (t.proc) return;
      var n = A.S.info.get(t.id), other = t.contract && t.contract !== c.id ? A.contractById(t.contract) : null;
      list.appendChild(h('label.pick', { style: { paddingLeft: (8 + t.level * 16) + 'px' } },
        h('input', { type: 'checkbox', checked: chosen.has(t.id), onchange: function (e) { if (e.target.checked) chosen.add(t.id); else chosen.delete(t.id); } }),
        h('span' + (n.summary ? '.b' : ''), n.wbs + '  ' + t.name), other ? h('em', ' ' + L('(now in ', '(actuellement dans ') + (other.ref || other.title) + ')') : null));
    });
    A.dialog({
      title: L('Tasks carried out under this contract', 'Tâches réalisées dans le cadre de ce contrat'), wide: true, body: list,
      buttons: [{ label: L('Cancel', 'Annuler') }, { label: L('Save', 'Enregistrer'), primary: true, onclick: function () {
        A.edit(function () { A.P.tasks.forEach(function (t) { if (t.proc) return; if (chosen.has(t.id)) t.contract = c.id; else if (t.contract === c.id) t.contract = 0; }); });
      } }]
    });
  }
  /* create contracts from tasks */
  function fromTasksDialog(generate) {
    var chosen = new Set(), list = h('div.picklist'), any = false;
    A.S.nodes.forEach(function (n) {
      var t = n.t; if (t.proc || t.contract || n.isLoe) return;
      if (n.summary && !n.children.every(function (c) { return !c.summary; })) return;
      any = true;
      list.appendChild(h('label.pick', { style: { paddingLeft: (8 + t.level * 16) + 'px' } },
        h('input', { type: 'checkbox', onchange: function (e) { if (e.target.checked) chosen.add(t.id); else chosen.delete(t.id); } }),
        h('span', n.wbs + '  ' + t.name), h('em', n.cost ? '  ' + A.money(n.cost) + ' ' + A.P.currency : '')));
    });
    if (!any) return A.toast(L('Every task already belongs to a contract.', 'Toutes les tâches appartiennent déjà à un contrat.'));
    A.dialog({
      title: generate ? L('Generate procurement activities', 'Générer les activités de passation') : L('Create contracts from tasks', 'Créer des contrats à partir des tâches'), wide: true,
      body: h('div', h('p.muted', generate ? L('Tick the tasks that will each be carried out under one contract. A contract is created for each, with the method suggested by the thresholds, and its procurement steps are added to the plan before the task.', 'Cocher les tâches qui seront réalisées chacune par un contrat. Un contrat est créé pour chacune, avec la méthode proposée par les seuils, et ses étapes de passation sont ajoutées au plan avant la tâche.')
        : L('Tick the tasks that will each be carried out under one contract. The estimate is taken from the task cost.', "Cocher les tâches qui seront réalisées chacune par un contrat. L'estimation reprend le coût de la tâche.")), list),
      buttons: [{ label: L('Cancel', 'Annuler') }, { label: L('Create', 'Créer'), primary: true, onclick: function () {
        if (!chosen.size) return false;
        A.edit(function () {
          A.P.tasks.forEach(function (t) {
            if (!chosen.has(t.id)) return;
            var n = A.S.info.get(t.id), c = A.newContract(t.name), cat = (A.catById(n.cat) || {}).name || '';
            c.estimate = Math.round(n.cost); c.ref = 'C-' + String(A.P.contracts.length + 1).padStart(2, '0');
            c.pcat = /good|bien|fournit|equip|équip/i.test(cat) ? 'goods' : /consult|service|étude|etude|audit/i.test(cat) ? 'firm' : 'works';
            A.P.contracts.push(c); t.contract = c.id; A.ui.contractId = c.id;
            if (generate) { if (!c.procParent && A.P.procHome) c.procParent = A.P.procHome; A.generateProcurement(c); }
          });
        });
        if (generate) A.toast(L('Contracts created and procurement steps added to the plan.', 'Contrats créés et étapes de passation ajoutées au plan.'), 'ok');
      } }]
    });
  }
  A.fromTasksDialog = fromTasksDialog;

  /* ---------- Contracts ---------- */
  A.views.contracts = function (root) {
    var ui = A.ui, P = A.P, cur = P.currency;
    if (!A.contractById(ui.contractId)) ui.contractId = P.contracts.length ? P.contracts[0].id : null;
    root.appendChild(h('div.toolbar',
      h('div.tg', A.btn('plus', L('Contract', 'Contrat'), function () {
        var c; A.edit(function () { c = A.newContract(L('New contract', 'Nouveau contrat')); c.ref = 'C-' + String(P.contracts.length + 1).padStart(2, '0'); P.contracts.push(c); });
        ui.contractId = c.id; ui.contractTab = 'general'; A.refresh();
      }, { primary: true }),
        A.btn('child', L('From tasks…', 'Depuis les tâches…'), fromTasksDialog, { title: L('Create contracts from tasks of the plan', 'Créer des contrats à partir de tâches du plan') })),
      h('div.tg.muted', P.contracts.length + L(' contracts', ' contrats'))));
    if (!P.contracts.length) {
      root.appendChild(h('div.empty-state', h('h3', L('No contract yet', 'Aucun contrat pour le moment')),
        h('p', L('A contract groups one or more tasks of the plan. Atlas then follows its procurement, milestones, payments, guarantees, amendments and claims.', 'Un contrat regroupe une ou plusieurs tâches du plan. Atlas suit ensuite sa passation, ses jalons, paiements, garanties, avenants et réclamations.')),
        A.btn('child', L('Create contracts from tasks…', 'Créer des contrats à partir des tâches…'), fromTasksDialog, { primary: true })));
      return;
    }
    /* register */
    var infos = P.contracts.map(A.contractInfo), tot = { est: 0, rev: 0, paid: 0 };
    var ids = P.contracts.map(function (c) { return c.id; }); ui.cSel.forEach(function (id) { if (ids.indexOf(id) < 0) ui.cSel.delete(id); });
    var table = h('table.data.pickable'), allCb = h('input', { type: 'checkbox', checked: ui.cSel.size === P.contracts.length && P.contracts.length > 0, title: L('Select all', 'Tout sélectionner'),
      onclick: function (e) { e.stopPropagation(); ui.cSel = allCb.checked ? new Set(ids) : new Set(); A.refresh(); } });
    table.appendChild(h('thead', h('tr', h('th.ck', allCb), h('th', L('Ref.', 'Réf.')), h('th', L('Contract', 'Contrat')), h('th', L('Contractor', 'Titulaire')), h('th', L('Method', 'Méthode')),
      h('th.r', L('Amount', 'Montant') + ' (' + cur + ')'), h('th.r', L('Paid', 'Payé')), h('th', L('Start', 'Début')), h('th', L('End', 'Fin')), h('th', L('Progress', 'Avancement')), h('th', L('Status', 'Statut')), h('th', L('Alerts', 'Alertes')))));
    var tb = h('tbody');
    infos.forEach(function (o) {
      var c = o.c, bad = o.alerts.filter(function (a) { return a.level === 'bad'; }).length, warn = o.alerts.filter(function (a) { return a.level === 'warn'; }).length;
      tot.est += o.base; tot.rev += o.revised; tot.paid += o.paid;
      var cb = h('input', { type: 'checkbox', checked: ui.cSel.has(c.id), onclick: function (e) { e.stopPropagation(); if (cb.checked) ui.cSel.add(c.id); else ui.cSel.delete(c.id); A.refresh(); } });
      tb.appendChild(h('tr' + (c.id === ui.contractId ? '.sel' : '') + (ui.cSel.has(c.id) ? '.ticked' : ''), { tabindex: 0, onclick: function (e) { if (e.shiftKey || e.ctrlKey || e.metaKey) { if (ui.cSel.has(c.id)) ui.cSel.delete(c.id); else ui.cSel.add(c.id); } ui.contractId = c.id; A.refresh(); }, onkeydown: function (e) { if (e.key === 'Enter') { ui.contractId = c.id; A.refresh(); } if (e.key === ' ') { e.preventDefault(); if (ui.cSel.has(c.id)) ui.cSel.delete(c.id); else ui.cSel.add(c.id); A.refresh(); } } },
        h('td.ck', cb), h('td', c.ref), h('td.b', c.title), h('td', c.contractor || '—'), h('td', { title: A.methodName(A.effMethod(c)) }, A.methodShort(A.effMethod(c))),
        h('td.r', A.money(o.revised)), h('td.r', o.revised ? Math.round(o.paid / o.revised * 100) + ' %' : ''), h('td', A.fmtDate(o.start)), h('td', A.fmtDate(o.revEnd)),
        h('td', h('div.meter', { title: Math.round(o.pct) + ' %' }, h('i', { style: { width: Math.round(o.pct) + '%' } }))), h('td', statusPill(c)),
        h('td', bad ? h('span.badge.bad', { title: o.alerts.map(function (a) { return a.text; }).join('\n') }, bad) : null, warn ? h('span.badge.warn', { title: o.alerts.map(function (a) { return a.text; }).join('\n') }, warn) : null)));
    });
    table.appendChild(tb);
    table.appendChild(h('tfoot', h('tr.total', h('td', { colspan: 5 }, L('Total', 'Total')), h('td.r', A.money(tot.rev)), h('td.r', tot.rev ? Math.round(tot.paid / tot.rev * 100) + ' %' : ''), h('td', { colspan: 5 }))));
    root.appendChild(h('div.card.flush', h('div.scroll-x.register', table)));
    if (ui.cSel.size) {
      var selC = P.contracts.filter(function (c) { return ui.cSel.has(c.id); }), selTot = 0; selC.forEach(function (c) { selTot += A.contractInfo(c).revised; });
      var stSel = h('select.in.sm', h('option', { value: '' }, L('Change status…', 'Changer le statut…')), A.cstatuses().map(function (s) { return h('option', { value: s.id }, s.name); }));
      stSel.addEventListener('change', function () { var v = stSel.value; if (!v) return; A.edit(function () { A.P.contracts.forEach(function (c) { if (ui.cSel.has(c.id)) c.status = v; }); }); });
      root.appendChild(h('div.toolbar.bulk',
        h('div.tg', h('b', selC.length + L(' contracts selected', ' contrats sélectionnés')), h('span.muted', ' · ' + A.money(selTot) + ' ' + cur)),
        h('div.tg', A.btn('gear', L('Generate procurement steps', 'Générer les étapes de passation'), function () {
          A.edit(function () { A.P.contracts.forEach(function (c) { if (ui.cSel.has(c.id)) { if (!c.procParent && A.P.procHome) c.procParent = A.P.procHome; A.generateProcurement(c); } }); });
          A.toast(L('Procurement steps created for the selected contracts.', 'Étapes de passation créées pour les contrats sélectionnés.'), 'ok');
        }), stSel,
          A.btn('down2', 'Excel', function () { A.exportContractsXLSX(selC); }, { title: L('Export the selected contracts to Excel', 'Exporter les contrats sélectionnés vers Excel') }),
          A.btn('trash', L('Delete', 'Supprimer'), function () {
            A.confirm(L('Delete the ', 'Supprimer les ') + selC.length + L(' selected contracts and their procurement steps? The tasks carried out under them are kept.', ' contrats sélectionnés et leurs étapes de passation ? Les tâches réalisées sont conservées.'), L('Delete', 'Supprimer'), function () {
              A.edit(function () { selC.forEach(function (c) { A.removeProcurement(c); A.P.tasks.forEach(function (t) { if (t.contract === c.id) t.contract = 0; }); }); A.P.contracts = A.P.contracts.filter(function (c) { return !ui.cSel.has(c.id); }); ui.cSel = new Set(); });
            });
          }, { danger: true })),
        h('div.tg', A.btn('close', L('Clear selection', 'Annuler la sélection'), function () { ui.cSel = new Set(); A.refresh(); }, { ghost: true }))));
    }

    /* detail */
    var c = A.contractById(ui.contractId), o = A.contractInfo(c), g = cGet(c.id), fk = 'c' + c.id + ':';
    var tabs = [['general', L('General', 'Général')], ['milestones', L('Milestones', 'Jalons') + ' (' + c.milestones.length + ')'], ['payments', L('Payments', 'Paiements') + ' (' + c.payments.length + ')'],
      ['guarantees', L('Guarantees', 'Garanties') + ' (' + c.guarantees.length + ')'], ['changes', L('Changes & claims', 'Avenants et réclamations') + ' (' + c.changes.length + ')']];
    var card = h('div.card');
    card.appendChild(h('div.card-head', h('h2', (c.ref ? c.ref + ' · ' : '') + c.title), statusPill(c), h('span.sp'),
      A.btn('trash', L('Delete contract', 'Supprimer le contrat'), function () {
        A.confirm(L('Delete this contract and its procurement steps? The tasks carried out under it are kept.', 'Supprimer ce contrat et ses étapes de passation ? Les tâches réalisées sont conservées.'), L('Delete', 'Supprimer'), function () {
          A.edit(function () { A.removeProcurement(c); A.P.tasks.forEach(function (t) { if (t.contract === c.id) t.contract = 0; }); A.P.contracts = A.P.contracts.filter(function (x) { return x.id !== c.id; }); });
        });
      }, { ghost: true, danger: true })));
    card.appendChild(h('div.kpis.small',
      kpi(L('Original amount', 'Montant initial'), A.money(o.base), cur + (c.amount ? '' : L(' · estimate', ' · estimation'))),
      kpi(L('Revised amount', 'Montant révisé'), A.money(o.revised), o.delta ? (o.delta > 0 ? '+' : '') + A.money(o.delta) + L(' approved changes', " d'avenants approuvés") : L('no approved change', 'aucun avenant approuvé')),
      kpi(L('Paid', 'Payé'), A.money(o.paid), o.revised ? Math.round(o.paid / o.revised * 100) + ' % · ' + L('balance ', 'solde ') + A.money(o.balance) : ''),
      kpi(L('End date', 'Date de fin'), A.fmtDate(o.revEnd) || '—', o.days ? '+' + o.days + L(' days granted', ' jours accordés') : L('as planned', 'comme prévu')),
      kpi(L('Physical progress', 'Avancement physique'), Math.round(o.pct) + ' %', L('from the linked tasks', 'selon les tâches liées'))));
    if (o.alerts.length) card.appendChild(h('div.alerts', o.alerts.map(function (a) { return h('div.alert.' + a.level, A.icon(a.level === 'info' ? 'info' : 'warn'), a.text); })));
    card.appendChild(h('div.subtabs', { role: 'tablist' }, tabs.map(function (t) { return h('button' + (ui.contractTab === t[0] ? '.on' : ''), { type: 'button', role: 'tab', onclick: function () { ui.contractTab = t[0]; A.refresh(); } }, t[1]); })));
    var body = h('div.subbody'); card.appendChild(body);
    var F = A.field, I = function (k, type, opts) { return A.live(g, k, type, Object.assign({ fk: fk + k }, opts || {})); };
    if (ui.contractTab === 'general') {
      var linked = A.contractTasks(c);
      body.appendChild(h('div.form',
        h('div.cols4', F(L('Reference', 'Référence'), I('ref')), F(L('Title', 'Intitulé'), I('title'), null, 'span2'), F(L('Status', 'Statut'), I('status', 'select', { options: A.cstatuses() }))),
        h('div.cols4', F(L('Contractor / supplier / consultant', 'Titulaire / fournisseur / consultant'), I('contractor'), null, 'span2'), F(L('Procurement category', 'Catégorie de marché'), I('pcat', 'select', { options: A.pcats() })), F(L('Contract type', 'Type de contrat'), I('ctype', 'select', { options: A.ctypes() }))),
        h('div.cols4', F(L('Estimate', 'Estimation') + ' (' + cur + ')', I('estimate', 'num')), F(L('Signed amount', 'Montant signé') + ' (' + cur + ')', I('amount', 'num'), L('leave empty until signature', "laisser vide jusqu'à la signature")),
          F(L('Advance payment %', 'Avance de démarrage %'), I('advPct', 'pct', { zero: true })), F(L('Retention %', 'Retenue de garantie %'), I('retPct', 'pct', { zero: true }))),
        h('div.cols4', F(L('Signature date', 'Date de signature'), I('sign', 'date'), o.signPlan != null ? L('planned ', 'prévue ') + A.fmtDate(o.signPlan) : null),
          F(L('Contractual start', 'Début contractuel'), I('start', 'date'), o.planStart != null ? L('planned ', 'prévu ') + A.fmtDate(o.planStart) : null),
          F(L('Contractual end', 'Fin contractuelle'), I('end', 'date'), o.planEnd != null ? L('planned ', 'prévue ') + A.fmtDate(o.planEnd) : null), h('div')),
        F(L('Notes', 'Notes'), I('notes', 'area'), null, 'full')));
      body.appendChild(h('h3', L('Tasks carried out under this contract', 'Tâches réalisées dans le cadre de ce contrat')));
      body.appendChild(linked.length ? h('ul.tasklist', linked.map(function (t) {
        var n = A.S.info.get(t.id);
        return h('li', h('a', { href: '#', onclick: function (e) { e.preventDefault(); A.goToTask(t.id); } }, n.wbs + '  ' + t.name), h('span.muted', '  ' + A.fmtDate(n.start) + ' → ' + A.fmtDate(n.finish) + ' · ' + Math.round(n.pct) + ' %'));
      })) : h('p.muted', L('No task is linked yet: planned dates and progress cannot be followed.', "Aucune tâche liée : les dates prévues et l'avancement ne peuvent pas être suivis.")));
      body.appendChild(A.btn('link', L('Choose tasks…', 'Choisir les tâches…'), function () { linkTasksDialog(c); }));
    } else if (ui.contractTab === 'milestones') {
      body.appendChild(A.listEditor({
        id: fk + 'ms', rows: function () { return g().milestones; },
        cols: [{ k: 'name', label: L('Milestone / deliverable', 'Jalon / livrable') }, { k: 'due', label: L('Due date', 'Date prévue'), type: 'date', w: 150 }, { k: 'actual', label: L('Actual date', 'Date réelle'), type: 'date', w: 150 },
          { k: 'status', label: L('Status', 'Statut'), type: 'select', w: 150, options: [{ id: 'planned', name: L('Planned', 'Prévu') }, { id: 'submitted', name: L('Submitted', 'Soumis') }, { id: 'done', name: L('Accepted', 'Accepté') }] },
          { k: 'task', label: 'Gantt', ro: true, get: function (r) { return r.task && A.taskById(r.task) ? '✓' : ''; }, w: 60 }],
        add: function () { return { id: A.uid(), name: L('New milestone', 'Nouveau jalon'), due: A.toISO(o.revEnd != null ? o.revEnd : A.S.finish), actual: '', status: 'planned' }; },
        del: function (r) { if (r.task) A.ops.remove([r.task]); },
        addLabel: L('Add milestone', 'Ajouter un jalon'),
        extra: A.btn('diamond', L('Show on the Gantt', 'Afficher dans le Gantt'), function () {
          A.edit(function () {
            var cc = g(), linked = A.contractTasks(cc), at, lv;
            if (linked.length) { var li = A.taskIndex(linked[linked.length - 1].id); at = A.blockEnd(li); lv = A.P.tasks[li].level; } else { at = A.P.tasks.length; lv = 0; }
            cc.milestones.forEach(function (m) {
              var t = m.task ? A.taskById(m.task) : null;
              if (!t) { t = A.ops.insert(at++, '', lv, { ms: true, dur: 0, cmile: cc.id }); m.task = t.id; }
              t.name = m.name + ' (' + (cc.ref || cc.title) + ')'; t.ctype = m.due ? 'MSO' : 'ASAP'; t.cdate = m.due || ''; t.af = m.actual || ''; t.as = m.actual || ''; if (m.status === 'done') t.pct = 100;
            });
          });
          A.toast(L('Milestones added to the plan as fixed-date milestones.', 'Jalons ajoutés au plan comme jalons à date fixe.'), 'ok');
        }, { title: L('Create or update a milestone in the plan for each contract milestone', 'Créer ou mettre à jour un jalon dans le plan pour chaque jalon du contrat') })
      }));
    } else if (ui.contractTab === 'payments') {
      var sum = 0, paid = 0; c.payments.forEach(function (p) { sum += +p.amount || 0; if (p.status === 'paid') paid += +p.paid || +p.amount || 0; });
      body.appendChild(A.listEditor({
        id: fk + 'pay', rows: function () { return g().payments; },
        cols: [{ k: 'label', label: L('Payment', 'Paiement') },
          { k: 'type', label: L('Kind', 'Nature'), type: 'select', w: 150, options: [{ id: 'advance', name: L('Advance', 'Avance') }, { id: 'interim', name: L('Interim', 'Décompte') }, { id: 'final', name: L('Final', 'Final') }, { id: 'retention', name: L('Retention release', 'Libération de retenue') }] },
          { k: 'due', label: L('Due date', 'Échéance'), type: 'date', w: 150 }, { k: 'amount', label: L('Amount', 'Montant'), type: 'num', w: 130 },
          { k: 'status', label: L('Status', 'Statut'), type: 'select', w: 130, options: [{ id: 'planned', name: L('Planned', 'Prévu') }, { id: 'invoiced', name: L('Invoiced', 'Facturé') }, { id: 'paid', name: L('Paid', 'Payé') }],
            set: function (r, v) { r.status = v; if (v === 'paid') { if (!r.paid) r.paid = r.amount; if (!r.paidDate) r.paidDate = A.P.statusDate || A.todayISO(); } } },
          { k: 'paidDate', label: L('Paid on', 'Payé le'), type: 'date', w: 150 }, { k: 'paid', label: L('Amount paid', 'Montant payé'), type: 'num', w: 130 }],
        rowClass: function (r) { var d = A.toDay(r.due), today = A.toDay(A.P.statusDate) || A.toDay(A.todayISO()); return r.status === 'paid' ? '.done' : (d != null && d < today ? '.late' : ''); },
        add: function () { return { id: A.uid(), label: L('Payment', 'Paiement'), type: 'interim', due: A.toISO(o.revEnd != null ? o.revEnd : A.S.finish), amount: 0, status: 'planned', paidDate: '', paid: 0 }; },
        addLabel: L('Add payment', 'Ajouter un paiement'),
        foot: h('tfoot', h('tr.total', h('td', { colspan: 3 }, L('Total scheduled', 'Total échéancier')), h('td.r', A.money(sum)), h('td', { colspan: 2 }, L('Total paid', 'Total payé')), h('td.r', A.money(paid)), h('td'))),
        extra: A.btn('gear', L('Build standard schedule', 'Générer un échéancier type'), function () {
          var go = function () { A.edit(function () { A.generatePayments(g()); }); };
          if (c.payments.length) A.confirm(L('Replace the current payment schedule?', "Remplacer l'échéancier actuel ?"), L('Replace', 'Remplacer'), go); else go();
        }, { title: L('Advance, quarterly interim payments and retention release, from the percentages of the General tab', "Avance, décomptes trimestriels et libération de la retenue, selon les pourcentages de l'onglet Général") })
      }));
    } else if (ui.contractTab === 'guarantees') {
      body.appendChild(A.listEditor({
        id: fk + 'gar', rows: function () { return g().guarantees; },
        cols: [{ k: 'type', label: L('Guarantee', 'Garantie'), type: 'select', options: ['bid', 'advance', 'performance', 'retention'].map(function (x) { return { id: x, name: A.guaranteeName(x) }; }) },
          { k: 'amount', label: L('Amount', 'Montant'), type: 'num', w: 130 }, { k: 'issuer', label: L('Issuing bank', 'Banque émettrice') },
          { k: 'issued', label: L('Issued on', 'Émise le'), type: 'date', w: 150 }, { k: 'expiry', label: L('Expires on', 'Expire le'), type: 'date', w: 150 },
          { k: 'status', label: L('Status', 'Statut'), type: 'select', w: 130, options: [{ id: 'planned', name: L('Expected', 'Attendue') }, { id: 'valid', name: L('Valid', 'Valide') }, { id: 'released', name: L('Released', 'Libérée') }] }],
        add: function () { return { id: A.uid(), type: 'performance', amount: Math.round(o.revised * 0.1), issuer: '', issued: c.sign || '', expiry: A.toISO(o.revEnd != null ? o.revEnd + 28 : A.S.finish), status: 'planned' }; },
        addLabel: L('Add guarantee', 'Ajouter une garantie')
      }));
      body.appendChild(h('p.muted', L('Atlas warns 30 days before a guarantee expires, and when it would expire before the revised end of the contract.', "Atlas avertit 30 jours avant l'expiration d'une garantie, et lorsqu'elle expirerait avant la fin révisée du contrat.")));
    } else {
      body.appendChild(A.listEditor({
        id: fk + 'chg', rows: function () { return g().changes; },
        cols: [{ k: 'type', label: L('Kind', 'Nature'), type: 'select', w: 190, options: ['amendment', 'variation', 'extension', 'claim', 'penalty'].map(function (x) { return { id: x, name: A.changeName(x) }; }) },
          { k: 'ref', label: L('No.', 'N°'), w: 80 }, { k: 'date', label: L('Date', 'Date'), type: 'date', w: 150 }, { k: 'desc', label: L('Description', 'Description') },
          { k: 'amount', label: L('Amount (+/−)', 'Montant (+/−)'), type: 'num', w: 130 }, { k: 'days', label: L('Days (+/−)', 'Jours (+/−)'), type: 'num', w: 90 },
          { k: 'status', label: L('Status', 'Statut'), type: 'select', w: 130, options: [{ id: 'pending', name: L('Under review', 'En examen') }, { id: 'approved', name: L('Approved', 'Approuvé') }, { id: 'rejected', name: L('Rejected', 'Rejeté') }] }],
        add: function () { return { id: A.uid(), type: 'amendment', ref: String(c.changes.length + 1), date: A.P.statusDate || A.todayISO(), desc: '', amount: 0, days: 0, status: 'pending' }; },
        addLabel: L('Add change or claim', 'Ajouter un avenant ou une réclamation')
      }));
      body.appendChild(h('p.muted', L('Approved amendments, variation orders and extensions change the revised amount and end date. Approved penalties are tracked separately: ', 'Les avenants, ordres de modification et prolongations approuvés modifient le montant et la fin révisés. Les pénalités approuvées sont suivies à part : ') + A.money(o.penalties) + ' ' + cur + '. ' +
        L('Claims under review: ', 'Réclamations en examen : ') + A.money(o.pendingClaims) + ' ' + cur + '.'));
    }
    root.appendChild(card);
  };
  function kpi(label, value, sub) { return h('div.kpi', h('span.k', label), h('span.v', value), sub ? h('span.s', sub) : null); }
  A.kpi = kpi;

  /* ---------- Procurement ---------- */
  A.views.procurement = function (root) {
    var P = A.P, cur = P.currency, th = P.thresholds;
    var homeOpts = [{ id: 0, name: L('next to each contract’s tasks', 'à côté des tâches de chaque contrat') }].concat(
      A.S.nodes.filter(function (n) { return !n.t.proc && (n.summary || n.t.level <= 1) && !n.t.contract; }).map(function (n) { return { id: n.id, name: n.wbs + '  ' + n.t.name }; }));
    var homeSel = A.live(function () { return A.P; }, 'procHome', 'select', { options: homeOpts, fk: 'procHome' });
    if (P.procHome == null) homeSel.selectedIndex = 0;
    root.appendChild(h('div.toolbar',
      h('div.tg', A.btn('gear', L('Generate procurement activities…', 'Générer les activités de passation…'), function () { A.fromTasksDialog(true); }, { primary: true, title: L('Choose tasks: a contract and its procurement steps are created for each', 'Choisir des tâches : un contrat et ses étapes de passation sont créés pour chacune') }),
        A.btn('gear', L('Generate all steps', 'Générer toutes les étapes'), function () {
          A.edit(function () { A.P.contracts.forEach(function (c) { if (!c.procParent && A.P.procHome) c.procParent = A.P.procHome; A.generateProcurement(c); }); });
          A.toast(L('Procurement steps created in the plan for every contract.', 'Étapes de passation créées dans le plan pour chaque contrat.'), 'ok');
        }, { title: L('Create or rebuild the procurement steps of every contract as tasks of the plan', 'Créer ou reconstruire les étapes de passation de chaque contrat comme tâches du plan'), disabled: !P.contracts.length })),
      h('div.tg', h('span.muted', L('Place new steps', 'Placer les nouvelles étapes')), homeSel)));

    /* thresholds */
    function T(obj, key, fkk) { return A.live(function () { return A.P.thresholds[obj]; }, key, 'num', { fk: 'th:' + obj + ':' + key + (fkk || ''), zero: true }); }
    root.appendChild(h('details.card', { open: A.ui.thOpen ? true : null, ontoggle: function (e) { A.ui.thOpen = e.target.open; } },
      h('summary', L('Thresholds of the financing agreement', "Seuils de l'accord de financement"), h('span.muted', '  ' + L('used to suggest the method and the review', 'utilisés pour proposer la méthode et la revue'))),
      h('div.scroll-x', h('table.data.th',
        h('thead', h('tr', h('th', ''), h('th.r', L('International bidding from', "Appel d'offres international à partir de")), h('th.r', L('National bidding from', "Appel d'offres national à partir de")), h('th.r', L('Prior review from', 'Revue a priori à partir de')))),
        h('tbody',
          h('tr', h('td', L('Works', 'Travaux')), h('td.r', T('works', 'icb')), h('td.r', T('works', 'ncb')), h('td.r', T('works', 'prior'))),
          h('tr', h('td', L('Goods and non-consulting services', 'Biens et services autres que consultants')), h('td.r', T('goods', 'icb')), h('td.r', T('goods', 'ncb')), h('td.r', T('goods', 'prior'))),
          h('tr', h('td', L('Consulting firms', 'Firmes de consultants')), h('td.r', '—'), h('td.r', '—'), h('td.r', T('firm', 'prior'))),
          h('tr', h('td', L('Individual consultants', 'Consultants individuels')), h('td.r', '—'), h('td.r', '—'), h('td.r', T('indiv', 'prior')))))),
      h('p.muted', L('Below the national bidding threshold, a request for quotations is suggested. Amounts in ', "Sous le seuil de l'appel d'offres national, une demande de cotations est proposée. Montants en ") + cur + '.')));

    if (!P.contracts.length) {
      root.appendChild(h('div.empty-state', h('h3', L('Procurement plan', 'Plan de passation des marchés')),
        h('p', L('Create the contracts first. For each one, Atlas suggests a method from the thresholds, then adds the procurement steps to the plan so that the contract starts after its signature.', "Créer d'abord les contrats. Pour chacun, Atlas propose une méthode d'après les seuils, puis ajoute les étapes de passation au plan afin que le contrat démarre après sa signature."))));
      return;
    }
    var table = h('table.list.plan');
    table.appendChild(h('thead', h('tr', h('th', { style: { width: '70px' } }, L('Ref.', 'Réf.')), h('th', L('Contract', 'Contrat')), h('th', { style: { width: '150px' } }, L('Category', 'Catégorie')), h('th.r', { style: { width: '120px' } }, L('Estimate', 'Estimation')),
      h('th', { style: { width: '230px' } }, L('Method', 'Méthode')), h('th', { style: { width: '130px' } }, L('Bank review', 'Revue de la Banque')), h('th', { style: { width: '150px' } }, L('Contract type', 'Type de contrat')),
      h('th', { style: { width: '90px' } }, L('Lead time', 'Délai')), h('th', { style: { width: '104px' } }, L('Launch', 'Lancement')), h('th', { style: { width: '104px' } }, L('Signature', 'Signature')), h('th', { style: { width: '150px' } }, L('Steps in the plan', 'Étapes dans le plan')))));
    var tb = h('tbody');
    P.contracts.forEach(function (c) {
      var g = cGet(c.id), fk = 'pp' + c.id + ':', o = A.contractInfo(c), sm = A.suggestMethod(c), sr = A.suggestReview(c), steps = A.procTasks(c).length;
      var mOpts = [{ id: '', name: L('Auto: ', 'Auto : ') + A.methodShort(sm) }].concat(A.METHODS.filter(function (m) { return m.for.indexOf(c.pcat) >= 0; }).map(function (m) { return { id: m.id, name: A.methodShort(m.id) + ' – ' + A.L(m.en, m.fr).replace(/\s*\(.*\)$/, '') }; }));
      var rOpts = [{ id: '', name: L('Auto: ', 'Auto : ') + (sr === 'prior' ? L('prior', 'a priori') : L('post', 'a posteriori')) }, { id: 'prior', name: L('Prior review', 'Revue a priori') }, { id: 'post', name: L('Post review', 'Revue a posteriori') }];
      var mdef = A.methodById(A.effMethod(c)), leadObj = { lead: c.lead || (mdef ? mdef.lead : 0), unit: (c.lead || (mdef ? mdef.lead : 0)) % P.calendar.daysPerMonth === 0 ? 'mo' : 'd' };
      var leadIn = A.input(leadObj, 'lead', 'dur', { unitKey: 'unit', fk: fk + 'lead', after: function () { A.commitLater(function () { g().lead = leadObj.lead; }); }, title: L('From launch to contract signature', 'Du lancement à la signature du contrat') });
      tb.appendChild(h('tr',
        h('td', A.live(g, 'ref', 'text', { fk: fk + 'ref' })), h('td', A.live(g, 'title', 'text', { fk: fk + 'title' })),
        h('td', A.live(g, 'pcat', 'select', { options: A.pcats(), fk: fk + 'pcat', set: function (cc, v) { cc.pcat = v; var mm = A.methodById(cc.method); if (mm && mm.for.indexOf(v) < 0) cc.method = ''; } })),
        h('td.r', A.live(g, 'estimate', 'num', { fk: fk + 'est' })),
        h('td', A.live(g, 'method', 'select', { options: mOpts, fk: fk + 'method' })), h('td', A.live(g, 'review', 'select', { options: rOpts, fk: fk + 'review' })),
        h('td', A.live(g, 'ctype', 'select', { options: A.ctypes(), fk: fk + 'ctype' })), h('td', leadIn),
        h('td.ro', A.fmtDate(o.launch) || '—'), h('td.ro', c.sign ? A.fmtDate(c.sign) : (A.fmtDate(o.signPlan) || '—')),
        h('td.act2', A.btn(null, steps ? L('Rebuild', 'Reconstruire') : L('Generate', 'Générer'), function () {
          A.edit(function () { var cc = g(); if (!cc.procParent && A.P.procHome) cc.procParent = A.P.procHome; A.generateProcurement(cc); });
        }, { title: steps ? L('Rebuild the steps with the current method, review and lead time', 'Reconstruire les étapes avec la méthode, la revue et le délai actuels') : L('Add the procurement steps to the plan', 'Ajouter les étapes de passation au plan') }),
          steps ? A.btn('trash', L('Remove the steps from the plan', 'Retirer les étapes du plan'), function () { A.edit(function () { A.removeProcurement(g()); }); }, { iconOnly: true, ghost: true }) : null)));
    });
    table.appendChild(tb);
    root.appendChild(h('div.card.flush', h('div.scroll-x', table)));
    root.appendChild(h('p.muted.pad', L('Generated steps are ordinary tasks (shown in amber in the Gantt): adjust their durations, or give the first step a start date to launch the procurement just in time. The contract’s tasks start after the “Contract signed” milestone.',
      'Les étapes générées sont des tâches ordinaires (en ambre dans le Gantt) : ajuster leurs durées, ou donner une date de début à la première étape pour lancer la passation juste à temps. Les tâches du contrat démarrent après le jalon « Contrat signé ».')));
  };
  A.goToTask = function (id) {
    A.edit(function () { // unfold the ancestors so the task is visible
      var i = A.taskIndex(id), lv = A.P.tasks[i].level;
      for (var j = i - 1; j >= 0 && lv > 0; j--) if (A.P.tasks[j].level < lv) { A.P.tasks[j].collapsed = false; lv = A.P.tasks[j].level; }
    });
    A.ui.sel = new Set([id]); A.ui.anchor = id; A.go('gantt');
    setTimeout(function () { var tr = document.querySelector('.grid tr[data-id="' + id + '"]'); if (tr) tr.scrollIntoView({ block: 'center' }); }, 50);
  };
})();
