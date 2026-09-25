import assert from "node:assert";
import { route } from "../ring.js";
import { plan } from "../migrate.js";
import { render } from "../app.js";

let failed = 0;
function check(name, fn) {
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

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
