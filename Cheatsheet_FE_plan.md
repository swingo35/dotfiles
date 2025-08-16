Cheatsheet Keymaps: Export Pipeline (FE already built)

Goal
- Generate deterministic, versioned keymap JSON for tmux, Ghostty, and AeroSpace using local scripts; FE consumes static files. No backend.

Outputs
- apps/cheatsheet-pwa/public/keymaps/{tmux,ghostty,aerospace}.json
- Each file contains { tool, version, items[] } with items annotated as source: 'default'|'user'.

Data Model (shared)
```ts
// packages/types/keymaps.ts
export type Keymap = {
  tool: 'tmux'|'ghostty'|'aerospace';
  version?: string;
  table?: string;       // tmux key-table (root, prefix, copy-mode-vi, …)
  context?: string;     // ghostty/aerospace mode/context
  action: string;       // human-readable action/command
  keys: string[];       // e.g. ["C-b"], ["cmd+enter"]
  source: 'default'|'user';
  sourceFile?: string;
  line?: number;
};
export type KeymapBundle = { tool: Keymap['tool']; version?: string; items: Keymap[] };
```

Repo Layout (no server)
- tools/exporters/export-tmux.ts
- tools/exporters/export-ghostty.ts
- tools/exporters/export-aerospace.ts
- FE: apps/cheatsheet-pwa/ (already built) reads from public/keymaps/.

Run Commands (single entrypoint)
- From FE app: add a script export:keymaps:
```json
// apps/cheatsheet-pwa/package.json
{
  "scripts": {
    "export:keymaps": "bun run ../../tools/exporters/export-tmux.ts && bun run ../../tools/exporters/export-ghostty.ts && bun run ../../tools/exporters/export-aerospace.ts"
  }
}
```
- Usage: cd apps/cheatsheet-pwa && bun run export:keymaps

Exporter Details
1) tmux (automatic and reliable)
- Defaults: start isolated server with no config to capture true defaults.
- User: list keys from your current session (after tmux.conf loads).
- Tables: root, prefix, copy-mode, copy-mode-vi (extend as needed).
- Core commands:
  - Defaults: tmux -L __kb -f /dev/null start-server \; list-keys -T <table> \; kill-server
  - User: tmux list-keys -T <table>
  - Version: tmux -V
- Notes: Keep tables explicit for stability across tmux versions.

2) Ghostty (config parser)
- User config: parse ~/.config/ghostty/config (override with GHOSTTY_CONFIG).
- Defaults: keep a small ghostty-defaults.json checked in; merge with user keys.
- Patterns supported (adapt to your file):
  - keybind = ctrl+shift+t:new_tab
  - keybind ctrl+shift+t new_tab

3) AeroSpace (config parser)
- Parse your TOML config (e.g., ~/.config/aerospace/aerospace.toml).
- Extract keybindings per mode/context; keep aerospace-defaults.json for defaults.
- Use a TOML parser for robustness; fall back to regex for your known shapes.

TypeScript Sketch (Bun) — tmux
```ts
import { $ } from 'bun';
import { writeFileSync } from 'node:fs';
import type { Keymap, KeymapBundle } from '../../packages/types/keymaps';

function parseListKeys(out: string, source: 'default'|'user'): Keymap[] {
  return out.split('\n').map(s=>s.trim()).filter(Boolean).flatMap(line => {
    const m = line.match(/-T\s+(\S+)\s+(\S+)\s+(.+)$/);
    if (!m) return [];
    const [, table, key, action] = m;
    return [{ tool:'tmux', table, action, keys:[key], source }];
  });
}

async function listKeys(table: string, isolated=false) {
  const cmd = isolated
    ? await $`tmux -L __kb -f /dev/null start-server \; list-keys -T ${table} \; kill-server`.quiet()
    : await $`tmux list-keys -T ${table}`.quiet();
  return cmd.stdout.toString();
}

await (async () => {
  const version = (await $`tmux -V`.quiet()).stdout.toString().trim();
  const tables = ['root','prefix','copy-mode','copy-mode-vi'];
  const defaults = (await Promise.all(tables.map(t => listKeys(t, true)))).flatMap(s => parseListKeys(s,'default'));
  const users = (await Promise.all(tables.map(t => listKeys(t, false)))).flatMap(s => parseListKeys(s,'user'));
  const bundle: KeymapBundle = { tool:'tmux', version, items:[...defaults, ...users] };
  writeFileSync(new URL('../../apps/cheatsheet-pwa/public/keymaps/tmux.json', import.meta.url), JSON.stringify(bundle, null, 2));
})();
```

Quality Gates & Validation
- Determinism: exporters produce the same output across runs given the same configs.
- Versioning: include tool versions; bump curated defaults with a short note when tools update.
- Conflicts: after merge, detect duplicate chords within the same scope and mark them (FE can highlight).
- Sanity checks (local):
  - tmux: tmux -f tmux/tmux.conf start-server \; kill-server (syntax check)
  - Ghostty: ensure GHOSTTY_CONFIG exists; error clearly if not.
  - AeroSpace: run aerospace reload-config after edits to validate.

Rollout
- V0: tmux exporter only; FE reads tmux.json.
- V0.1: add Ghostty exporter + curated defaults.
- V0.2: add AeroSpace exporter + conflict marking.
- Nice-to-have: drag-and-drop custom JSON bundles in FE for sharing.

Operational Tips
- Run: cd apps/cheatsheet-pwa && bun run export:keymaps before building/deploying FE.
- Mac glyphs: FE pretty-prints chords (⌘ ⌥ ⌃ ⇧) from raw strings; keep exporter output raw and simple.
- Locations: prefer env overrides (GHOSTTY_CONFIG, AEROSPACE_CONFIG) for portability.

