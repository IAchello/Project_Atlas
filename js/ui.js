/* Project Atlas — user-interface helpers: elements, dialogs, toasts, editable lists. */
var A = globalThis.A = globalThis.A || {};
A.ui = { tab: 'dashboard', sel: new Set(), anchor: null, zoom: null, showCrit: true, showBase: false, gridW: 620, filter: 'all', wbsZoom: 1, cSel: new Set(),
  contractId: null, contractTab: 'general', wbsDir: 'h', wbsDepth: 0, wbsCost: true, cfStep: 'quarter', cfBy: 'category', resId: null,
  report: { summary: true, wbs: true, gantt: true, budget: true, cashflow: true, procurement: true, contracts: true, dictionary: false, evm: true, definition: true, stakeholders: true, risks: true } };
A.views = {};

/* h('div.card#id', {onclick: fn, title: 'x'}, child, 'text', [more]) */
A.h = function (spec, attrs) {
  var m = /^([a-z0-9]+)?(.*)$/i.exec(spec), el = document.createElement(m[1] || 'div');
  (m[2].match(/[.#][^.#]+/g) || []).forEach(function (s) { if (s[0] === '#') el.id = s.slice(1); else el.classList.add(s.slice(1)); });
  var start = 1;
  if (attrs && typeof attrs === 'object' && !(attrs instanceof Node) && !Array.isArray(attrs)) {
    start = 2;
    for (var k in attrs) {
      var v = attrs[k]; if (v == null || v === false) continue;
      if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'value') el.value = v;
      else if (k === 'checked' || k === 'disabled' || k === 'selected' || k === 'readOnly') el[k] = !!v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'data') for (var d in v) el.dataset[d] = v[d];
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  function add(c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) c.forEach(add);
    else el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  for (var i = start; i < arguments.length; i++) add(arguments[i]);
  return el;
};
A.esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

/* icons: 16x16 stroke icons */
var ICON = {
  plus: 'M8 3v10M3 8h10', trash: 'M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5', up: 'M8 13V3M4 7l4-4 4 4', down: 'M8 3v10M4 9l4 4 4-4',
  indent: 'M3 3h10M8 8h5M3 13h10M3 6l3 2-3 2', outdent: 'M3 3h10M8 8h5M3 13h10M6 6L3 8l3 2', link: 'M6.5 9.5l3-3M7 4.5l1-1a2.5 2.5 0 013.5 3.5l-1 1M9 11.5l-1 1A2.5 2.5 0 014.5 9l1-1',
  unlink: 'M7 4.5l1-1a2.5 2.5 0 013.5 3.5l-1 1M9 11.5l-1 1A2.5 2.5 0 014.5 9l1-1M3 3l10 10', info: 'M8 7v4M8 4.8v.2M8 14A6 6 0 108 2a6 6 0 000 12z',
  undo: 'M5 3L2 6l3 3M2 6h7a4 4 0 010 8H6', redo: 'M11 3l3 3-3 3M14 6H7a4 4 0 000 8h3', print: 'M4 6V2h8v4M4 11H2.5V6h11v5H12M4 9h8v5H4z',
  file: 'M4 2h5l3 3v9H4zM9 2v3h3', open: 'M2 4h4l1.5 1.5H14V13H2z', save: 'M3 2h8l2 2v10H3zM5 2v4h5V2M5 14V9h6v5', down2: 'M8 2v8M5 7l3 3 3-3M3 13h10',
  up2: 'M8 11V3M5 6l3-3 3 3M3 13h10', diamond: 'M8 2l6 6-6 6-6-6z', flag: 'M4 14V2M4 3h8l-2 2.5L12 8H4', zoomin: 'M7 5v4M5 7h4M11 11l3 3M7 12A5 5 0 107 2a5 5 0 000 10z',
  zoomout: 'M5 7h4M11 11l3 3M7 12A5 5 0 107 2a5 5 0 000 10z', child: 'M3 3v6h6M9 6.5l2.5 2.5L9 11.5', gear: 'M8 10.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4',
  expand: 'M4 6l4 4 4-4', collapse: 'M6 4l4 4-4 4', close: 'M4 4l8 8M12 4l-8 8', warn: 'M8 2l6.5 11.5h-13zM8 6.5v3.5M8 12v.2', check: 'M3 8.5l3.5 3.5L13 4.5', book: 'M3 2.5h7a2 2 0 012 2V14H5a2 2 0 01-2-2zM3 12a2 2 0 012-2h7'
};
A.icon = function (name) {
  var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 16 16'); s.setAttribute('class', 'ico'); s.setAttribute('aria-hidden', 'true');
  s.innerHTML = '<path d="' + (ICON[name] || '') + '" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
  return s;
};
A.btn = function (icon, label, onclick, opts) {
  opts = opts || {};
  return A.h('button.btn' + (opts.primary ? '.primary' : '') + (opts.ghost ? '.ghost' : '') + (opts.active ? '.active' : '') + (opts.danger ? '.danger' : ''),
    { type: 'button', title: opts.title || (opts.iconOnly ? label : null), 'aria-label': opts.iconOnly ? label : null, onclick: onclick, disabled: opts.disabled },
    icon ? A.icon(icon) : null, opts.iconOnly ? null : A.h('span', label));
};

/* ---------- toast ---------- */
A.toast = function (msg, kind) {
  var box = document.getElementById('toasts');
  var t = A.h('div.toast' + (kind ? '.' + kind : ''), { role: 'status' }, msg);
  box.appendChild(t);
  setTimeout(function () { t.classList.add('out'); setTimeout(function () { t.remove(); }, 300); }, kind === 'bad' ? 6000 : 3200);
};

/* ---------- dialogs ---------- */
A.dialog = function (o) {
  var dlg = A.h('dialog.dlg' + (o.wide ? '.wide' : ''));
  function close() { dlg.close(); dlg.remove(); }
  var foot = A.h('div.dlg-foot');
  (o.buttons || [{ label: A.L('Close', 'Fermer') }]).forEach(function (b) {
    foot.appendChild(A.h('button.btn' + (b.primary ? '.primary' : '') + (b.danger ? '.danger' : ''), { type: 'button', onclick: function () { if (!b.onclick || b.onclick() !== false) close(); } }, b.label));
  });
  dlg.appendChild(A.h('div.dlg-head', A.h('h2', o.title), A.h('button.x', { type: 'button', 'aria-label': A.L('Close', 'Fermer'), onclick: close }, A.icon('close'))));
  dlg.appendChild(A.h('div.dlg-body', o.body));
  dlg.appendChild(foot);
  dlg.addEventListener('cancel', function (e) { e.preventDefault(); close(); });
  dlg.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox') {
      var pb = (o.buttons || []).find(function (b) { return b.primary; });
      if (pb) { e.preventDefault(); e.target.blur(); if (!pb.onclick || pb.onclick() !== false) close(); }
    }
  });
  document.body.appendChild(dlg); dlg.showModal();
  return { el: dlg, close: close };
};
A.confirm = function (msg, yes, cb) {
  A.dialog({ title: A.L('Please confirm', 'Confirmation'), body: A.h('p', msg), buttons: [{ label: A.L('Cancel', 'Annuler') }, { label: yes, primary: true, onclick: cb }] });
};
A.promptText = function (title, value, cb) {
  var inp = A.h('input.in', { type: 'text', value: value || '' });
  A.dialog({ title: title, body: inp, buttons: [{ label: A.L('Cancel', 'Annuler') }, { label: 'OK', primary: true, onclick: function () { cb(inp.value.trim()); } }] });
  setTimeout(function () { inp.focus(); inp.select(); }, 30);
};

