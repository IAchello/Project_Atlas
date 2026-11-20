/* Project Atlas — online shared projects (Supabase). No accounts: a share link gives read access,
   the edit code gives the right to save. Saving never overwrites someone else's newer version silently. */
var A = globalThis.A = globalThis.A || {};
(function () {
  var h = A.h, L = A.L, cloud = A.cloud = { remote: null, busy: false, lastError: '', own: {} };
  function ls(key, val) {
    try { if (val === undefined) return JSON.parse(localStorage.getItem(key) || 'null'); localStorage.setItem(key, JSON.stringify(val)); } catch (e) { return null; }
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

  cloud.rpc = function (fn, args) {
    var c = cloud.cfg(); if (!c) return Promise.reject(new Error(L('Online sharing is not set up.', 'Le partage en ligne n’est pas configuré.')));
    return fetch(c.url + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: c.key, Authorization: 'Bearer ' + c.key }, body: JSON.stringify(args || {}) })
      .then(function (r) {
        return r.text().then(function (t) {
          var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) { j = null; }
          if (!r.ok) throw new Error((j && (j.message || j.hint)) || ('HTTP ' + r.status));
          return j;
        });
      }, function () { throw new Error(L('The online service cannot be reached. Check the internet connection.', 'Le service en ligne est injoignable. Vérifier la connexion internet.')); });
  };
  function payload() { var p = A.clone(A.P); p.shared = { id: A.P.shared ? A.P.shared.id : null }; return p; }
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

  /* ---- actions ---- */
  cloud.shareDialog = function () {
    if (!cloud.cfg()) return cloud.needSetup();
    if (A.P.shared) return A.dialog({ title: L('Share links', 'Liens de partage'), wide: true, body: linksBody(A.P.shared.id, cloud.code(A.P.shared.id)) });
    var who = { name: cloud.user() };
    A.dialog({
      title: L('Share this project online', 'Partager ce projet en ligne'),
      body: h('div.form', h('p', L('The project is copied to the online space. You get a link to view it and a link to edit it. Each person works in their browser and saves online; Atlas warns when someone else has saved in the meantime.',
        'Le projet est copié dans l’espace en ligne. Vous obtenez un lien de consultation et un lien de modification. Chacun travaille dans son navigateur et enregistre en ligne ; Atlas avertit si quelqu’un d’autre a enregistré entre-temps.')),
        A.field(L('Your name (shown to the others when you save)', 'Votre nom (affiché aux autres à l’enregistrement)'), A.input(who, 'name', 'text'))),
      buttons: [{ label: L('Cancel', 'Annuler') }, { label: L('Share', 'Partager'), primary: true, onclick: function () {
        ls('project-atlas.user', who.name.trim()); var code = newCode(); cloud.busy = true;
        cloud.rpc('atlas_create', { p_name: A.P.name, p_data: payload(), p_edit_code: code, p_by: cloud.user() }).then(function (r) {
          cloud.busy = false; setCode(r.id, code);
          A.P.shared = { id: r.id, version: r.version, at: r.updated_at, by: cloud.user(), dirty: false }; A.persist(); cloud.remote = null; A.refresh();
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
    cloud.remote = null; A.refresh();
  }
  cloud.open = function (id, code) {
    if (!cloud.cfg()) return cloud.needSetup();
    cloud.busy = true;
    return cloud.rpc('atlas_get', { p_id: id }).then(function (r) {
      cloud.busy = false;
      if (!r) throw new Error(L('This shared project does not exist (or was deleted).', 'Ce projet partagé n’existe pas (ou a été supprimé).'));
      var done = function () { adopt(r, true); A.go(r.data.tasks && r.data.tasks.length ? 'gantt' : 'dashboard'); A.toast(L('Shared project opened', 'Projet partagé ouvert') + (cloud.canEdit() ? '' : L(' (view only)', ' (consultation seule)')), 'ok'); };
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
          setCode(id, code); A.refresh(); A.toast(L('You can now save this project online.', 'Vous pouvez maintenant enregistrer ce projet en ligne.'), 'ok');
        }, fail);
      } }] });
  };
  cloud.save = function (force) {
    var sh = A.P.shared; if (!sh) return cloud.shareDialog();
    if (!cloud.canEdit()) return cloud.enterCode();
    if (!cloud.user()) { return A.promptText(L('Your name (shown to the others when you save)', 'Votre nom (affiché aux autres à l’enregistrement)'), '', function (n) { if (n) { ls('project-atlas.user', n); cloud.save(force); } }); }
    cloud.busy = true; A.refresh();
    cloud.rpc('atlas_save', { p_id: sh.id, p_edit_code: cloud.code(sh.id), p_data: payload(), p_name: A.P.name, p_expected: sh.version, p_by: cloud.user(), p_force: !!force }).then(function (r) {
      cloud.busy = false;
      if (r.ok) { cloud.own[sh.version] = r.version; sh.version = r.version; sh.at = r.updated_at; sh.by = cloud.user(); sh.dirty = false; cloud.remote = null; A.persist(); A.refresh(); A.toast(L('Saved online (version ', 'Enregistré en ligne (version ') + r.version + ')', 'ok'); return; }
      if (r.reason === 'conflict') { cloud.remote = { version: r.version, by: r.updated_by, at: r.updated_at }; A.refresh(); return cloud.conflictDialog(); }
      if (r.reason === 'code') { setCode(sh.id, ''); A.refresh(); return A.toast(L('The edit code is no longer valid.', 'Le code de modification n’est plus valide.'), 'bad'); }
      if (r.reason === 'missing') return A.toast(L('This shared project was deleted online. Your copy is still here.', 'Ce projet partagé a été supprimé en ligne. Votre copie est toujours ici.'), 'bad');
      A.toast(L('The project is too large to be saved online.', 'Le projet est trop volumineux pour être enregistré en ligne.'), 'bad'); A.refresh();
    }, fail);
  };
  cloud.conflictDialog = function () {
    var r = cloud.remote || {};
    A.dialog({ title: L('Someone else saved a newer version', 'Quelqu’un d’autre a enregistré une version plus récente'),
      body: h('div', h('p', (r.by || L('Another person', 'Une autre personne')) + L(' saved version ', ' a enregistré la version ') + r.version + L(' while you were working. Your changes are not online yet.', ' pendant que vous travailliez. Vos modifications ne sont pas encore en ligne.')),
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
      function () { A.P.shared = null; cloud.remote = null; A.persist(); A.refresh(); });
  };
  cloud.remove = function () {
    var sh = A.P.shared;
    A.confirm(L('Delete the online copy for everyone? This cannot be undone. Your local copy is kept.', 'Supprimer la copie en ligne pour tout le monde ? Cette action est irréversible. Votre copie locale est conservée.'), L('Delete online', 'Supprimer en ligne'), function () {
      cloud.rpc('atlas_delete', { p_id: sh.id, p_edit_code: cloud.code(sh.id) }).then(function (ok) {
        if (!ok) return A.toast(L('The online copy could not be deleted.', 'La copie en ligne n’a pas pu être supprimée.'), 'bad');
        setCode(sh.id, ''); A.P.shared = null; cloud.remote = null; A.persist(); A.refresh(); A.toast(L('Online copy deleted.', 'Copie en ligne supprimée.'), 'ok');
      }, fail);
    });
  };
  /* notice other people's saves */
  cloud.poll = function () {
    var sh = A.P && A.P.shared; if (!sh || !cloud.cfg() || cloud.busy || document.hidden) return;
    cloud.rpc('atlas_head', { p_id: sh.id }).then(function (r) {
      if (!r || !A.P.shared || A.P.shared.id !== sh.id) return;
      cloud.lastError = '';
      if (r.version > sh.version) {
        var typing = /^(input|textarea|select)$/i.test((document.activeElement || {}).tagName || '') || document.querySelector('dialog[open]');
        if (!sh.dirty && !typing) return cloud.reloadQuiet(r);
        if (!cloud.remote || cloud.remote.version !== r.version) { cloud.remote = { version: r.version, by: r.updated_by, at: r.updated_at }; A.refresh(); }
      }
    }, function (e) { cloud.lastError = String(e.message || e); });
  };
  cloud.reloadQuiet = function (head) {
    var id = A.P.shared.id;
    cloud.rpc('atlas_get', { p_id: id }).then(function (r) {
      if (!r || !A.P.shared || A.P.shared.id !== id || A.P.shared.dirty) return;
      adopt(r, true); A.toast((r.updated_by || L('Someone', 'Quelqu’un')) + L(' saved version ', ' a enregistré la version ') + r.version + L(': it is now on your screen.', ' : elle est maintenant à l’écran.'), 'ok');
    }, function () { /* next poll retries */ });
  };

  /* mark local changes */
  ['edit', 'undo', 'redo'].forEach(function (name) {
    var orig = A[name];
    A[name] = function () {
      var before = A.P && A.P.shared ? JSON.stringify(A.P.shared) : null, res = orig.apply(A, arguments);
      if (A.P && A.P.shared && res !== false) {
        if (name !== 'edit') { var v = A.P.shared.version; while (cloud.own[v] && cloud.own[v] > v) v = cloud.own[v]; A.P.shared.version = v; } // my own later saves still count as my base
        if (!A.P.shared.dirty) { A.P.shared.dirty = true; A.persist(); if (A.renderShellOnly) A.renderShellOnly(); }
      }
      return res;
    };
  });

  /* ---- interface pieces used by the shell ---- */
  cloud.menuItems = function () {
    var sh = A.P.shared, items = [];
    if (!cloud.cfg()) return [[L('Set up online sharing…', 'Configurer le partage en ligne…'), cloud.needSetup, L('needs a free Supabase project', 'nécessite un projet Supabase gratuit')]];
    if (!sh) items.push([L('Share this project online…', 'Partager ce projet en ligne…'), cloud.shareDialog, L('get a link to view and a link to edit', 'obtenir un lien de consultation et un lien de modification')]);
    else {
      items.push([L('Save online', 'Enregistrer en ligne'), function () { cloud.save(); }, cloud.canEdit() ? (sh.dirty ? L('you have changes not yet online', 'des modifications ne sont pas encore en ligne') : L('version ', 'version ') + sh.version + L(' is online', ' est en ligne')) : L('view only: needs the edit code', 'consultation seule : nécessite le code de modification')]);
      items.push([L('Share links…', 'Liens de partage…'), cloud.shareDialog]);
      if (!cloud.canEdit()) items.push([L('Enter the edit code…', 'Saisir le code de modification…'), cloud.enterCode]);
      items.push([L('Load the online version', 'Charger la version en ligne'), cloud.reload, L('replaces what is on screen (Undo brings it back)', 'remplace ce qui est à l’écran (Annuler le rétablit)')]);
      items.push(null);
      items.push([L('Detach: keep a local copy only', 'Détacher : ne garder qu’une copie locale'), cloud.detach]);
      if (cloud.canEdit()) items.push([L('Delete the online copy…', 'Supprimer la copie en ligne…'), cloud.remove]);
    }
    items.push(null); items.push([L('Open a shared project…', 'Ouvrir un projet partagé…'), cloud.openDialog, L('from a share link', 'à partir d’un lien de partage')]);
    return items;
  };
  cloud.statusText = function () {
    var sh = A.P.shared; if (!sh) return L('Share', 'Partager');
    if (cloud.busy) return L('Saving…', 'Enregistrement…');
    if (!cloud.canEdit()) return L('Online · view only', 'En ligne · consultation');
    return sh.dirty ? L('Online · not saved', 'En ligne · non enregistré') : L('Online · v', 'En ligne · v') + sh.version;
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
    setInterval(cloud.poll, 20000);
    window.addEventListener('focus', cloud.poll);
    setTimeout(cloud.poll, 1500);
  };
})();
