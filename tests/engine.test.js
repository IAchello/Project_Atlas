/* Engine checks, run with: node tests/engine.test.js */
const path = require('path');
['core', 'schedule', 'procure', 'example', 'io', 'evm', 'pm', 'ui', 'cloud'].forEach(f => require(path.join('..', 'js', f + '.js')));
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

/* ---- version 2: display unit, baselines, re-parenting, summary resources, material capacity ---- */
A.lang = 'en'; A.P = A.buildAzuriya(); S = A.recalc();
A.P.durUnit = 'mo'; eq(A.fmtDurT(240, A.P.tasks[2]), '12 mo', 'durations shown in months when the project says so');
A.P.durUnit = 'w'; eq(A.fmtDurT(10, A.P.tasks[2]), '2 wks', 'durations shown in weeks'); A.P.durUnit = 'auto';
const n0 = A.P.baselines.length; eq(n0, 1, 'the example has one baseline');
A.setBaseline('Approved plan'); eq(A.P.baselines.length + '|' + A.P.baseline.name, '2|Approved plan', 'second baseline saved and in use');
A.useBaseline(A.P.baselines[0].id); eq(A.P.baseline.id, A.P.baselines[0].id, 'baseline switched');
A.clearBaseline(); eq(A.P.baselines.length + '|' + A.P.baseline.name, '1|Approved plan', 'clear removes the one in use, the other takes over');
for (let i = 0; i < 12; i++) A.setBaseline('b' + i); eq(A.P.baselines.length, 10, 'never more than ten baselines');
const hosp = A.P.tasks.find(t => /Hospital construction works/.test(t.name)), c2 = A.P.tasks.find(t => /Rehabilitation of 3/.test(t.name));
ok(A.ops.reparent(hosp.id, c2.id, 'child'), 'move the hospital works under component 2');
S = A.recalc(); eq(S.info.get(hosp.id).parent.id, c2.id, 'new parent'); eq(S.info.get(hosp.id).t.level, 1, 'level follows the new parent');
ok(!A.ops.reparent(c2.id, hosp.id, 'child'), 'cannot drop a task inside its own sub-tree');
const eqN = A.P.tasks.find(t => /Equipment HCC North/.test(t.name)), eqW = A.P.tasks.find(t => /Equipment HCC West/.test(t.name));
A.ops.reparent(eqW.id, eqN.id, 'before'); eq(A.taskIndex(eqW.id) + 1, A.taskIndex(eqN.id), 'reorder before a sibling');
const rr = A.newResource('Site engineer', 'work'); rr.rate = 1000; rr.per = 'd'; A.P.resources.push(rr);
const sum = A.P.tasks.find(t => /Category 1: Construction/.test(t.name)); A.P.assignments.push({ task: sum.id, res: rr.id, units: 50 }); S = A.recalc();
ok(S.info.get(sum.id).own > 0 && Math.abs(S.info.get(sum.id).own - S.info.get(sum.id).dur * 500) < 1, 'a resource assigned to a summary task costs units x summary duration');
const mat = A.newResource('Cement', 'material'); mat.max = 100; mat.unit = 't'; A.P.resources.push(mat);
A.P.assignments.push({ task: hosp.id, res: mat.id, units: 80 }); A.P.assignments.push({ task: eqN.id, res: mat.id, units: 30 }); S = A.recalc();
const ov = A.overallocations(S).find(o => o.res.id === mat.id); ok(ov && ov.qty && ov.peak === 110, 'material over its available quantity is flagged');
const bud = A.tableBudget(); ok(bud[0][0] === 'Component' && A.catLabel() === 'Budget line', 'budget lines wording');

