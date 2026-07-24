import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(rootDir, "sparkle", "rule.yaml");
const outputPath = path.join(rootDir, "surge", "rule.conf");

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

function buildProxyGroup(group, index) {
  requireObject(group, `proxy-groups[${index}]`);

  const { name, type } = group;
  if (typeof name !== "string" || !name) {
    throw new Error(`proxy-groups[${index}].name 必须是非空字符串`);
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

function buildRule(rule, providers, index) {
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

async function generate() {
  const source = YAML.parse(await readFile(sourcePath, "utf8"));
  requireObject(source, "配置根节点");

  const groups = requireArray(source["proxy-groups"], "proxy-groups");
  const providers = requireObject(source["rule-providers"], "rule-providers");
  const rules = requireArray(source.rules, "rules");

  return [
    "# 此文件由 scripts/build-surge.mjs 根据 sparkle/rule.yaml 自动生成，请勿手动修改。",
    "",
    "[Proxy Group]",
    ...groups.map(buildProxyGroup),
    "",
    "[Rule]",
    ...rules.map((rule, index) => buildRule(rule, providers, index)),
    "",
  ].join("\n");
}

const generated = await generate();

if (process.argv.includes("--check")) {
  const current = await readFile(outputPath, "utf8").catch(() => "");
  if (current !== generated) {
    console.error("surge/rule.conf 不是由当前 sparkle/rule.yaml 生成的");
    process.exitCode = 1;
  }
} else {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, generated, "utf8");
}
