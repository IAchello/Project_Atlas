# Online shared projects — setup (about 10 minutes, once)

Project Atlas stores shared projects in a Supabase project that you own. The free plan is enough.

1. Create an account at https://supabase.com and a **New project** (any name, e.g. `project-atlas`;
   choose a region close to your users; keep the database password somewhere safe — Atlas does not need it).
2. In the project, open **SQL Editor > New query**, paste the whole content of [`setup.sql`](setup.sql) and press **Run**.
3. Open **Project Settings > API** (or **Connect**) and copy two values:
   - the **Project URL**, like `https://abcdefghijkl.supabase.co`
   - the **anon / publishable key** (the public one — never the `service_role` / secret key).
4. Try it on your computer: in Project Atlas, **Project** tab > **Online sharing**, paste the two values, **Save and test**.
5. Switch it on for everybody: put the same two values in [`../js/config.js`](../js/config.js) and publish.
   Both values are public by design; the edit code of each project is what protects it.

## How it works for users

- **Share** (top right) > *Share this project online* gives a **link to view**, a **link to edit** and an **edit code**.
- Everyone works in their own browser. **Save online** sends changes; other people's screens follow within about
  20 seconds if they have no unsaved change of their own.
- If two people changed the project, the second one to save is warned and chooses: load the other version,
  replace it with theirs, or save their copy to a file first. Nothing is overwritten silently.
- A viewer can become an editor by typing the edit code (*Share > Enter the edit code*).

## What to know

- There are no accounts: **anyone who has the view link can read the project**, anyone with the edit link or code
  can change or delete it. Share links accordingly. The edit code cannot be recovered if lost.
- Projects cannot be listed or searched: the table is closed and only reachable through the functions of `setup.sql`.
- It is not simultaneous co-editing: two people editing at once must merge by choosing one version.
- Free Supabase projects are paused after about a week without activity; reopen the dashboard to resume them.
- To see or remove shared projects as the owner: Supabase dashboard > Table Editor > `atlas_projects`.
