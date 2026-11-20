/* Project Atlas — online sharing settings.
   Fill in the two values of your Supabase project (Project Settings > API) so that everyone who opens
   the app can use shared projects. Both are public values: the "anon" key is meant to be visible in a web page.
   Leave empty to keep online sharing switched off. See supabase/README.md. */
var A = globalThis.A = globalThis.A || {};
A.cloudConfig = {
  url: '',   // e.g. 'https://abcdefghijkl.supabase.co'
  key: ''    // the "anon" / "publishable" key
};
