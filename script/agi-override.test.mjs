import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(
  new URL("../sparkle/agi-override.js", import.meta.url),
  "utf8",
);

function apply(config) {
  const context = vm.createContext({ config });
  vm.runInContext(source, context);
  return JSON.parse(JSON.stringify(vm.runInContext("main(config)", context)));
}

test("AGI 覆写保留原配置并添加 AGI 相关配置", () => {
  const result = apply({
    proxies: [{ name: "日本", type: "ss" }],
    "proxy-providers": { existing: { type: "http" } },
    "proxy-groups": [{ name: "Auto", type: "select" }],
    "rule-providers": { existing: { type: "http" } },
    rules: ["DOMAIN,example.com,DIRECT", "MATCH,Auto"],
    dns: { enable: true },
  });

  assert.deepEqual(result.proxies, [{ name: "日本", type: "ss" }]);
  assert.deepEqual(result.dns, { enable: true });
  assert.deepEqual(result["proxy-providers"].existing, { type: "http" });
  assert.equal(
    result["proxy-providers"].tag.path,
    "C:/Users/haoran/AppData/Roaming/sparkle/work/tag.yml",
  );
  assert.equal(result["proxy-groups"][0].name, "AGI");
  assert.deepEqual(result["proxy-groups"][0].use, ["tag"]);
  assert.deepEqual(result["proxy-groups"][1], {
    name: "Auto",
    type: "select",
  });
  assert.deepEqual(result["rule-providers"].existing, { type: "http" });
  assert.equal(result["rule-providers"].agi.behavior, "classical");
  assert.deepEqual(result.rules, [
    "RULE-SET,agi,AGI",
    "DOMAIN,example.com,DIRECT",
    "MATCH,Auto",
  ]);
});

test("AGI 覆写可重复执行且不产生重复配置", () => {
  const first = apply({
    "proxy-groups": [
      { name: "AGI", type: "select" },
      { name: "Auto", type: "select" },
    ],
    rules: ["RULE-SET,agi,OLD", "MATCH,Auto"],
  });
  const result = apply(first);

  assert.equal(
    result["proxy-groups"].filter((group) => group.name === "AGI").length,
    1,
  );
  assert.equal(
    result.rules.filter((rule) => rule.startsWith("RULE-SET,agi,")).length,
    1,
  );
  assert.equal(result.rules[0], "RULE-SET,agi,AGI");
});

test("AGI 覆写支持空输入", () => {
  for (const config of [null, undefined, [], "invalid", {}]) {
    const result = apply(config);
    assert.equal(result["proxy-groups"][0].name, "AGI");
    assert.equal(result.rules[0], "RULE-SET,agi,AGI");
  }
});
