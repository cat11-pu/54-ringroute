// ring.js：环与归属（基线：按输入顺序轮流分、不看权重）
export function route(nodes, keys) {
  const mapping = {};
  keys.forEach((key, index) => { mapping[key] = nodes.length ? nodes[index % nodes.length].id : null; });
  return { mapping: mapping, tokens: nodes.map((node) => node.id) };
}
