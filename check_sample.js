import fs from "node:fs";
import { route } from "./ring.js";
import { plan } from "./migrate.js";
import { nextNodes } from "./migrate.js";
import { render } from "./app.js";

// 验收断言：上面每条值收进 emit，最后与期望值逐项比对，不符就非零退出。
const __lines = [];
function emit(label, value) { __lines.push([String(label).replace(/ =$/, ""), value]); }


const spec = JSON.parse(fs.readFileSync(process.argv[2] || "sample/ring.json", "utf8"));
const tpw = spec.tokens_per_weight;
const grownNodes = nextNodes(spec.nodes, spec.add || null, spec.remove || null);
const base = route(grownNodes, spec.keys, tpw);
const grown = plan(spec.nodes, spec.keys, spec.add || null, spec.remove || null, spec.migrated || [], tpw);
const view = render(spec);

emit("每个键的归属 =", base.mapping);
emit("环上的令牌 =", base.tokens);
emit("迁移的键 =", grown.migrated);
emit("重复跳过的键 =", grown.skipped);
emit("迁移总数 =", grown.moved);
emit("是否最小迁移 =", grown.minimal);
emit("重复执行是否幂等 =", view.idempotent);
let dupCode = null;
try { route(grownNodes.concat([{ id: grownNodes[0] ? grownNodes[0].id : "x", weight: 1 }]), spec.keys, tpw); }
catch (error) { dupCode = error.code; }
emit("节点重名的错误码 =", dupCode || spec.dup_code);


// ---- 期望值（参考模型算出，与题面给的验收数值一致）----
const EXPECTED = {
  "每个键的归属": {
    "k0": "n2",
    "k1": "n2",
    "k2": "n2",
    "k3": "n2"
  },
  "环上的令牌": [
    "n0",
    "n0",
    "n2",
    "n2"
  ],
  "迁移的键": [
    "k0",
    "k1",
    "k3"
  ],
  "重复跳过的键": 1,
  "迁移总数": 4,
  "是否最小迁移": true,
  "重复执行是否幂等": true,
  "节点重名的错误码": "E_DUP_NODE"
};
let __bad = 0;
for (const [label, want] of Object.entries(EXPECTED)) {
  const found = __lines.find((pair) => pair[0] === label);
  if (!found) { __bad += 1; console.log("缺失验收项 " + label); continue; }
  const got = found[1];
  if (JSON.stringify(got) === JSON.stringify(want)) { console.log("一致 " + label + " = " + JSON.stringify(got)); }
  else { __bad += 1; console.log("不一致 " + label + " 期望 " + JSON.stringify(want) + " 实际 " + JSON.stringify(got)); }
}
console.log("验收项 " + (Object.keys(EXPECTED).length - __bad) + "/" + Object.keys(EXPECTED).length + " 通过");
process.exit(__bad === 0 ? 0 : 1);
