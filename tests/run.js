import assert from "node:assert";
import { route, buildRing, ownerOf, hashPosition } from "../ring.js";
import { plan } from "../migrate.js";
import { render } from "../app.js";

let failed = 0;
let total = 0;
function check(name, fn) {
  total += 1;
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

const nodes = [{ id: "n0", weight: 1 }, { id: "n1", weight: 1 }];
const keys = ["k0", "k1"];

check("route maps every key", () => {
  assert.strictEqual(Object.keys(route(nodes, keys).mapping).length, 2);
});

check("route returns tokens", () => {
  assert.ok(Array.isArray(route(nodes, keys).tokens));
});

check("plan reports skipped", () => {
  assert.strictEqual(typeof plan(nodes, keys, null, null, []).skipped, "number");
});

check("plan reports minimal flag", () => {
  assert.strictEqual(typeof plan(nodes, keys, null, null, []).minimal, "boolean");
});

check("render exposes moved", () => {
  assert.strictEqual(typeof render({ nodes: nodes, keys: keys, migrated: [] }).moved, "number");
});

const weighted = [{ id: "n0", weight: 1 }, { id: "n1", weight: 3 }];

check("tokensPerWeight places weight*2 tokens, sorted by position", () => {
  const result = route(weighted, ["k0"], 2);
  assert.strictEqual(result.tokens.length, 8);
  const expected = [];
  weighted.forEach((node) => {
    for (let i = 0; i < node.weight * 2; i += 1) {
      expected.push([hashPosition(node.id + "/" + i), node.id]);
    }
  });
  expected.sort((a, b) => (a[0] - b[0]) || (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));
  assert.deepStrictEqual(result.tokens, expected.map((entry) => entry[1]));
});

check("keys land on the clockwise-nearest token owner", () => {
  const ring = buildRing(weighted, 2);
  const result = route(weighted, ["a", "b", "c", "d"], 2);
  ["a", "b", "c", "d"].forEach((key) => {
    assert.strictEqual(result.mapping[key], ownerOf(ring, key));
  });
});

const sampleNodes = [{ id: "n0", weight: 1 }, { id: "n1", weight: 1 }];
const sampleKeys = ["k0", "k1", "k2", "k3"];

check("plan only moves keys whose owner changes", () => {
  const grown = plan(sampleNodes, sampleKeys, { id: "n2", weight: 1 }, "n1", ["k2"], 2);
  assert.deepStrictEqual(grown.migrated, ["k0", "k1", "k3"]);
  assert.strictEqual(grown.skipped, 1);
  assert.strictEqual(grown.moved, 4);
  assert.strictEqual(grown.minimal, true);
});

check("plan is idempotent when rerun with migrated keys applied", () => {
  const first = plan(sampleNodes, sampleKeys, { id: "n2", weight: 1 }, "n1", ["k2"], 2);
  const again = plan(sampleNodes, sampleKeys, { id: "n2", weight: 1 }, "n1",
    ["k2"].concat(first.migrated), 2);
  assert.deepStrictEqual(again.migrated, []);
  assert.strictEqual(again.skipped, first.moved);
});

check("duplicate node ids throw E_DUP_NODE instead of silent dedup", () => {
  const dupes = [{ id: "n0", weight: 1 }, { id: "n0", weight: 1 }];
  assert.throws(() => route(dupes, ["k"], 2), (error) => error.code === "E_DUP_NODE");
  assert.throws(
    () => plan(sampleNodes, sampleKeys, { id: "n0", weight: 1 }, null, [], 2),
    (error) => error.code === "E_DUP_NODE"
  );
});

check("render keeps the seven-key result shape", () => {
  const view = render({
    nodes: sampleNodes, keys: sampleKeys, add: { id: "n2", weight: 1 },
    remove: "n1", migrated: ["k2"], tokens_per_weight: 2,
  });
  assert.deepStrictEqual(Object.keys(view).sort(),
    ["idempotent", "mapping", "migrated", "minimal", "moved", "skipped", "tokens"]);
  assert.strictEqual(view.idempotent, true);
});

check("100k keys route with the ring built once and stay fast", () => {
  const manyKeys = Array.from({ length: 100000 }, (_, i) => "key-" + i);
  const started = Date.now();
  const result = route(weighted, manyKeys, 2);
  const elapsedMs = Date.now() - started;
  assert.strictEqual(Object.keys(result.mapping).length, 100000);
  const grown = plan(weighted, manyKeys, { id: "n2", weight: 2 }, null, [], 2);
  const ringBefore = buildRing(weighted, 2);
  const ringAfter = buildRing(weighted.concat({ id: "n2", weight: 2 }), 2);
  let changed = 0;
  manyKeys.forEach((key) => {
    if (ownerOf(ringBefore, key) !== ownerOf(ringAfter, key)) { changed += 1; }
  });
  assert.strictEqual(grown.moved, changed);
  assert.ok(elapsedMs < 5000, "route took " + elapsedMs + "ms");
});

console.log(total + " cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
