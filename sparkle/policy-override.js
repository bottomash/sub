// 此文件由 script/build-configs.mjs 根据 sparkle/policy.yml 自动生成，请勿手动修改。
// 保留原配置，并增量添加或更新 Sparkle / Mihomo 专用策略。

const override = {
  "proxy-providers": {
    "tag": {
      "type": "file",
      "path": "C:/Users/haoran/AppData/Roaming/sparkle/work/tag.yml",
      "health-check": {
        "enable": true,
        "url": "https://www.gstatic.com/generate_204",
        "interval": 300
      }
    }
  },
  "proxy-groups": [
    {
      "name": "AGI",
      "type": "fallback",
      "interval": 300,
      "url": "https://www.gstatic.com/generate_204",
      "icon": "https://raw.zhai.dev/Koolson/Qure/master/IconSet/Color/AI.png",
      "use": [
        "tag"
      ]
    },
    {
      "name": "SSH",
      "type": "fallback",
      "interval": 300,
      "url": "https://www.gstatic.com/generate_204",
      "icon": "https://raw.zhai.dev/Koolson/Qure/master/IconSet/Color/SSH.png",
      "use": [
        "tag"
      ]
    }
  ],
  "rule-providers": {
    "agi": {
      "type": "http",
      "format": "text",
      "behavior": "classical",
      "interval": 86400,
      "url": "https://raw.zhai.dev/bottomash/sub/latest/rule/agi.txt"
    },
    "ssh": {
      "type": "http",
      "format": "text",
      "behavior": "classical",
      "interval": 86400,
      "url": "https://raw.zhai.dev/bottomash/sub/latest/rule/ssh.txt"
    }
  },
  "rules": [
    "RULE-SET,agi,AGI",
    "RULE-SET,ssh,SSH"
  ]
};

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function ruleKey(rule) {
  if (typeof rule !== "string") {
    return rule;
  }
  const parts = rule.split(",");
  return parts[0] === "RULE-SET" && parts[1]
    ? `RULE-SET,${parts[1]},`
    : rule;
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
    ...override["proxy-providers"],
  };

  const originalGroups = Array.isArray(config["proxy-groups"])
    ? config["proxy-groups"]
    : [];
  const overrideGroupNames = new Set(
    override["proxy-groups"].map((group) => group.name),
  );
  config["proxy-groups"] = [
    ...override["proxy-groups"],
    ...originalGroups.filter(
      (group) => !isObject(group) || !overrideGroupNames.has(group.name),
    ),
  ];

  const ruleProviders = isObject(config["rule-providers"])
    ? config["rule-providers"]
    : {};
  config["rule-providers"] = {
    ...ruleProviders,
    ...override["rule-providers"],
  };

  const originalRules = Array.isArray(config.rules) ? config.rules : [];
  const overrideRuleKeys = new Set(override.rules.map(ruleKey));
  config.rules = [
    ...override.rules,
    ...originalRules.filter((rule) => !overrideRuleKeys.has(ruleKey(rule))),
  ];

  return config;
}
