/// <reference types="@cloudflare/workers-types" />

// Bindings available to the worker at runtime. `DB` is optional because
// `.openai/hosting.json` currently declares `"d1": null`, so the binding is
// absent unless the control plane injects it — `db/index.ts` checks for it.
declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
  }
}
