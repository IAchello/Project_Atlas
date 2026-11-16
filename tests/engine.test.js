/* Engine checks, run with: node tests/engine.test.js */
const path = require('path');
['core', 'schedule', 'procure', 'example', 'io', 'evm'].forEach(f => require(path.join('..', 'js', f + '.js')));
const A = globalThis.A;
let fails = 0;
function ok(cond, msg) { if (!cond) { fails++; console.log('FAIL  ' + msg); } else console.log('ok    ' + msg); }
function eq(a, b, msg) { ok(a === b, msg + '  (got ' + a + ', expected ' + b + ')'); }

/* ---- small network ---- */
A.lang = 'en';
A.P = A.newProject('t'); A.P.start = '2027-01-04'; // a Monday
const a = A.ops.insert(null, 'A', 0, { dur: 5 });
const b = A.ops.insert(null, 'B', 0, { dur: 3, preds: [{ id: a.id, type: 'FS', lag: 0 }] });
const c = A.ops.insert(null, 'C', 0, { dur: 10, preds: [{ id: a.id, type: 'SS', lag: 2 }] });
const d = A.ops.insert(null, 'D', 0, { dur: 2, preds: [{ id: b.id, type: 'FS', lag: 0 }, { id: c.id, type: 'FF', lag: 0 }] });
const m = A.ops.insert(null, 'End', 0, { ms: true, dur: 0, preds: [{ id: d.id, type: 'FS', lag: 0 }] });
let S = A.recalc();
const n = id => S.info.get(id);
eq(n(a.id).ES, 0, 'A starts day 0'); eq(n(b.id).ES, 5, 'B after A'); eq(n(c.id).ES, 2, 'C SS+2');
eq(n(d.id).EF, 12, 'D finishes with C (FF)'); eq(S.PF, 12, 'project length 12 days');
ok(n(c.id).crit && n(d.id).crit && n(a.id).crit, 'A, C, D critical'); eq(n(b.id).TF, 2, 'B has 2 days float');
eq(A.toISO(n(a.id).finish), '2027-01-08', 'A finishes Friday'); eq(A.toISO(n(b.id).start), '2027-01-11', 'B starts Monday (weekend skipped)');
eq(A.toISO(n(m.id).start), '2027-01-19', 'milestone sits on the last day');

/* constraints, holidays, summaries */
c.ctype = 'SNET'; c.cdate = '2027-01-18'; S = A.recalc();
eq(n(c.id).ES, 10, 'SNET moves C');
A.P.calendar.holidays.push({ from: '2027-01-05', to: '2027-01-06', name: 'x' }); S = A.recalc();
eq(A.toISO(n(a.id).finish), '2027-01-12', 'holidays push the finish');
A.P.calendar.holidays = []; c.ctype = 'ASAP'; c.cdate = '';
const s = A.ops.insert(0, 'Summary', 0); [a, b, c, d].forEach(t => t.level = 1);
m.preds = [{ id: s.id, type: 'FS', lag: 1 }]; S = A.recalc();
ok(n(s.id).summary, 'summary detected'); eq(n(s.id).EF, 12, 'summary spans children'); eq(n(m.id).ES, 13, 'link from a summary + lag');
eq(n(a.id).wbs, '1.1.1', 'WBS code');
b.preds.push({ id: d.id, type: 'FS', lag: 0 });
ok(A.schedule(A.P).cycle, 'loop detected'); b.preds.pop();
ok(A.wouldCycle(a.id, [{ id: s.id, type: 'FS', lag: 0 }]), 'child cannot follow its own summary');

/* text parsing */
eq(A.parseDur('3 mo').dur, 60, '3 mo = 60 days'); eq(A.parseDur('2 sem').dur, 10, '2 sem = 10 days'); eq(A.parseDur('15j').dur, 15, '15j');
const pp = A.parsePreds('2; 3SS+2w; 4DD-1mois', 999);
eq(pp.length, 3, 'three predecessors'); eq(pp[1].type + pp[1].lag, 'SS10', 'SS+2w'); eq(pp[2].type + pp[2].lag, 'SS-20', 'DD-1mois');
eq(A.num('18,965,450'), 18965450, 'number with commas'); eq(A.num('1 234,5'), 1234.5, 'french number');

/* costs */
const r = A.newResource('Eng', 'work'); r.rate = 100; r.per = 'd'; A.P.resources.push(r);
A.P.assignments.push({ task: a.id, res: r.id, units: 50 }); a.fixed = 1000; S = A.recalc();
eq(n(a.id).cost, 1250, 'fixed + resource cost'); eq(n(s.id).cost, 1250, 'cost rolls up');
A.P.assignments.push({ task: c.id, res: r.id, units: 100 }); S = A.recalc();
eq(A.overallocations(S).length, 1, 'over-allocation found');