/* ---------- form fields bound to a draft object (used inside dialogs and panels) ---------- */
/* field(label, input) -> labelled block */
A.field = function (label, input, hint, cls) {
  return A.h('label.field' + (cls ? '.' + cls : ''), A.h('span.lbl', label), input, hint ? A.h('span.hint', hint) : null);
};
/* input bound to obj[key]; type: text | num | date | pct | select | check | area | dur ; onset called after the value is stored */
A.input = function (obj, key, type, opts) {
  opts = opts || {};
  var el;
  function set(v) { if (opts.set) opts.set(v); else obj[key] = v; if (opts.after) opts.after(v); }
  if (type === 'select') {
    el = A.h('select.in', { onchange: function () { var o = opts.options[el.selectedIndex]; set(o.id); } },
      opts.options.map(function (o) { return A.h('option', { selected: o.id === obj[key] }, o.name); }));
  } else if (type === 'check') {
    el = A.h('input', { type: 'checkbox', checked: !!obj[key], onchange: function () { set(el.checked); } });
  } else if (type === 'area') {
    el = A.h('textarea.in', { rows: opts.rows || 3, onchange: function () { set(el.value); } }); el.value = obj[key] || '';
  } else if (type === 'date') {
    el = A.h('input.in', { type: 'date', value: obj[key] || '', onchange: function () { set(el.value); } });
  } else if (type === 'num' || type === 'pct') {
    el = A.h('input.in.num', { type: 'text', inputmode: 'decimal', value: obj[key] ? A.fmtNum(+obj[key], (+obj[key]) % 1 ? 2 : 0) : (opts.zero ? '0' : ''),
      onchange: function () { var v = A.num(el.value); if (type === 'pct') v = Math.max(0, Math.min(100, v)); set(v); el.value = v ? A.fmtNum(v, v % 1 ? 2 : 0) : (opts.zero ? '0' : ''); } });
  } else if (type === 'dur') {
    el = A.h('input.in', { type: 'text', value: A.fmtDur(obj[key] || 0, obj[opts.unitKey] || 'd'),
      onchange: function () { var d = A.parseDur(el.value, obj[opts.unitKey]); if (d) { obj[key] = Math.abs(d.dur) * (opts.signed && d.dur < 0 ? -1 : 1); obj[opts.unitKey] = d.unit; if (opts.after) opts.after(); } el.value = A.fmtDur(obj[key] || 0, obj[opts.unitKey] || 'd'); } });
  } else {
    el = A.h('input.in', { type: 'text', value: obj[key] == null ? '' : obj[key], placeholder: opts.placeholder, onchange: function () { set(el.value); } });
  }
  if (opts.fk) el.dataset.fk = opts.fk;
  if (opts.disabled) el.disabled = true;
  if (opts.title) el.title = opts.title;
  return el;
};

