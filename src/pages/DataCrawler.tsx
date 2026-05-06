import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  ExternalLink,
  Loader2,
  Download,
  Globe,
  Trash2,
  Clock,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Clipboard,
} from "lucide-react";

// ---------- Types ----------

interface CrawlResult {
  success: boolean;
  columns: string[];
  rows: string[][];
  rowCount: number;
  rawTitle: string;
  note?: string;
  error?: string;
}

interface CrawlHistoryEntry {
  url: string;
  title: string;
  timestamp: number;
}

const HISTORY_KEY = "datacrawler_history";

// ---------- Helpers ----------

function loadHistory(): CrawlHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(entries: CrawlHistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
}

function parseTabularText(text: string): { columns: string[]; rows: string[][] } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return { columns: [], rows: [] };

  const columns = lines[0].split("\t").map((c) => c.trim());
  const rows = lines.slice(1).map((line) => line.split("\t").map((c) => c.trim()));

  return { columns, rows };
}

function downloadCSV(columns: string[], rows: string[][], filename: string) {
  const bom = "\uFEFF";
  const csvLines = [columns.join(","), ...rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))];
  const blob = new Blob([bom + csvLines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- Component ----------

export default function DataCrawler() {
  // URL input
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CrawlResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Manual paste
  const [pasteText, setPasteText] = useState("");
  const [manualData, setManualData] = useState<{ columns: string[]; rows: string[][] } | null>(null);

  // History
  const [history, setHistory] = useState<CrawlHistoryEntry[]>(loadHistory);

  // Persist history changes
  useEffect(() => {
    saveHistory(history);
  }, [history]);

  // ---------- Crawl ----------

  const handleCrawl = useCallback(async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;

    // Normalize URL
    let targetUrl = trimmedUrl;
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = "https://" + targetUrl;
    }

    // Open in new tab
    window.open(targetUrl, "_blank", "noopener,noreferrer");

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });

      const data: CrawlResult = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || data.note || "抓取失败");
        setResult(data);
      } else {
        setResult(data);
        // Add to history
        setHistory((prev) => {
          const next: CrawlHistoryEntry[] = [
            { url: targetUrl, title: data.rawTitle || targetUrl, timestamp: Date.now() },
            ...prev.filter((h) => h.url !== targetUrl),
          ].slice(0, 20);
          return next;
        });
      }
    } catch (err: any) {
      setError(err.message || "请求失败，请检查网络连接");
    } finally {
      setLoading(false);
    }
  }, [url]);

  const handleHistoryClick = (entry: CrawlHistoryEntry) => {
    setUrl(entry.url);
  };

  const handleDeleteHistory = (entryUrl: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistory((prev) => prev.filter((h) => h.url !== entryUrl));
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  };

  // ---------- Manual Parse ----------

  const handleParsePaste = () => {
    if (!pasteText.trim()) return;
    const parsed = parseTabularText(pasteText);
    setManualData(parsed);
  };

  // ---------- Download ----------

  const handleDownload = (columns: string[], rows: string[][]) => {
    const filename = `crawl_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCSV(columns, rows, filename);
  };

  // ---------- Determine what to render ----------

  const activeColumns = result?.columns?.length ? result.columns : manualData?.columns || [];
  const activeRows = result?.rows?.length ? result.rows : manualData?.rows || [];
  const hasData = activeColumns.length > 0 && activeRows.length > 0;

  // ---------- Render ----------

  return (
    <div className="v2-page-container">
      <div className="v2-inner-container">
        {/* Header */}
        <header className="v2-header flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex items-center space-x-3">
            <div className="v2-header-icon bg-gradient-to-br from-emerald-500 to-teal-600">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h1 className="v2-header-title">数据爬虫</h1>
              <p className="v2-header-subtitle">
                抓取网页中的公开表格数据，支持自动解析与手动粘贴
              </p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Left sidebar: Input + History */}
          <div className="lg:col-span-1 space-y-4">
            {/* URL Input Card */}
            <div className="v2-card p-5 space-y-4">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-emerald-500" />
                目标网址
              </h3>

              <div className="space-y-3">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCrawl()}
                  placeholder="https://..."
                  className="v2-input text-sm"
                  disabled={loading}
                />

                <button
                  onClick={handleCrawl}
                  disabled={loading || !url.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-md active:scale-95 transition-all"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      抓取中...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4" />
                      开始爬取
                    </>
                  )}
                </button>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}
            </div>

            {/* Manual Paste Card */}
            <div className="v2-card p-5 space-y-3">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Clipboard className="w-3.5 h-3.5 text-amber-500" />
                手动粘贴数据
              </h3>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={"从 Excel / Google Sheets 复制数据粘贴到此处\n（制表符分隔）"}
                rows={6}
                className="v2-input text-xs font-mono resize-y min-h-[100px]"
              />
              <button
                onClick={handleParsePaste}
                disabled={!pasteText.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-md active:scale-95 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                渲染表格
              </button>
            </div>

            {/* History */}
            <div className="v2-card">
              <div className="v2-card-header">
                <h3 className="v2-card-title">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  抓取历史
                </h3>
                {history.length > 0 && (
                  <button
                    onClick={handleClearHistory}
                    className="text-[10px] text-slate-400 hover:text-rose-500 transition-colors font-bold"
                  >
                    清空
                  </button>
                )}
              </div>
              <div className="max-h-[240px] overflow-y-auto">
                {history.length === 0 ? (
                  <div className="px-4 py-6 text-center text-[11px] text-slate-400 italic">
                    暂无历史记录
                  </div>
                ) : (
                  history.map((entry) => (
                    <button
                      key={entry.timestamp + entry.url}
                      onClick={() => handleHistoryClick(entry)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-50 text-left group"
                    >
                      <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-emerald-500 transition-colors shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-bold text-slate-700 truncate">
                          {entry.title || entry.url}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {entry.url}
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDeleteHistory(entry.url, e)}
                        className="p-1 rounded hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all"
                        title="删除"
                      >
                        <Trash2 className="w-3 h-3 text-rose-400" />
                      </button>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right: Results */}
          <div className="lg:col-span-3 space-y-4">
            <AnimatePresence mode="wait">
              {/* Loading */}
              {loading && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="v2-card bg-emerald-50/30 border-emerald-200/40 flex flex-col items-center justify-center p-16 text-center"
                >
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-4" />
                  <p className="text-sm font-bold text-slate-600">正在抓取数据...</p>
                  <p className="text-xs text-slate-400 mt-1">已在新标签页中打开目标页面</p>
                </motion.div>
              )}

              {/* Empty state + note */}
              {!loading && !result && !manualData && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="v2-card bg-slate-50/50 border-dashed border-slate-200 flex flex-col items-center justify-center p-16 text-center"
                >
                  <Globe className="w-10 h-10 text-slate-300 mb-4" />
                  <p className="text-sm font-bold text-slate-500">等待抓取</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
                    输入目标网址点击「开始爬取」，或在左侧粘贴表格数据
                  </p>
                </motion.div>
              )}

              {/* Note from server (JS-rendered page) */}
              {!loading && result?.note && !hasData && (
                <motion.div
                  key="note"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="v2-card bg-amber-50/50 border-amber-200/40 p-6 text-center"
                >
                  <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
                  <p className="text-sm font-bold text-amber-800">{result.note}</p>
                  {result.rawTitle && (
                    <p className="text-xs text-amber-600 mt-2">
                      页面标题: {result.rawTitle}
                    </p>
                  )}
                </motion.div>
              )}

              {/* Table result */}
              {!loading && hasData && (
                <motion.div
                  key="table"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="v2-card"
                >
                  <div className="v2-card-header">
                    <h2 className="v2-card-title text-slate-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      {result ? (
                        <>
                          抓取结果
                          {result.rawTitle && (
                            <span className="text-[10px] font-normal text-slate-400 ml-2 truncate max-w-[300px]">
                              — {result.rawTitle}
                            </span>
                          )}
                        </>
                      ) : (
                        "手动粘贴数据"
                      )}
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded">
                        {activeRows.length} 行 × {activeColumns.length} 列
                      </span>
                      <button
                        onClick={() => handleDownload(activeColumns, activeRows)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-white text-[10px] font-bold rounded-lg shadow-sm active:scale-95 transition-all"
                      >
                        <Download className="w-3 h-3" />
                        导出 CSV
                      </button>
                    </div>
                  </div>
                  <div className="v2-table-wrapper max-h-[600px]">
                    <table className="v2-table">
                      <thead className="v2-table-thead">
                        <tr>
                          <th className="v2-table-th w-12 text-center text-[10px]">#</th>
                          {activeColumns.map((col, i) => (
                            <th key={i} className="v2-table-th whitespace-nowrap">
                              {col || `列${i + 1}`}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {activeRows.map((row, ri) => (
                          <tr key={ri} className="v2-table-tr">
                            <td className="v2-table-td text-center text-[10px] text-slate-400 font-mono">
                              {ri + 1}
                            </td>
                            {row.map((cell, ci) => (
                              <td
                                key={ci}
                                className="v2-table-td whitespace-nowrap max-w-[300px] truncate"
                                title={cell}
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {/* Error-only result (e.g., fetch failed but we got a response) */}
              {!loading && result && !result.success && !hasData && !result.note && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="v2-card bg-rose-50/50 border-rose-200/40 p-6 text-center"
                >
                  <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-3" />
                  <p className="text-sm font-bold text-rose-800">
                    {result.error || "未知错误"}
                  </p>
                  {result.rawTitle && (
                    <p className="text-xs text-rose-600 mt-2">
                      页面标题: {result.rawTitle}
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
