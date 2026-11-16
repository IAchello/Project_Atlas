/* Project Atlas — WBS view: the task hierarchy drawn as a tree. Same data as the Gantt. */
var A = globalThis.A = globalThis.A || {};
(function () {
  var h = A.h, L = A.L, C = function (n) { return A.cssVar('--' + n); };

  function buildTree(o) {
    var S = A.S, root = { id: 0, name: A.P.name, code: A.P.wbsPrefix || '', cost: S.total, depth: 0, kids: [], node: null };
    var map = new Map();
    S.nodes.forEach(function (n) {
      if (!o.steps && n.t.proc && !n.t.procSum) return;
      var parent = n.parent ? map.get(n.parent.id) : root; if (!parent) return;
      var depth = parent.depth + 1;
      if (o.depth && depth >= o.depth) return;
      var x = { id: n.id, name: n.t.name, code: n.wbs, cost: n.cost, depth: depth, kids: [], node: n };
      parent.kids.push(x); map.set(n.id, x);
    });
    return root;
  }
  function wrap(text, max, lines) {
    var words = String(text).split(/\s+/), out = [], cur = '';
    words.forEach(function (w) {
      if ((cur + ' ' + w).trim().length <= max) cur = (cur + ' ' + w).trim();
      else { if (cur) out.push(cur); cur = w; }
    });
    if (cur) out.push(cur);
    if (out.length > lines) { out = out.slice(0, lines); out[lines - 1] = out[lines - 1].slice(0, max - 1) + '…'; }
    return out.map(function (l) { return l.length > max ? l.slice(0, max - 1) + '…' : l; });
  }
  function style(d) {
    if (d === 0) return { fill: C('wbs0'), text: '#fff', stroke: C('wbs0') };
    if (d === 1) return { fill: C('wbs1'), text: '#fff', stroke: C('wbs1') };
    if (d === 2) return { fill: C('wbs2'), text: C('wbs-ink'), stroke: C('wbs1') };
    return { fill: C('wbs3'), text: C('wbs-ink'), stroke: C('wbs1') };
  }
  /* o = {dir:'h'|'v', depth, cost, steps, sel} -> {svg, w, h} */
  A.wbsSVG = function (o) {
    var root = buildTree(o), boxes = [], lines = [], cur = A.P.currency;
    var BW = o.dir === 'v' ? 168 : 250, BH = o.cost ? 58 : 44, GX = o.dir === 'v' ? 14 : 44, GY = o.dir === 'v' ? 34 : 10, IND = 22;
    if (o.dir === 'v') {
      /* children spread horizontally; a parent whose children are all leaves stacks them vertically */
      (function size(n) {
        n.kids.forEach(size);
        n.stack = n.kids.length > 0 && n.kids.every(function (k) { return !k.kids.length; }) && n.depth > 0;
        if (!n.kids.length) n.w = BW;
        else if (n.stack) n.w = BW + IND;
        else n.w = Math.max(BW, n.kids.reduce(function (a, k) { return a + k.w; }, 0) + GX * (n.kids.length - 1));
      })(root);
      (function place(n, x, y) {
        if (n.stack) {
          n.x = x; n.y = y;
          n.kids.forEach(function (k, i) { k.x = x + IND; k.y = y + (i + 1) * (BH + 10); lines.push('M' + (x + 10) + ',' + (y + BH) + 'V' + (k.y + BH / 2) + 'H' + k.x); });
        } else {
          n.x = x + (n.w - BW) / 2; n.y = y;
          var cx = x + (n.w - (n.kids.reduce(function (a, k) { return a + k.w; }, 0) + GX * Math.max(0, n.kids.length - 1))) / 2, my = y + BH + GY / 2;
          n.kids.forEach(function (k) { place(k, cx, y + BH + GY); cx += k.w + GX; });
          if (n.kids.length) {
            lines.push('M' + (n.x + BW / 2) + ',' + (y + BH) + 'V' + my);
            var a = n.kids[0], b = n.kids[n.kids.length - 1];
            lines.push('M' + (a.x + (a.stack ? 10 : BW / 2)) + ',' + my + 'H' + (b.x + (b.stack ? 10 : BW / 2)));
            n.kids.forEach(function (k) { lines.push('M' + (k.x + (k.stack ? 10 : BW / 2)) + ',' + my + 'V' + k.y); });
          }
        }
        boxes.push(n); if (n.stack) n.kids.forEach(function (k) { boxes.push(k); });
      })(root, 0, 0);
    } else {
      var yy = 0;
      (function place(n) {
        n.x = n.depth * (BW + GX);
        if (!n.kids.length) { n.y = yy; yy += BH + GY; }
        else {
          n.kids.forEach(place);
          n.y = (n.kids[0].y + n.kids[n.kids.length - 1].y) / 2;
          var mx = n.x + BW + GX / 2;
          lines.push('M' + (n.x + BW) + ',' + (n.y + BH / 2) + 'H' + mx);
          lines.push('M' + mx + ',' + (n.kids[0].y + BH / 2) + 'V' + (n.kids[n.kids.length - 1].y + BH / 2));
          n.kids.forEach(function (k) { lines.push('M' + mx + ',' + (k.y + BH / 2) + 'H' + k.x); });
          if (n.depth > 0 && n.kids.length) yy += 8;
        }
        boxes.push(n);
      })(root);
    }
    var W = 0, H = 0; boxes.forEach(function (b) { W = Math.max(W, b.x + BW); H = Math.max(H, b.y + BH); });
    var pad = 12, s = '<svg xmlns="http://www.w3.org/2000/svg" class="wbs-svg" width="' + (W + pad * 2) + '" height="' + (H + pad * 2) + '" viewBox="0 0 ' + (W + pad * 2) + ' ' + (H + pad * 2) + '" font-family="' + A.esc(C('font') || 'sans-serif') + '">';
    s += '<g transform="translate(' + pad + ',' + pad + ')">';
    s += '<path d="' + lines.join('') + '" fill="none" stroke="' + C('wbs-line') + '" stroke-width="1.3"/>';
    var maxCh = Math.floor((BW - 18) / 6.4);
    boxes.forEach(function (b) {
      var st = style(b.depth), sel = o.sel != null && o.sel === b.id;
      var txt = wrap((b.code ? b.code + '  ' : '') + b.name, maxCh, 2), ty = b.y + (o.cost ? 18 : (txt.length === 1 ? BH / 2 + 4 : 18));
      s += '<g class="wn" data-id="' + b.id + '"><title>' + A.esc((b.code ? b.code + ' ' : '') + b.name + (b.cost ? '\n' + cur + ' ' + A.money(b.cost) : '') + (b.node ? '\n' + A.fmtDate(b.node.start) + ' → ' + A.fmtDate(b.node.finish) : '')) + '</title>';
      s += '<rect x="' + b.x + '" y="' + b.y + '" width="' + BW + '" height="' + BH + '" rx="6" fill="' + st.fill + '" stroke="' + (sel ? C('sel-ring') : st.stroke) + '" stroke-width="' + (sel ? 3 : 1.2) + '"/>';
      txt.forEach(function (l, i) { s += '<text x="' + (b.x + BW / 2) + '" y="' + (ty + i * 14) + '" text-anchor="middle" font-size="12" font-weight="600" fill="' + st.text + '">' + A.esc(l) + '</text>'; });
      if (o.cost) s += '<text x="' + (b.x + BW / 2) + '" y="' + (b.y + BH - 8) + '" text-anchor="middle" font-size="11" fill="' + st.text + '" opacity=".9">' + A.esc(cur + ' ' + A.money(b.cost || 0)) + '</text>';
      s += '</g>';
    });
    s += '</g></svg>';
    return { svg: s, w: W + pad * 2, h: H + pad * 2 };
  };

  A.views.wbs = function (root) {
    var ui = A.ui, S = A.S;
    var selId = ui.wbsRoot ? 0 : (A.selIds()[0] != null ? A.selIds()[0] : null);
    var maxLevel = 0; A.P.tasks.forEach(function (t) { if (t.level > maxLevel) maxLevel = t.level; });
    var depthSel = h('select.in.sm', { title: L('Levels shown', 'Niveaux affichés'), onchange: function () { ui.wbsDepth = +depthSel.value; A.refresh(); } },
      h('option', { value: 0 }, L('All levels', 'Tous les niveaux')));
    for (var lv = 2; lv <= maxLevel + 1; lv++) depthSel.appendChild(h('option', { value: lv + 1, selected: ui.wbsDepth === lv + 1 }, L('Down to level ', "Jusqu'au niveau ") + (lv)));
    function need() { if (selId == null) { A.toast(L('Click a box first.', "Cliquer d'abord sur une case.")); return false; } return true; }
    function addChild() {
      if (!need()) return;
      A.promptText(L('Name of the new element', 'Nom du nouvel élément'), '', function (name) {
        if (!name) return; var nt;
        A.edit(function () { nt = selId === 0 ? A.ops.insert(null, name, 0) : A.ops.addChild(selId, name); });
        ui.wbsRoot = false; ui.sel = new Set([nt.id]); ui.anchor = nt.id; A.refresh();
      });
    }
    function addSibling() {
      if (!need()) return; if (selId === 0) return addChild();
      A.promptText(L('Name of the new element', 'Nom du nouvel élément'), '', function (name) {
        if (!name) return; var nt;
        A.edit(function () { nt = A.ops.addSibling(selId, name); });
        ui.sel = new Set([nt.id]); ui.anchor = nt.id; A.refresh();
      });
    }
    function rename() {
      if (!need()) return;
      var cur = selId === 0 ? A.P.name : A.taskById(selId).name;
      A.promptText(L('Rename', 'Renommer'), cur, function (name) { if (name) A.edit(function () { if (selId === 0) A.P.name = name; else A.taskById(selId).name = name; }); });
    }
    function del() {
      if (!need() || selId === 0) return;
      var i = A.taskIndex(selId), kids = A.blockEnd(i) - i - 1;
      var go = function () { ui.sel = new Set(); A.edit(function () { A.ops.remove([selId]); }); };
      if (kids) A.confirm(L('Delete this element and the ', 'Supprimer cet élément et ses ') + kids + L(' elements under it?', ' sous-éléments ?'), L('Delete', 'Supprimer'), go); else go();
    }
    root.appendChild(h('div.toolbar',
      h('div.tg', A.btn('child', L('Add below', 'Ajouter en dessous'), addChild, { primary: true, title: L('Add a child element under the selected box', 'Ajouter un sous-élément sous la case sélectionnée') }),
        A.btn('plus', L('Add beside', 'Ajouter à côté'), addSibling, { title: L('Add an element at the same level', 'Ajouter un élément de même niveau') }),
        A.btn(null, L('Rename', 'Renommer'), rename), A.btn('trash', L('Delete', 'Supprimer'), del, { iconOnly: true })),
      h('div.tg', A.btn('up', L('Move before', 'Déplacer avant'), function () { if (need() && selId) A.edit(function () { A.ops.move(selId, -1); }); }, { iconOnly: true }),
        A.btn('down', L('Move after', 'Déplacer après'), function () { if (need() && selId) A.edit(function () { A.ops.move(selId, 1); }); }, { iconOnly: true }),
        A.btn('outdent', L('Move up one level', "Remonter d'un niveau"), function () { if (need() && selId) A.edit(function () { A.ops.indent([selId], -1); }); }, { iconOnly: true }),
        A.btn('indent', L('Move down one level (under the element before it)', "Descendre d'un niveau (sous l'élément précédent)"), function () { if (need() && selId) A.edit(function () { A.ops.indent([selId], 1); if (A.schedule(A.P).cycle) return false; }); }, { iconOnly: true }),
        A.btn('info', L('Details', 'Détails'), function () { if (need() && selId) A.taskDialog(selId); })),
      h('div.tg',
        h('div.seg', h('button' + (ui.wbsDir === 'h' ? '.on' : ''), { type: 'button', onclick: function () { ui.wbsDir = 'h'; A.refresh(); } }, L('Left to right', 'De gauche à droite')),
          h('button' + (ui.wbsDir === 'v' ? '.on' : ''), { type: 'button', onclick: function () { ui.wbsDir = 'v'; A.refresh(); } }, L('Top down', 'De haut en bas'))),
        depthSel,
        h('label.chk', h('input', { type: 'checkbox', checked: ui.wbsCost, onchange: function (e) { ui.wbsCost = e.target.checked; A.refresh(); } }), L('Costs', 'Coûts')),
        h('label.chk', h('input', { type: 'checkbox', checked: !!ui.wbsSteps, onchange: function (e) { ui.wbsSteps = e.target.checked; A.refresh(); } }), L('Procurement steps', 'Étapes de passation'))),
      h('div.tg', A.btn('down2', 'SVG', function () { A.download(A.fileName(' - WBS.svg'), draw().svg, 'image/svg+xml'); }, { title: L('Download the diagram as an SVG image', 'Télécharger le diagramme en image SVG') }),
        A.btn('down2', 'PNG', function () { A.svgToPng(draw(), A.fileName(' - WBS.png')); }, { title: L('Download the diagram as a PNG image', 'Télécharger le diagramme en image PNG') }))
    ));
    function draw() { return A.wbsSVG({ dir: ui.wbsDir, depth: ui.wbsDepth, cost: ui.wbsCost, steps: ui.wbsSteps, sel: null }); }
    if (!A.P.tasks.length) root.appendChild(h('div.banner', L('The WBS and the Gantt chart show the same tasks. Click the project box, then “Add below” to create the first component.', 'Le WBS et le diagramme de Gantt montrent les mêmes tâches. Cliquer sur la case du projet, puis « Ajouter en dessous » pour créer la première composante.')));
    var d = A.wbsSVG({ dir: ui.wbsDir, depth: ui.wbsDepth, cost: ui.wbsCost, steps: ui.wbsSteps, sel: selId });
    var canvas = h('div.wbs-canvas', { html: d.svg });
    root.appendChild(canvas);
    root.appendChild(h('div.legend', h('span.muted', L('Click a box to select it, double-click to rename. Every box is a task of the Gantt chart: what you add here appears there, and the reverse.',
      'Cliquer sur une case pour la sélectionner, double-clic pour la renommer. Chaque case est une tâche du Gantt : ce qui est ajouté ici y apparaît, et inversement.'))));
    canvas.scrollLeft = ui.wbsScroll ? ui.wbsScroll[0] : 0; canvas.scrollTop = ui.wbsScroll ? ui.wbsScroll[1] : 0;
    canvas.addEventListener('scroll', function () { ui.wbsScroll = [canvas.scrollLeft, canvas.scrollTop]; });
    canvas.addEventListener('click', function (e) {
      var g = e.target.closest('.wn'); if (!g) return;
      var id = +g.dataset.id;
      if (id === 0) { ui.wbsRoot = true; ui.sel = new Set(); } else { ui.wbsRoot = false; ui.sel = new Set([id]); ui.anchor = id; }
      A.refresh();
    });
    canvas.addEventListener('dblclick', function (e) { if (e.target.closest('.wn')) rename(); });
  };

  A.svgToPng = function (d, name) {
    var img = new Image(), scale = 2;
    img.onload = function () {
      var c = document.createElement('canvas'); c.width = d.w * scale; c.height = d.h * scale;
      var ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
      c.toBlob(function (b) { A.download(name, b, 'image/png'); });
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(d.svg);
  };
})();
