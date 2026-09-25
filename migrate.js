// migrate.js：最小迁移计划。只搬归属真正变化的键，已迁移的键幂等跳过。
import { buildRing, ownerOf, hash32, DEFAULT_TOKENS_PER_WEIGHT } from "./ring.js";

export function toList(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value.slice() : [value];
}

// 变更后的节点拓扑：移除 removed 中的节点，加入 added（未指定 weight 时按 1）。
export function nextNodes(nodes, added, removed) {
  const removeIds = new Set(toList(removed).map((node) => (node == null ? node : (typeof node === "string" ? node : node.id))));
  return nodes
    .filter((node) => !removeIds.has(node.id))
    .concat(toList(added).map((node) => (typeof node === "string" ? { id: node, weight: 1 } : node)));
}

// migrate.plan：对比变更前后的归属，只搬变化的键；migrated 中已有的键跳过。
// 返回 migrated（本次新搬的键，保持输入顺序）、skipped、moved（变化键总数）、minimal。
export function plan(nodes, keys, added, removed, migrated, tokensPerWeight) {
  const already = new Set(toList(migrated));
  const perWeight = tokensPerWeight || DEFAULT_TOKENS_PER_WEIGHT;
  const afterNodes = nextNodes(nodes, added, removed);
  const unchanged = afterNodes.length === nodes.length &&
    afterNodes.every((node, i) => node === nodes[i]);
  const beforeTokens = unchanged ? null : buildRing(nodes, perWeight);
  const afterTokens = buildRing(afterNodes, perWeight);

  const movedKeys = [];
  let changed = 0;
  let skipped = 0;

  for (const key of keys) {
    const keyPos = hash32(key);
    const before = unchanged ? ownerOf(afterTokens, keyPos) : ownerOf(beforeTokens, keyPos);
    const after = ownerOf(afterTokens, keyPos);
    if (before === after) continue;
    changed += 1;
    if (already.has(key)) {
      skipped += 1;
    } else {
      movedKeys.push(key);
    }
  }

  return {
    migrated: movedKeys,
    skipped: skipped,
    moved: changed,
    minimal: changed === movedKeys.length + skipped
  };
}
