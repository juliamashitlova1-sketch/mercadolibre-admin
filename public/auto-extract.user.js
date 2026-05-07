// ==UserScript==
// @name         美客多自动爬虫 - 蓝鲸选品数据拦截
// @namespace    milyfly-crawler
// @version      2.3
// @description  自动拦截蓝鲸选品扩展的API数据，提取热搜词表格并传回MILYFLY软件
// @author       MILYFLY
// @match        *://*.mercadolibre.com.mx/*
// @match        *://*.mercadolibre.com/*
// @grant        unsafeWindow
// @grant        GM_log
// ==/UserScript==

(function () {
  "use strict";

  var APP_URL = "https://mercadolibre-admin-v2.vercel.app";
  var captured = false;
  var _w = unsafeWindow; // 页面真实 window（脚本猫/暴力猴兼容）

  // 日志统一用 GM_log，避免沙箱问题
  function log(msg) {
    try {
      GM_log("[MILYFLY] " + msg);
    } catch (e) {}
    try {
      _w.console.log("[MILYFLY] " + msg);
    } catch (e) {}
  }

  log("自动爬虫已启动 v2.3");

  // 保存原始的 console.log
  var origLog = _w.console.log.bind(_w.console);

  // 拦截页面 console.log（通过 unsafeWindow）
  _w.console.log = function () {
    var args = Array.prototype.slice.call(arguments);
    origLog.apply(_w.console, arguments);
    if (captured) return;

    for (var i = 0; i < args.length; i++) {
      if (
        typeof args[i] === "string" &&
        (args[i].indexOf("流量词") >= 0 || args[i].indexOf("热搜词") >= 0)
      ) {
        for (var j = i + 1; j < args.length; j++) {
          if (
            args[j] &&
            typeof args[j] === "object" &&
            Array.isArray(args[j]) &&
            args[j].length > 0
          ) {
            // 兼容无 .key 的情况，只要有 length>0 就尝试处理
            captured = true;
            log("✅ 成功拦截 " + args[j].length + " 条数据");
            saveAndReturn(args[j]);
            return;
          }
        }
      }
    }
  };

  // 拦截 XHR（通过 unsafeWindow）- 只捕获含 .key 的有效数据
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
            data.length > 0 &&
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

  // 拦截 fetch（通过 unsafeWindow）
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

  function saveAndReturn(data) {
    // 如果 data 是数组且元素有 .key 属性，正常处理
    // 如果数组元素是字符串，转为需要的形式
    var formatted;
    if (data.length > 0 && typeof data[0] === "string") {
      // 纯字符串数组 — 直接作为热搜词列
      formatted = data.map(function (s) {
        return [s, "", "", "", "", "", "", "", "", ""];
      });
      var cols = [
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
      var cols = [
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

    var result = { columns: cols, rows: formatted };
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

    // 方法2: 尝试直接修改 opener 的 location.hash（跨域可能被阻止）
    if (!sent && _w.opener && _w.opener !== _w) {
      try {
        var encoded = encodeURIComponent(JSON.stringify(result));
        _w.opener.location.href = APP_URL + "/data-crawler#data=" + encoded;
        log("✅ 通过 location.hash 传回");
        sent = true;
      } catch (e) {
        log("location.hash 失败");
      }
    }

    // 方法3: 如果上面都不行，新标签打开结果页
    if (!sent) {
      var encoded2 = encodeURIComponent(JSON.stringify(result));
      _w.open(APP_URL + "/data-crawler#data=" + encoded2, "_blank");
      log("✅ 通过新标签传回");
    }
  }

  // 自动点击反查流量词Tab（通过 unsafeWindow）
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
  }, 3000);
})();