/* ---------- live editing in the page: changes are applied through A.edit, then focus is restored ---------- */
/* live(obj-getter) returns an input whose change is committed inside A.edit. `path` must be unique on screen. */
A.live = function (get, key, type, opts) {
  opts = opts || {};
  var obj = get();
  var o = Object.assign({}, opts, { fk: opts.fk || key, set: function (v) { A.commitLater(function () { var target = get(); if (target) { if (opts.set) opts.set(target, v); else target[key] = v; } }); } });
  return A.input(obj, key, type, o);
};
A.commitLater = function (fn) {
  setTimeout(function () { A.edit(fn); }, 0);
};
A.captureFocus = function () {
  var a = document.activeElement;
  if (!a || !a.dataset || !a.dataset.fk || a.closest('dialog')) return null;
  return { fk: a.dataset.fk, s: a.selectionStart, e: a.selectionEnd };
};
A.restoreFocus = function (f) {
  if (!f) return;
  var el = document.querySelector('[data-fk="' + f.fk.replace(/"/g, '\\"') + '"]');
  if (el) { el.focus(); try { if (el.select && el.type === 'text') el.select(); } catch (e) { /* not selectable */ } }
};

/* editable list: rows live in the project; every change goes through A.edit.
   o = {id, cols:[{k,label,type,options,w,get,ro}], rows: ()=>array (called inside edit too), add: ()=>row, empty, foot} */
A.listEditor = function (o) {
  var rows = o.rows(), L = A.L;
  var table = A.h('table.list');
  table.appendChild(A.h('thead', A.h('tr', o.cols.map(function (c) { return A.h('th' + (c.type === 'num' || c.type === 'pct' ? '.r' : ''), { style: c.w ? { width: c.w + 'px' } : null }, c.label); }), A.h('th.act'))));
  var tb = A.h('tbody');
  rows.forEach(function (row, i) {
    var tr = A.h('tr' + (o.rowClass ? o.rowClass(row) : ''));
    o.cols.forEach(function (c) {
      var td = A.h('td' + (c.type === 'num' || c.type === 'pct' ? '.r' : ''));
      if (c.ro) td.appendChild(document.createTextNode(c.get(row)));
      else if (c.render) td.appendChild(c.render(row, i, o.id + ':' + i + ':' + c.k));
      else {
        var el = A.live(function () { return o.rows()[i]; }, c.k, c.type || 'text', { options: c.options, fk: o.id + ':' + i + ':' + c.k, zero: c.zero, set: c.set, unitKey: c.unitKey, signed: c.signed, placeholder: c.placeholder });
        if (c.disabled && c.disabled(row)) { el.disabled = true; el.classList.add('locked'); if (c.lockTitle) el.title = c.lockTitle(row); }
        td.appendChild(el);
      }
      tr.appendChild(td);
    });
    tr.appendChild(A.h('td.act', A.btn('trash', L('Delete', 'Supprimer'), function () { A.edit(function () { var r = o.rows(); if (o.del) o.del(r[i]); r.splice(i, 1); }); }, { iconOnly: true, ghost: true })));
    tb.appendChild(tr);
  });
  if (!rows.length) tb.appendChild(A.h('tr', A.h('td.empty', { colspan: o.cols.length + 1 }, o.empty || L('Nothing here yet.', 'Rien pour le moment.'))));
  table.appendChild(tb);
  if (o.foot) table.appendChild(o.foot);
  var bar = A.h('div.list-bar', A.btn('plus', o.addLabel || L('Add', 'Ajouter'), function () { A.edit(function () { o.rows().push(o.add()); }); }), o.extra || null);
  return A.h('div.list-wrap', A.h('div.scroll-x', table), bar);
};

/* simple read-only table from an array of rows (first row = header); numeric cells right-aligned and formatted */
A.simpleTable = function (rows, opts) {
  opts = opts || {};
  var t = A.h('table.data' + (opts.cls ? '.' + opts.cls.trim().replace(/\s+/g, '.') : ''));
  t.appendChild(A.h('thead', A.h('tr', rows[0].map(function (c, j) { return A.h('th' + (j && opts.num !== false ? '.r' : ''), c); }))));
  var tb = A.h('tbody');
  rows.slice(1).forEach(function (r, i) {
    var last = opts.totalRows && i >= rows.length - 1 - opts.totalRows;
    tb.appendChild(A.h('tr' + (last ? '.total' : ''), r.map(function (c, j) {
      var isNum = typeof c === 'number';
      return A.h('td' + (isNum || (j && opts.num !== false) ? '.r' : ''), isNum ? (c === 0 && opts.dash ? '–' : A.fmtNum(c, opts.dec || 0)) : (c == null ? '' : c));
    })));
  });
  t.appendChild(tb);
  return t;
};
A.svgEl = function (markup) { var d = document.createElement('div'); d.innerHTML = markup; return d.firstElementChild; };
A.cssVar = function (name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); };
