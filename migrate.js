// migrate.js：最小迁移计划，只搬归属真正变化的键，已迁移的跳过

import { buildRing, ownerOf, DEFAULT_TOKENS_PER_WEIGHT } from "./ring.js";

function toList(value) {
  if (value === null || value === undefined) { return []; }
  return Array.isArray(value) ? value : [value];
}

// 增删后的新节点表；节点重名（含与新加入节点撞号）在 buildRing 里抛 E_DUP_NODE
export function nextNodes(nodes, added, removed) {
  const removedIds = Object.create(null);
  toList(removed).forEach((entry) => {
    removedIds[typeof entry === "object" && entry !== null ? entry.id : entry] = true;
  });
  const additions = toList(added);
  return nodes
    .filter((node) => !Object.prototype.hasOwnProperty.call(removedIds, node.id))
    .concat(additions);
}

// 旧环、新环各建一次，随后只做查询：十万键也不重复建环
export function plan(nodes, keys, added, removed, migrated, tokensPerWeight) {
  const perWeight = tokensPerWeight || DEFAULT_TOKENS_PER_WEIGHT;
  const alreadyMigrated = new Set(toList(migrated));
  const oldRing = buildRing(nodes, perWeight);
  const newRing = buildRing(nextNodes(nodes, added, removed), perWeight);

  const movedKeys = [];
  const newlyMigrated = [];
  let skipped = 0;

  keys.forEach((key) => {
    const before = ownerOf(oldRing, key);
    const after = ownerOf(newRing, key);
    if (before === after) { return; }
    movedKeys.push(key);
    if (alreadyMigrated.has(key)) {
      skipped += 1;
    } else {
      newlyMigrated.push(key);
    }
  });

  const moved = movedKeys.length;
  return {
    migrated: newlyMigrated,
    skipped: skipped,
    moved: moved,
    // 最小迁移：计划的搬迁量（已搬 + 待搬）恰好等于归属变化的键数
    minimal: newlyMigrated.length + skipped === moved,
  };
}
