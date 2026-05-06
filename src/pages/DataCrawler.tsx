import React, { useState, useRef, useEffect } from "react";
import {
  ExternalLink,
  Loader2,
  Download,
  Globe,
  Copy,
  Check,
} from "lucide-react";

export default function DataCrawler() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [error, setError] = useState("");
  const [opened, setOpened] = useState(false);
  const pasteRef = useRef<HTMLTextAreaElement>(null);
  const [copied, setCopied] = useState(false);

  // Listen for postMessage from opened tab (Tampermonkey sends this)
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "TABLE_DATA_READY" && e.data?.data) {
        const d = e.data.data;
        if (d.columns) setColumns(d.columns);
        if (d.rows) setRows(d.rows);
        setLoading(false);
        setOpened(false);
        setError("");
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // Auto-load from URL hash (bookmarklet sends this)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.startsWith("#data=")) {
      try {
        const raw = decodeURIComponent(hash.slice(6));
        const d = JSON.parse(raw);
        if (d.columns) setColumns(d.columns);
        if (d.rows) setRows(d.rows);
        if (d.rows?.length > 0) {
          setTimeout(() => {
            window.location.hash = "";
            history.replaceState(null, "", window.location.pathname);
          }, 500);
        }
      } catch {}
    }
  }, []);

  // Auto-listen for paste anywhere after opening URL
  useEffect(() => {
    const handler = async (e: ClipboardEvent) => {
      if (!opened) return;
      const html = e.clipboardData?.getData("text/html") || "";
      const text = e.clipboardData?.getData("text/plain") || "";
      if (!html && !text) return;

      // Try to parse HTML first (from table copy)
      if (html && html.includes("<table")) {
        parseHtmlTable(html);
        setOpened(false);
        setLoading(false);
        return;
      }
      // Fallback to plain text
      if (text && text.includes("\t")) {
        parseTabText(text);
        setOpened(false);
        setLoading(false);
        return;
      }
    };
    if (opened) {
      document.addEventListener("paste", handler);
      return () => document.removeEventListener("paste", handler);
    }
  }, [opened]);

  const parseHtmlTable = (html: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const table = doc.querySelector("table");
    if (!table) {
      setError("未在粘贴内容中找到表格");
      return;
    }

    const cols: string[] = [];
    table.querySelectorAll("thead tr th, thead tr td").forEach((th) => {
      cols.push((th as HTMLElement).innerText.trim());
    });

    const data: string[][] = [];
    table.querySelectorAll("tbody tr").forEach((tr) => {
      const row: string[] = [];
      tr.querySelectorAll("td").forEach((td) => {
        row.push((td as HTMLElement).innerText.trim().replace(/\s+/g, " "));
      });
      if (row.length > 0) data.push(row);
    });

    if (data.length === 0) {
      setError("未在表格中找到数据行");
      return;
    }
    setColumns(
      cols.length > 0
        ? cols
        : Array.from({ length: data[0].length }, (_, i) => `列${i + 1}`),
    );
    setRows(data);
    setError("");
  };

  const parseTabText = (text: string) => {
    const lines = text.trim().split("\n").filter(Boolean);
    if (lines.length < 2) {
      setError("数据至少需要两行");
      return;
    }
    const cols = lines[0].split("\t");
    const data = lines.slice(1).map((line) => line.split("\t"));
    setColumns(cols);
    setRows(data);
    setError("");
  };

  const handleStart = () => {
    if (!url) return;
    setLoading(true);
    setOpened(true);
    setError("");
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => pasteRef.current?.focus(), 500);
  };

  const handlePasteManually = async () => {
    try {
      const clipboard = await navigator.clipboard.read();
      for (const item of clipboard) {
        if (item.types.includes("text/html")) {
          const blob = await item.getType("text/html");
          const html = await blob.text();
          if (html.includes("<table")) {
            parseHtmlTable(html);
            setOpened(false);
            setLoading(false);
            return;
          }
        }
        if (item.types.includes("text/plain")) {
          const blob = await item.getType("text/plain");
          const text = await blob.text();
          if (text.includes("\t")) {
            parseTabText(text);
            setOpened(false);
            setLoading(false);
            return;
          }
        }
      }
      setError(
        "剪贴板中没有检测到表格数据。请先在新打开的标签页中选中表格并复制（Ctrl+A → Ctrl+C）",
      );
    } catch {
      setError("无法读取剪贴板，请直接在下方粘贴框中 Ctrl+V 粘贴表格数据");
    }
  };

  const exportCSV = () => {
    const csv = [
      columns.join(","),
      ...rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `数据爬取_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="v2-page-container">
      <div className="v2-inner-container">
        <header className="v2-header">
          <div className="flex items-center space-x-4">
            <div className="v2-header-icon bg-gradient-to-br from-emerald-500 to-teal-600">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="v2-header-title">数据爬虫</h1>
              <p className="v2-header-subtitle font-medium">
                打开网页 → 等待扩展加载 → 复制表格 → 自动解析
              </p>
            </div>
          </div>
        </header>

        {/* URL Input */}
        <div className="v2-card bg-white p-5 border-slate-200/60 shadow-sm">
          <div className="flex gap-3">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleStart()}
              placeholder="粘贴目标网页 URL..."
              className="v2-input flex-1 text-sm py-2.5"
            />
            <button
              onClick={handleStart}
              disabled={!url || loading}
              className="bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shrink-0 transition-all active:scale-95"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4" />
              )}
              {loading ? "等待数据..." : "开始爬取"}
            </button>
          </div>

          {/* Tampermonkey / Bookmarklet 安装提示 */}
          <div className="mt-4 p-3 bg-gradient-to-r from-emerald-50 to-sky-50 border border-emerald-200/60 rounded-xl">
            <p className="text-[10px] font-bold text-emerald-700 mb-1.5">
              🤖 全自动方案（推荐）
            </p>
            <p className="text-[9px] text-slate-500 leading-relaxed mb-2">
              安装 Tampermonkey 扩展后，添加下方脚本。以后打开 Mercado Libre
              页面时自动提取表格数据并传回本软件，无需手动复制粘贴。
            </p>
            <div className="flex gap-2 items-center">
              <a
                href="/auto-extract.user.js"
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold transition-all"
              >
                📥 下载自动脚本
              </a>
              <span className="text-[9px] text-slate-400">或</span>
              <button
                onClick={() => {
                  const code = `javascript:(function(){const s=document.createElement('script');s.src='${window.location.origin}/auto-extract.user.js?'+Date.now();document.body.appendChild(s)})();`;
                  navigator.clipboard.writeText(code);
                  alert(
                    "书签代码已复制！在浏览器书签栏新建书签，粘贴到网址栏即可。点击该书签即可自动提取当前页面的表格数据。",
                  );
                }}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-[10px] font-bold transition-all"
              >
                📋 复制书签代码
              </button>
            </div>
          </div>
        </div>

        {/* Waiting state */}
        {loading && opened && (
          <div className="v2-card bg-amber-50/80 border-2 border-amber-300 border-dashed rounded-xl p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-amber-500" />
            <h3 className="text-sm font-bold text-amber-700 mb-2">
              ⏳ 等待数据粘贴
            </h3>
            <p className="text-xs text-amber-600 leading-relaxed max-w-md mx-auto">
              已在浏览器新标签页打开目标网页。请在<b>新标签页中</b>选中表格数据
              （Ctrl+A → Ctrl+C），然后回到本页面按 Ctrl+V
              粘贴，系统将自动解析。
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <button
                onClick={handlePasteManually}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white rounded-lg text-xs font-bold transition-all"
              >
                从剪贴板读取
              </button>
              <button
                onClick={() => {
                  setLoading(false);
                  setOpened(false);
                }}
                className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-500 transition-all"
              >
                取消
              </button>
            </div>
            <div className="mt-5">
              <p className="text-[10px] text-amber-500 font-medium mb-2">
                或者直接在这里 Ctrl+V 粘贴表格数据：
              </p>
              <textarea
                ref={pasteRef}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.includes("<table")) {
                    parseHtmlTable(val);
                    setOpened(false);
                    setLoading(false);
                  } else if (val.includes("\t")) {
                    parseTabText(val);
                    setOpened(false);
                    setLoading(false);
                  }
                }}
                placeholder="在这里 Ctrl+V 粘贴复制的表格..."
                className="w-full h-24 text-xs font-mono border-2 border-amber-200 rounded-lg p-3 outline-none focus:border-amber-400 resize-none"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-600">
            ⚠️ {error}
          </div>
        )}

        {/* Results Table */}
        {rows.length > 0 && (
          <div className="v2-card bg-white p-5 border-slate-200/60 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" />
                解析结果 · {rows.length} 行 × {columns.length} 列
              </h3>
              <button
                onClick={exportCSV}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                {copied ? "已下载" : "导出 CSV"}
              </button>
            </div>
            <div className="v2-table-wrapper max-h-[600px] overflow-auto custom-scrollbar border border-slate-100 rounded-lg">
              <table className="v2-table text-[11px]">
                <thead className="v2-table-thead bg-slate-50 sticky top-0 z-10">
                  <tr>
                    <th className="v2-table-th text-center w-10">#</th>
                    {columns.map((col, i) => (
                      <th key={i} className="v2-table-th whitespace-nowrap">
                        {col || `列${i + 1}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row, ri) => (
                    <tr key={ri} className="v2-table-tr hover:bg-slate-50/80">
                      <td className="v2-table-td text-center text-slate-400 font-mono">
                        {ri + 1}
                      </td>
                      {row.map((cell, ci) => (
                        <td
                          key={ci}
                          className="v2-table-td max-w-[300px] truncate"
                          title={cell}
                        >
                          {cell || "-"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && rows.length === 0 && (
          <div className="v2-card bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-xl p-12 text-center">
            <Globe className="w-10 h-10 mx-auto mb-3 text-slate-200" />
            <p className="text-sm text-slate-400 font-medium">
              输入 URL 并点击"开始爬取"开始
            </p>
            <p className="text-xs text-slate-300 mt-1">
              支持自动识别粘贴板中的 HTML 表格或 Tab 分隔数据
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
