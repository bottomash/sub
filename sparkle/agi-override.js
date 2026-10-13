// Sparkle / Mihomo AGI 增量覆写。
// 保留原配置，仅添加或更新 AGI 策略组、规则和本地 tag 节点提供者。

const LOCAL_PROVIDER_NAME = "tag";
const AGI_GROUP_NAME = "AGI";
const AGI_RULE_PROVIDER_NAME = "agi";

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
      name: AGI_GROUP_NAME,
      type: "fallback",
      interval: 300,
      url: "https://www.gstatic.com/generate_204",
      filter: "(美国|韩国|日本|新加坡)",
      "exclude-filter": "3[xX]|5[xX]|10[xX]|家宽|星链|住宅|游戏",
      "include-all": true,
      icon: "https://raw.zhai.dev/Koolson/Qure/master/IconSet/Color/AI.png",
      use: [LOCAL_PROVIDER_NAME],
    },
    ...originalGroups.filter(
      (group) => !isObject(group) || group.name !== AGI_GROUP_NAME,
    ),
  ];

  const ruleProviders = isObject(config["rule-providers"])
    ? config["rule-providers"]
    : {};
  config["rule-providers"] = {
    ...ruleProviders,
    [AGI_RULE_PROVIDER_NAME]: {
      type: "http",
      format: "text",
      behavior: "classical",
      interval: 86400,
      url: "https://raw.zhai.dev/bottomash/sub/latest/rule/agi.txt",
    },
  };

  const originalRules = Array.isArray(config.rules) ? config.rules : [];
  config.rules = [
    `RULE-SET,${AGI_RULE_PROVIDER_NAME},${AGI_GROUP_NAME}`,
    ...originalRules.filter(
      (rule) =>
        typeof rule !== "string" ||
        !rule.startsWith(`RULE-SET,${AGI_RULE_PROVIDER_NAME},`),
    ),
  ];

  return config;
}
