import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(
  new URL("../userscript/raw-github-to-zhai.user.js", import.meta.url),
  "utf8",
);

function redirect(input) {
  let result;
  const context = vm.createContext({
    URL,
    window: {
      location: {
        href: input,
        replace(value) {
          result = value;
        },
      },
    },
  });

  vm.runInContext(source, context);
  return result;
}

test("将 refs/heads 地址转换为 raw.zhai.dev 简洁格式", () => {
  assert.equal(
    redirect(
      "https://raw.githubusercontent.com/bottomash/sub/refs/heads/latest/sparkle/agi-override.js",
    ),
    "https://raw.zhai.dev/bottomash/sub/latest/sparkle/agi-override.js",
  );
});

test("保留已是简洁格式的路径、查询参数和锚点", () => {
  assert.equal(
    redirect(
      "https://raw.githubusercontent.com/bottomash/sub/latest/rule/agi.txt?raw=1#top",
    ),
    "https://raw.zhai.dev/bottomash/sub/latest/rule/agi.txt?raw=1#top",
  );
});
