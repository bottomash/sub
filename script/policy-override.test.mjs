import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(
  new URL("../sparkle/policy-override.js", import.meta.url),
  "utf8",
);

function apply(config) {
  const context = vm.createContext({ config });
  vm.runInContext(source, context);
  return JSON.parse(JSON.stringify(vm.runInContext("main(config)", context)));
}

test("Sparkle 策略覆写保留原配置并添加 AGI 与 SSH 策略", () => {
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
  assert.deepEqual(
    result["proxy-groups"].map((group) => group.name),
    ["AGI", "SSH", "Auto"],
  );
  assert.deepEqual(result["proxy-groups"][0].use, ["tag"]);
  assert.deepEqual(result["proxy-groups"][1].use, ["tag"]);
  assert.deepEqual(result["rule-providers"].existing, { type: "http" });
  assert.equal(result["rule-providers"].agi.behavior, "classical");
  assert.equal(result["rule-providers"].ssh.behavior, "classical");
  assert.deepEqual(result.rules, [
    "RULE-SET,agi,AGI",
    "RULE-SET,ssh,SSH",
    "DOMAIN,example.com,DIRECT",
    "MATCH,Auto",
  ]);
});

test("Sparkle 策略覆写可重复执行且不产生重复配置", () => {
  const first = apply({
    "proxy-groups": [
      { name: "AGI", type: "select" },
      { name: "SSH", type: "select" },
      { name: "Auto", type: "select" },
    ],
    rules: [
      "RULE-SET,agi,OLD",
      "RULE-SET,ssh,OLD",
      "MATCH,Auto",
    ],
  });
  const result = apply(first);

  for (const name of ["AGI", "SSH"]) {
    assert.equal(
      result["proxy-groups"].filter((group) => group.name === name).length,
      1,
    );
  }
  assert.equal(
    result.rules.filter((rule) => rule.startsWith("RULE-SET,agi,")).length,
    1,
  );
  assert.equal(
    result.rules.filter((rule) => rule.startsWith("RULE-SET,ssh,")).length,
    1,
  );
  assert.deepEqual(result.rules.slice(0, 2), [
    "RULE-SET,agi,AGI",
    "RULE-SET,ssh,SSH",
  ]);
});

test("Sparkle 策略覆写支持空输入", () => {
  for (const config of [null, undefined, [], "invalid", {}]) {
    const result = apply(config);
    assert.deepEqual(
      result["proxy-groups"].map((group) => group.name),
      ["AGI", "SSH"],
    );
    assert.deepEqual(result.rules, [
      "RULE-SET,agi,AGI",
      "RULE-SET,ssh,SSH",
    ]);
  }
});
