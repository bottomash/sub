// Sparkle / Mihomo AI 分流覆写。
// 本地节点提供者文件 ./tag.yml 需使用 proxy-provider 格式，例如：
// proxies:
//   - name: example
//     type: ss
//     server: example.com
//     port: 443

const LOCAL_PROVIDER_NAME = "AI Local";
const AUTO_GROUP_NAME = "Auto Proxy";
const AI_GROUP_NAME = "AI";
const AI_RULE_PROVIDER_NAME = "agi";

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function main(config) {
  if (!isObject(config)) {
    config = {};
  }

  const proxyProviders = isObject(config["proxy-providers"])
    ? config["proxy-providers"]
    : {};

  config["proxy-providers"] = {
    ...proxyProviders,
    [LOCAL_PROVIDER_NAME]: {
      type: "file",
      path: "./tag.yml",
      "health-check": {
        enable: true,
        url: "https://www.gstatic.com/generate_204",
        interval: 300,
      },
    },
  };

  const originalGroups = Array.isArray(config["proxy-groups"])
    ? config["proxy-groups"]
    : [];
  const retainedGroups = originalGroups.filter(
    (group) =>
      !isObject(group) ||
      (group.name !== AI_GROUP_NAME && group.name !== AUTO_GROUP_NAME),
  );

  config["proxy-groups"] = [
    {
      name: AUTO_GROUP_NAME,
      type: "url-test",
      use: [LOCAL_PROVIDER_NAME],
      url: "https://www.gstatic.com/generate_204",
      interval: 300,
      tolerance: 50,
    },
    {
      name: AI_GROUP_NAME,
      type: "select",
      proxies: [AUTO_GROUP_NAME],
      use: [LOCAL_PROVIDER_NAME],
    },
    ...retainedGroups,
  ];

  const ruleProviders = isObject(config["rule-providers"])
    ? config["rule-providers"]
    : {};

  config["rule-providers"] = {
    ...ruleProviders,
    [AI_RULE_PROVIDER_NAME]: {
      type: "http",
      behavior: "classical",
      format: "text",
      url: "https://raw.zhai.dev/bottomash/sub/latest/rule/agi.txt",
      path: "./rule_provider/agi.txt",
      interval: 86400,
    },
  };

  const originalRules = Array.isArray(config.rules) ? config.rules : [];
  const retainedRules = originalRules.filter(
    (rule) =>
      typeof rule !== "string" ||
      !rule.startsWith(`RULE-SET,${AI_RULE_PROVIDER_NAME},`),
  );

  config.rules = [
    `RULE-SET,${AI_RULE_PROVIDER_NAME},${AI_GROUP_NAME}`,
    ...(retainedRules.length > 0 ? retainedRules : ["MATCH,DIRECT"]),
  ];

  return config;
}
