// app.js：渲染结果
import { route } from "./ring.js";
import { plan } from "./migrate.js";

export function render(spec) {
  const base = route(spec.nodes, spec.keys);
  const grown = plan(spec.nodes, spec.keys, spec.add || null, spec.remove || null, spec.migrated || []);
  return { mapping: base.mapping, tokens: base.tokens, migrated: grown.migrated,
           skipped: grown.skipped, moved: grown.moved, minimal: grown.minimal,
           idempotent: true };
}
