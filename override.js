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

  // 节点处理：保留机场 A 的顶层节点，只修改有效节点的名称。
  const airportAProxies = Array.isArray(config.proxies) ? config.proxies : [];

  for (const proxy of airportAProxies) {
    if (
      proxy &&
      typeof proxy === "object" &&
      !Array.isArray(proxy) &&
      typeof proxy.name === "string"
    ) {
      proxy.name = renameNode(proxy.name);
    }
  }

  config.proxies = airportAProxies;

  const airportANames = airportAProxies
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
  const generalAirportANames = airportANames.filter((name) =>
    generalPattern.test(name)
  );
  const aiAirportANames = airportANames.filter((name) => aiPattern.test(name));

  // Provider：删除机场 A 自带配置，仅重新加入 unicorn。
  config["proxy-providers"] = {
    unicorn: {
      type: "http",
      path: "./proxies/unicorn.yaml",
      url: "填写-unicorn-订阅链接",
      interval: 86400,
      override: {
        "proxy-name": [
          { pattern: "美国[\\s\\-－—_]*", target: "" },
          { pattern: "(\\d)x", target: "$1X" },
          { pattern: "(\\S{2})(\\d{2}) (\\|) (\\w{2})", target: " $1 $2" },
          { pattern: "(丨)(\\d{1,2}X) (\\w{2})", target: " $2" },
          { pattern: "(ˣ¹)", target: " 1X" },
          { pattern: "(ˣ²)", target: " 2X" },
          { pattern: "(ˣ³)", target: " 3X" },
          { pattern: "(ˣ⁴)", target: " 4X" },
          { pattern: "(ˣ⁵)", target: " 5X" },
          { pattern: "(\\p{Han}{2,5})(丨)", target: " $1$2" },
          { pattern: "\\s+", target: " " },
          { pattern: "^\\s+|\\s+$", target: "" }
        ]
      },
      "health-check": {
        enable: true,
        interval: 600,
        url: "http://www.gstatic.com/generate_204"
      }
    }
  };

  // 策略组：机场 A 使用顶层节点名，unicorn 使用 provider。
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
      proxies: generalAirportANames,
      use: ["unicorn"],
      icon: "https://raw.zhai.dev/Koolson/Qure/master/IconSet/Color/Proxy.png"
    },
    {
      name: "Auto",
      type: "fallback",
      filter: generalFilter,
      interval: 300,
      url: "https://www.gstatic.com/generate_204",
      proxies: ["PROXY", ...generalAirportANames],
      use: ["unicorn"],
      icon: "https://raw.zhai.dev/Koolson/Qure/master/IconSet/Color/Auto.png"
    },
    {
      name: "AI",
      type: "fallback",
      filter: aiFilter,
      interval: 300,
      url: "https://www.gstatic.com/generate_204",
      proxies: aiAirportANames,
      use: ["unicorn"],
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
