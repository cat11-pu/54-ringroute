// migrate.js：迁移计划（基线：全部重分、不记已迁移）
export function plan(nodes, keys, added, removed, migrated) {
  return { migrated: keys.slice(), skipped: 0, moved: keys.length, minimal: false };
}
