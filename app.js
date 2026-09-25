// app.js：渲染结果（返回结构保持兼容：mapping/tokens/migrated/skipped/moved/minimal/idempotent）
import { route, DEFAULT_TOKENS_PER_WEIGHT } from "./ring.js";
import { plan, nextNodes } from "./migrate.js";

export function render(spec) {
  const perWeight = spec.tokens_per_weight || DEFAULT_TOKENS_PER_WEIGHT;
  const afterNodes = nextNodes(spec.nodes, spec.add || null, spec.remove || null);
  const base = route(afterNodes, spec.keys, perWeight);
  const grown = plan(spec.nodes, spec.keys, spec.add || null, spec.remove || null,
                     spec.migrated || [], perWeight);

  // 用"再执行一次"的结果验证幂等：第二次不得再产生新的迁移。
  const merged = (spec.migrated || []).concat(grown.migrated);
  const rerun = plan(spec.nodes, spec.keys, spec.add || null, spec.remove || null,
                     merged, perWeight);

  return {
    mapping: base.mapping,
    tokens: base.tokens,
    migrated: grown.migrated,
    skipped: grown.skipped,
    moved: grown.moved,
    minimal: grown.minimal,
    idempotent: rerun.migrated.length === 0
  };
}
