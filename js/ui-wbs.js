/* Project Atlas — WBS view: the task hierarchy drawn as a tree. Same data as the Gantt.
   Boxes can be dragged onto one another (re-parent or reorder), folded with +/−, zoomed and panned. */
var A = globalThis.A = globalThis.A || {};
(function () {
  var h = A.h, L = A.L, C = function (n) { return A.cssVar('--' + n); };
  var ZOOMS = [0.4, 0.5, 0.6, 0.75, 0.9, 1, 1.15, 1.3, 1.5, 1.75, 2];

  function buildTree(o) {
    var S = A.S, root = { id: 0, name: A.P.name, code: A.P.wbsPrefix || '', cost: S.total, depth: 0, kids: [], node: null, hidden: 0 };
    var map = new Map();
    S.nodes.forEach(function (n) {
      if (!o.steps && n.t.proc && !n.t.procSum) return;
      var parent = n.parent ? map.get(n.parent.id) : root; if (!parent) return;
      if (parent.folded) { parent.hidden++; map.set(n.id, parent); parent.foldedIds = parent.foldedIds || []; return; }
      var depth = parent.depth + 1;
      if (o.depth && depth >= o.depth) { parent.hidden++; return; }
      var x = { id: n.id, name: n.t.name, code: n.wbs, cost: n.cost, depth: depth, kids: [], node: n, hidden: 0, hasKids: n.summary, folded: !!(o.fold && n.t.wbsFold && n.summary) };
      parent.kids.push(x); map.set(n.id, x);
    });
    /* a folded box counts every descendant it hides */
    function count(n) { var c = 0; n.kids.forEach(function (k) { c += 1 + count(k); }); return c; }
    S.nodes.forEach(function (n) { var x = map.get(n.id); if (x && x.id === n.id && x.folded) x.hidden = A.leavesOf(n).length + (n.children.length - A.leavesOf(n).filter(function (l) { return l.parent === n; }).length); });
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
  /* o = {dir:'h'|'v', depth, cost, steps, fold, sel, toggles} -> {svg, w, h, boxes} */
  A.wbsSVG = function (o) {
    var root = buildTree(o), boxes = [], lines = [], cur = A.P.currency;
    var BW = o.dir === 'v' ? 168 : 250, BH = o.cost ? 58 : 44, GX = o.dir === 'v' ? 14 : 44, GY = o.dir === 'v' ? 34 : 10, IND = 22;
    if (o.dir === 'v') {
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
    var pad = 14, s = '<svg xmlns="http://www.w3.org/2000/svg" class="wbs-svg" width="' + (W + pad * 2) + '" height="' + (H + pad * 2) + '" viewBox="0 0 ' + (W + pad * 2) + ' ' + (H + pad * 2) + '" font-family="' + A.esc(C('font') || 'sans-serif') + '">';
    s += '<g transform="translate(' + pad + ',' + pad + ')">';
    s += '<path d="' + lines.join('') + '" fill="none" stroke="' + C('wbs-line') + '" stroke-width="1.3"/>';
    var maxCh = Math.floor((BW - 18) / 6.4);
    boxes.forEach(function (b) {
      var st = style(b.depth), sel = o.sel != null && o.sel === b.id;
      var txt = wrap((b.code ? b.code + '  ' : '') + b.name, maxCh, 2), ty = b.y + (o.cost ? 18 : (txt.length === 1 ? BH / 2 + 4 : 18));
      s += '<g class="wn" data-id="' + b.id + '"><title>' + A.esc((b.code ? b.code + ' ' : '') + b.name + (b.cost ? '\n' + cur + ' ' + A.money(b.cost) : '') + (b.node ? '\n' + A.fmtDate(b.node.start) + ' → ' + A.fmtDate(b.node.finish) : '')) + '</title>';
      s += '<rect class="wb" x="' + b.x + '" y="' + b.y + '" width="' + BW + '" height="' + BH + '" rx="6" fill="' + st.fill + '" stroke="' + (sel ? C('sel-ring') : st.stroke) + '" stroke-width="' + (sel ? 3 : 1.2) + '"/>';
      txt.forEach(function (l, i) { s += '<text x="' + (b.x + BW / 2) + '" y="' + (ty + i * 14) + '" text-anchor="middle" font-size="12" font-weight="600" fill="' + st.text + '">' + A.esc(l) + '</text>'; });
      if (o.cost) s += '<text x="' + (b.x + BW / 2) + '" y="' + (b.y + BH - 8) + '" text-anchor="middle" font-size="11" fill="' + st.text + '" opacity=".9">' + A.esc(cur + ' ' + A.money(b.cost || 0)) + '</text>';
      if (o.toggles && b.hasKids && b.id) {
        var tx = o.dir === 'v' ? b.x + BW / 2 : b.x + BW, tyy = o.dir === 'v' ? b.y + BH : b.y + BH / 2;
        s += '<g class="wtog" data-id="' + b.id + '"><title>' + A.esc(b.folded ? L('Show the sub-elements', 'Afficher les sous-éléments') : L('Hide the sub-elements', 'Masquer les sous-éléments')) + '</title>';
        s += '<circle cx="' + tx + '" cy="' + tyy + '" r="8" fill="#fff" stroke="' + C('wbs1') + '" stroke-width="1.2"/>';
        s += '<path d="M' + (tx - 4) + ',' + tyy + 'H' + (tx + 4) + (b.folded ? 'M' + tx + ',' + (tyy - 4) + 'V' + (tyy + 4) : '') + '" stroke="' + C('wbs0') + '" stroke-width="1.6" stroke-linecap="round"/>';
        if (b.folded && b.hidden) s += '<text x="' + (tx + (o.dir === 'v' ? 12 : 12)) + '" y="' + (tyy + 4) + '" font-size="10" fill="' + C('muted') + '">' + b.hidden + '</text>';
        s += '</g>';
      }
      s += '</g>';
    });
    s += '</g></svg>';
    return { svg: s, w: W + pad * 2, h: H + pad * 2, boxes: boxes, BW: BW, BH: BH };
  };

  A.views.wbs = function (root) {
    var ui = A.ui, S = A.S;
    var selId = ui.wbsRoot ? 0 : (A.selIds()[0] != null ? A.selIds()[0] : null);
    var maxLevel = 0; A.P.tasks.forEach(function (t) { if (t.level > maxLevel) maxLevel = t.level; });
    var depthSel = h('select.in.sm', { title: L('Levels shown', 'Niveaux affichés'), onchange: function () { ui.wbsDepth = +depthSel.value; A.refresh(); } },
      h('option', { value: 0 }, L('All levels', 'Tous les niveaux')));
    for (var lv = 2; lv <= maxLevel + 1; lv++) depthSel.appendChild(h('option', { value: lv + 1, selected: ui.wbsDepth === lv + 1 }, L('Down to level ', "Jusqu'au niveau ") + lv));
    function need() { if (selId == null) { A.toast(L('Click a box first.', "Cliquer d'abord sur une case.")); return false; } return true; }
    function addChild() {
      if (!need()) return;
      A.promptText(L('Name of the new element', 'Nom du nouvel élément'), '', function (name) {
        if (!name) return; var nt;
        A.edit(function () { nt = selId === 0 ? A.ops.insert(null, name, 0) : A.ops.addChild(selId, name); if (selId) A.taskById(selId).wbsFold = false; });
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
    function details() { if (!need()) return; if (selId === 0) A.go('project'); else A.taskDialog(selId); }
    function del() {
      if (!need() || selId === 0) return;
      var i = A.taskIndex(selId), kids = A.blockEnd(i) - i - 1;
      var go = function () { ui.sel = new Set(); A.edit(function () { A.ops.remove([selId]); }); };
      if (kids) A.confirm(L('Delete this element and the ', 'Supprimer cet élément et ses ') + kids + L(' elements under it?', ' sous-éléments ?'), L('Delete', 'Supprimer'), go); else go();
    }
    function setZoom(z) { ui.wbsZoom = Math.max(ZOOMS[0], Math.min(ZOOMS[ZOOMS.length - 1], z)); applyZoom(); }
    function zoomStep(d) { var i = ZOOMS.findIndex(function (z) { return z >= ui.wbsZoom - 1e-9; }); if (i < 0) i = ZOOMS.length - 1; setZoom(ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, i + d))]); }
    function foldAll(fold) { A.edit(function () { A.P.tasks.forEach(function (t) { t.wbsFold = fold; }); }); }
    root.appendChild(h('div.toolbar',
      h('div.tg', A.btn('child', L('Add below', 'Ajouter en dessous'), addChild, { primary: true, title: L('Add a child element under the selected box', 'Ajouter un sous-élément sous la case sélectionnée') }),
        A.btn('plus', L('Add beside', 'Ajouter à côté'), addSibling, { title: L('Add an element at the same level', 'Ajouter un élément de même niveau') }),
        A.btn('info', L('Details', 'Détails'), details, { title: L('Details of the selected box (double-click a box)', 'Détails de la case sélectionnée (double-clic sur une case)') }),
        A.btn(null, L('Rename', 'Renommer'), rename), A.btn('trash', L('Delete', 'Supprimer'), del, { iconOnly: true })),
      h('div.tg', A.btn('up', L('Move before', 'Déplacer avant'), function () { if (need() && selId) A.edit(function () { A.ops.move(selId, -1); }); }, { iconOnly: true }),
        A.btn('down', L('Move after', 'Déplacer après'), function () { if (need() && selId) A.edit(function () { A.ops.move(selId, 1); }); }, { iconOnly: true }),
        A.btn('outdent', L('Move up one level', "Remonter d'un niveau"), function () { if (need() && selId) A.edit(function () { A.ops.indent([selId], -1); }); }, { iconOnly: true }),
        A.btn('indent', L('Move down one level (under the element before it)', "Descendre d'un niveau (sous l'élément précédent)"), function () { if (need() && selId) A.edit(function () { A.ops.indent([selId], 1); if (A.schedule(A.P).cycle) return false; }); }, { iconOnly: true })),
      h('div.tg', A.btn('zoomout', L('Zoom out', 'Zoom arrière'), function () { zoomStep(-1); }, { iconOnly: true }),
        h('button.btn.zoomlbl', { type: 'button', title: L('Back to 100 %', 'Revenir à 100 %'), onclick: function () { setZoom(1); } }, Math.round(ui.wbsZoom * 100) + ' %'),
        A.btn('zoomin', L('Zoom in', 'Zoom avant'), function () { zoomStep(1); }, { iconOnly: true }),
        A.btn('expand', L('Show all', 'Tout afficher'), function () { foldAll(false); }, { title: L('Unfold every element', 'Déplier tous les éléments') }),
        A.btn('collapse', L('Fold all', 'Tout replier'), function () { foldAll(true); }, { title: L('Fold every element that has sub-elements', 'Replier tous les éléments qui ont des sous-éléments') })),
      h('div.tg',
        h('div.seg', h('button' + (ui.wbsDir === 'h' ? '.on' : ''), { type: 'button', onclick: function () { ui.wbsDir = 'h'; A.refresh(); } }, L('Left to right', 'De gauche à droite')),
          h('button' + (ui.wbsDir === 'v' ? '.on' : ''), { type: 'button', onclick: function () { ui.wbsDir = 'v'; A.refresh(); } }, L('Top down', 'De haut en bas'))),
        depthSel,
        h('label.chk', h('input', { type: 'checkbox', checked: ui.wbsCost, onchange: function (e) { ui.wbsCost = e.target.checked; A.refresh(); } }), L('Costs', 'Coûts')),
        h('label.chk', h('input', { type: 'checkbox', checked: !!ui.wbsSteps, onchange: function (e) { ui.wbsSteps = e.target.checked; A.refresh(); } }), L('Procurement steps', 'Étapes de passation'))),
      h('div.tg', A.btn('down2', 'SVG', function () { A.download(A.fileName(' - WBS.svg'), draw().svg, 'image/svg+xml'); }, { title: L('Download the diagram as an SVG image', 'Télécharger le diagramme en image SVG') }),
        A.btn('down2', 'PNG', function () { A.svgToPng(draw(), A.fileName(' - WBS.png')); }, { title: L('Download the diagram as a PNG image', 'Télécharger le diagramme en image PNG') }))
    ));
    function draw() { return A.wbsSVG({ dir: ui.wbsDir, depth: ui.wbsDepth, cost: ui.wbsCost, steps: ui.wbsSteps, fold: true, sel: null }); }
    if (!A.P.tasks.length) root.appendChild(h('div.banner', L('The WBS and the Gantt chart show the same tasks. Click the project box, then “Add below” to create the first component.', 'Le WBS et le diagramme de Gantt montrent les mêmes tâches. Cliquer sur la case du projet, puis « Ajouter en dessous » pour créer la première composante.')));
    var d = A.wbsSVG({ dir: ui.wbsDir, depth: ui.wbsDepth, cost: ui.wbsCost, steps: ui.wbsSteps, fold: true, sel: selId, toggles: true });
    var inner = h('div.wbs-inner', { html: d.svg }), canvas = h('div.wbs-canvas', inner);
    root.appendChild(canvas);
    root.appendChild(h('div.legend', h('span.muted', L('Click a box to select it, double-click for its details. Drag a box onto another: in the middle to put it inside, on the edge to place it before or after. Use +/− to fold a branch, the mouse wheel with Ctrl to zoom, and drag the background to pan.',
      'Cliquer sur une case pour la sélectionner, double-clic pour ses détails. Glisser une case sur une autre : au centre pour la mettre dedans, sur le bord pour la placer avant ou après. Utiliser +/− pour replier une branche, la molette avec Ctrl pour zoomer, et glisser le fond pour se déplacer.'))));
    function applyZoom() {
      var z = ui.wbsZoom; inner.style.transform = 'scale(' + z + ')'; inner.style.width = d.w + 'px'; inner.style.height = d.h + 'px';
      canvas.style.setProperty('--zw', (d.w * z) + 'px'); canvas.style.setProperty('--zh', (d.h * z) + 'px');
      var lbl = root.querySelector('.zoomlbl'); if (lbl) lbl.textContent = Math.round(z * 100) + ' %';
    }
    applyZoom();
    canvas.scrollLeft = ui.wbsScroll ? ui.wbsScroll[0] : 0; canvas.scrollTop = ui.wbsScroll ? ui.wbsScroll[1] : 0;
    canvas.addEventListener('scroll', function () { ui.wbsScroll = [canvas.scrollLeft, canvas.scrollTop]; });
    canvas.addEventListener('wheel', function (e) { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); zoomStep(e.deltaY < 0 ? 1 : -1); }, { passive: false });

    /* pointer interactions: select, toggle, drag a box, pan the background */
    var svg = inner.querySelector('svg'), drag = null, pan = null;
    function boxAt(x, y) {
      var els = document.elementsFromPoint(x, y);
      for (var i = 0; i < els.length; i++) { var g = els[i].closest && els[i].closest('.wn'); if (g && svg.contains(g)) return g; }
      return null;
    }
    function dropMode(g, x, y) {
      var r = g.querySelector('.wb').getBoundingClientRect();
      if (ui.wbsDir === 'v') { var fx = (x - r.left) / r.width; return fx < 0.25 ? 'before' : fx > 0.75 ? 'after' : 'child'; }
      var fy = (y - r.top) / r.height; return fy < 0.25 ? 'before' : fy > 0.75 ? 'after' : 'child';
    }
    canvas.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      var tog = e.target.closest('.wtog');
      if (tog) { e.preventDefault(); var tid = +tog.dataset.id; A.edit(function () { var t = A.taskById(tid); t.wbsFold = !t.wbsFold; }); return; }
      var g = e.target.closest('.wn');
      if (!g) { pan = { x: e.clientX, y: e.clientY, sl: canvas.scrollLeft, st: canvas.scrollTop }; canvas.setPointerCapture(e.pointerId); canvas.classList.add('panning'); return; }
      var id = +g.dataset.id;
      drag = { id: id, g: g, x0: e.clientX, y0: e.clientY, moved: false, ghost: null, over: null };
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', function (e) {
      if (pan) { canvas.scrollLeft = pan.sl - (e.clientX - pan.x); canvas.scrollTop = pan.st - (e.clientY - pan.y); return; }
      if (!drag) return;
      var dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
      if (!drag.moved) { if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return; if (drag.id === 0) { drag = null; return; } drag.moved = true; drag.g.classList.add('dragging'); canvas.classList.add('dragging'); }
      drag.g.setAttribute('transform', 'translate(' + (dx / ui.wbsZoom) + ',' + (dy / ui.wbsZoom) + ')');
      var over = boxAt(e.clientX, e.clientY), mode = over ? dropMode(over, e.clientX, e.clientY) : null;
      if (over && (+over.dataset.id === drag.id || over === drag.g)) over = null;
      if (over && over.dataset.id === '0' && mode !== 'child') mode = 'child';
      svg.querySelectorAll('.wn.drop-child,.wn.drop-before,.wn.drop-after').forEach(function (x) { x.classList.remove('drop-child', 'drop-before', 'drop-after'); });
      if (over) over.classList.add('drop-' + mode);
      drag.over = over; drag.mode = mode;
    });
    function endDrag(e) {
      if (pan) { pan = null; canvas.classList.remove('panning'); return; }
      if (!drag) return;
      var dr = drag; drag = null; canvas.classList.remove('dragging');
      if (!dr.moved) { // a click: select, or open details on a second click
        var now = Date.now(), lc = ui.wbsLastClick || {}, same = lc.id === dr.id && now - lc.t < 450; ui.wbsLastClick = { id: dr.id, t: now };
        var already = dr.id === 0 ? ui.wbsRoot : (!ui.wbsRoot && ui.sel.size === 1 && ui.sel.has(dr.id));
        if (dr.id === 0) { ui.wbsRoot = true; ui.sel = new Set(); } else { ui.wbsRoot = false; ui.sel = new Set([dr.id]); ui.anchor = dr.id; }
        if (same) { ui.wbsLastClick = null; if (dr.id === 0) A.go('project'); else A.taskDialog(dr.id); return; }
        if (!already) A.refresh(); return;
      }
      dr.g.removeAttribute('transform'); dr.g.classList.remove('dragging');
      var over = dr.over; if (!over) return;
      var targetId = +over.dataset.id, mode = dr.mode, ok = false;
      A.edit(function () {
        if (targetId === 0) { // onto the project box: becomes a top-level component at the end
          var i = A.taskIndex(dr.id), e2 = A.blockEnd(i), block = A.P.tasks.splice(i, e2 - i), lv0 = block[0].level;
          block.forEach(function (t) { t.level -= lv0; }); A.P.tasks = A.P.tasks.concat(block); ok = true;
        } else ok = A.ops.reparent(dr.id, targetId, mode);
        if (!ok) return false;
        if (A.schedule(A.P).cycle) { ok = false; return false; }
      });
      if (!ok) A.toast(L('This move is not possible: a task cannot go under one of its own sub-tasks or under a task that depends on it.', 'Déplacement impossible : une tâche ne peut pas aller sous l’une de ses propres sous-tâches ni sous une tâche qui dépend d’elle.'), 'bad');
      else { ui.sel = new Set([dr.id]); ui.anchor = dr.id; A.refresh(); }
    }
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
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
