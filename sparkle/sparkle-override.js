// 此文件由 script/build-configs.mjs 根据 sparkle/policy.yml 和 sparkle/rename.js 自动生成，请勿手动修改。

function renameNode(name) {
  if (typeof name !== "string") {
    return name;
  }

  return name
    .replace(/美国[\s\-－—_]*/g, "")
    .replace(/(\d)x/g, "$1X")
    .replace(/(\S+)(\d{2}) (\|) (\w{2})/g, " $1 $2")
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

function applyNodeOverride(config) {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    config = {};
  }

  delete config["global-client-fingerprint"];
  delete config["proxy-groups"];
  delete config["rule-providers"];
  delete config["rules"];

  let proxies = Array.isArray(config.proxies) ? config.proxies : [];

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

  return config;
}

function main(config) {
  config = applyNodeOverride(config);
  Object.assign(config, {
  "mode": "rule",
  "ipv6": false,
  "allow-lan": true,
  "mixed-port": 7890,
  "keep-alive-interval": 15,
  "find-process-mode": "always",
  "external-controller": "0.0.0.0:8899",
  "secret": "love",
  "dns": {
    "enable": true,
    "listen": "0.0.0.0:1053",
    "enhanced-mode": "fake-ip",
    "fake-ip-range": "198.18.0.1/16",
    "fake-ip-filter": [
      "*.lan",
      "msftncsi.com",
      "131.107.255.255/32",
      "msftconnecttest.com",
      "localhost.ptlogin2.qq.com"
    ],
    "nameserver": [
      "223.5.5.5",
      "119.29.29.29"
    ]
  },
  "proxy-groups": [
    {
      "name": "AGI",
      "type": "fallback",
      "interval": 300,
      "url": "https://www.gstatic.com/generate_204",
      "filter": "(美国|韩国|日本|新加坡)",
      "exclude-filter": "3[xX]|5[xX]|10[xX]|家宽|星链|住宅|游戏",
      "include-all": true,
      "icon": "https://raw.zhai.dev/Koolson/Qure/master/IconSet/Color/AI.png"
    },
    {
      "name": "Auto",
      "type": "fallback",
      "interval": 300,
      "url": "https://www.gstatic.com/generate_204",
      "proxies": [
        "PROXY"
      ],
      "include-all": true,
      "filter": "(日本|香港|新加坡|美国|韩国|土耳其)",
      "exclude-filter": "3[xX]|5[xX]|10[xX]|家宽|星链|住宅|游戏",
      "icon": "https://raw.zhai.dev/Koolson/Qure/master/IconSet/Color/Auto.png"
    },
    {
      "name": "PROXY",
      "type": "select",
      "include-all": true,
      "filter": "(日本|香港|新加坡|美国|韩国|土耳其)",
      "exclude-filter": "3[xX]|5[xX]|10[xX]|家宽|星链|住宅|游戏|台湾",
      "icon": "https://raw.zhai.dev/Koolson/Qure/master/IconSet/Color/Proxy.png"
    },
    {
      "name": "OneDrive",
      "type": "select",
      "proxies": [
        "DIRECT",
        "Auto"
      ],
      "icon": "https://raw.zhai.dev/Koolson/Qure/master/IconSet/Color/OneDrive.png"
    },
    {
      "name": "GLOBAL",
      "type": "select",
      "proxies": [
        "DIRECT",
        "Auto"
      ],
      "icon": "https://raw.zhai.dev/Koolson/Qure/master/IconSet/Color/Global.png"
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
    "proxy": {
      "type": "http",
      "format": "text",
      "behavior": "classical",
      "interval": 86400,
      "url": "https://raw.zhai.dev/bottomash/sub/latest/rule/proxy.txt"
    },
    "direct": {
      "type": "http",
      "format": "text",
      "behavior": "classical",
      "interval": 86400,
      "url": "https://raw.zhai.dev/bottomash/sub/latest/rule/direct.txt"
    },
    "onedrive": {
      "type": "http",
      "format": "text",
      "behavior": "classical",
      "interval": 86400,
      "url": "https://raw.zhai.dev/bottomash/sub/latest/rule/onedrive.txt"
    }
  },
  "rules": [
    "RULE-SET,agi,AGI",
    "RULE-SET,onedrive,OneDrive",
    "RULE-SET,direct,DIRECT",
    "RULE-SET,proxy,Auto",
    "GEOIP,LAN,DIRECT",
    "GEOIP,CN,DIRECT",
    "MATCH,Auto"
  ]
});
  return config;
}
