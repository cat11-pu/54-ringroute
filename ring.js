// ring.js：按权重放令牌的一致性哈希环

export const DEFAULT_TOKENS_PER_WEIGHT = 2;

// 同一类错误：节点编号重复，错误码 E_DUP_NODE（不得静默去重）
export class RingError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "RingError";
    this.code = code;
  }
}

// 32 位 FNV-1a：纯标准库可实现，浏览器与 Node 结果一致
export function hashPosition(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

// 建环只做一次：每个节点按 weight * tokensPerWeight 放令牌，按位置升序
export function buildRing(nodes, tokensPerWeight) {
  const perWeight = tokensPerWeight || DEFAULT_TOKENS_PER_WEIGHT;
  const seen = Object.create(null);
  const tokens = [];
  nodes.forEach((node) => {
    if (Object.prototype.hasOwnProperty.call(seen, node.id)) {
      throw new RingError("duplicate node id: " + node.id, "E_DUP_NODE");
    }
    seen[node.id] = true;
    const count = (Number(node.weight) || 0) * perWeight;
    for (let replica = 0; replica < count; replica += 1) {
      tokens.push({ position: hashPosition(node.id + "/" + replica), node: node.id });
    }
  });
  tokens.sort((a, b) => (a.position - b.position) || (a.node < b.node ? -1 : a.node > b.node ? 1 : 0));
  return {
    positions: tokens.map((token) => token.position),
    owners: tokens.map((token) => token.node),
  };
}

// 顺时针最近令牌：lower_bound 后取模回到环首
export function ownerOf(ring, key) {
  if (ring.positions.length === 0) { return null; }
  const target = hashPosition(key);
  let low = 0;
  let high = ring.positions.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (ring.positions[middle] < target) { low = middle + 1; } else { high = middle; }
  }
  return ring.owners[low % ring.owners.length];
}

export function route(nodes, keys, tokensPerWeight) {
  const ring = buildRing(nodes, tokensPerWeight);
  const mapping = {};
  keys.forEach((key) => { mapping[key] = ownerOf(ring, key); });
  return { mapping: mapping, tokens: ring.owners };
}
