import React, { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Globe,
  ExternalLink,
  Loader2,
  Check,
  Save,
  Calendar,
  Database,
  ChevronDown,
  ChevronUp,
  Search,
  History,
  Trash2,
} from "lucide-react";
import { supabaseNew } from "../lib/supabase";
import { getMexicoDateString } from "../lib/time";

export default function DataCrawler() {
  const { skuData, managedSkus } = useOutletContext<{
    skuData: any[];
    managedSkus: any[];
  }>();

  const [crawlConfigs, setCrawlConfigs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getMexicoDateString());
  const [crawlingSkus, setCrawlingSkus] = useState<Record<string, boolean>>({});
  const [trendData, setTrendData] = useState<any[]>([]);
  const [expandedSkus, setExpandedSkus] = useState<Record<string, boolean>>({});
  const [savedSkus, setSavedSkus] = useState<Record<string, boolean>>({});
  const [crawlResults, setCrawlResults] = useState<Record<string, number>>({});

  // Load crawl configs from DB
  const loadConfigs = async () => {
    const { data } = await supabaseNew.from("sku_crawl_config").select("*");
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((c: any) => {
        map[c.sku] = c.url || "";
      });
      setCrawlConfigs(map);
    }
  };

  // Load trend data for selected date
  const loadTrendData = async () => {
    const { data } = await supabaseNew
      .from("sku_trend_data")
      .select("*")
      .eq("crawl_date", selectedDate);
    if (data) {
      setTrendData(data);
      const countMap: Record<string, number> = {};
      data.forEach((d: any) => {
        countMap[d.sku] = (countMap[d.sku] || 0) + 1;
      });
      setCrawlResults(countMap);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  useEffect(() => {
    loadTrendData();
  }, [selectedDate]);

  // Listen for postMessage from crawler
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "TABLE_DATA_READY" && e.data?.data) {
        const d = e.data.data;
        const sku = d.sku || "";
        const rows = d.rows || [];

        if (sku && rows.length > 0) {
          setCrawlingSkus((prev) => ({ ...prev, [sku]: false }));
          saveTrendData(sku, rows);
        }
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [selectedDate]);

  const saveTrendData = async (sku: string, rows: string[][]) => {
    setLoading(true);
    try {
      // Delete old data for this SKU + date
      await supabaseNew
        .from("sku_trend_data")
        .delete()
        .eq("sku", sku)
        .eq("crawl_date", selectedDate);

      // Insert new rows
      const inserts = rows.map((row) => ({
        sku,
        crawl_date: selectedDate,
        keyword: row[0] || "",
        keyword_cn: row[1] || "",
        traffic_share: row[2] || "",
        impressions: row[3] || "",
        ranking: row[4] || "",
        search_rank: row[5] || "",
        sales_30d: row[6] || "",
        search_30d: row[7] || "",
        competitors: row[8] || "",
        competition: row[9] || "",
      }));

      const { error } = await supabaseNew
        .from("sku_trend_data")
        .insert(inserts);
      if (error) throw error;

      alert(`✅ SKU ${sku}: 成功保存 ${inserts.length} 条关键词数据`);
      loadTrendData();
    } catch (err: any) {
      alert("❌ 保存失败: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUrl = async (sku: string, url: string) => {
    try {
      const { error } = await supabaseNew.from("sku_crawl_config").upsert(
        {
          sku,
          sku_name: managedSkus.find((s) => s.sku === sku)?.name || "",
          url,
        },
        { onConflict: "sku" },
      );
      if (error) throw error;
      setSavedSkus((prev) => ({ ...prev, [sku]: true }));
      setTimeout(
        () => setSavedSkus((prev) => ({ ...prev, [sku]: false })),
        2000,
      );
    } catch (err: any) {
      alert("保存失败: " + err.message);
    }
  };

  const handleCrawl = (sku: string, url: string) => {
    if (!url) {
      alert("请先配置该 SKU 的目标网页 URL");
      return;
    }
    setCrawlingSkus((prev) => ({ ...prev, [sku]: true }));
    const separator = url.includes("?") ? "&" : "?";
    const targetUrl = `${url}${separator}milyfly=1&sku=${encodeURIComponent(sku)}`;
    window.open(targetUrl, "_blank", "noopener=no");
  };

  const toggleExpand = (sku: string) => {
    setExpandedSkus((prev) => ({ ...prev, [sku]: !prev[sku] }));
  };

  const getSkuTrendData = (sku: string) => {
    return trendData.filter((d) => d.sku === sku);
  };

  return (
    <div className="v2-page-container">
      <div className="v2-inner-container">
        <header className="v2-header">
          <div className="flex items-center space-x-4">
            <div className="v2-header-icon bg-gradient-to-br from-blue-600 to-indigo-700">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="v2-header-title">蓝鲸数据爬虫中心</h1>
              <p className="v2-header-subtitle font-medium">
                管理SKU爬取配置，自动采集蓝鲸关键词数据
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs font-bold text-slate-700 outline-none bg-transparent w-[130px]"
              />
            </div>
          </div>
        </header>

        {/* Script Install Guide */}
        <div className="p-4 bg-gradient-to-r from-emerald-50 to-sky-50 border border-emerald-200/60 rounded-xl mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-emerald-700 mb-1">
                🤖 自动脚本安装
              </p>
              <p className="text-[9px] text-slate-500 leading-relaxed">
                安装 Tampermonkey / 脚本猫 扩展后，添加下方脚本。 打开 Mercado
                Libre 页面时自动提取数据并传回本软件。
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <a
                href="/auto-extract.user.js"
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold transition-all"
              >
                📥 下载自动脚本
              </a>
              <button
                onClick={() => {
                  const code = `javascript:(function(){const s=document.createElement('script');s.src='${window.location.origin}/auto-extract.user.js?'+Date.now();document.body.appendChild(s)})();`;
                  navigator.clipboard.writeText(code);
                  alert(
                    "书签代码已复制！在浏览器书签栏新建书签，粘贴到网址栏即可。",
                  );
                }}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-[10px] font-bold transition-all"
              >
                📋 复制书签代码
              </button>
            </div>
          </div>
        </div>

        {/* SKU Crawl Config Table */}
        <div className="v2-card bg-white p-5 border-slate-200/60 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-500" />
            SKU 爬取配置
          </h3>
          <div className="v2-table-wrapper border border-slate-100 rounded-lg">
            <table className="v2-table text-[11px]">
              <thead className="v2-table-thead bg-slate-50">
                <tr>
                  <th className="v2-table-th w-16">#</th>
                  <th className="v2-table-th">SKU</th>
                  <th className="v2-table-th">产品名称</th>
                  <th className="v2-table-th">目标网页 URL</th>
                  <th className="v2-table-th w-24 text-center">爬取结果</th>
                  <th className="v2-table-th w-40 text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {managedSkus.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="v2-table-td py-10 text-center text-slate-400 italic"
                    >
                      暂无可管理的 SKU
                    </td>
                  </tr>
                ) : (
                  managedSkus.map((sku: any, idx: number) => {
                    const skuCode = sku.sku;
                    const url = crawlConfigs[skuCode] || "";
                    const keywordCount = crawlResults[skuCode] || 0;
                    const isCrawling = crawlingSkus[skuCode];
                    const skuTrend = getSkuTrendData(skuCode);

                    return (
                      <tr
                        key={skuCode}
                        className="v2-table-tr group hover:bg-slate-50/80"
                      >
                        <td className="v2-table-td text-center text-slate-400 font-mono">
                          {idx + 1}
                        </td>
                        <td className="v2-table-td font-bold text-sky-600">
                          {skuCode}
                        </td>
                        <td className="v2-table-td text-slate-500 max-w-[120px] truncate">
                          {sku.name || "-"}
                        </td>
                        <td className="v2-table-td">
                          <div className="flex gap-1">
                            <input
                              type="text"
                              value={crawlConfigs[skuCode] || ""}
                              onChange={(e) =>
                                setCrawlConfigs((prev) => ({
                                  ...prev,
                                  [skuCode]: e.target.value,
                                }))
                              }
                              placeholder="https://www.mercadolibre.com.mx/..."
                              className="w-full text-[10px] px-2 py-1 border border-slate-200 rounded focus:outline-none focus:border-sky-400 bg-transparent"
                            />
                          </div>
                        </td>
                        <td className="v2-table-td text-center">
                          {keywordCount > 0 ? (
                            <span className="text-emerald-600 font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded-full">
                              {keywordCount} 条
                            </span>
                          ) : (
                            <span className="text-slate-300 text-[10px]">
                              -
                            </span>
                          )}
                        </td>
                        <td className="v2-table-td text-center">
                          <div className="flex justify-center gap-1">
                            <button
                              onClick={() =>
                                handleSaveUrl(
                                  skuCode,
                                  crawlConfigs[skuCode] || "",
                                )
                              }
                              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 ${
                                savedSkus[skuCode]
                                  ? "bg-emerald-500 text-white"
                                  : "bg-sky-500/10 text-sky-600 hover:bg-sky-500/20 border border-sky-500/20"
                              }`}
                            >
                              {savedSkus[skuCode] ? (
                                <Check className="w-3 h-3" />
                              ) : (
                                <Save className="w-3 h-3" />
                              )}
                              {savedSkus[skuCode] ? "已保存" : "保存"}
                            </button>
                            <button
                              onClick={() =>
                                handleCrawl(
                                  skuCode,
                                  crawlConfigs[skuCode] || "",
                                )
                              }
                              disabled={isCrawling}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 ${
                                isCrawling
                                  ? "bg-slate-200 text-slate-400 cursor-wait"
                                  : "bg-indigo-600 text-white hover:bg-indigo-500"
                              }`}
                            >
                              {isCrawling ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <ExternalLink className="w-3 h-3" />
                              )}
                              {isCrawling ? "爬取中..." : "开始爬取"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Crawl Results */}
        <div className="v2-card bg-white p-5 border-slate-200/60 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-500" />
            爬取结果 · {selectedDate}
            {trendData.length > 0 && (
              <span className="text-[10px] font-normal text-slate-400 ml-2">
                共 {trendData.length} 条关键词记录
              </span>
            )}
          </h3>

          {trendData.length === 0 ? (
            <div className="text-center py-12 text-slate-300">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">当天暂无爬取数据</p>
              <p className="text-[10px] text-slate-200 mt-1">
                配置 SKU 的 URL 后点击"开始爬取"
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(crawlResults).map(([sku, count]) => {
                const skuTrend = getSkuTrendData(sku);
                const isExpanded = expandedSkus[sku];
                return (
                  <div
                    key={sku}
                    className="border border-slate-100 rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => toggleExpand(sku)}
                      className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-sky-600">
                          {sku}
                        </span>
                        <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
                          {count} 个关键词
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="v2-table-wrapper border-t border-slate-100">
                        <table className="v2-table text-[10px]">
                          <thead className="bg-slate-50/80">
                            <tr>
                              <th className="v2-table-th">热搜词</th>
                              <th className="v2-table-th">中文</th>
                              <th className="v2-table-th">流量占比</th>
                              <th className="v2-table-th">曝光次数</th>
                              <th className="v2-table-th">排名</th>
                              <th className="v2-table-th">搜索排名</th>
                              <th className="v2-table-th">30天销量</th>
                              <th className="v2-table-th">30天搜索</th>
                              <th className="v2-table-th">竞品数</th>
                              <th className="v2-table-th">竞争度</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {skuTrend.map((row: any, i: number) => (
                              <tr
                                key={row.id || i}
                                className="hover:bg-slate-50/50"
                              >
                                <td className="v2-table-td font-bold text-slate-700">
                                  {row.keyword}
                                </td>
                                <td className="v2-table-td text-slate-500">
                                  {row.keyword_cn || "-"}
                                </td>
                                <td className="v2-table-td font-mono">
                                  {row.traffic_share}
                                </td>
                                <td className="v2-table-td font-mono">
                                  {row.impressions}
                                </td>
                                <td className="v2-table-td font-mono">
                                  {row.ranking}
                                </td>
                                <td className="v2-table-td font-mono">
                                  {row.search_rank}
                                </td>
                                <td className="v2-table-td font-mono">
                                  {row.sales_30d}
                                </td>
                                <td className="v2-table-td font-mono">
                                  {row.search_30d}
                                </td>
                                <td className="v2-table-td font-mono">
                                  {row.competitors}
                                </td>
                                <td className="v2-table-td font-mono">
                                  {row.competition}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
