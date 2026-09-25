// ring.js：一致性哈希环。按权重放令牌，键归到顺时针最近的令牌；环只建一次。
export const DEFAULT_TOKENS_PER_WEIGHT = 100;

// FNV-1a（32 位）：纯整数运算，浏览器与 Node 原生可用，无需任何依赖。
export function hash32(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function dupNodeError(id) {
  const err = new Error("duplicate node id: " + id);
  err.code = "E_DUP_NODE";
  return err;
}

// 建环（只建一次）：每份权重放 tokensPerWeight 个令牌，按位置升序返回。
// 节点编号重复直接抛 E_DUP_NODE，不做静默去重。
export function buildRing(nodes, tokensPerWeight) {
  const perWeight = tokensPerWeight || DEFAULT_TOKENS_PER_WEIGHT;
  const seen = new Set();
  const tokens = [];
  for (const node of nodes) {
    if (seen.has(node.id)) {
      throw dupNodeError(node.id);
    }
    seen.add(node.id);
    const count = Math.max(0, (node.weight == null ? 1 : Number(node.weight)) * perWeight);
    for (let i = 0; i < count; i += 1) {
      const name = node.id + "/" + i;
      tokens.push({ pos: hash32(name), name: name, node: node.id });
    }
  }
  tokens.sort((a, b) => (a.pos - b.pos) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return tokens;
}

// 顺时针最近令牌：位置 >= 键位置的第一个令牌；越过环尾则回到环首。
export function ownerOf(tokens, keyPos) {
  if (tokens.length === 0) return null;
  let lo = 0;
  let hi = tokens.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (tokens[mid].pos < keyPos) lo = mid + 1;
    else hi = mid;
  }
  return tokens[lo === tokens.length ? 0 : lo].node;
}

// ring.route：建一次环，再用二分查找给每个键定归属。
export function route(nodes, keys, tokensPerWeight) {
  const tokens = buildRing(nodes, tokensPerWeight);
  const mapping = {};
  for (const key of keys) {
    mapping[key] = ownerOf(tokens, hash32(key));
  }
  return { mapping: mapping, tokens: tokens.map((token) => token.node) };
}
