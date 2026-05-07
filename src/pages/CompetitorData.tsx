import { useState, useEffect, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  X,
  Calendar,
  BarChart3,
  Image as ImageIcon,
  Globe,
  Loader2,
} from "lucide-react";
import { supabaseNew as supabase } from "../lib/supabase";
import {
  CompetitorTracking,
  CompetitorDailyRecord,
  ManagedSku,
} from "../types";
import { getMexicoDateString } from "../lib/time";

interface ContextType {
  managedSkus: ManagedSku[];
}

interface CompetitorTrackingRow {
  id: string;
  sku: string;
  sku_name: string;
  competitor_url: string;
  competitor_title: string;
  competitor_image_url: string;
  competitor_listed_at: string;
  created_at: string;
}

interface CompetitorDailyRecordRow {
  id: string;
  competitor_id: string;
  date: string;
  sales: number;
  review_score: number;
  price: number;
  listing_date?: string;
  sales_7d?: number;
  sales_30d?: number;
  review_count?: number;
  created_at: string;
}

interface SkuOption {
  sku: string;
  product_name: string;
}

function mapTrackingRow(row: CompetitorTrackingRow): CompetitorTracking {
  return {
    id: row.id,
    sku: row.sku,
    skuName: row.sku_name,
    competitorUrl: row.competitor_url,
    competitorTitle: row.competitor_title,
    competitorImageUrl: row.competitor_image_url,
    competitorListedAt: row.competitor_listed_at,
    createdAt: row.created_at,
  };
}

function mapDailyRecordRow(
  row: CompetitorDailyRecordRow,
): CompetitorDailyRecord {
  return {
    id: row.id,
    competitorId: row.competitor_id,
    date: row.date,
    sales: row.sales,
    reviewScore: row.review_score,
    price: row.price,
    listingDate: row.listing_date || "",
    sales7d: row.sales_7d || 0,
    sales30d: row.sales_30d || 0,
    reviewCount: row.review_count || 0,
    createdAt: row.created_at,
  };
}

interface DailyRecordForm {
  date: string;
  sales: number;
  reviewScore: number;
  price: number;
  listingDate?: string;
  sales7d?: number;
  sales30d?: number;
  reviewCount?: number;
}

interface CompetitorForm {
  sku: string;
  skuName: string;
  competitorUrl: string;
  competitorTitle: string;
  competitorImageUrl: string;
  competitorListedAt: string;
  dailyRecords: DailyRecordForm[];
}

const emptyForm: CompetitorForm = {
  sku: "",
  skuName: "",
  competitorUrl: "",
  competitorTitle: "",
  competitorImageUrl: "",
  competitorListedAt: "",
  dailyRecords: [],
};

const emptyDailyRecord: DailyRecordForm = {
  date: getMexicoDateString(),
  sales: 0,
  reviewScore: 0,
  price: 0,
  listingDate: "",
  sales7d: 0,
  sales30d: 0,
  reviewCount: 0,
};

