// ==UserScript==
// @name         GitHub Raw 转 raw.zhai.dev
// @namespace    https://github.com/bottomash/sub
// @version      1.1.0
// @description  将 GitHub 文件页的 Raw 链接和 raw.githubusercontent.com 地址转换到 raw.zhai.dev
// @author       bottomash
// @match        https://github.com/*
// @match        *://raw.githubusercontent.com/*
// @run-at       document-start
// @grant        none
// @noframes
// @updateURL    https://raw.zhai.dev/bottomash/sub/latest/userscript/raw-github-to-zhai.user.js
// @downloadURL  https://raw.zhai.dev/bottomash/sub/latest/userscript/raw-github-to-zhai.user.js
// ==/UserScript==

(function () {
  "use strict";

  function getMirrorUrl(value) {
    const target = new URL(value, window.location.href);

    if (target.hostname === "raw.githubusercontent.com") {
      target.pathname = target.pathname.replace(
        /^\/([^/]+\/[^/]+)\/refs\/heads\//,
        "/$1/",
      );
    } else if (target.hostname === "github.com") {
      const match = target.pathname.match(
        /^\/([^/]+\/[^/]+)\/raw\/(?:refs\/heads\/)?(.+)$/,
      );
      if (!match) {
        return null;
      }
      target.pathname = `/${match[1]}/${match[2]}`;
    } else {
      return null;
    }

    target.protocol = "https:";
    target.hostname = "raw.zhai.dev";
    target.port = "";
    return target.href;
  }

  const pageMirrorUrl = getMirrorUrl(window.location.href);
  if (pageMirrorUrl) {
    window.location.replace(pageMirrorUrl);
    return;
  }

  function rewriteAnchor(anchor) {
    if (!anchor?.matches?.("a[href]")) {
      return;
    }

    const mirrorUrl = getMirrorUrl(anchor.href);
    if (mirrorUrl) {
      anchor.href = mirrorUrl;
    }
  }

  function rewriteTree(root) {
    if (!root?.querySelectorAll) {
      return;
    }

    rewriteAnchor(root);
    root.querySelectorAll("a[href]").forEach(rewriteAnchor);
  }

  function observeRawLinks() {
    rewriteTree(document.documentElement);

    new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes") {
          rewriteAnchor(mutation.target);
        } else {
          mutation.addedNodes.forEach(rewriteTree);
        }
      }
    }).observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["href"],
    });
  }

  document.addEventListener(
    "click",
    (event) => rewriteAnchor(event.target?.closest?.("a[href]")),
    true,
  );

  if (document.documentElement) {
    observeRawLinks();
  } else {
    document.addEventListener("DOMContentLoaded", observeRawLinks, {
      once: true,
    });
  }
})();
