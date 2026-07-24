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

function main(config) {
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

  const globalExcludePattern = /(?:3|5|10)X|家宽|星链|住宅|游戏/;
  proxies = proxies.filter(
    (proxy) =>
      !(
        proxy &&
        typeof proxy === "object" &&
        !Array.isArray(proxy) &&
        typeof proxy.name === "string" &&
        globalExcludePattern.test(proxy.name)
      )
  );

  config.proxies = proxies;

  return config;
}
