/* Project Atlas — application shell: header, menus, tabs, files, start-up. */
var A = globalThis.A = globalThis.A || {};
(function () {
  var h = A.h, L = A.L;
  function tabs() {
    return [['dashboard', L('Dashboard', 'Tableau de bord')], ['wbs', 'WBS'], ['gantt', 'Gantt'], ['resources', L('Resources', 'Ressources')],
      ['procurement', L('Procurement', 'Passation')], ['contracts', L('Contracts', 'Contrats')], ['finance', L('Budget & cash flow', 'Budget et trésorerie')], ['evm', L('Earned value', 'Valeur acquise')],
      ['reports', L('Reports', 'Rapports')], ['project', L('Project', 'Projet')]];
  }
  function prefs(save) {
    try {
      if (save) localStorage.setItem('project-atlas.prefs', JSON.stringify({ lang: A.lang, tab: A.ui.tab }));
      else return JSON.parse(localStorage.getItem('project-atlas.prefs') || '{}');
    } catch (e) { return {}; }
  }
  A.go = function (tab) { A.ui.tab = tab; prefs(true); A.refresh(); window.scrollTo(0, 0); };

  /* ---------- files ---------- */
  function guard(fn) {
    return function () {
      var args = arguments;
      if (!A.P.tasks.length && !A.P.contracts.length) return fn.apply(null, args);
      A.confirm(L('The current project will be replaced. It stays available through Undo until you close the page; save it first if you want to keep a file.', 'Le projet actuel sera remplacé. Il reste accessible par Annuler jusqu’à la fermeture de la page ; l’enregistrer d’abord pour conserver un fichier.'),
        L('Continue', 'Continuer'), function () { fn.apply(null, args); });
    };
  }
  function replaceProject(p) {
    var before = JSON.stringify(A.P), stack = A.undoStack.slice();
    A.ui.sel = new Set(); A.ui.zoom = null; A.ui.contractId = null; A.ui.showBase = false; A.ui.evmSel = null;
    A.setProject(p);
    A.undoStack = stack.concat([before]);
    A.refresh();
  }
  A.fileNew = guard(function () { replaceProject(A.newProject()); A.go('project'); });
  A.loadExample = guard(function () { replaceProject(A.buildAzuriya()); A.go('dashboard'); A.toast(L('Example loaded: Azuriya Health Project.', 'Exemple chargé : Projet Santé Azuriya.'), 'ok'); });
  A.loadABCDE = guard(function () { replaceProject(A.buildABCDE()); A.ui.evmTab = 'dash'; A.go('evm'); A.toast(L('Example loaded: Project ABCDE.', 'Exemple chargé : Projet ABCDE.'), 'ok'); });
  A.fileSave = function () { A.download(A.fileName('.atlas'), JSON.stringify(A.P, null, 1), 'application/json'); };
  function openText(text, name) {
    try {
      var p;
      if (/^\s*</.test(text)) p = A.importMSPXML(text);
      else { p = JSON.parse(text); if (A.evm.isTrackerFile(p)) p = A.evm.fromTracker(p); if (!p || !Array.isArray(p.tasks)) throw L('This file is not a Project Atlas file.', 'Ce fichier n’est pas un fichier Project Atlas.'); }
      replaceProject(p); A.go(p.tasks.length ? 'gantt' : 'dashboard');
      A.toast(L('Opened ', 'Ouvert : ') + name, 'ok');
    } catch (e) { A.toast(String(e.message || e), 'bad'); }
  }
  A.fileOpen = guard(function () { A.pickFile('.atlas,.json,.xml', openText); });
  A.importXML = guard(function () { A.pickFile('.xml', openText); });
  A.importSheet = function () {
    A.pickFile('.xlsx,.xls,.csv', function (data, name) {
      try {
        var rows;
        if (/\.csv$/i.test(name)) rows = A.parseCSV(new TextDecoder('utf-8').decode(data));
        else { var wb = XLSX.read(data, { type: 'array', cellDates: true }); rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, dateNF: 'yyyy-mm-dd', defval: '' }); }
        var n = 0, err = null;
        A.edit(function () { try { n = A.importTaskRows(rows); } catch (e) { err = e; return false; } });
        if (err) throw err;
        A.go('gantt'); A.toast(n + L(' tasks imported from ', ' tâches importées de ') + name, 'ok');
      } catch (e) { A.toast(String(e.message || e), 'bad'); }
    }, true);
  };
  A.exportXML = function () { A.download(A.fileName('.xml'), A.exportMSPXML(), 'application/xml'); A.toast(L('MS Project XML saved. In MS Project or ProjectLibre use File › Open and choose the XML format.', 'XML MS Project enregistré. Dans MS Project ou ProjectLibre : Fichier › Ouvrir, format XML.'), 'ok'); };
  A.sheetTemplate = function () {
    if (A.blocked()) return;
    var rows = [[L('WBS', 'WBS'), L('Name', 'Nom'), L('Duration', 'Durée'), L('Predecessors', 'Prédécesseurs'), L('Cost', 'Coût'), L('Category', 'Catégorie'), L('Resources', 'Ressources'), L('Notes', 'Notes')],
      ['1', L('Component A', 'Composante A'), '', '', '', '', '', ''], ['1.1', L('Design', 'Conception'), '3mo', '', 300000, '', '', ''], ['1.2', L('Works', 'Travaux'), '12mo', '2', 5000000, '', '', L('row numbers refer to the lines of this sheet', 'les numéros renvoient aux lignes de cette feuille')]];
    var wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), L('Tasks', 'Tâches')); XLSX.writeFile(wb, L('Project Atlas - task import template.xlsx', 'Project Atlas - modèle import tâches.xlsx'));
  };

  /* ---------- shell ---------- */
  function menu(label, icon, items) {
    var box = h('div.menu-items', { role: 'menu' }, items.map(function (it) {
      return it ? h('button', { type: 'button', role: 'menuitem', onclick: function () { det.open = false; it[1](); } }, it[0], it[2] ? h('small', it[2]) : null) : h('hr');
    }));
    var det = h('details.menu', h('summary.btn.onhead', A.icon(icon), h('span', label)), box);
    return det;
  }
  document.addEventListener('click', function (e) { document.querySelectorAll('details.menu[open]').forEach(function (d) { if (!d.contains(e.target)) d.open = false; }); });

  function renderShell() {
    var head = document.getElementById('head'); head.textContent = '';
    head.appendChild(h('div.brandbox',
      h('span.logo', h('img', { src: 'assets/logo.png', alt: 'SETYM' })),
      h('div.bt', h('strong', 'Project Atlas', h('small.ver', ' v' + A.APP_VERSION)), h('span.proj', { title: L('Project settings', 'Paramètres du projet'), onclick: function () { A.go('project'); } }, A.P.name))));
    head.appendChild(h('div.headtools',
      menu(L('File', 'Fichier'), 'file', [
        [L('New project', 'Nouveau projet'), A.fileNew], [L('Open…', 'Ouvrir…'), A.fileOpen, L('.atlas file, MS Project XML or EVM Tracker .json', 'fichier .atlas, XML MS Project ou .json EVM Tracker')], [L('Save to a file', 'Enregistrer dans un fichier'), A.fileSave, '.atlas'], null,
        [L('Import MS Project XML…', 'Importer un XML MS Project…'), A.importXML, L('from MS Project or ProjectLibre', 'depuis MS Project ou ProjectLibre')],
        [L('Import tasks from Excel / CSV…', 'Importer des tâches Excel / CSV…'), A.importSheet, L('added to the current project', 'ajoutées au projet actuel')],
        [L('Download the Excel import template', 'Télécharger le modèle d’import Excel'), A.sheetTemplate], null,
        [L('Export MS Project XML', 'Exporter en XML MS Project'), A.exportXML], [L('Export to Excel', 'Exporter vers Excel'), A.exportXLSX, L('tasks, resources, contracts, budget, cash flow', 'tâches, ressources, contrats, budget, trésorerie')],
        [L('Print / PDF reports', 'Rapports à imprimer / PDF'), function () { A.go('reports'); }], null,
        [L('Load the example: Azuriya Health Project', 'Charger l’exemple : Projet Santé Azuriya'), A.loadExample, L('planning, procurement, contracts', 'planification, passation, contrats')],
        [L('Load the example: Project ABCDE', 'Charger l’exemple : Projet ABCDE'), A.loadABCDE, L('earned value monitoring', 'suivi par la valeur acquise')], null,
        [L('Open Project Atlas version 1', 'Ouvrir Project Atlas version 1'), function () { window.open('v1/', '_blank'); }, L('the previous version, kept unchanged', 'la version précédente, conservée telle quelle')]]),
      (function () { var m = menu(A.cloud.statusText(), 'link', A.cloud.menuItems()); m.classList.add('share'); if (A.P.shared && A.P.shared.dirty && A.cloud.canEdit()) m.classList.add('dirty'); return m; })(),
      A.cloud.presence(),
      A.btn('save', L('Save', 'Enregistrer'), A.fileSave, { title: L('Save the project to a file. Changes are also kept automatically in this browser.', 'Enregistrer le projet dans un fichier. Les modifications sont aussi conservées automatiquement dans ce navigateur.') }),
      A.btn('undo', L('Undo (Ctrl+Z)', 'Annuler (Ctrl+Z)'), A.undo, { iconOnly: true, disabled: !A.undoStack.length }),
      A.btn('redo', L('Redo (Ctrl+Y)', 'Rétablir (Ctrl+Y)'), A.redo, { iconOnly: true, disabled: !A.redoStack.length }),
      h('div.seg.lang', h('button' + (A.lang === 'fr' ? '.on' : ''), { type: 'button', onclick: function () { setLang('fr'); } }, 'FR'), h('button' + (A.lang === 'en' ? '.on' : ''), { type: 'button', onclick: function () { setLang('en'); } }, 'EN'))));
    head.querySelectorAll('.headtools > .btn').forEach(function (b) { if (!b.classList.contains('primary')) b.classList.add('onhead'); });
    var nav = document.getElementById('tabs'); nav.textContent = '';
    tabs().forEach(function (t) { nav.appendChild(h('button' + (A.ui.tab === t[0] ? '.on' : ''), { type: 'button', role: 'tab', 'aria-selected': A.ui.tab === t[0] ? 'true' : 'false', onclick: function () { A.go(t[0]); } }, t[1])); });
    document.documentElement.lang = A.lang;
    document.title = A.P.name + ' — Project Atlas';
  }
  function setLang(l) { A.lang = l; prefs(true); A.refresh(); }

  A.refresh = function () {
    if (!A.P) return;
    var focus = A.captureFocus(), main = document.getElementById('main'), y = window.scrollY;
    renderShell();
    main.textContent = ''; main.className = 'view-' + A.ui.tab;
    var cb = A.cloud.banner(); if (cb) main.appendChild(cb);
    try { (A.views[A.ui.tab] || A.views.dashboard)(main); }
    catch (e) { console.error(e); main.appendChild(h('div.banner.bad', L('This screen could not be displayed: ', 'Cet écran n’a pas pu être affiché : ') + (e.message || e))); }
    A.restoreFocus(focus);
    window.scrollTo(0, y);
  };
  A.onChange = function () { A.refresh(); };
  A.renderShellOnly = renderShell;

  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase(), typing = tag === 'input' || tag === 'textarea' || tag === 'select';
    if ((e.ctrlKey || e.metaKey) && !typing) {
      var k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) { A.undo(); e.preventDefault(); }
      else if (k === 'y' || (k === 'z' && e.shiftKey)) { A.redo(); e.preventDefault(); }
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { if (A.P.shared && A.cloud.canEdit()) { A.cloud.save(); A.toast(L('Changes sent.', 'Modifications envoyées.'), 'ok'); } else A.fileSave(); e.preventDefault(); }
  });

  A.start = function () {
    var pf = prefs() || {};
    A.lang = pf.lang || ((navigator.language || 'en').slice(0, 2) === 'fr' ? 'fr' : 'en');
    var p = null;
    try { p = JSON.parse(localStorage.getItem(A.storageKey) || 'null'); if (!p) p = JSON.parse(localStorage.getItem(A.storageKeyV1) || 'null'); /* first start of version 2: continue with the version 1 project */ } catch (e) { p = null; }
    if (p && Array.isArray(p.tasks)) { A.P = A.normalize(p); if (pf.tab && A.views[pf.tab]) A.ui.tab = pf.tab; }
    else A.P = A.newProject();
    A.recalc();
    A.refresh();
    A.cloud.start();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', A.start); else A.start();
})();
