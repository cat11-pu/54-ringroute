// app.js：渲染结果（返回结构保持 mapping/tokens/migrated/skipped/moved/minimal/idempotent 七键）
import { route } from "./ring.js";
import { plan, nextNodes } from "./migrate.js";
import { DEFAULT_TOKENS_PER_WEIGHT } from "./ring.js";

export function render(spec) {
  const tokensPerWeight = spec.tokens_per_weight || DEFAULT_TOKENS_PER_WEIGHT;
  const added = spec.add || null;
  const removed = spec.remove || null;
  const migrated = spec.migrated || [];
  const targetNodes = nextNodes(spec.nodes, added, removed);

  // 环只建一次，mapping 与 tokens 都来自同一个环
  const base = route(targetNodes, spec.keys, tokensPerWeight);
  const grown = plan(spec.nodes, spec.keys, added, removed, migrated, tokensPerWeight);

  // 幂等：把本次该搬的键并入已迁移集合后重跑，不再产生新迁移
  const rerun = plan(
    spec.nodes, spec.keys, added, removed,
    migrated.concat(grown.migrated), tokensPerWeight
  );

  return {
    mapping: base.mapping,
    tokens: base.tokens,
    migrated: grown.migrated,
    skipped: grown.skipped,
    moved: grown.moved,
    minimal: grown.minimal,
    idempotent: rerun.migrated.length === 0 && rerun.skipped === grown.moved,
  };
}
