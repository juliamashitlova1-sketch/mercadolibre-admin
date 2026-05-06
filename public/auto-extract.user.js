// ==UserScript==
// @name         美客多数据爬虫 - 自动提取热搜表格
// @namespace    milyfly-crawler
// @version      1.0
// @description  自动提取 Mercado Libre #table-trend 热搜趋势数据并传回 MILYFLY 软件
// @author       MILYFLY
// @match        *://*.mercadolibre.com.mx/*
// @match        *://*.mercadolibre.com/*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  function extractTable() {
    var wrapper = document.getElementById("table-trend_wrapper");
    if (!wrapper) {
      console.log("[MILYFLY] 未找到 table-trend，3秒后重试...");
      setTimeout(extractTable, 3000);
      return;
    }

    var table = document.getElementById("table-trend");
    if (!table) {
      setTimeout(extractTable, 3000);
      return;
    }

    // 提取表头
    var headers = [];
    var thead = table.querySelector("thead");
    if (thead) {
      thead.querySelectorAll("th").forEach(function (th) {
        var text = th.innerText.trim();
        if (text) headers.push(text);
      });
    }

    // 提取数据行
    var rows = [];
    var tbody = table.querySelector("tbody");
    if (tbody) {
      tbody.querySelectorAll("tr").forEach(function (tr) {
        var row = [];
        tr.querySelectorAll("td").forEach(function (td) {
          row.push(td.innerText.trim().replace(/\s+/g, " "));
        });
        if (row.length > 0) rows.push(row);
      });
    }

    if (rows.length === 0) {
      setTimeout(extractTable, 3000);
      return;
    }

    var data = {
      columns: headers.length > 0 ? headers : [],
      rows: rows,
    };

    console.log("[MILYFLY] 成功提取 " + rows.length + " 条数据");

    // 通过 postMessage 通知原窗口
    if (window.opener && window.opener !== window) {
      window.opener.postMessage({ type: "TABLE_DATA_READY", data: data }, "*");
    }

    // 保存到 localStorage，供同名域页面读取
    localStorage.setItem("mx_crawled_table", JSON.stringify(data));

    // 如果当前页面也是我们的软件范围（同域），自动跳转
    var appUrl = "https://mercadolibre-admin-v2.vercel.app/data-crawler";
    var encoded = encodeURIComponent(JSON.stringify(data));

    if (window.opener && window.opener !== window) {
      // 已通知原窗口，不做额外操作
    } else {
      window.open(appUrl + "#data=" + encoded, "_blank");
    }
  }

  // 等待页面和扩展完全加载后执行
  setTimeout(extractTable, 5000);
})();
