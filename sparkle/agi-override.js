// Sparkle / Mihomo AGI 增量覆写。
// 保留原配置，仅添加或更新 AGI 策略组、规则和本地 tag 节点提供者。

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
    tag: {
      type: "file",
      path: "C:/Users/haoran/AppData/Roaming/sparkle/work/tag.yml",
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
  config["proxy-groups"] = [
    {
      name: "AGI",
      type: "fallback",
      interval: 300,
      url: "https://www.gstatic.com/generate_204",
      icon: "https://raw.zhai.dev/Koolson/Qure/master/IconSet/Color/AI.png",
      use: ["tag"],
    },
    ...originalGroups.filter(
      (group) => !isObject(group) || group.name !== "AGI",
    ),
  ];

  const ruleProviders = isObject(config["rule-providers"])
    ? config["rule-providers"]
    : {};
  config["rule-providers"] = {
    ...ruleProviders,
    agi: {
      type: "http",
      format: "text",
      behavior: "classical",
      interval: 86400,
      url: "https://raw.zhai.dev/bottomash/sub/latest/rule/agi.txt",
    },
  };

  const originalRules = Array.isArray(config.rules) ? config.rules : [];
  config.rules = [
    "RULE-SET,agi,AGI",
    ...originalRules.filter(
      (rule) =>
        typeof rule !== "string" || !rule.startsWith("RULE-SET,agi,"),
    ),
  ];

  return config;
}
