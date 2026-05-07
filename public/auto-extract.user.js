// ==UserScript==
// @name         美客多自动爬虫 - 蓝鲸选品数据拦截
// @namespace    milyfly-crawler
// @version      2.2
// @description  自动拦截蓝鲸选品扩展的API数据，提取热搜词表格并传回MILYFLY软件
// @author       MILYFLY
// @match        *://*.mercadolibre.com.mx/*
// @match        *://*.mercadolibre.com/*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";
  var APP_URL = "https://mercadolibre-admin-v2.vercel.app";
  var captured = false;
  console.log("[MILYFLY] 自动爬虫已启动");

  var origLog = console.log;

  // 拦截 console.log
  console.log = function () {
    var args = Array.prototype.slice.call(arguments);
    origLog.apply(console, arguments);
    if (captured) return;
    for (var i = 0; i < args.length; i++) {
      if (
        typeof args[i] === "string" &&
        (args[i].indexOf("流量词") >= 0 || args[i].indexOf("热搜词") >= 0)
      ) {
        for (var j = i + 1; j < args.length; j++) {
          if (
            args[j] &&
            Array.isArray(args[j]) &&
            args[j].length > 0 &&
            args[j][0].key
          ) {
            captured = true;
            origLog.call(
              console,
              "[MILYFLY] ✅ 成功拦截 " + args[j].length + " 条数据",
            );
            saveAndReturn(args[j]);
            return;
          }
        }
      }
    }
  };

  // 拦截 XHR
  var origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function () {
    var url = arguments[1];
    var xhr = this;
    xhr.addEventListener("load", function () {
      if (!captured && xhr.status === 200) {
        try {
          var data = JSON.parse(xhr.responseText);
          if (Array.isArray(data) && data.length > 5 && data[0].key) {
            captured = true;
            origLog.call(console, "[MILYFLY] ✅ 通过XHR拦截到数据");
            saveAndReturn(data);
          }
        } catch (e) {}
      }
    });
    return origOpen.apply(xhr, arguments);
  };

  function saveAndReturn(data) {
    var rows = data.map(function (item) {
      var h = item.history && item.history.length > 0 ? item.history[0] : {};
      var rank = h.ranking
        ? "\u7B2C" + (h.page || "?") + "\u9875,\u7B2C" + h.ranking + "\u540D"
        : "";
      return [
        item.key || "",
        item.key_cn || "",
        (item.bgl || 0) + "%",
        String(item.keyCount || 0),
        rank,
        String(item.paiming || 0),
        String(item.sale30 || 0),
        String(item.visit30 || 0),
        String(item.total_item || 0),
        item.jzd || "0%",
      ];
    });
    var result = {
      columns: [
        "\u70ED\u641C\u8BCD",
        "\u4E2D\u6587",
        "\u6D41\u91CF\u5360\u6BD4",
        "\u66DD\u5149\u6B21\u6570",
        "\u6392\u540D\u60C5\u51B5",
        "\u641C\u7D22\u91CF\u6392\u540D",
        "30\u5929\u9500\u91CF",
        "30\u5929\u641C\u7D22\u91CF",
        "\u7ADE\u54C1\u6570",
        "\u7ADE\u4E89\u5EA6",
      ],
      rows: rows,
    };
    var sent = false;

    // 方法1: postMessage 到 opener（主通道）
    if (window.opener && window.opener !== window) {
      try {
        window.opener.postMessage(
          { type: "TABLE_DATA_READY", data: result },
          "*",
        );
        origLog.call(
          console,
          "[MILYFLY] \u2714 postMessage \u5DF2\u53D1\u9001",
        );
        sent = true;
        try {
          window.opener.focus();
        } catch (e) {}
      } catch (e) {
        origLog.call(console, "[MILYFLY] postMessage\u5931\u8D25:", e.message);
      }
    }

    // 方法2: URL hash 导航（备用：postMessage 失败时）
    if (!sent && window.opener && window.opener !== window) {
      var encoded = encodeURIComponent(JSON.stringify(result));
      try {
        window.opener.location.href = APP_URL + "/data-crawler#data=" + encoded;
      } catch (e) {
        // 跨域无法导航 opener，不做处理
      }
    }
  }

  // 自动点击反查流量词Tab
  setTimeout(function () {
    var tab = document.querySelector('a[href="#tabs-trend-table"]');
    if (tab) {
      origLog.call(console, "[MILYFLY] 点击反查流量词Tab...");
      tab.click();
    } else {
      var t2 = document.querySelector('a[href="#tabs-trend"]');
      if (t2) {
        origLog.call(console, "[MILYFLY] 点击热搜词Tab...");
        t2.click();
      }
    }
  }, 3000);
})();
