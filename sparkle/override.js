function main(config) {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    config = {};
  }

  // 新版 Mihomo 已移除全局客户端指纹配置。
  delete config["global-client-fingerprint"];

  // 删除订阅自带的 proxy-provider，全部节点均来自顶层 proxies。
  delete config["proxy-providers"];

  const generalFilter =
    "(日本|新加坡|韩国|费城|纽约|洛杉矶|西雅图|硅谷|达拉斯|芝加哥|华盛顿|法国|德国|挪威|土耳其)";

  config["proxy-groups"] = [
    {
      name: "GLOBAL",
      type: "select",
      proxies: ["DIRECT", "Auto"],
      icon: "https://raw.zhai.dev/Koolson/Qure/master/IconSet/Color/Global.png"
    },
    {
      name: "OneDrive",
      type: "select",
      proxies: ["DIRECT", "Auto"],
      icon: "https://raw.zhai.dev/Koolson/Qure/master/IconSet/Color/OneDrive.png"
    },
    {
      name: "PROXY",
      type: "select",
      "include-all-proxies": true,
      filter: generalFilter,
      icon: "https://raw.zhai.dev/Koolson/Qure/master/IconSet/Color/Proxy.png"
    },
    {
      name: "Auto",
      type: "fallback",
      interval: 300,
      proxies: ["PROXY"],
      "include-all-proxies": true,
      url: "https://www.gstatic.com/generate_204",
      icon: "https://raw.zhai.dev/Koolson/Qure/master/IconSet/Color/Auto.png"
    },
    {
      name: "AI",
      type: "fallback",
      "include-all-proxies": true,
      filter: generalFilter,
      interval: 300,
      url: "https://www.gstatic.com/generate_204",
      icon: "https://raw.zhai.dev/Koolson/Qure/master/IconSet/Color/AI.png"
    }
  ];

  // 规则集：完全替换机场 A 自带配置。
  config["rule-providers"] = {
    ai: {
      type: "http",
      format: "text",
      behavior: "classical",
      interval: 86400,
      url: "https://raw.zhai.dev/bottomash/sub/latest/ai.txt"
    },
    proxy: {
      type: "http",
      format: "text",
      behavior: "classical",
      interval: 86400,
      url: "https://raw.zhai.dev/bottomash/sub/latest/proxy.txt"
    },
    direct: {
      type: "http",
      format: "text",
      behavior: "classical",
      interval: 86400,
      url: "https://raw.zhai.dev/bottomash/sub/latest/direct.txt"
    },
    onedrive: {
      type: "http",
      format: "text",
      behavior: "classical",
      interval: 86400,
      url: "https://raw.zhai.dev/bottomash/sub/latest/onedrive.txt"
    }
  };

  // 规则：完全替换机场 A 自带规则并保持原顺序。
  config.rules = [
    "DOMAIN-SUFFIX,sub.zhai.dev,DIRECT",
    "RULE-SET,ai,AI",
    "RULE-SET,onedrive,OneDrive",
    "RULE-SET,direct,DIRECT",
    "RULE-SET,proxy,Auto",
    "GEOIP,LAN,DIRECT",
    "GEOIP,CN,DIRECT",
    "MATCH,Auto"
  ];

  return config;
}
