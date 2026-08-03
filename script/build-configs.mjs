import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const policyPath = path.join(rootDir, "sparkle", "policy.yml");
const renamePath = path.join(rootDir, "sparkle", "rename.js");
const sparkleOutputPath = path.join(rootDir, "sparkle", "sparkle-override.js");
const surgeOutputPath = path.join(rootDir, "surge", "policy.conf");
const prefOutputPath = path.join(rootDir, "pref.yml");

const surgeManagedConfig =
  "#!MANAGED-CONFIG https://raw.zhai.dev/bottomash/sub/latest/surge/policy.conf";
const surgeAdditionalRules = ["DOMAIN-SUFFIX,ad.12306.cn,REJECT"];

function requireArray(value, name) {
  if (!Array.isArray(value)) {
    throw new Error(`${name} 必须是数组`);
  }
  return value;
}

function requireObject(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${name} 必须是对象`);
  }
  return value;
}

function quote(value) {
  return `"${String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

function isGlobalGroup(name) {
  return typeof name === "string" && name.toLowerCase() === "global";
}

function buildPolicyFilter(group) {
  const include = group.filter;
  const exclude = group["exclude-filter"];

  if (include && exclude) {
    return `^(?=.*(?:${include}))(?!.*(?:${exclude})).*$`;
  }
  if (exclude) {
    return `^(?!.*(?:${exclude})).*$`;
  }
  return include;
}

function buildSurgeProxyGroup(group, index) {
  requireObject(group, `proxy-groups[${index}]`);

  const { name, type } = group;
  if (typeof name !== "string" || !name) {
    throw new Error(`proxy-groups[${index}].name 必须是非空字符串`);
  }
  if (isGlobalGroup(name)) {
    return null;
  }
  if (!["select", "fallback", "url-test", "load-balance"].includes(type)) {
    throw new Error(`策略组 ${name} 使用了暂不支持的类型：${type}`);
  }

  const parts = [type];
  if (group.proxies !== undefined) {
    parts.push(...requireArray(group.proxies, `${name}.proxies`));
  }
  if (group["include-all"] === true) {
    parts.push("include-all-proxies=true");
  }

  const policyFilter = buildPolicyFilter(group);
  if (policyFilter) {
    parts.push(`policy-regex-filter=${quote(policyFilter)}`);
  }
  if (group.url) {
    parts.push(`url=${group.url}`);
  }
  if (group.interval !== undefined) {
    parts.push(`interval=${group.interval}`);
  }
  return `${name} = ${parts.join(", ")}`;
}

function buildSurgeRule(rule, providers, index) {
  if (typeof rule !== "string") {
    throw new Error(`rules[${index}] 必须是字符串`);
  }

  const parts = rule.split(",").map((part) => part.trim());
  const type = parts[0];

  if (type === "RULE-SET") {
    const provider = requireObject(providers[parts[1]], `rule-provider ${parts[1]}`);
    if (typeof provider.url !== "string" || !provider.url) {
      throw new Error(`rule-provider ${parts[1]} 缺少 url`);
    }
    parts[1] = provider.url;
    return parts.join(",");
  }

  if (type === "GEOIP" && parts[1] === "LAN") {
    return ["RULE-SET", "LAN", ...parts.slice(2)].join(",");
  }

  if (type === "MATCH") {
    return ["FINAL", ...parts.slice(1)].join(",");
  }

  return parts.join(",");
}

function parseJavaScriptString(value) {
  if (!value.startsWith('"')) {
    throw new Error(`rename.js 的替换字符串必须使用双引号：${value}`);
  }
  return JSON.parse(value);
}

function parseRenameRules(renameSource) {
  if (!renameSource.includes("function renameNode")) {
    throw new Error("rename.js 缺少 renameNode 函数");
  }

  const renameStart = renameSource.indexOf("function renameNode");
  const nextFunction = renameSource.indexOf("\nfunction ", renameStart + 1);
  const renameBody =
    nextFunction === -1
      ? renameSource.slice(renameStart)
      : renameSource.slice(renameStart, nextFunction);

  const replacePattern =
    /\.replace\(\/((?:\\.|[^/])*)\/([a-z]*),\s*((?:"(?:\\.|[^"\\])*"))\)/g;
  const rules = [];

  for (const match of renameBody.matchAll(replacePattern)) {
    const [, pattern, flags, replacement] = match;
    if (!/^gu?$/.test(flags)) {
      throw new Error(`rename.js 中的正则 flags 暂不支持转换：${flags}`);
    }
    rules.push({
      match: pattern.replaceAll("\\p{Script=Han}", "\\p{Han}"),
      replace: parseJavaScriptString(replacement),
    });
  }

  if (rules.length === 0) {
    throw new Error("没有从 rename.js 中解析出 renameNode 的 replace 规则");
  }
  return rules;
}

function buildSubconverterRule(group) {
  const include = group.filter;
  const exclude = group["exclude-filter"];
  const patterns = [];

  if (include && exclude) {
    patterns.push(`(?=.*(?:${include}))(?!.*(?:${exclude})).*$`);
  } else if (include) {
    patterns.push(include);
  } else if (exclude) {
    patterns.push(`(?!.*(?:${exclude})).*$`);
  } else if (group["include-all"] === true) {
    patterns.push(".*");
  }

  return patterns;
}

function buildSubconverterProxyGroup(group, groupNames, index) {
  requireObject(group, `proxy-groups[${index}]`);

  const { name, type } = group;
  if (typeof name !== "string" || !name) {
    throw new Error(`proxy-groups[${index}].name 必须是非空字符串`);
  }

  const rule = [];
  if (group.proxies !== undefined) {
    for (const proxy of requireArray(group.proxies, `${name}.proxies`)) {
      if (typeof proxy !== "string") {
        throw new Error(`${name}.proxies 中的值必须是字符串`);
      }
      const isGroupReference =
        groupNames.has(proxy) || ["DIRECT", "REJECT", "PASS"].includes(proxy);
      rule.push(isGroupReference ? `[]${proxy}` : proxy);
    }
  }
  rule.push(...buildSubconverterRule(group));

  return {
    name,
    type,
    rule: rule.length > 0 ? rule : [".*"],
    ...(group.url ? { url: group.url } : {}),
    ...(group.interval !== undefined ? { interval: group.interval } : {}),
  };
}

function buildSubconverterRulesets(rules) {
  return rules.map((rule, ruleIndex) => {
    if (typeof rule !== "string") {
      throw new Error(`rules[${ruleIndex}] 必须是字符串`);
    }
    const parts = rule.split(",").map((part) => part.trim());
    if (parts.length < 2) {
      throw new Error(`rules[${ruleIndex}] 格式无效：${rule}`);
    }
    return {
      rule: parts.slice(0, -1).join(","),
      group: parts.at(-1),
    };
  });
}

function buildSparkleOverride(policy, renameSource) {
  const policyLiteral = JSON.stringify(policy, null, 2);
  return [
    "// 此文件由 script/build-configs.mjs 根据 sparkle/policy.yml 和 sparkle/rename.js 自动生成，请勿手动修改。",
    "",
    renameSource.trimEnd(),
    "",
    "function main(config) {",
    "  config = applyNodeOverride(config);",
    `  Object.assign(config, ${policyLiteral});`,
    "  return config;",
    "}",
    "",
  ].join("\n");
}

function buildSurgePolicy(policy) {
  const groups = requireArray(policy["proxy-groups"], "proxy-groups");
  const providers = requireObject(policy["rule-providers"], "rule-providers");
  const rules = requireArray(policy.rules, "rules");
  const renderedGroups = groups
    .map(buildSurgeProxyGroup)
    .filter((group) => group !== null);

  return [
    surgeManagedConfig,
    "# 此文件由 script/build-configs.mjs 根据 sparkle/policy.yml 自动生成，请勿手动修改。",
    "",
    "[Proxy Group]",
    ...renderedGroups,
    "",
    "[Rule]",
    ...surgeAdditionalRules,
    ...rules.map((rule, index) => buildSurgeRule(rule, providers, index)),
    "",
  ].join("\n");
}

function buildPref(policy, renameSource) {
  const groups = requireArray(policy["proxy-groups"], "proxy-groups");
  const groupNames = new Set(
    groups.map((group, index) => {
      requireObject(group, `proxy-groups[${index}]`);
      return group.name;
    }),
  );
  const rules = requireArray(policy.rules, "rules");

  const pref = {
    common: {
      api_mode: false,
      clash_rule_base: "sparkle/policy.yml",
      enable_filter: true,
    },
    node_pref: {
      sort_flag: false,
      clash_use_new_field_name: true,
      clash_proxies_style: "flow",
      rename_node: parseRenameRules(renameSource),
    },
    aliases: [
      {
        uri: "/clash",
        target: "/sub?target=clash&new_name=true",
      },
    ],
    rulesets: {
      enabled: true,
      overwrite_original_rules: true,
      rulesets: buildSubconverterRulesets(rules),
    },
    proxy_groups: {
      custom_proxy_group: groups.map((group, index) =>
        buildSubconverterProxyGroup(group, groupNames, index),
      ),
    },
    advanced: {
      enable_cache: false,
    },
  };

  return [
    "# 此文件由 script/build-configs.mjs 根据 sparkle/policy.yml 和 sparkle/rename.js 自动生成，请勿手动修改。",
    YAML.stringify(pref, { lineWidth: 0 }).trimEnd(),
    "",
  ].join("\n");
}

async function loadSources() {
  const [policySource, renameSource] = await Promise.all([
    readFile(policyPath, "utf8"),
    readFile(renamePath, "utf8"),
  ]);
  const policy = requireObject(YAML.parse(policySource), "配置根节点");
  return { policy, renameSource };
}

export async function generateArtifacts() {
  const { policy, renameSource } = await loadSources();
  return {
    [sparkleOutputPath]: buildSparkleOverride(policy, renameSource),
    [surgeOutputPath]: buildSurgePolicy(policy),
    [prefOutputPath]: buildPref(policy, renameSource),
  };
}

async function checkArtifacts(artifacts) {
  let valid = true;
  for (const [outputPath, expected] of Object.entries(artifacts)) {
    const current = await readFile(outputPath, "utf8").catch(() => "");
    if (current !== expected) {
      console.error(`${path.relative(rootDir, outputPath)} 不是由当前源文件生成的`);
      valid = false;
    }
  }
  return valid;
}

export async function run(args = process.argv.slice(2)) {
  const artifacts = await generateArtifacts();
  if (args.includes("--check")) {
    if (!(await checkArtifacts(artifacts))) {
      process.exitCode = 1;
    }
    return;
  }

  await Promise.all(
    Object.entries(artifacts).map(([outputPath, content]) =>
      writeFile(outputPath, content, "utf8"),
    ),
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await run();
}