/* ---- Azuriya ---- */
['en', 'fr'].forEach(lang => {
  A.lang = lang;
  A.P = A.buildAzuriya(); S = A.recalc();
  const byName = re => S.nodes.find(x => re.test(x.t.name) && !x.t.proc);
  eq(Math.round(S.total), 27885450, lang + ': total cost');
  eq(S.PF / 20, 29, lang + ': 29 months');
  const hosp = byName(/Hospital construction|Travaux de construction/);
  eq(hosp.ES / 20 + '-' + hosp.EF / 20, '13-25', lang + ': hospital M13-M25'); ok(hosp.crit, lang + ': hospital critical');
  const sup = byName(/^Construction supervision|^Supervision de la construction/);
  eq(sup.ES / 20 + '-' + sup.EF / 20, '12-26', lang + ': supervision M12-M26');
  const eqp = byName(/Equipment HCC North|Équipements CSC Nord/);
  eq(eqp.ES / 20 + '-' + eqp.EF / 20, '17-22', lang + ': HCC equipment M17-M22');
  const aud = byName(/External audit|Audit externe/);
  eq(aud.ES / 20 + '-' + aud.EF / 20, '27-29', lang + ': audit M27-M29');
  const bm = A.budgetMatrix(A.P, S);
  eq(bm.m.map(row => Math.round(row.reduce((x, y) => x + y, 0))).join(','), '22890450,1490000,3505000', lang + ': component totals');
  const cats = bm.cats.map((_, j) => Math.round(bm.m.reduce((x, row) => x + row[j], 0)));
  eq(cats.join(','), '19865450,3615000,925000,3480000,0,0', lang + ': category totals');
  const per = A.periods(S, 'month'), rows = A.phaseCosts(S, per);
  const tot = rows.reduce((x, rw) => x + rw.values.reduce((u, v) => u + v, 0), 0);
  eq(Math.round(tot), 27885450, lang + ': cash flow adds up to the budget');
  eq(A.P.contracts.length, 17, lang + ': 17 contracts');
  eq(A.effReview(A.P.contracts[0]), 'prior', lang + ': hospital works under prior review');
  ok(A.P.contracts.every(c => Math.abs(c.payments.reduce((x, pm) => x + pm.amount, 0) - c.estimate) < 1), lang + ': payment schedules add up');
  eq(S.errors.length, 0, lang + ': no scheduling errors');

  /* MS Project XML round trip */
  const xml = A.exportMSPXML();
  const p2 = A.importMSPXML(xml);
  const before = A.P; A.P = A.normalize(p2); const S2 = A.recalc();
  eq(A.P.tasks.length, before.tasks.length, lang + ': XML round trip keeps all tasks');
  eq(S2.PF, 580, lang + ': XML round trip keeps the schedule');
  eq(Math.round(S2.total), 27885450, lang + ': XML round trip keeps the cost');
});

/* ---- earned value: the EVM Tracker example ---- */
A.lang = 'en'; A.P = A.normalize(A.buildABCDE()); S = A.recalc();
eq(S.PF, 55, 'ABCDE lasts 55 working days'); eq(Math.round(S.total), 1000000, 'ABCDE BAC');
const ss = A.evm.sorted(), m1 = A.evm.metrics(S, ss[0]), m3 = A.evm.metrics(S, ss[2]);
eq(Math.round(m1.tot.pv), 300000, 'PV at 30 June'); eq(Math.round(m1.tot.ev), 250000, 'EV at 30 June'); eq(m1.tot.ac, 265000, 'AC at 30 June');
eq(m1.tot.spi.toFixed(3), '0.833', 'SPI'); eq(m1.tot.cpi.toFixed(3), '0.943', 'CPI');
eq(Math.round(m1.tot.eac), 1060000, 'EAC = AC + (BAC-EV)/CPI');
eq(Math.round(m3.tot.ev), 840000, 'EV at 31 July'); eq(m3.tot.ac, 920000, 'AC at 31 July');
const fc = A.evm.forecast(S, m3); ok(fc.fin > fc.planned, 'forecast finish later than planned (' + A.toISO(fc.fin) + ' vs ' + A.toISO(fc.planned) + ')');
eq(A.P.tasks[2].pct, 85, 'latest status drives task progress'); eq(A.P.statusDate, '2026-07-31', 'status date follows');
A.lang = 'en'; A.P = A.buildAzuriya(); S = A.recalc();
const mz = A.evm.metrics(S, { date: A.toISO(S.finish), pct: {}, ac: {} });
eq(Math.round(mz.tot.pv), 27885450, 'Azuriya PV at the finish equals the budget');

console.log(fails ? '\n' + fails + ' FAILED' : '\nall passed');
process.exit(fails ? 1 : 0);
