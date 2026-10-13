import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import YAML from "yaml";
import { generateArtifacts } from "./build-configs.mjs";

const policy = YAML.parse(await readFile(new URL("../sparkle/policy.yml", import.meta.url), "utf8"));
const aiOverride = YAML.parse(await readFile(new URL("../sparkle/ai-override.yml", import.meta.url), "utf8"));
const artifacts = await generateArtifacts();
const source = Object.entries(artifacts).find(([name]) => name.endsWith("od1.js"))[1];

function apply(config) {
  const context = vm.createContext({ config });
  vm.runInContext(source, context);
  return JSON.parse(JSON.stringify(vm.runInContext("main(config)", context)));
}

test("od1 保留 policy，仅添加 tag provider 和 AGI.use", () => {
  const result = apply({
    proxies: [{ name: "美国-日本 2x", type: "ss" }],
    "global-client-fingerprint": "chrome",
    "proxy-groups": [{ name: "旧策略" }],
    "rule-providers": { old: {} },
    rules: ["MATCH,DIRECT"],
    "proxy-providers": { existing: { type: "file", path: "existing.yml" } },
  });
  const expected = structuredClone(policy);
  expected["proxy-groups"].find((group) => group.name === "AGI").use = ["tag"];
  expected["proxy-providers"] = { tag: aiOverride["proxy-providers"].tag };
  expected.proxies = [{ name: "日本 2X", type: "ss" }];
  assert.deepEqual(result, expected);
  assert.equal(result.rules.at(-1), "MATCH,Auto");
  assert.equal(result["proxy-groups"].some((group) => group.name === "AI"), false);
});

test("od1 支持空输入且多次调用不共享配置对象", () => {
  for (const config of [null, undefined, [], "invalid", {}]) {
    const context = vm.createContext({ config });
    vm.runInContext(source, context);
    vm.runInContext("const first = main(config); first.rules.push('MATCH,REJECT');", context);
    const result = JSON.parse(JSON.stringify(vm.runInContext("main(null)", context)));
    assert.deepEqual(result.rules, policy.rules);
    assert.deepEqual(result.proxies, []);
  }
});
