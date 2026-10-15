// ==UserScript==
// @name         Raw GitHub 转 raw.zhai.dev
// @namespace    https://github.com/bottomash/sub
// @version      1.0.1
// @description  自动将 raw.githubusercontent.com 地址转换并重定向到 raw.zhai.dev
// @author       bottomash
// @match        *://raw.githubusercontent.com/*
// @run-at       document-start
// @grant        none
// @noframes
// @updateURL    https://raw.zhai.dev/bottomash/sub/latest/userscript/raw-github-to-zhai.user.js
// @downloadURL  https://raw.zhai.dev/bottomash/sub/latest/userscript/raw-github-to-zhai.user.js
// ==/UserScript==

(function () {
  "use strict";

  const target = new URL(window.location.href);
  if (target.hostname !== "raw.githubusercontent.com") {
    return;
  }

  target.protocol = "https:";
  target.hostname = "raw.zhai.dev";
  target.port = "";
  target.pathname = target.pathname.replace(
    /^\/([^/]+\/[^/]+)\/refs\/heads\//,
    "/$1/",
  );

  window.location.replace(target.href);
})();
