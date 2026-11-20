# Project Atlas

Version 2 is at the root of the repository; **version 1 is kept unchanged in the `v1/` folder**
(and under the git tag `v1.0`): `https://<user>.github.io/Project_Atlas/v1/`. The two versions keep
their projects separately in the browser; version 2 opens the version 1 project the first time it starts.


Project planning and contract management in the browser: WBS, Gantt chart, resources,
budget and cash flow, procurement plan, contracts. French / English.

Open `index.html`, or publish the repository with GitHub Pages (no build step, no server):
Settings > Pages > Source *Deploy from a branch* > choose the branch and `/ (root)` > Save.
The app is then at `https://<user>.github.io/Project_Atlas/`.
Projects are kept in the browser and saved to `.atlas` files.

## What it does

- **WBS and Gantt are one structure**: a box added in the WBS diagram is a task in the Gantt, and the reverse.
- **Version 2 additions**: currency list and duration unit on the Project tab, budget lines, movable and foldable WBS boxes with zoom,
  resource drop-down and task filter in the Gantt, resources on summary tasks, up to ten baselines, accounting categories
  and material capacities for resources, multi-selection of contracts, simultaneous editing of shared projects.
- **Scheduling**: critical path method, four link types (FS, SS, FF, SF) with lag or lead, date constraints,
  working days and holidays, milestones, whole-project tasks, total float, baseline, progress.
- **Resources**: work, material and cost resources, rates, assignments, workload chart, over-allocation warnings.
- **Costs**: fixed costs, monthly rates and resource costs, rolled up the WBS; budget by component and
  expense category; monthly, quarterly or yearly cash-flow plan.
- **Earned value**: status dates with % complete and actual cost, PV/EV/AC, SPI, CPI, EAC, earned-schedule
  forecast, S-curve; opens EVM Project Tracker `.json` files.
- **Procurement**: method and review suggested from editable thresholds; procurement steps generated as
  linked tasks ending with the contract signature.
- **Contracts**: register, milestones, payment schedule, guarantees, amendments, claims and penalties, alerts.
- **Online sharing** (optional): share a project by link and work on it with several people at the same time;
  changes are sent automatically and merged. Needs a free Supabase project: see [`supabase/README.md`](supabase/README.md).
- **Files**: MS Project XML import and export (MS Project, ProjectLibre), Excel and CSV, print / PDF reports.
- **Example**: Azuriya Health Project (File › Load the example).

## Code

| File | Content |
|---|---|
| `js/core.js` | dates, working calendar, data model, undo, autosave |
| `js/schedule.js` | scheduling engine, costs, cash flow, task operations |
| `js/procure.js` | procurement methods and steps, contract figures and alerts |
| `js/io.js` | MS Project XML, Excel / CSV, report tables |
| `js/example.js` | the Azuriya example |
| `js/evm.js` | earned value calculations, EVM Tracker import, ABCDE example |
| `js/cloud.js`, `js/config.js` | online shared projects and their settings |
| `supabase/setup.sql` | database script for online sharing |
| `js/ui*.js`, `js/app.js` | screens |
| `css/atlas.css` | styles; brand colours are the variables at the top |
| `vendor/xlsx.full.min.js` | SheetJS 0.18.5 (Apache-2.0), Excel read/write |

Engine tests: `node tests/engine.test.js`