/* ---- three-way merge for shared projects ---- */
A.P = A.buildABCDE(); A.P.shared = { id: 'x' }; S = A.recalc();
const base = A.clone(A.P), local = A.clone(A.P), remote = A.clone(A.P);
local.tasks[0].name = 'A (Ann)'; local.tasks.push(Object.assign(A.newTask('New by Ann', 0), { id: 9001, dur: 3 })); local.name = 'Renamed by Ann';
remote.tasks[1].name = 'B (Bob)'; remote.tasks[2].dur = 25; remote.tasks.splice(3, 1); remote.resources.push(Object.assign(A.newResource('Bob res', 'work'), { id: 9002 }));
remote.statuses[0].pct[remote.tasks[0].id] = 50; local.statuses[0].ac[local.tasks[0].id] = 999;
local.tasks[2].dur = 30; // both changed task C's duration: the saver (local) wins
const mg = A.cloud.merge(base, local, remote);
eq(mg.tasks.map(t => t.name).join('|'), 'A (Ann)|B (Bob)|C|E|New by Ann', 'merged task list: both renames, remote deletion, local addition at the end');
eq(mg.tasks[2].dur, 30, 'same field changed by both: the person saving wins');
eq(mg.name, "Renamed by Ann", "project name from local"); eq(mg.resources.length, 1, 'remote resource added');
eq(mg.statuses[0].pct[base.tasks[0].id] + '|' + mg.statuses[0].ac[base.tasks[0].id], '50|999', 'progress entered by two people on one status date is combined');
const m2 = A.cloud.merge(base, base, remote); eq(JSON.stringify(m2.tasks), JSON.stringify(remote.tasks), 'no local change: remote wins entirely');

/* ---- stakeholders, results, risks ---- */
A.lang = 'en'; A.P = A.buildAzuriya(); S = A.recalc();
eq(A.P.stakeholders.length + '|' + A.P.results.length + '|' + A.P.risks.length + '|' + A.P.kpis.length, '7|5|7|3', 'Azuriya example carries stakeholders, results, risks and KPIs');
eq(A.pm.suggestStrategy({ power: 3, interest: 3 }) + ',' + A.pm.suggestStrategy({ power: 3, interest: 1 }) + ',' + A.pm.suggestStrategy({ power: 1, interest: 3 }) + ',' + A.pm.suggestStrategy({ power: 1, interest: 1 }), 'collaborate,satisfy,inform,monitor', 'power / interest strategies');
eq([25, 12, 8, 4, 2].map(A.pm.band).join(','), 'vh,h,m,l,vl', 'risk score bands');
const r1 = A.P.risks[0]; eq(A.pm.score(r1.prob, r1.impact), 12, 'R01 score'); eq(Math.round(A.pm.emv(r1)), 144000, 'EMV = 40 % x 360,000');
const opp = A.P.risks.find(r => r.kind === 'opportunity'); ok(A.pm.emv(opp) < 0, 'opportunities reduce the reserve');
const rs = A.pm.riskSummary(); eq(rs.open, 7, 'all risks active'); ok(rs.reserve > 0 && rs.reserve < 2000000, 'reserve in a plausible range (' + Math.round(rs.reserve) + ')');
const outs = A.P.results.filter(r => r.level === 'output'); ok(outs.every(r => r.task && S.info.get(r.task) && !S.info.get(r.task).parent), 'outputs are linked to the top-level components');
eq(A.pm.indicatorProgress({ baseline: '45', target: '80', actual: '62' }), (62 - 45) / 35 * 100, 'indicator progress');
A.P = A.newProject('x'); A.ops.insert(null, 'Comp A', 0); A.ops.insert(null, 'Comp B', 0); S = A.recalc();
eq(A.pm.resultsFromWBS(), 2, 'two outputs from two components'); eq(A.P.results.length, 4, 'impact + outcome + 2 outputs');
A.P.results[1].assumptions = 'Funding arrives on time'; eq(A.pm.risksFromAssumptions(), 1, 'one risk per assumption'); eq(A.pm.risksFromAssumptions(), 0, 'not twice');
const tb = A.pm.tables(); ok(tb.risks.length === 2 && tb.results.length === 5 && tb.stakeholders.length === 1, 'export tables');
const bse = A.clone(A.P), lcl = A.clone(A.P), rmt = A.clone(A.P); lcl.risks[0].owner = 'Ann'; rmt.risks[0].review = '2027-01-01'; rmt.stakeholders.push(A.pm.newStakeholder('Bob side'));
const mg2 = A.cloud.merge(bse, lcl, rmt); eq(mg2.risks[0].owner + '|' + mg2.risks[0].review + '|' + mg2.stakeholders.length, 'Ann|2027-01-01|1', 'new lists merge field by field');

console.log(fails ? '\n' + fails + ' FAILED' : '\nall passed');
process.exit(fails ? 1 : 0);
