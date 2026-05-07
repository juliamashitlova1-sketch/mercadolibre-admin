// ==UserScript==
// @name         美客多自动爬虫 - 蓝鲸选品/竞品数据拦截
// @namespace    milyfly-crawler
// @version      2.5
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
  var _w = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;

  // 调试日志：确认脚本版本和来源判断
  try {
    console.log("[MILYFLY] v2.5 检查来源...");
  } catch (e) {}

  // 仅当从 MILYFLY 软件打开时才运行
  try {
    var pageUrl = (location && location.href) || "";
    var pageRef = (document && document.referrer) || "";
    try {
      console.log("[MILYFLY] URL:", pageUrl, "REF:", pageRef);
    } catch (e) {}
    if (
      pageUrl.indexOf("milyfly=1") < 0 &&
      pageRef.indexOf("mercadolibre-admin-v2.vercel.app") < 0 &&
      pageRef.indexOf("localhost") < 0
    ) {
      try {
        console.log("[MILYFLY] 非软件打开，跳过执行");
      } catch (e) {}
      return;
    }
  } catch (e) {
    try {
      console.log("[MILYFLY] 判断异常:", e);
    } catch (ex) {}
    return;
  }
  try {
    console.log("[MILYFLY] 来源验证通过，继续执行");
  } catch (e) {}

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
    var match = fullUrl.match(/[?&]sku=([^&#]+)/);
    if (match) currentSku = decodeURIComponent(match[1]);
  } catch (e) {}
  log("自动爬虫已启动 v2.5" + (currentSku ? " (SKU: " + currentSku + ")" : ""));

  // ========== 竞品爬取模式：立即执行并退出，不启动任何拦截器 ==========
  if (_w.location.href.indexOf("type=competitor") >= 0) {
    log("竞品数据爬取模式");
    // 从完整URL提取 competitor_id
    var compIdMatch = _w.location.href.match(/[?&]competitor_id=([^&#]+)/);
    var competitorId = compIdMatch ? decodeURIComponent(compIdMatch[1]) : "";
    log("竞品ID: " + competitorId);

    // 延迟等待页面加载后提取数据
    setTimeout(function () {
      try {
        var result = { competitorId: competitorId };

        // 当前售价（优先取 meta[itemprop=price] 折后实价）
        var priceMeta = _w.document.querySelector('meta[itemprop="price"]');
        if (priceMeta) {
          result.price = parseFloat(priceMeta.getAttribute("content")) || 0;
        } else {
          // 兜底：取非划线价的最新价格
          var priceEl = _w.document.querySelector(
            ".andes-money-amount:not(.andes-money-amount--previous) .andes-money-amount__fraction",
          );
          if (priceEl)
            result.price =
              parseFloat(priceEl.textContent.replace(/[^0-9.]/g, "")) || 0;
        }

        // 上架时间
        var listingEl = _w.document.querySelector(
          "#ljxp-start-time .ljxp-value",
        );
        if (listingEl) result.listingDate = listingEl.textContent.trim();

        // 7天销量
        var sales7El = _w.document.querySelector("#ljxp-sale7 .ljxp-value");
        if (sales7El)
          result.sales7d = parseInt(sales7El.textContent.trim()) || 0;

        // 30天销量
        var sales30El = _w.document.querySelector("#ljxp-sale30 .ljxp-value");
        if (sales30El)
          result.sales30d = parseInt(sales30El.textContent.trim()) || 0;

        // 总销量
        var totalSalesEl = _w.document.querySelector(
          "#ljxp-saleTotal .ljxp-value",
        );
        if (totalSalesEl)
          result.totalSales = parseInt(totalSalesEl.textContent.trim()) || 0;

        // 评论数量
        var reviewCountEl = _w.document.querySelector(
          ".ui-pdp-reviews__rating__count, [class*='reviews'] [class*='amount'], .ui-review-view__rating__summary",
        );
        if (reviewCountEl)
          result.reviewCount =
            parseInt(reviewCountEl.textContent.replace(/[^0-9]/g, "")) || 0;

        // 平均评分
        var ratingEl = _w.document.querySelector(
          ".ui-pdp-reviews__rating__summary, [class*='rating'] [class*='average']",
        );
        if (ratingEl)
          result.avgRating = parseFloat(ratingEl.textContent.trim()) || 0;

        log("✅ 竞品数据提取完成: " + JSON.stringify(result));

        // postMessage 传回
        if (_w.opener && _w.opener !== _w) {
          try {
            _w.opener.postMessage(
              { type: "COMPETITOR_DATA_READY", data: result },
              "*",
            );
            log("✅ 竞品数据 postMessage 已发送");
          } catch (e) {}
        }

        // API 直写
        try {
          _w.fetch(APP_URL + "/api/save-competitor-data", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(result),
          })
            .then(function (r) {
              if (r.ok) log("✅ 竞品API保存成功");
              else log("⚠️ 竞品API错误: " + r.status);
            })
            .catch(function (e) {});
        } catch (e) {}
      } catch (e) {
        log("⚠️ 竞品提取失败: " + e.message);
      }
    }, 5000);
    return; // 退出，不执行后续爬虫代码
  }

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

  // ========== 方法3: 深度监听 postMessage（捕获扩展内部通信） ==========
  _w.addEventListener("message", function (e) {
    if (captured) return;
    try {
      var d = e.data;
      if (d && typeof d === "object") {
        // 递归搜索对象中的数组，找到含 .key 的数据
        function findKeyArray(obj, depth) {
          if (depth > 3 || !obj || typeof obj !== "object") return null;
          if (Array.isArray(obj) && obj.length > 5 && obj[0] && obj[0].key) {
            return obj;
          }
          for (var k in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, k)) {
              var result = findKeyArray(obj[k], depth + 1);
              if (result) return result;
            }
          }
          return null;
        }
        var found = findKeyArray(d, 0);
        if (found) {
          captured = true;
          log("✅ 通过postMessage深度拦截到数据 " + found.length + " 条");
          saveAndReturn(found);
          return;
        }
      }
    } catch (e) {}
  });

  // ========== 新方法: 拦截 addEventListener('message') 注册（捕获扩展内部消息） ==========
  var origAddEventListener = _w.addEventListener;
  _w.addEventListener = function (type, handler, options) {
    if (type === "message" && !handler._milyflyPatched) {
      var origHandler = handler;
      var patchedHandler = function (e) {
        if (!captured) {
          try {
            var d = e.data;
            if (d && typeof d === "object") {
              function findKeyArray(obj, depth) {
                if (depth > 3 || !obj || typeof obj !== "object") return null;
                if (
                  Array.isArray(obj) &&
                  obj.length > 5 &&
                  obj[0] &&
                  obj[0].key
                )
                  return obj;
                for (var k in obj) {
                  if (Object.prototype.hasOwnProperty.call(obj, k)) {
                    var r = findKeyArray(obj[k], depth + 1);
                    if (r) return r;
                  }
                }
                return null;
              }
              var found = findKeyArray(d, 0);
              if (found) {
                captured = true;
                log("✅ 通过message拦截器捕获 " + found.length + " 条");
                saveAndReturn(found);
              }
            }
          } catch (e) {}
        }
        return origHandler.apply(this, arguments);
      };
      patchedHandler._milyflyPatched = true;
      return origAddEventListener.call(_w, type, patchedHandler, options);
    }
    return origAddEventListener.call(_w, type, handler, options);
  };

  var pollCount = 0;

  // ========== 方法4: DOM 提取（兜底方案 - 只用于XHR/fetch都失败时） ==========
  function extractFromDOM() {
    if (captured) return;
    // 查找页面上的趋势表格 - 优先找含"热搜词""流量占比"等列的
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

      // 检查是否为趋势关键词表格：列数约为10列，且包含热搜词/流量占比等关键词
      var isTrendTable = false;
      var headerText = headers.join(" ");
      if (
        headerText.indexOf("热搜词") >= 0 ||
        headerText.indexOf("流量占比") >= 0 ||
        headerText.indexOf("曝光") >= 0
      ) {
        isTrendTable = true;
      }
      // 如果没有thead，检查第一行数据
      if (!isTrendTable && rows.length > 0) {
        var firstRow = rows[0].join(" ");
        // 趋势数据第一列应该是关键词(非数字非纯属性)
        if (
          rows[0][0] &&
          rows[0][0].indexOf("毫米") < 0 &&
          rows[0][0].indexOf("塑料") < 0
        ) {
          // 可能有10列左右的数据
          if (rows[0].length >= 8 && rows[0].length <= 12) {
            isTrendTable = true;
          }
        }
      }

      if (!isTrendTable) continue;

      // 只要有数据且列数正常(8-12列)，就接受
      if (rows.length > 0 && rows[0].length >= 8 && rows[0].length <= 12) {
        // 5行以上立即接受，5行以下等20秒后才接受
        if (rows.length >= 5 || pollCount > 20) {
          captured = true;
          log("✅ 通过DOM提取到 " + rows.length + " 行数据");
          saveAndReturn({ columns: headers, rows: rows });
          return;
        }
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

    // 点击后轮询 DOM，前15秒只看不抓(给XHR/fetch时间)，之后每1秒检查一次，最多60秒
    var pollTimer = setInterval(function () {
      pollCount++;
      if (captured) {
        clearInterval(pollTimer);
        return;
      }
      // 前8秒只等XHR/fetch，8秒后开始尝试DOM提取
      if (pollCount > 8) {
        extractFromDOM();
      }
      if (pollCount >= 60) {
        clearInterval(pollTimer);
        if (!captured) log("⚠️ 轮询60秒未找到数据");
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
