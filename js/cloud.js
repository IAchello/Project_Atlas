/* Project Atlas — online shared projects (Supabase). No accounts: a share link gives read access,
   the edit code gives the right to save. Several people can work at the same time: changes are
   sent automatically a moment after they are made, other people's changes are merged in, and only
   when the same field was changed by two people at once does the later save win for that field. */
var A = globalThis.A = globalThis.A || {};
(function () {
  var h = A.h, L = A.L, cloud = A.cloud = { remote: null, busy: false, lastError: '', own: {}, others: [], base: null, client: null, online: true };
  function ls(key, val) {
    try { if (val === undefined) return JSON.parse(localStorage.getItem(key) || 'null'); if (val === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(val)); } catch (e) { return null; }
  }
  cloud.cfg = function () {
    var c = A.cloudConfig || {}, l = ls('project-atlas.cloud') || {};
    var url = (c.url || l.url || '').trim().replace(/\/+$/, ''), key = (c.key || l.key || '').trim();
    return url && key ? { url: url, key: key, fixed: !!(c.url && c.key) } : null;
  };
  cloud.user = function () { return ls('project-atlas.user') || ''; };
  cloud.code = function (id) { return (ls('project-atlas.codes') || {})[id] || ''; };
  function setCode(id, code) { var m = ls('project-atlas.codes') || {}; if (code) m[id] = code; else delete m[id]; ls('project-atlas.codes', m); }
  cloud.canEdit = function () { return !!(A.P.shared && cloud.code(A.P.shared.id)); };
  cloud.clientId = function () { if (!cloud.client) { try { cloud.client = sessionStorage.getItem('project-atlas.client'); } catch (e) { /* none */ } if (!cloud.client) { cloud.client = Math.random().toString(36).slice(2, 10); try { sessionStorage.setItem('project-atlas.client', cloud.client); } catch (e) { /* none */ } } } return cloud.client; };

  cloud.rpc = function (fn, args) {
    var c = cloud.cfg(); if (!c) return Promise.reject(new Error(L('Online sharing is not set up.', 'Le partage en ligne n’est pas configuré.')));
    return fetch(c.url + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: c.key, Authorization: 'Bearer ' + c.key }, body: JSON.stringify(args || {}) })
      .then(function (r) {
        return r.text().then(function (t) {
          var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) { j = null; }
          if (!r.ok) { var err = new Error((j && (j.message || j.hint)) || ('HTTP ' + r.status)); err.status = r.status; err.code = j && j.code; throw err; }
          cloud.online = true;
          return j;
        });
      }, function () { cloud.online = false; throw new Error(L('The online service cannot be reached. Check the internet connection.', 'Le service en ligne est injoignable. Vérifier la connexion internet.')); });
  };
  function payload(p) { p = A.clone(p || A.P); p.shared = { id: A.P.shared ? A.P.shared.id : null }; return p; }
  function fail(e) { cloud.busy = false; cloud.lastError = String(e.message || e); A.toast(cloud.lastError, 'bad'); A.refresh(); }
  function linkFor(id, code) { return location.href.split('#')[0] + '#p=' + id + (code ? '&k=' + encodeURIComponent(code) : ''); }
  cloud.link = linkFor;
  function newCode() {
    var abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', a = new Uint32Array(12), s = '';
    crypto.getRandomValues(a); a.forEach(function (n, i) { s += abc[n % abc.length]; if (i % 4 === 3 && i < 11) s += '-'; });
    return s;
  }
  function copyBtn(text) {
    return A.btn(null, L('Copy', 'Copier'), function () {
      (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { A.toast(L('Copied.', 'Copié.'), 'ok'); }, function () { A.toast(L('Select the text and copy it.', 'Sélectionner le texte et le copier.')); });
    });
  }
  function linksBody(id, code) {
    var row = function (label, text, hint) { return h('div.field', h('span.lbl', label), h('div.copyrow', h('input.in', { type: 'text', readOnly: true, value: text, onfocus: function (e) { e.target.select(); } }), copyBtn(text)), hint ? h('span.hint', hint) : null); };
    return h('div.form',
      row(L('Link to view', 'Lien de consultation'), linkFor(id), L('Anyone with this link can open the project and follow its changes, but cannot save.', 'Toute personne ayant ce lien peut ouvrir le projet et suivre ses modifications, sans pouvoir enregistrer.')),
      code ? row(L('Link to edit', 'Lien de modification'), linkFor(id, code), L('Give this one only to the people who may change the project.', 'À ne donner qu’aux personnes autorisées à modifier le projet.')) : null,
      code ? row(L('Edit code', 'Code de modification'), code, L('Someone who opened the view link can type this code to be allowed to save. Keep it: it cannot be recovered.', 'Une personne ayant ouvert le lien de consultation peut saisir ce code pour pouvoir enregistrer. Le conserver : il ne peut pas être retrouvé.')) : null);
  }

  /* ---- the base copy: what the online version looked like when it was last loaded or saved ---- */
  function setBase(p, version) { cloud.base = { version: version, data: JSON.stringify(payload(p)) }; ls('project-atlas.v2.base', cloud.base); }
  function getBase() { if (!cloud.base) cloud.base = ls('project-atlas.v2.base'); return cloud.base; }

  /* ---- three-way merge: base (last common version), local (this screen), remote (the newer online copy) ---- */
  var SAME = function (a, b) { return JSON.stringify(a) === JSON.stringify(b); };
  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }
  function mergeValue(b, l, r) {
    if (SAME(l, r)) return l;
    if (SAME(l, b)) return r;       // only the other person changed it
    if (SAME(r, b)) return l;       // only I changed it
    if (isObj(b) && isObj(l) && isObj(r)) { // both changed: go one level down (status-date maps, calendars, thresholds)
      var out = {}, keys = {}; [b, l, r].forEach(function (o) { Object.keys(o).forEach(function (k) { keys[k] = 1; }); });
      Object.keys(keys).forEach(function (k) { var v = mergeValue(b[k], l[k], r[k]); if (v !== undefined) out[k] = v; });
      return out;
    }
    return l; // same field changed by both: the person saving now wins
  }
  /* lists of records with an id: added, removed and changed records from both sides */
  function mergeList(b, l, r, keyOf) {
    keyOf = keyOf || function (x) { return x.id; };
    var bm = new Map(), lm = new Map(), rm = new Map();
    (b || []).forEach(function (x) { bm.set(keyOf(x), x); }); (l || []).forEach(function (x) { lm.set(keyOf(x), x); }); (r || []).forEach(function (x) { rm.set(keyOf(x), x); });
    var res = new Map();
    new Set([].concat(Array.from(bm.keys()), Array.from(lm.keys()), Array.from(rm.keys()))).forEach(function (k) {
      var bx = bm.get(k), lx = lm.get(k), rx = rm.get(k);
      if (!bx) { if (lx && rx) res.set(k, mergeValue({}, lx, rx)); else res.set(k, lx || rx); return; }   // added on one side (or both with the same id)
      if (!lx && !rx) return;                                                                                 // removed by both
      if (!lx) { if (!SAME(rx, bx)) res.set(k, rx); return; }                                                // I removed it: it stays only if the other person changed it meanwhile
      if (!rx) { if (!SAME(lx, bx)) res.set(k, lx); return; }                                                // the other person removed it: it stays only if I changed it
      res.set(k, mergeValue(bx, lx, rx));
    });
    /* order: the remote order first, then my records placed after the record that precedes them on my screen */
    var order = [], placed = new Set();
    (r || []).forEach(function (x) { var k = keyOf(x); if (res.has(k)) { order.push(k); placed.add(k); } });
    (l || []).forEach(function (x, i) {
      var k = keyOf(x); if (!res.has(k) || placed.has(k)) return;
      var prev = null; for (var j = i - 1; j >= 0; j--) { var pk = keyOf(l[j]); if (placed.has(pk)) { prev = pk; break; } }
      var at = prev == null ? 0 : order.indexOf(prev) + 1; order.splice(at, 0, k); placed.add(k);
    });
    return order.map(function (k) { return res.get(k); });
  }
  cloud.merge = function (base, local, remote) {
    var out = A.clone(remote), lists = { tasks: null, resources: null, contracts: null, categories: null, statuses: null, baselines: null, stakeholders: null, results: null, kpis: null, risks: null, issues: null, assignments: function (a) { return a.task + '/' + a.res; } };
    Object.keys(local).forEach(function (k) {
      if (k === 'shared' || k === 'nextId') return;
      if (k in lists) out[k] = mergeList(base[k], local[k], remote[k], lists[k] || undefined);
      else out[k] = mergeValue(base[k], local[k], remote[k]);
    });
    out.nextId = Math.max(local.nextId || 0, remote.nextId || 0);
    return out;
  };

  /* ---- actions ---- */
  cloud.shareDialog = function () {
    if (!cloud.cfg()) return cloud.needSetup();
    if (A.P.shared) return A.dialog({ title: L('Share links', 'Liens de partage'), wide: true, body: linksBody(A.P.shared.id, cloud.code(A.P.shared.id)) });
    var who = { name: cloud.user() };
    A.dialog({
      title: L('Share this project online', 'Partager ce projet en ligne'),
      body: h('div.form', h('p', L('The project is copied to the online space. You get a link to view it and a link to edit it. Everyone works in their own browser; changes are sent automatically and merged with the other people’s changes.',
        'Le projet est copié dans l’espace en ligne. Vous obtenez un lien de consultation et un lien de modification. Chacun travaille dans son navigateur ; les modifications sont envoyées automatiquement et fusionnées avec celles des autres.')),
        A.field(L('Your name (shown to the others)', 'Votre nom (affiché aux autres)'), A.input(who, 'name', 'text'))),
      buttons: [{ label: L('Cancel', 'Annuler') }, { label: L('Share', 'Partager'), primary: true, onclick: function () {
        ls('project-atlas.user', who.name.trim()); var code = newCode(); cloud.busy = true;
        cloud.rpc('atlas_create', { p_name: A.P.name, p_data: payload(), p_edit_code: code, p_by: cloud.user() }).then(function (r) {
          cloud.busy = false; setCode(r.id, code);
          A.P.shared = { id: r.id, version: r.version, at: r.updated_at, by: cloud.user(), dirty: false }; setBase(A.P, r.version); A.persist(); cloud.remote = null; A.refresh();
          A.dialog({ title: L('The project is shared', 'Le projet est partagé'), wide: true, body: linksBody(r.id, code) });
        }, fail);
      } }]
    });
  };
  cloud.needSetup = function () { A.go('project'); A.toast(L('Online sharing must be set up first: see “Online sharing” at the bottom of this page.', 'Le partage en ligne doit d’abord être configuré : voir « Partage en ligne » en bas de cette page.')); };
  function adopt(r, keepUndo) {
    var p = r.data; p.shared = { id: r.id, version: r.version, at: r.updated_at, by: r.updated_by, dirty: false };
    var before = JSON.stringify(A.P), stack = A.undoStack.slice();
    A.setProject(p); if (keepUndo) A.undoStack = stack.concat([before]);
    setBase(A.P, r.version); cloud.remote = null; A.refresh();
  }
  cloud.open = function (id, code) {
    if (!cloud.cfg()) return cloud.needSetup();
    cloud.busy = true;
    return cloud.rpc('atlas_get', { p_id: id }).then(function (r) {
      cloud.busy = false;
      if (!r) throw new Error(L('This shared project does not exist (or was deleted).', 'Ce projet partagé n’existe pas (ou a été supprimé).'));
      var done = function () { adopt(r, true); A.go(r.data.tasks && r.data.tasks.length ? 'gantt' : 'dashboard'); A.toast(L('Shared project opened', 'Projet partagé ouvert') + (cloud.canEdit() ? '' : L(' (view only)', ' (consultation seule)')), 'ok'); cloud.poll(); };
      if (code) return cloud.rpc('atlas_check', { p_id: id, p_edit_code: code }).then(function (ok) { if (ok) setCode(id, code); done(); });
      done();
    }).catch(fail);
  };
  cloud.openDialog = function () {
    if (!cloud.cfg()) return cloud.needSetup();
    var o = { link: '' };
    A.dialog({ title: L('Open a shared project', 'Ouvrir un projet partagé'), body: A.field(L('Paste the share link', 'Coller le lien de partage'), A.input(o, 'link', 'text', { placeholder: 'https://…#p=…' })),
      buttons: [{ label: L('Cancel', 'Annuler') }, { label: L('Open', 'Ouvrir'), primary: true, onclick: function () {
        var m = /p=([0-9a-f-]{36})/i.exec(o.link) || /^\s*([0-9a-f-]{36})\s*$/i.exec(o.link), k = /[&#]k=([^&\s]+)/.exec(o.link);
        if (!m) { A.toast(L('This is not a Project Atlas share link.', 'Ce n’est pas un lien de partage Project Atlas.'), 'bad'); return false; }
        cloud.open(m[1], k ? decodeURIComponent(k[1]) : '');
      } }] });
  };
  cloud.enterCode = function () {
    var o = { code: '' }, id = A.P.shared.id;
    A.dialog({ title: L('Edit code', 'Code de modification'), body: A.field(L('Type the edit code you were given', 'Saisir le code de modification reçu'), A.input(o, 'code', 'text')),
      buttons: [{ label: L('Cancel', 'Annuler') }, { label: 'OK', primary: true, onclick: function () {
        var code = o.code.trim().toUpperCase();
        cloud.rpc('atlas_check', { p_id: id, p_edit_code: code }).then(function (ok) {
          if (!ok) return A.toast(L('This code is not the edit code of this project.', 'Ce code n’est pas le code de modification de ce projet.'), 'bad');
          setCode(id, code); A.refresh(); A.toast(L('You can now change this project; your changes are sent automatically.', 'Vous pouvez maintenant modifier ce projet ; vos modifications sont envoyées automatiquement.'), 'ok');
        }, fail);
      } }] });
  };
  function askName(then) {
    if (cloud.user()) return then();
    A.promptText(L('Your name (shown to the others)', 'Votre nom (affiché aux autres)'), '', function (n) { if (n) { ls('project-atlas.user', n); then(); } });
  }
  /* send my changes. Merges first when somebody else saved since my base copy. */
  cloud.save = function (force) {
    var sh = A.P.shared; if (!sh) return cloud.shareDialog();
    if (!cloud.canEdit()) return cloud.enterCode();
    if (!cloud.user()) return askName(function () { cloud.save(force); });
    if (cloud.busy) { cloud.again = true; return; }
    cloud.busy = true; if (A.renderShellOnly) A.renderShellOnly();
    var expected = sh.version;
    cloud.rpc('atlas_save', { p_id: sh.id, p_edit_code: cloud.code(sh.id), p_data: payload(), p_name: A.P.name, p_expected: expected, p_by: cloud.user(), p_force: !!force }).then(function (r) {
      cloud.busy = false;
      if (r.ok) {
        cloud.own[expected] = r.version; sh.version = r.version; sh.at = r.updated_at; sh.by = cloud.user();
        if (!cloud.editedSince) sh.dirty = false;
        cloud.editedSince = false; setBase(A.P, r.version); cloud.remote = null; cloud.lastError = ''; A.persist();
        if (A.renderShellOnly) A.renderShellOnly();
        if (cloud.again) { cloud.again = false; cloud.schedule(300); }
        return;
      }
      if (r.reason === 'conflict') return cloud.mergeFromRemote(r);
      if (r.reason === 'code') { setCode(sh.id, ''); A.refresh(); return A.toast(L('The edit code is no longer valid.', 'Le code de modification n’est plus valide.'), 'bad'); }
      if (r.reason === 'missing') return A.toast(L('This shared project was deleted online. Your copy is still here.', 'Ce projet partagé a été supprimé en ligne. Votre copie est toujours ici.'), 'bad');
      A.toast(L('The project is too large to be saved online.', 'Le projet est trop volumineux pour être enregistré en ligne.'), 'bad'); A.refresh();
    }, function (e) { cloud.busy = false; cloud.lastError = String(e.message || e); if (A.renderShellOnly) A.renderShellOnly(); });
  };
  /* somebody saved before me: merge their version with mine, then save again */
  cloud.mergeFromRemote = function (head) {
    var sh = A.P.shared, base = getBase();
    cloud.remote = { version: head.version, by: head.updated_by, at: head.updated_at };
    if (!base || base.version !== sh.version) { A.refresh(); return cloud.conflictDialog(); } // nothing to merge from: the person decides
    cloud.busy = true;
    return cloud.rpc('atlas_get', { p_id: sh.id }).then(function (r) {
      cloud.busy = false;
      if (!r) throw new Error(L('This shared project was deleted online.', 'Ce projet partagé a été supprimé en ligne.'));
      if (!A.P.shared || A.P.shared.id !== sh.id) return;
      var merged = cloud.merge(JSON.parse(base.data), payload(), payload(r.data));
      merged.shared = { id: sh.id, version: r.version, at: r.updated_at, by: r.updated_by, dirty: true };
      var focus = A.captureFocus(), before = JSON.stringify(A.P), stack = A.undoStack.slice();
      A.setProject(merged); A.undoStack = stack.concat([before]); A.restoreFocus(focus);
      setBase(r.data, r.version); cloud.remote = null; cloud.editedSince = false;
      A.toast((r.updated_by || L('Someone', 'Quelqu’un')) + L('’s changes were merged with yours.', ' : ses modifications ont été fusionnées avec les vôtres.'), 'ok');
      cloud.save();
    }, fail);
  };
  cloud.conflictDialog = function () {
    var r = cloud.remote || {};
    A.dialog({ title: L('Someone else saved a newer version', 'Quelqu’un d’autre a enregistré une version plus récente'),
      body: h('div', h('p', (r.by || L('Another person', 'Une autre personne')) + L(' saved version ', ' a enregistré la version ') + r.version + L(' and Atlas cannot merge it automatically with your changes (the common starting point is missing). Your changes are not online yet.', ' et Atlas ne peut pas la fusionner automatiquement avec vos modifications (le point de départ commun manque). Vos modifications ne sont pas encore en ligne.')),
        h('p.muted', L('Tip: “Save my copy to a file” first if you want to compare the two versions at leisure.', 'Astuce : « Enregistrer ma copie dans un fichier » d’abord pour comparer les deux versions à tête reposée.'))),
      buttons: [{ label: L('Decide later', 'Décider plus tard') }, { label: L('Save my copy to a file', 'Enregistrer ma copie dans un fichier'), onclick: function () { A.fileSave(); return false; } },
        { label: L('Load their version', 'Charger leur version'), onclick: function () { cloud.reload(); } },
        { label: L('Replace it with mine', 'La remplacer par la mienne'), danger: true, onclick: function () { cloud.save(true); } }] });
  };
  cloud.reload = function () {
    var sh = A.P.shared; if (!sh) return;
    cloud.rpc('atlas_get', { p_id: sh.id }).then(function (r) { if (!r) throw new Error(L('This shared project was deleted online.', 'Ce projet partagé a été supprimé en ligne.')); adopt(r, true); A.toast(L('Online version loaded (version ', 'Version en ligne chargée (version ') + r.version + L('). Undo brings your copy back.', '). Annuler rétablit votre copie.'), 'ok'); }, fail);
  };
  cloud.detach = function () {
    A.confirm(L('Keep this project as a local copy only? It stays online for the others; you can reopen it with its link.', 'Conserver ce projet comme simple copie locale ? Il reste en ligne pour les autres ; vous pourrez le rouvrir avec son lien.'), L('Detach', 'Détacher'),
      function () { A.P.shared = null; cloud.remote = null; cloud.others = []; A.persist(); A.refresh(); });
  };
  cloud.remove = function () {
    var sh = A.P.shared;
    A.confirm(L('Delete the online copy for everyone? This cannot be undone. Your local copy is kept.', 'Supprimer la copie en ligne pour tout le monde ? Cette action est irréversible. Votre copie locale est conservée.'), L('Delete online', 'Supprimer en ligne'), function () {
      cloud.rpc('atlas_delete', { p_id: sh.id, p_edit_code: cloud.code(sh.id) }).then(function (ok) {
        if (!ok) return A.toast(L('The online copy could not be deleted.', 'La copie en ligne n’a pas pu être supprimée.'), 'bad');
        setCode(sh.id, ''); A.P.shared = null; cloud.remote = null; cloud.others = []; A.persist(); A.refresh(); A.toast(L('Online copy deleted.', 'Copie en ligne supprimée.'), 'ok');
      }, fail);
    });
  };

  /* ---- keeping in step: every few seconds, tell the others I am here and look for their saves ---- */
  var typingSince = 0;
  function typing() {
    var el = document.activeElement, tag = (el && el.tagName || '').toLowerCase();
    var busyInput = (tag === 'input' && el.type !== 'checkbox' && el.type !== 'date') || tag === 'textarea' || !!document.querySelector('dialog[open]') || !!document.querySelector('.respick');
    if (!busyInput) { typingSince = 0; return false; }
    if (!typingSince) typingSince = Date.now();
    return Date.now() - typingSince < 20000; // after 20 s the other changes come in anyway
  }
  cloud.poll = function () {
    var sh = A.P && A.P.shared; if (!sh || !cloud.cfg() || cloud.busy || document.hidden) return;
    var pid = sh.id;
    var p = cloud.pingOk === false ? cloud.rpc('atlas_head', { p_id: pid }) : cloud.rpc('atlas_ping', { p_id: pid, p_client: cloud.clientId(), p_by: cloud.user() || L('Guest', 'Invité') }).catch(function (e) {
      if (e.status === 404 || /atlas_ping|function/i.test(e.message)) { cloud.pingOk = false; return cloud.rpc('atlas_head', { p_id: pid }); } throw e;
    });
    p.then(function (r) {
      if (!r || !A.P.shared || A.P.shared.id !== pid) return;
      cloud.lastError = '';
      var others = r.others || [], changed = JSON.stringify(others) !== JSON.stringify(cloud.others); cloud.others = others;
      if (r.version > A.P.shared.version) {
        if (!A.P.shared.dirty) { if (!typing()) return cloud.reloadQuiet(r); }
        else if (cloud.canEdit()) { if (!typing()) return cloud.mergeFromRemote(r); }
        if (!cloud.remote || cloud.remote.version !== r.version) { cloud.remote = { version: r.version, by: r.updated_by, at: r.updated_at }; A.refresh(); return; }
      } else if (A.P.shared.dirty && cloud.canEdit() && !cloud.busy && !typing()) return cloud.save();
      if (changed && A.renderShellOnly) A.renderShellOnly();
    }, function (e) { cloud.lastError = String(e.message || e); if (A.renderShellOnly) A.renderShellOnly(); });
  };
  cloud.reloadQuiet = function (head) {
    var id = A.P.shared.id; cloud.busy = true;
    cloud.rpc('atlas_get', { p_id: id }).then(function (r) {
      cloud.busy = false;
      if (!r || !A.P.shared || A.P.shared.id !== id || A.P.shared.dirty) return;
      var focus = A.captureFocus(); adopt(r, true); A.restoreFocus(focus);
      A.toast((r.updated_by || L('Someone', 'Quelqu’un')) + L(' made changes: they are now on your screen.', ' a fait des modifications : elles sont maintenant à l’écran.'), 'ok');
    }, function () { cloud.busy = false; });
  };
  /* my changes go online about two seconds after the last one */
  cloud.schedule = function (ms) {
    clearTimeout(cloud.timer);
    cloud.timer = setTimeout(function () { if (A.P.shared && A.P.shared.dirty && cloud.canEdit() && !typing()) cloud.save(); else if (A.P.shared && A.P.shared.dirty && cloud.canEdit()) cloud.schedule(1500); }, ms || 2000);
  };

  /* mark local changes */
  ['edit', 'undo', 'redo'].forEach(function (name) {
    var orig = A[name];
    A[name] = function () {
      var res = orig.apply(A, arguments);
      if (A.P && A.P.shared && res !== false) {
        if (name !== 'edit') { var v = A.P.shared.version; while (cloud.own[v] && cloud.own[v] > v) v = cloud.own[v]; A.P.shared.version = v; } // my own later saves still count as my base
        A.P.shared.dirty = true; if (cloud.busy) cloud.editedSince = true; A.persist(); if (A.renderShellOnly) A.renderShellOnly();
        if (cloud.canEdit()) cloud.schedule();
      }
      return res;
    };
  });

  /* ---- interface pieces used by the shell ---- */
  cloud.menuItems = function () {
    var sh = A.P.shared, items = [];
    if (!cloud.cfg()) return [[L('Set up online sharing…', 'Configurer le partage en ligne…'), cloud.needSetup, L('needs a free Supabase project', 'nécessite un projet Supabase gratuit')]];
    if (!sh) items.push([L('Share this project online…', 'Partager ce projet en ligne…'), cloud.shareDialog, L('work on it with others at the same time', 'y travailler à plusieurs en même temps')]);
    else {
      items.push([L('Send my changes now', 'Envoyer mes modifications maintenant'), function () { cloud.save(); }, cloud.canEdit() ? (sh.dirty ? L('they are sent automatically a moment after each change', 'elles sont envoyées automatiquement un instant après chaque changement') : L('everything is online (version ', 'tout est en ligne (version ') + sh.version + ')') : L('view only: needs the edit code', 'consultation seule : nécessite le code de modification')]);
      items.push([L('Share links…', 'Liens de partage…'), cloud.shareDialog]);
      if (!cloud.canEdit()) items.push([L('Enter the edit code…', 'Saisir le code de modification…'), cloud.enterCode]);
      items.push([L('Reload the online version', 'Recharger la version en ligne'), cloud.reload, L('replaces what is on screen (Undo brings it back)', 'remplace ce qui est à l’écran (Annuler le rétablit)')]);
      items.push(null);
      items.push([L('Detach: keep a local copy only', 'Détacher : ne garder qu’une copie locale'), cloud.detach]);
      if (cloud.canEdit()) items.push([L('Delete the online copy…', 'Supprimer la copie en ligne…'), cloud.remove]);
    }
    items.push(null); items.push([L('Open a shared project…', 'Ouvrir un projet partagé…'), cloud.openDialog, L('from a share link', 'à partir d’un lien de partage')]);
    return items;
  };
  cloud.statusText = function () {
    var sh = A.P.shared; if (!sh) return L('Share', 'Partager');
    if (cloud.lastError && !cloud.online) return L('Online · no connection', 'En ligne · pas de connexion');
    if (cloud.busy) return L('Online · sending…', 'En ligne · envoi…');
    if (!cloud.canEdit()) return L('Online · view only', 'En ligne · consultation');
    return sh.dirty ? L('Online · changes pending', 'En ligne · envoi en attente') : L('Online · up to date', 'En ligne · à jour');
  };
  cloud.presence = function () {
    if (!A.P.shared || !cloud.others.length) return null;
    return h('div.presence', { title: L('Also here right now', 'Également présents en ce moment') }, cloud.others.slice(0, 6).map(function (o) {
      var name = o.name || L('Guest', 'Invité'), hue = 0; for (var i = 0; i < name.length; i++) hue = (hue * 31 + name.charCodeAt(i)) % 360;
      return h('span.av', { style: { background: 'hsl(' + hue + ' 55% 45%)' }, title: name }, name.trim().split(/\s+/).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase());
    }), cloud.others.length > 6 ? h('span.more', '+' + (cloud.others.length - 6)) : null);
  };
  cloud.banner = function () {
    var sh = A.P.shared, r = cloud.remote; if (!sh || !r || r.version <= sh.version) return null;
    return h('div.banner.warn.noprint', A.icon('warn'), h('span', (r.by || L('Someone', 'Quelqu’un')) + L(' saved a newer version online (version ', ' a enregistré une version plus récente en ligne (version ') + r.version + ').'), h('span.sp'),
      A.btn(null, L('Load their version', 'Charger leur version'), cloud.reload), sh.dirty && cloud.canEdit() ? A.btn(null, L('Choose…', 'Choisir…'), cloud.conflictDialog) : null);
  };
  cloud.settingsCard = function () {
    var c = cloud.cfg(), l = ls('project-atlas.cloud') || { url: '', key: '' }, o = { url: l.url || '', key: l.key || '' };
    var body;
    if (c && c.fixed) body = h('p', A.icon('check'), ' ' + L('Online sharing is switched on for everyone who uses this copy of Project Atlas.', 'Le partage en ligne est activé pour tous les utilisateurs de cette copie de Project Atlas.'));
    else body = h('div.form',
      h('p.muted', L('Shared projects are stored in a Supabase project that you own (free plan). Create it, run the script supabase/setup.sql in its SQL editor, then paste its two public values below to try it on this computer. To switch it on for everybody, the same two values go into the file js/config.js.',
        'Les projets partagés sont stockés dans un projet Supabase qui vous appartient (offre gratuite). Le créer, exécuter le script supabase/setup.sql dans son éditeur SQL, puis coller ci-dessous ses deux valeurs publiques pour l’essayer sur cet ordinateur. Pour l’activer pour tout le monde, ces deux mêmes valeurs vont dans le fichier js/config.js.')),
      h('div.cols3', A.field(L('Project URL', 'URL du projet'), A.input(o, 'url', 'text', { placeholder: 'https://xxxxxxxx.supabase.co' })), A.field(L('Public (anon) key', 'Clé publique (anon)'), A.input(o, 'key', 'text'), null, 'span2')),
      h('div.list-bar', A.btn('check', L('Save and test', 'Enregistrer et tester'), function () {
        ls('project-atlas.cloud', { url: o.url.trim(), key: o.key.trim() });
        if (!cloud.cfg()) { A.refresh(); return A.toast(L('Online sharing switched off on this computer.', 'Partage en ligne désactivé sur cet ordinateur.')); }
        cloud.rpc('atlas_head', { p_id: '00000000-0000-0000-0000-000000000000' }).then(function () { A.refresh(); A.toast(L('Connection works. Use the Share button at the top.', 'La connexion fonctionne. Utiliser le bouton Partager en haut.'), 'ok'); },
          function (e) { A.refresh(); A.toast(L('Connection failed: ', 'Échec de la connexion : ') + (e.message || e) + L(' — check the two values and that the script was run.', ' — vérifier les deux valeurs et que le script a été exécuté.'), 'bad'); });
      }, { primary: true }), c ? h('span.muted', L('Active on this computer.', 'Actif sur cet ordinateur.')) : null));
    return h('div.card', h('div.card-head', h('h2', L('Online sharing', 'Partage en ligne'))), body);
  };
  /* open a share link given in the address */
  cloud.fromAddress = function () {
    var m = /[#&]p=([0-9a-f-]{36})/i.exec(location.hash || ''), k = /[#&]k=([^&]+)/.exec(location.hash || ''); if (!m) return;
    var id = m[1], code = k ? decodeURIComponent(k[1]) : '';
    try { history.replaceState(null, '', location.href.split('#')[0]); } catch (e) { /* keep the hash */ }
    if (!cloud.cfg()) return A.toast(L('This link opens a shared project, but online sharing is not set up in this copy of Project Atlas.', 'Ce lien ouvre un projet partagé, mais le partage en ligne n’est pas configuré dans cette copie de Project Atlas.'), 'bad');
    var same = A.P.shared && A.P.shared.id === id, empty = !A.P.tasks.length && !A.P.contracts.length;
    if (same) { if (code) cloud.rpc('atlas_check', { p_id: id, p_edit_code: code }).then(function (ok) { if (ok) { setCode(id, code); A.refresh(); } }); return cloud.poll(); }
    if (empty) return cloud.open(id, code);
    A.confirm(L('Open the shared project from the link? The project now on screen (“', 'Ouvrir le projet partagé du lien ? Le projet actuellement à l’écran (« ') + A.P.name + L('”) will be replaced; save it to a file first if you need it.', ' ») sera remplacé ; l’enregistrer d’abord dans un fichier si nécessaire.'), L('Open', 'Ouvrir'), function () { cloud.open(id, code); });
  };
  cloud.start = function () {
    cloud.fromAddress();
    window.addEventListener('hashchange', cloud.fromAddress);
    setInterval(cloud.poll, 5000);
    window.addEventListener('focus', cloud.poll);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) cloud.poll(); });
    window.addEventListener('beforeunload', function () { if (A.P.shared && A.P.shared.dirty && cloud.canEdit() && cloud.cfg() && navigator.sendBeacon) { /* last chance: a plain save */ cloud.save(); } });
    setTimeout(cloud.poll, 1000);
  };
})();
