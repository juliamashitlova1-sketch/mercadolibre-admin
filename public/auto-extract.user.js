// ==UserScript==
// @name         美客多数据爬虫 - 自动提取 #table-trend
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  自动提取 Mercado Libre 热搜趋势表格数据
// @author       MILYFLY
// @match        *://*.mercadolibre.com.mx/*
// @match        *://*.mercadolibre.com/*
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  function extractTable() {
    const wrapper = document.getElementById('table-trend_wrapper');
    if (!wrapper) {
      alert('未找到 #table-trend 表格，请确认页面已完全加载');
      return;
    }

    const table = document.getElementById('table-trend');
    if (!table) {
      alert('表格元素不存在');
      return;
    }

    // 提取表头
    const headers = [];
    const thead = table.querySelector('thead');
    if (thead) {
      thead.querySelectorAll('th').forEach(th => {
        const text = th.innerText.trim();
        if (text) headers.push(text);
      });
    }

    // 提取数据行
    const rows = [];
    const tbody = table.querySelector('tbody');
    if (tbody) {
      tbody.querySelectorAll('tr').forEach(tr => {
        const row = [];
        tr.querySelectorAll('td').forEach(td => {
          row.push(td.innerText.trim().replace(/\s+/g, ' '));
        });
        if (row.length > 0) rows.push(row);
      });
    }

    if (rows.length === 0) {
      alert('表格中没有数据');
      return;
    }

    // 保存到 localStorage
    const data = { columns: headers.length > 0 ? headers : [], rows };
    localStorage.setItem('mx_crawled_table', JSON.stringify(data));

    // 尝试通知原窗口（如果是从我们的软件打开的）
    if (window.opener && window.opener !== window) {
      window.opener.postMessage({ type: 'TABLE_DATA_READY', data }, '*');
    }

    // 尝试打开我们的软件页面并传入数据
    const appUrl = 'https://mercadolibre-admin-v2.vercel.app/data-crawler';
    const encoded = encodeURIComponent(JSON.stringify(data));

    // 如果无法通过 postMessage 通信，直接跳转回我们的软件
    if (!window.opener || window.opener === window) {
      window.open(appUrl + '#data=' + encoded, '_blank');
    }

    alert(`✅ 成功提取 ${rows.length} 条数据！已发送回数据爬虫页面。`);
  }

  // 等待扩展加载完成后自动执行
  setTimeout(extractTable, 3000);
})();