export default function CompetitorData() {
  const { managedSkus } = useOutletContext<ContextType>();
  const [competitors, setCompetitors] = useState<CompetitorTracking[]>([]);
  const [dailyRecordsMap, setDailyRecordsMap] = useState<
    Record<string, CompetitorDailyRecord[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [skuFilter, setSkuFilter] = useState<string>("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CompetitorForm>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [crawlingCompetitors, setCrawlingCompetitors] = useState<
    Record<string, boolean>
  >({});

  // ---------- Fetch competitors ----------
  const fetchCompetitors = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("competitor_tracking")
        .select("*")
        .order("created_at", { ascending: false });

      if (skuFilter) {
        query = query.eq("sku", skuFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      const competitorsData = (data || []).map((r: CompetitorTrackingRow) =>
        mapTrackingRow(r),
      );
      setCompetitors(competitorsData);

      // Fetch daily records for all competitors
      if (competitorsData.length > 0) {
        const ids = competitorsData.map((c) => c.id);
        const { data: recordsData, error: recordsError } = await supabase
          .from("competitor_daily_records")
          .select("*")
          .in("competitor_id", ids)
          .order("date", { ascending: true });

        if (recordsError) throw recordsError;

        const recordsMap: Record<string, CompetitorDailyRecord[]> = {};
        (recordsData || []).forEach((r: CompetitorDailyRecordRow) => {
          const mapped = mapDailyRecordRow(r);
          if (!recordsMap[mapped.competitorId]) {
            recordsMap[mapped.competitorId] = [];
          }
          recordsMap[mapped.competitorId].push(mapped);
        });
        setDailyRecordsMap(recordsMap);
      } else {
        setDailyRecordsMap({});
      }
    } catch (err: any) {
      console.error("Error fetching competitors:", err);
      alert("获取竞品数据失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const handleCrawlCompetitor = async (competitor: CompetitorTracking) => {
    if (!competitor.competitorUrl) {
      alert("该竞品没有配置URL");
      return;
    }
    setCrawlingCompetitors((prev) => ({ ...prev, [competitor.id]: true }));
    var url = competitor.competitorUrl;
    var hashIndex = url.indexOf("#");
    var baseUrl = hashIndex >= 0 ? url.substring(0, hashIndex) : url;
    var hashPart = hashIndex >= 0 ? url.substring(hashIndex) : "";
    var separator = baseUrl.includes("?") ? "&" : "?";
    var targetUrl = `${baseUrl}${separator}milyfly=1&type=competitor&competitor_id=${competitor.id}${hashPart}`;
    window.open(targetUrl, "_blank", "noopener=no");

    // Poll for data every 3 seconds for up to 60 seconds
    let pollCount = 0;
    const timer = setInterval(async () => {
      pollCount++;
      if (pollCount > 20) {
        clearInterval(timer);
        setCrawlingCompetitors((prev) => ({ ...prev, [competitor.id]: false }));
        return;
      }
      const { data } = await supabase
        .from("competitor_daily_records")
        .select("id, date")
        .eq("competitor_id", competitor.id)
        .eq("date", getMexicoDateString())
        .limit(1);
      if (data && data.length > 0) {
        clearInterval(timer);
        setCrawlingCompetitors((prev) => ({ ...prev, [competitor.id]: false }));
        fetchCompetitors();
      }
    }, 3000);
  };

  useEffect(() => {
    fetchCompetitors();
  }, [skuFilter]);

  // ---------- Filtered competitors by selected SKU ----------
  const filteredCompetitors = useMemo(() => {
    if (!skuFilter) return competitors;
    return competitors.filter((c) => c.sku === skuFilter);
  }, [competitors, skuFilter]);

  // ---------- Stats ----------
  const stats = useMemo(() => {
    const total = filteredCompetitors.length;
    const totalRecords = Object.values(dailyRecordsMap).reduce(
      (acc, records) => acc + records.length,
      0,
    );
    return { total, totalRecords };
  }, [filteredCompetitors, dailyRecordsMap]);

  // ---------- Expand / Collapse ----------
  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // ---------- Form helpers ----------
  const openCreateModal = () => {
    setEditingId(null);
    setForm({
      sku: "",
      skuName: "",
      competitorUrl: "",
      competitorTitle: "",
      competitorImageUrl: "",
      competitorListedAt: "",
      dailyRecords: [],
    });
    setIsModalOpen(true);
  };

  const openEditModal = async (competitor: CompetitorTracking) => {
    setEditingId(competitor.id);
    setForm({
      sku: competitor.sku,
      skuName: competitor.skuName,
      competitorUrl: competitor.competitorUrl,
      competitorTitle: competitor.competitorTitle,
      competitorImageUrl: competitor.competitorImageUrl,
      competitorListedAt: competitor.competitorListedAt,
      dailyRecords: (dailyRecordsMap[competitor.id] || []).map((r) => ({
        date: r.date,
        sales: r.sales,
        reviewScore: r.reviewScore,
        price: r.price,
        listingDate: r.listingDate || "",
        sales7d: r.sales7d || 0,
        sales30d: r.sales30d || 0,
        reviewCount: r.reviewCount || 0,
      })),
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSkuSelect = (sku: string) => {
    const managed = managedSkus.find((s) => s.sku === sku);
    setForm({
      ...form,
      sku,
      skuName: managed?.name || "",
    });
  };

  // ---------- Daily record form helpers ----------
  const addDailyRecord = () => {
    setForm({
      ...form,
      dailyRecords: [
        ...form.dailyRecords,
        { ...emptyDailyRecord, date: getMexicoDateString() },
      ],
    });
  };

  const removeDailyRecord = (index: number) => {
    setForm({
      ...form,
      dailyRecords: form.dailyRecords.filter((_, i) => i !== index),
    });
  };

  const updateDailyRecord = (
    index: number,
    field: keyof DailyRecordForm,
    value: string | number,
  ) => {
    const updated = [...form.dailyRecords];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, dailyRecords: updated });
  };

  // ---------- Save (Create / Update) ----------
  const handleSave = async () => {
    if (!form.sku || !form.competitorUrl.trim()) {
      alert("请填写完整信息（SKU、竞品链接为必填）");
      return;
    }

    const trackingPayload = {
      sku: form.sku,
      sku_name: form.skuName,
      competitor_url: form.competitorUrl.trim(),
      competitor_title: form.competitorTitle.trim(),
      competitor_image_url: form.competitorImageUrl.trim(),
      competitor_listed_at: form.competitorListedAt,
    };

    setSaving(true);
    try {
      if (editingId) {
        // Update competitor_tracking
        const { error: updateError } = await supabase
          .from("competitor_tracking")
          .update(trackingPayload)
          .eq("id", editingId);

        if (updateError) throw updateError;

        // Delete old daily records and re-insert
        const { error: deleteError } = await supabase
          .from("competitor_daily_records")
          .delete()
          .eq("competitor_id", editingId);

        if (deleteError) throw deleteError;

        // Insert new daily records
        if (form.dailyRecords.length > 0) {
          const recordsPayload = form.dailyRecords.map((r) => ({
            competitor_id: editingId,
            date: r.date,
            sales: r.sales,
            review_score: r.reviewScore,
            price: r.price,
            listing_date: r.listingDate || "",
            sales_7d: r.sales7d || 0,
            sales_30d: r.sales30d || 0,
            review_count: r.reviewCount || 0,
          }));

          const { error: insertError } = await supabase
            .from("competitor_daily_records")
            .insert(recordsPayload);

          if (insertError) throw insertError;
        }
      } else {
        // Insert into competitor_tracking
        const { data: trackingData, error: insertError } = await supabase
          .from("competitor_tracking")
          .insert([trackingPayload])
          .select();

        if (insertError) throw insertError;

        const newId = trackingData?.[0]?.id;
        if (!newId) throw new Error("创建竞品记录失败");

        // Insert daily records
        if (form.dailyRecords.length > 0) {
          const recordsPayload = form.dailyRecords.map((r) => ({
            competitor_id: newId,
            date: r.date,
            sales: r.sales,
            review_score: r.reviewScore,
            price: r.price,
            listing_date: r.listingDate || "",
            sales_7d: r.sales7d || 0,
            sales_30d: r.sales30d || 0,
            review_count: r.reviewCount || 0,
          }));

          const { error: recordsInsertError } = await supabase
            .from("competitor_daily_records")
            .insert(recordsPayload);

          if (recordsInsertError) throw recordsInsertError;
        }
      }

      closeModal();
      fetchCompetitors();
    } catch (err: any) {
      console.error("Error saving competitor:", err);
      alert("保存失败: " + (err.message || "请稍后重试"));
    } finally {
      setSaving(false);
    }
  };

  // ---------- Delete ----------
  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个竞品记录吗？（关联的每日记录也会被删除）"))
      return;
    try {
      const { error } = await supabase
        .from("competitor_tracking")
        .delete()
        .eq("id", id);
      if (error) throw error;
      fetchCompetitors();
    } catch (err: any) {
      console.error("Error deleting competitor:", err);
      alert("删除失败，请稍后重试");
    }
  };

  // ---------- PostMessage listener for competitor data ----------
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "COMPETITOR_DATA_READY" && e.data?.data) {
        const d = e.data.data;
        if (d.competitorId) {
          saveCompetitorData(d);
        }
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const saveCompetitorData = async (data: any) => {
    try {
      const { error } = await supabase.from("competitor_daily_records").upsert(
        {
          competitor_id: data.competitorId,
          date: getMexicoDateString(),
          price: data.price || 0,
          sales: data.totalSales || 0,
          review_score: data.avgRating || 0,
          listing_date: data.listingDate || "",
          sales_7d: data.sales7d || 0,
          sales_30d: data.sales30d || 0,
          review_count: data.reviewCount || 0,
        },
        { onConflict: "competitor_id,date" },
      );
      if (error) throw error;
      alert("✅ 竞品数据保存成功");
      fetchCompetitors();
    } catch (err: any) {
      alert("❌ 保存失败: " + err.message);
    }
  };

  // ---------- Helpers ----------
  const formatPrice = (price: number) => {
    return `$${Number(price).toFixed(2)}`;
  };

  return (
    <div className="v2-page-container">
      <div className="v2-inner-container">
        {/* ============ Header ============ */}
        <header className="v2-header">
          <div className="flex items-center space-x-4">
            <div className="v2-header-icon bg-gradient-to-br from-emerald-500 to-teal-600">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="v2-header-title">竞品数据</h1>
              <p className="v2-header-subtitle font-medium">
                追踪与管理竞品信息，洞察市场动态
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchCompetitors}
              className="p-2.5 bg-white border border-slate-200 text-slate-500 hover:text-sky-600 hover:border-sky-200 hover:bg-sky-50 rounded-xl transition-all shadow-sm"
              title="刷新数据"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={openCreateModal}
              className="bg-slate-900 hover:bg-slate-800 text-white transition-all px-5 py-2.5 rounded-xl flex items-center justify-center space-x-2 shadow-lg active:scale-95 text-xs font-bold"
            >
              <Plus className="w-4 h-4" />
              <span>新建竞品</span>
            </button>
          </div>
        </header>

        {/* ============ SKU Filter ============ */}
        <div className="flex items-center gap-3 mb-5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
            筛选 SKU
          </label>
          <select
            value={skuFilter}
            onChange={(e) => setSkuFilter(e.target.value)}
            className="v2-input max-w-xs"
          >
            <option value="">全部 SKU</option>
            {managedSkus.map((s) => (
              <option key={s.sku} value={s.sku}>
                {s.sku} — {s.name}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-100 rounded-full">
            <BarChart3 className="w-3 h-3 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              共 {stats.total} 个竞品
            </span>
          </div>
        </div>

        {/* ============ Competitor Cards ============ */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-2 text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className="text-sm">加载中...</span>
            </div>
          </div>
        ) : filteredCompetitors.length === 0 ? (
          <div className="v2-card">
            <div className="py-20 text-center text-slate-400 italic">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-10" />
              <p className="text-base font-bold opacity-60">
                {skuFilter ? "该 SKU 暂无竞品数据" : "暂无竞品数据"}
              </p>
              <button
                onClick={openCreateModal}
                className="mt-3 text-xs text-emerald-600 hover:text-emerald-500 font-bold transition-colors"
              >
                新建第一条竞品 →
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCompetitors.map((competitor) => {
              const records = dailyRecordsMap[competitor.id] || [];
              const isExpanded = expandedIds.has(competitor.id);

              return (
                <div
                  key={competitor.id}
                  className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden transition-all hover:shadow-md"
                >
                  {/* Card Header */}
                  <div className="p-5">
                    <div className="flex gap-5">
                      {/* Image */}
                      <div className="flex-shrink-0 w-24 h-24 bg-slate-50 border border-slate-100 rounded-xl overflow-hidden flex items-center justify-center">
                        {competitor.competitorImageUrl ? (
                          <img
                            src={competitor.competitorImageUrl}
                            alt={competitor.competitorTitle}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              (
                                e.currentTarget as HTMLImageElement
                              ).style.display = "none";
                              (e.currentTarget.parentElement!.querySelector(
                                ".fallback",
                              ) as HTMLElement)!.style.display = "flex";
                            }}
                          />
                        ) : null}
                        <div
                          className="fallback w-full h-full flex items-center justify-center"
                          style={{
                            display: competitor.competitorImageUrl
                              ? "none"
                              : "flex",
                          }}
                        >
                          <ImageIcon className="w-8 h-8 text-slate-300" />
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-bold text-slate-800 truncate max-w-md">
                              {competitor.competitorTitle || "未命名竞品"}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 text-[10px] font-bold shadow-sm">
                                {competitor.sku}
                              </span>
                              {competitor.skuName && (
                                <span className="text-[11px] text-slate-500 truncate max-w-[200px]">
                                  {competitor.skuName}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-1 flex-shrink-0">
                            <button
                              onClick={() => openEditModal(competitor)}
                              className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-all"
                              title="编辑"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(competitor.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                              title="删除"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleCrawlCompetitor(competitor)}
                              disabled={crawlingCompetitors[competitor.id]}
                              className={`p-1.5 rounded-lg transition-all ${
                                crawlingCompetitors[competitor.id]
                                  ? "text-sky-400 bg-sky-50 cursor-wait"
                                  : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                              }`}
                              title={
                                crawlingCompetitors[competitor.id]
                                  ? "爬取中..."
                                  : "爬取竞品数据"
                              }
                            >
                              {crawlingCompetitors[competitor.id] ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Globe className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* URL */}
                        <div className="mt-2 flex items-center gap-1.5">
                          <ExternalLink className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <a
                            href={competitor.competitorUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-sky-600 hover:text-sky-500 truncate font-medium hover:underline max-w-lg"
                          >
                            {competitor.competitorUrl}
                          </a>
                        </div>

                        {/* Listed Date */}
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span className="text-[11px] text-slate-500 font-mono font-medium">
                            {competitor.competitorListedAt || "未设置"}
                          </span>
                          {records.length > 0 && (
                            <span className="ml-2 text-[10px] text-slate-400 font-mono">
                              · {records.length} 条每日记录
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Expand Button */}
                      <div className="flex-shrink-0 flex items-start pt-1">
                        <button
                          onClick={() => toggleExpand(competitor.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                          title={isExpanded ? "收起" : "展开"}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Daily Records Table */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-slate-100 bg-slate-50/50">
                          {records.length === 0 ? (
                            <div className="py-6 text-center text-slate-400 text-xs italic">
                              暂无每日记录数据
                            </div>
                          ) : (
                            <div className="v2-table-wrapper custom-scrollbar">
                              <table className="v2-table">
                                <thead className="v2-table-thead">
                                  <tr>
                                    <th className="v2-table-th">日期</th>
                                    <th className="v2-table-th text-right">
                                      销量
                                    </th>
                                    <th className="v2-table-th text-right">
                                      评分
                                    </th>
                                    <th className="v2-table-th text-right">
                                      价格
                                    </th>
                                    <th className="v2-table-th text-right">
                                      上架时间
                                    </th>
                                    <th className="v2-table-th text-right">
                                      7天销量
                                    </th>
                                    <th className="v2-table-th text-right">
                                      30天销量
                                    </th>
                                    <th className="v2-table-th text-right">
                                      评论数
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {records.map((record) => (
                                    <tr key={record.id} className="v2-table-tr">
                                      <td className="v2-table-td">
                                        <div className="flex items-center gap-2">
                                          <Calendar className="w-3 h-3 text-slate-300" />
                                          <span className="text-slate-600 font-mono font-medium text-xs">
                                            {record.date}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="v2-table-td text-right">
                                        <span className="text-slate-700 text-xs font-bold">
                                          {record.sales}
                                        </span>
                                      </td>
                                      <td className="v2-table-td text-right">
                                        <span className="text-xs font-bold text-amber-600">
                                          {Number(record.reviewScore).toFixed(
                                            1,
                                          )}
                                        </span>
                                      </td>
                                      <td className="v2-table-td text-right">
                                        <span className="text-xs font-bold text-emerald-600">
                                          {formatPrice(record.price)}
                                        </span>
                                      </td>
                                      <td className="v2-table-td text-right">
                                        <span className="text-xs text-slate-600 font-medium">
                                          {record.listingDate || "-"}
                                        </span>
                                      </td>
                                      <td className="v2-table-td text-right">
                                        <span className="text-xs font-bold text-indigo-600">
                                          {record.sales7d ?? "-"}
                                        </span>
                                      </td>
                                      <td className="v2-table-td text-right">
                                        <span className="text-xs font-bold text-violet-600">
                                          {record.sales30d ?? "-"}
                                        </span>
                                      </td>
                                      <td className="v2-table-td text-right">
                                        <span className="text-xs font-bold text-cyan-600">
                                          {record.reviewCount ?? "-"}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============ Modal ============ */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={closeModal}
            />
            {/* Modal panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-xl overflow-hidden text-slate-800 max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-500" />
                  {editingId ? "编辑竞品" : "新建竞品"}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                {/* SKU dropdown */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    SKU <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={form.sku}
                    onChange={(e) => handleSkuSelect(e.target.value)}
                    className="v2-input"
                  >
                    <option value="" disabled>
                      选择 SKU
                    </option>
                    {managedSkus.map((s) => (
                      <option key={s.sku} value={s.sku}>
                        {s.sku} — {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* SKU Name (auto-filled, readonly) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    SKU 名称
                  </label>
                  <input
                    type="text"
                    value={form.skuName}
                    readOnly
                    placeholder="选择 SKU 后自动填充"
                    className="v2-input bg-slate-50 text-slate-500 cursor-not-allowed"
                  />
                </div>

                {/* Competitor URL */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    竞品链接 <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.competitorUrl}
                    onChange={(e) =>
                      setForm({ ...form, competitorUrl: e.target.value })
                    }
                    placeholder="https://..."
                    className="v2-input"
                  />
                </div>

                {/* Competitor Title */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    竞品标题
                  </label>
                  <input
                    type="text"
                    value={form.competitorTitle}
                    onChange={(e) =>
                      setForm({ ...form, competitorTitle: e.target.value })
                    }
                    placeholder="竞品标题"
                    className="v2-input"
                  />
                </div>

                {/* Competitor Image URL */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    竞品图片链接
                  </label>
                  <input
                    type="text"
                    value={form.competitorImageUrl}
                    onChange={(e) =>
                      setForm({ ...form, competitorImageUrl: e.target.value })
                    }
                    placeholder="https://..."
                    className="v2-input"
                  />
                </div>

                {/* Competitor Listed At */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    竞品上架时间
                  </label>
                  <input
                    type="date"
                    value={form.competitorListedAt}
                    onChange={(e) =>
                      setForm({ ...form, competitorListedAt: e.target.value })
                    }
                    className="v2-input"
                  />
                </div>

                {/* Daily Records Section */}
                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                      每日记录
                    </label>
                    <button
                      type="button"
                      onClick={addDailyRecord}
                      className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg hover:bg-emerald-100 transition-all"
                    >
                      <Plus className="w-3 h-3" />
                      添加记录
                    </button>
                  </div>

                  {form.dailyRecords.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-4">
                      暂无每日记录，点击"添加记录"按钮添加
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {form.dailyRecords.map((record, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-100 rounded-lg"
                        >
                          <div className="flex-1 grid grid-cols-4 gap-x-2 gap-y-3">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">
                                日期
                              </label>
                              <input
                                type="date"
                                value={record.date}
                                onChange={(e) =>
                                  updateDailyRecord(
                                    index,
                                    "date",
                                    e.target.value,
                                  )
                                }
                                className="v2-input text-xs py-1.5 px-2"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">
                                销量
                              </label>
                              <input
                                type="number"
                                value={record.sales}
                                onChange={(e) =>
                                  updateDailyRecord(
                                    index,
                                    "sales",
                                    parseInt(e.target.value) || 0,
                                  )
                                }
                                className="v2-input text-xs py-1.5 px-2"
                                min={0}
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">
                                评分
                              </label>
                              <input
                                type="number"
                                value={record.reviewScore}
                                onChange={(e) =>
                                  updateDailyRecord(
                                    index,
                                    "reviewScore",
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                                className="v2-input text-xs py-1.5 px-2"
                                min={0}
                                max={5}
                                step={0.1}
                              />
                            </div>
                            <div className="relative">
                              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">
                                价格
                              </label>
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">
                                  $
                                </span>
                                <input
                                  type="number"
                                  value={record.price}
                                  onChange={(e) =>
                                    updateDailyRecord(
                                      index,
                                      "price",
                                      parseFloat(e.target.value) || 0,
                                    )
                                  }
                                  className="v2-input text-xs py-1.5 pl-5 pr-2"
                                  min={0}
                                  step={0.01}
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">
                                上架时间
                              </label>
                              <input
                                type="text"
                                value={record.listingDate || ""}
                                onChange={(e) =>
                                  updateDailyRecord(
                                    index,
                                    "listingDate",
                                    e.target.value,
                                  )
                                }
                                className="v2-input text-xs py-1.5 px-2"
                                placeholder="2024-01-01"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">
                                7天销量
                              </label>
                              <input
                                type="number"
                                value={record.sales7d || ""}
                                onChange={(e) =>
                                  updateDailyRecord(
                                    index,
                                    "sales7d",
                                    parseInt(e.target.value) || 0,
                                  )
                                }
                                className="v2-input text-xs py-1.5 px-2"
                                min={0}
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">
                                30天销量
                              </label>
                              <input
                                type="number"
                                value={record.sales30d || ""}
                                onChange={(e) =>
                                  updateDailyRecord(
                                    index,
                                    "sales30d",
                                    parseInt(e.target.value) || 0,
                                  )
                                }
                                className="v2-input text-xs py-1.5 px-2"
                                min={0}
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">
                                评论数
                              </label>
                              <input
                                type="number"
                                value={record.reviewCount || ""}
                                onChange={(e) =>
                                  updateDailyRecord(
                                    index,
                                    "reviewCount",
                                    parseInt(e.target.value) || 0,
                                  )
                                }
                                className="v2-input text-xs py-1.5 px-2"
                                min={0}
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeDailyRecord(index)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all flex-shrink-0 mt-5"
                            title="删除该记录"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 p-5 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all active:scale-95"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving && <RefreshCw className="w-3 h-3 animate-spin" />}
                  {saving ? "保存中..." : editingId ? "更新" : "创建"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
