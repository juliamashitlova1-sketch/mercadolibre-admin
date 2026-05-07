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
        ? "第" + (h.page || "?") + "页,第" + h.ranking + "名"
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
        "热搜词",
        "中文",
        "流量占比",
        "曝光次数",
        "排名情况",
        "搜索量排名",
        "30天销量",
        "30天搜索量",
        "竞品数",
        "竞争度",
      ],
      rows: rows,
    };

    // 方法1: postMessage 到 opener
    var sent = false;
    if (window.opener && window.opener !== window) {
      try {
        window.opener.postMessage(
          { type: "TABLE_DATA_READY", data: result },
          "*",
        );
        origLog.call(console, "[MILYFLY] postMessage 已发送");
        sent = true;
        // 让opener窗口获得焦点
        try {
          window.opener.focus();
        } catch (e) {}
      } catch (e) {
        origLog.call(console, "[MILYFLY] postMessage失败:", e.message);
      }
    }

    // 方法2: 如果postMessage没成功，将数据存入 hash 并告知 opener 刷新
    if (!sent) {
      var encoded = encodeURIComponent(JSON.stringify(result));
      var dataUrl = APP_URL + "/data-crawler#data=" + encoded;

      // 尝试导航 opener（跨域可能被阻止）
      if (window.opener && window.opener !== window) {
        try {
          window.opener.location.href = dataUrl;
          return;
        } catch (e) {}
      }

      // 最后手段：新标签打开
      window.open(dataUrl, "_blank");
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
