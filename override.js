function renameNode(name) {
  if (typeof name !== "string") {
    return name;
  }

  return name
    .replace(/美国[\s\-－—_]*/g, "")
    .replace(/(\d)x/g, "$1X")
    .replace(/(\S{2})(\d{2}) (\|) (\w{2})/g, " $1 $2")
    .replace(/(丨)(\d{1,2}X) (\w{2})/g, " $2")
    .replace(/(ˣ¹)/g, " 1X")
    .replace(/(ˣ²)/g, " 2X")
    .replace(/(ˣ³)/g, " 3X")
    .replace(/(ˣ⁴)/g, " 4X")
    .replace(/(ˣ⁵)/g, " 5X")
    .replace(/(\p{Script=Han}{2,5})(丨)/gu, " $1$2")
    .replace(/\s+/g, " ")
    .trim();
}

function main(config) {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    config = {};
  }

  // 节点处理：保留全部顶层节点，只修改有效节点的名称。
  const proxies = Array.isArray(config.proxies) ? config.proxies : [];

  for (const proxy of proxies) {
    if (
      proxy &&
      typeof proxy === "object" &&
      !Array.isArray(proxy) &&
      typeof proxy.name === "string"
    ) {
      proxy.name = renameNode(proxy.name);
    }
  }

  config.proxies = proxies;

  const proxyNames = proxies
    .filter(
      (proxy) =>
        proxy &&
        typeof proxy === "object" &&
        !Array.isArray(proxy) &&
        typeof proxy.name === "string"
    )
    .map((proxy) => proxy.name);

  const generalPattern = /(日本|香港|新加坡|美国|韩国|土耳其)(?!.*3X)/;
  const aiPattern = /(美国|韩国|日本|新加坡)(?!.*3X)/;
  const generalProxyNames = proxyNames.filter((name) =>
    generalPattern.test(name)
  );
  const aiProxyNames = proxyNames.filter((name) => aiPattern.test(name));

  // 删除订阅自带的 proxy-provider，全部节点均来自顶层 proxies。
  delete config["proxy-providers"];

  // 策略组：仅使用顶层节点名。
  const generalFilter = "(日本|香港|新加坡|美国|韩国|土耳其)(?!.*3X)";
  const aiFilter = "(美国|韩国|日本|新加坡)(?!.*3X)";

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
      filter: generalFilter,
      proxies: generalProxyNames,
      icon: "https://raw.zhai.dev/Koolson/Qure/master/IconSet/Color/Proxy.png"
    },
    {
      name: "Auto",
      type: "fallback",
      filter: generalFilter,
      interval: 300,
      url: "https://www.gstatic.com/generate_204",
      proxies: ["PROXY", ...generalProxyNames],
      icon: "https://raw.zhai.dev/Koolson/Qure/master/IconSet/Color/Auto.png"
    },
    {
      name: "AI",
      type: "fallback",
      filter: aiFilter,
      interval: 300,
      url: "https://www.gstatic.com/generate_204",
      proxies: aiProxyNames,
      icon: "https://raw.zhai.dev/Koolson/Qure/master/IconSet/Color/AI.png"
    }
  ];

  // 规则集：完全替换机场 A 自带配置。
  config["rule-providers"] = {
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
    },
    ai: {
      type: "http",
      format: "text",
      behavior: "classical",
      interval: 86400,
      url: "https://raw.zhai.dev/bottomash/sub/latest/ai.txt"
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
