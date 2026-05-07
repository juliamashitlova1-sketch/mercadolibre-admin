// ==UserScript==
// @name         美客多自动爬虫 - 蓝鲸选品数据拦截
// @namespace    milyfly-crawler
// @version      2.4
// @description  自动拦截蓝鲸选品扩展的API数据，提取热搜词表格并传回MILYFLY软件
// @author       MILYFLY
// @match        *://*.mercadolibre.com.mx/*
// @match        *://*.mercadolibre.com/*
// @grant        unsafeWindow
// @grant        GM_log
// @run-at       document-start
// ==/UserScript==

(function () {
  "use strict";

  var APP_URL = "https://mercadolibre-admin-v2.vercel.app";
  var captured = false;
  var _w = unsafeWindow || window;

  function log(msg) {
    try {
      GM_log("[MILYFLY] " + msg);
    } catch (e) {}
    try {
      _w.console.log("[MILYFLY] " + msg);
    } catch (e) {}
  }

  // 从 URL 参数中读取 SKU（同时检查 search 和 hash，兼容SPA）
  var currentSku = "";
  try {
    var fullUrl = _w.location.href;
    // 从完整URL中提取 sku 参数，不受页面SPA路由影响
    var match = fullUrl.match(/[?&]sku=([^&]+)/);
    if (match) currentSku = decodeURIComponent(match[1]);
  } catch (e) {}
  log("自动爬虫已启动 v2.4" + (currentSku ? " (SKU: " + currentSku + ")" : ""));

  // ========== 方法1: 拦截 XHR（只捕获含 .key 的有效数据） ==========
  var origOpen = _w.XMLHttpRequest.prototype.open;
  _w.XMLHttpRequest.prototype.open = function () {
    var xhr = this;
    var url = arguments[1];
    xhr.addEventListener("load", function () {
      if (!captured && xhr.status === 200) {
        try {
          var data = JSON.parse(xhr.responseText);
          if (
            Array.isArray(data) &&
            data.length > 5 &&
            data[0] &&
            data[0].key
          ) {
            captured = true;
            log("✅ 通过XHR拦截到数据 " + data.length + " 条");
            saveAndReturn(data);
          }
        } catch (e) {}
      }
    });
    return origOpen.apply(xhr, arguments);
  };

  // ========== 方法2: 拦截 fetch（只捕获含 .key 的有效数据） ==========
  if (_w.fetch) {
    var origFetch = _w.fetch;
    _w.fetch = function () {
      var args = arguments;
      return origFetch.apply(_w, args).then(function (response) {
        if (!captured) {
          var cloned = response.clone();
          cloned
            .text()
            .then(function (text) {
              try {
                var data = JSON.parse(text);
                if (
                  Array.isArray(data) &&
                  data.length > 5 &&
                  data[0] &&
                  data[0].key
                ) {
                  captured = true;
                  log("✅ 通过fetch拦截到数据 " + data.length + " 条");
                  saveAndReturn(data);
                }
              } catch (e) {}
            })
            .catch(function () {});
        }
        return response;
      });
    };
  }

  // ========== 方法3: 监听 postMessage（蓝鲸选品扩展可能通过此方式通信） ==========
  _w.addEventListener("message", function (e) {
    if (captured) return;
    try {
      var d = e.data;
      // 尝试从各种可能的消息结构中提取数据
      if (d && typeof d === "object") {
        // 直接包含 key 数组
        if (
          d.data &&
          Array.isArray(d.data) &&
          d.data.length > 5 &&
          d.data[0] &&
          d.data[0].key
        ) {
          captured = true;
          log("✅ 通过postMessage拦截到数据 " + d.data.length + " 条");
          saveAndReturn(d.data);
          return;
        }
        // 某些扩展把数据放在 payload 或 body 里
        var payload = d.payload || d.body || d.result || d.data;
        if (
          payload &&
          Array.isArray(payload) &&
          payload.length > 5 &&
          payload[0] &&
          payload[0].key
        ) {
          captured = true;
          log(
            "✅ 通过postMessage(payload)拦截到数据 " + payload.length + " 条",
          );
          saveAndReturn(payload);
          return;
        }
      }
    } catch (e) {}
  });

  // ========== 方法4: DOM 提取（兜底方案） ==========
  function extractFromDOM() {
    if (captured) return;
    // 查找页面上的趋势表格
    var tables = _w.document.querySelectorAll(
      "#table-trend table, .trend-table table, [class*='trend'] table, table",
    );
    for (var t = 0; t < tables.length; t++) {
      var table = tables[t];
      var headers = [];
      var rows = [];
      var thead = table.querySelector("thead");
      if (thead) {
        thead.querySelectorAll("th, td").forEach(function (th) {
          headers.push((th.textContent || "").trim());
        });
      }
      var tbody = table.querySelector("tbody");
      if (tbody) {
        tbody.querySelectorAll("tr").forEach(function (tr) {
          var row = [];
          tr.querySelectorAll("td").forEach(function (td) {
            row.push((td.textContent || "").trim().replace(/\s+/g, " "));
          });
          if (row.length > 0) rows.push(row);
        });
      }
      if (rows.length > 5) {
        captured = true;
        log("✅ 通过DOM提取到 " + rows.length + " 行数据");
        saveAndReturn({ columns: headers, rows: rows });
        return;
      }
    }
  }

  // 自动点击反查流量词Tab，然后轮询等待数据
  setTimeout(function () {
    var tab = _w.document.querySelector('a[href="#tabs-trend-table"]');
    if (tab) {
      log("点击反查流量词Tab...");
      tab.click();
    } else {
      var t2 = _w.document.querySelector('a[href="#tabs-trend"]');
      if (t2) {
        log("点击热搜词Tab...");
        t2.click();
      }
    }

    // 点击后轮询 DOM，每隔 1 秒检查一次，最多 30 秒
    var pollCount = 0;
    var pollTimer = setInterval(function () {
      pollCount++;
      if (captured) {
        clearInterval(pollTimer);
        return;
      }
      extractFromDOM();
      if (pollCount >= 30) {
        clearInterval(pollTimer);
        if (!captured) log("⚠️ 轮询30秒未找到数据");
      }
    }, 1000);
  }, 3000);

  // ========== saveAndReturn: 格式化数据并传回 ==========
  function saveAndReturn(data) {
    var formatted;
    var cols;

    // 如果传入的是 { columns, rows } 对象（来自DOM提取）
    if (data.columns && data.rows) {
      data.sku = currentSku;
      saveAndSend(data);
      return;
    }

    // 如果传入的是数组
    if (data.length > 0 && typeof data[0] === "string") {
      formatted = data.map(function (s) {
        return [s, "", "", "", "", "", "", "", "", ""];
      });
      cols = [
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
      ];
    } else {
      formatted = data.map(function (item) {
        if (!item || typeof item !== "object")
          return ["", "", "", "", "", "", "", "", "", ""];
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
      cols = [
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
      ];
    }

    saveAndSend({ columns: cols, rows: formatted, sku: currentSku });
  }

  function saveAndSend(result) {
    var sent = false;

    // 方法1: postMessage 到 opener（主通道）
    if (_w.opener && _w.opener !== _w) {
      try {
        _w.opener.postMessage({ type: "TABLE_DATA_READY", data: result }, "*");
        log("✅ postMessage 已发送");
        sent = true;
        try {
          _w.opener.focus();
        } catch (e) {}
      } catch (e) {
        log("postMessage失败: " + e.message);
      }
    }

    // 方法2: 通过 API 直接写入数据库（最可靠，绕过跨域问题）
    try {
      var today = new Date().toISOString().slice(0, 10);
      var body = JSON.stringify({
        sku: result.sku || "",
        crawl_date: today,
        rows: result.rows || [],
      });
      // 如果 sku 为空，尝试从页面标题或URL中提取
      if (!result.sku) {
        try {
          var titleMatch =
            _w.document.title.match(/\[(\w+)\]/) ||
            _w.location.href.match(/\/(\w+)\?/);
          if (titleMatch) result.sku = titleMatch[1];
        } catch (e) {}
      }
      _w.fetch(APP_URL + "/api/save-trend-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body,
      })
        .then(function (r) {
          if (r.ok) log("✅ API保存成功");
          else log("⚠️ API返回错误: " + r.status);
        })
        .catch(function (e) {
          log("⚠️ API调用失败: " + e.message);
        });
    } catch (e) {
      log("⚠️ API调用异常: " + e.message);
    }

    // 方法3: location.hash 传回（备用）
    if (!sent && _w.opener && _w.opener !== _w) {
      try {
        var encoded = encodeURIComponent(JSON.stringify(result));
        _w.opener.location.href = APP_URL + "/data-crawler#data=" + encoded;
        log("✅ 通过location.hash传回");
        sent = true;
      } catch (e) {
        log("location.hash失败");
      }
    }

    // 方法4: 新标签打开
    if (!sent) {
      var encoded2 = encodeURIComponent(JSON.stringify(result));
      _w.open(APP_URL + "/data-crawler#data=" + encoded2, "_blank");
      log("✅ 通过新标签传回");
    }
  }
})();
