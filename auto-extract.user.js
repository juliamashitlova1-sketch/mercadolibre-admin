// ==UserScript==
// @name         美客多自动爬虫 - 蓝鲸选品数据拦截
// @namespace    milyfly-crawler
// @version      2.0
// @description  自动拦截蓝鲸选品扩展的API数据，提取热搜词表格并传回MILYFLY软件
// @author       MILYFLY
// @match        *://*.mercadolibre.com.mx/*
// @match        *://*.mercadolibre.com/*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  var APP_URL = "https://mercadolibre-admin-v2.vercel.app/data-crawler";
  var captured = false;

  console.log("[MILYFLY] 自动爬虫已启动，等待蓝鲸选品扩展加载数据...");

  // 方案1: 拦截 console.log 抓取蓝鲸选品的数据
  var origLog = console.log;
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
            saveData(args[j]);
            return;
          }
        }
      }
    }
  };

  // 方案2: 拦截 XHR
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
            saveData(data);
          }
        } catch (e) {}
      }
    });
    return origOpen.apply(xhr, arguments);
  };

  function saveData(data) {
    var rows = data.map(function (item) {
      var h = item.history && item.history.length > 0 ? item.history[0] : {};
      var rank = h.ranking
        ? "第" + (h.page || "?") + "页,第" + h.ranking + "名"
        : "";
      return [
        item.key || "",
        item.key_cn || "",
        (item.bgl || 0).toString() + "%",
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

    localStorage.setItem("mx_crawled_table", JSON.stringify(result));

    if (window.opener && window.opener !== window) {
      window.opener.postMessage(
        { type: "TABLE_DATA_READY", data: result },
        "*",
      );
    }

    // 如果是从软件打开的带参数，自动跳回
    if (window.location.search.indexOf("milyfly=1") >= 0) {
      setTimeout(function () {
        window.location.href = APP_URL;
      }, 500);
    }

    origLog.call(
      console,
      "[MILYFLY] ✅ 已保存 " + rows.length + " 行数据，请回到数据爬虫页面查看",
    );
  }

  // 自动点击反查流量词Tab触发数据加载
  setTimeout(function () {
    var tab = document.querySelector('a[href="#tabs-trend-table"]');
    if (tab) {
      origLog.call(console, "[MILYFLY] 正在点击反查流量词Tab...");
      tab.click();
    } else {
      origLog.call(console, "[MILYFLY] 未找到反查流量词Tab，尝试点击热搜词...");
      var tab2 = document.querySelector('a[href="#tabs-trend"]');
      if (tab2) tab2.click();
    }
  }, 3000);
})();
