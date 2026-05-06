import { useState, useEffect, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { format } from "date-fns";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  Trash2,
  Edit2,
  Star,
  MessageSquare,
  RefreshCw,
  X,
  Calendar,
  Filter,
} from "lucide-react";
import { supabaseNew as supabase } from "../lib/supabase";
import { LinkReview, ManagedSku } from "../types";
import { getMexicoDateString } from "../lib/time";

interface ContextType {
  managedSkus: ManagedSku[];
}

interface LinkReviewRow {
  id: string;
  sku: string;
  sku_name: string;
  review_time: string;
  review_score: number;
  review_content: string;
  created_at: string;
}

function mapRowToReview(row: LinkReviewRow): LinkReview {
  return {
    id: row.id,
    sku: row.sku,
    skuName: row.sku_name,
    reviewTime: row.review_time,
    reviewScore: row.review_score,
    reviewContent: row.review_content,
    createdAt: row.created_at,
  };
}

const SCORE_OPTIONS = [1, 2, 3, 4, 5];

export default function SkuReviews() {
  const { managedSkus } = useOutletContext<ContextType>();
  const [reviews, setReviews] = useState<LinkReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    sku: "",
    skuName: "",
    reviewTime: getMexicoDateString(),
    reviewScore: 5,
    reviewContent: "",
  });
  const [saving, setSaving] = useState(false);

  // ---------- Fetch data ----------
  const fetchReviews = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("link_reviews")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReviews((data || []).map((r: LinkReviewRow) => mapRowToReview(r)));
    } catch (err) {
      console.error("Error fetching link reviews:", err);
      alert("获取评价数据失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  // ---------- Aggregated stats ----------
  const stats = useMemo(() => {
    const total = reviews.length;
    if (total === 0) return { total, averageRating: 0 };

    const sum = reviews.reduce((acc, r) => acc + r.reviewScore, 0);
    return {
      total,
      averageRating: Number((sum / total).toFixed(2)),
    };
  }, [reviews]);

  // ---------- Per-SKU cumulative average ----------
  const skuAverageMap = useMemo(() => {
    const grouped: Record<string, number[]> = {};
    reviews.forEach((r) => {
      if (!grouped[r.sku]) grouped[r.sku] = [];
      grouped[r.sku].push(r.reviewScore);
    });
    const map: Record<string, number> = {};
    for (const [sku, scores] of Object.entries(grouped)) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      map[sku] = Number(avg.toFixed(2));
    }
    return map;
  }, [reviews]);

  // ---------- Form helpers ----------
  const openCreateModal = () => {
    setEditingId(null);
    setForm({
      sku: "",
      skuName: "",
      reviewTime: getMexicoDateString(),
      reviewScore: 5,
      reviewContent: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (review: LinkReview) => {
    setEditingId(review.id);
    setForm({
      sku: review.sku,
      skuName: review.skuName,
      reviewTime: review.reviewTime,
      reviewScore: review.reviewScore,
      reviewContent: review.reviewContent,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSkuSelect = (sku: string) => {
    const selected = managedSkus.find((s) => s.sku === sku);
    setForm({
      ...form,
      sku,
      skuName: selected?.name || "",
    });
  };

  // ---------- Save (Create / Update) ----------
  const handleSave = async () => {
    if (!form.sku || !form.reviewTime || !form.reviewContent.trim()) {
      alert("请填写完整信息（SKU、评价时间、评价内容为必填）");
      return;
    }

    const payload = {
      sku: form.sku,
      sku_name: form.skuName,
      review_time: form.reviewTime,
      review_score: form.reviewScore,
      review_content: form.reviewContent.trim(),
    };

    setSaving(true);
    try {
      let error = null;
      if (editingId) {
        const { error: err } = await supabase
          .from("link_reviews")
          .update(payload)
          .eq("id", editingId);
        error = err;
      } else {
        const { error: err } = await supabase
          .from("link_reviews")
          .insert([payload]);
        error = err;
      }

      if (error) throw error;

      closeModal();
      fetchReviews();
    } catch (err: any) {
      console.error("Error saving review:", err);
      alert("保存失败: " + (err.message || "请稍后重试"));
    } finally {
      setSaving(false);
    }
  };

  // ---------- Delete ----------
  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这条评价记录吗？")) return;
    try {
      const { error } = await supabase
        .from("link_reviews")
        .delete()
        .eq("id", id);
      if (error) throw error;
      fetchReviews();
    } catch (err: any) {
      console.error("Error deleting review:", err);
      alert("删除失败，请稍后重试");
    }
  };

  // ---------- Helpers for display ----------
  const getScoreBadge = (score: number) => {
    if (score >= 4) return "bg-emerald-50 text-emerald-600 border-emerald-100";
    if (score >= 3) return "bg-amber-50 text-amber-600 border-amber-100";
    return "bg-rose-50 text-rose-600 border-rose-100";
  };

  const renderStars = (score: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {SCORE_OPTIONS.map((s) => (
          <Star
            key={s}
            className={`w-3.5 h-3.5 ${
              s <= score
                ? "text-amber-400 fill-amber-400"
                : "text-slate-200 fill-slate-200"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="v2-page-container">
      <div className="v2-inner-container">
        {/* ============ Header ============ */}
        <header className="v2-header">
          <div className="flex items-center space-x-4">
            <div className="v2-header-icon bg-gradient-to-br from-amber-500 to-orange-600">
              <Star className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="v2-header-title">SKU 链接评价管理</h1>
              <p className="v2-header-subtitle font-medium">
                记录与管理 SKU 的买家评价信息
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchReviews}
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
              <span>新建评价</span>
            </button>
          </div>
        </header>

        {/* ============ Stats Cards ============ */}
        {!loading && reviews.length > 0 && (
          <div className="v2-stats-grid">
            <div className="v2-stat-card bg-white/80 border-slate-200/60 shadow-lg">
              <span className="v2-stat-label text-slate-400 font-bold">
                累计评价数
              </span>
              <div className="v2-stat-value text-slate-900">{stats.total}</div>
            </div>
            <div className="v2-stat-card bg-white/80 border-slate-200/60 shadow-lg">
              <span className="v2-stat-label text-amber-600 font-bold">
                平均评分
              </span>
              <div className="v2-stat-value text-amber-600 flex items-center gap-2">
                {stats.averageRating}
                <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
              </div>
            </div>
            <div className="v2-stat-card bg-white/80 border-slate-200/60 shadow-lg">
              <span className="v2-stat-label text-sky-600 font-bold">
                涉及 SKU 数
              </span>
              <div className="v2-stat-value text-sky-600">
                {Object.keys(skuAverageMap).length}
              </div>
            </div>
            <div className="v2-stat-card bg-white/80 border-slate-200/60 shadow-lg">
              <span className="v2-stat-label text-slate-400 font-bold flex items-center gap-1.5">
                <Calendar className="w-3 h-3" /> 最近评价
              </span>
              <div className="v2-stat-value text-slate-500 text-sm font-mono">
                {reviews[0]?.reviewTime || "-"}
              </div>
            </div>
          </div>
        )}

        {/* ============ Table ============ */}
        <div className="v2-card">
          <div className="v2-card-header">
            <h2 className="v2-card-title text-slate-800">
              <MessageSquare className="w-4 h-4 text-amber-500" />
              链接评价明细
            </h2>
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-100 rounded-full">
              <Filter className="w-3 h-3 text-slate-400" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                共 {reviews.length} 条
              </span>
            </div>
          </div>

          <div className="v2-table-wrapper max-h-[650px] custom-scrollbar">
            <table className="v2-table">
              <thead className="v2-table-thead">
                <tr>
                  <th className="v2-table-th">SKU</th>
                  <th className="v2-table-th">SKU 名称</th>
                  <th className="v2-table-th">评价时间</th>
                  <th className="v2-table-th text-center">评价分数</th>
                  <th className="v2-table-th">评价内容</th>
                  <th className="v2-table-th text-center">累计评分</th>
                  <th className="v2-table-th text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="v2-table-td py-10 text-center">
                      <div className="flex items-center justify-center gap-2 text-slate-400">
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span className="text-sm">加载中...</span>
                      </div>
                    </td>
                  </tr>
                ) : reviews.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-32 text-center text-slate-400 italic"
                    >
                      <Star className="w-12 h-12 mx-auto mb-4 opacity-5" />
                      <p className="text-sm font-bold opacity-60">
                        暂无评价记录
                      </p>
                      <button
                        onClick={openCreateModal}
                        className="mt-3 text-xs text-amber-600 hover:text-amber-500 font-bold transition-colors"
                      >
                        新建第一条评价 →
                      </button>
                    </td>
                  </tr>
                ) : (
                  reviews.map((review) => (
                    <tr key={review.id} className="v2-table-tr group">
                      <td className="v2-table-td">
                        <span className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg border border-amber-100 text-[11px] font-bold shadow-sm">
                          {review.sku}
                        </span>
                      </td>
                      <td className="v2-table-td">
                        <div className="max-w-[180px]">
                          <p
                            className="text-slate-700 text-xs font-medium truncate"
                            title={review.skuName}
                          >
                            {review.skuName}
                          </p>
                        </div>
                      </td>
                      <td className="v2-table-td">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-300" />
                          <span className="text-slate-500 font-mono font-medium text-xs">
                            {review.reviewTime}
                          </span>
                        </div>
                      </td>
                      <td className="v2-table-td">
                        <div className="flex justify-center">
                          <div
                            className={`px-2.5 py-1 rounded-full border text-[10px] font-black tracking-wide shadow-sm ${getScoreBadge(review.reviewScore)}`}
                          >
                            {renderStars(review.reviewScore)}
                          </div>
                        </div>
                      </td>
                      <td className="v2-table-td">
                        <div className="max-w-[280px]">
                          <p className="text-slate-600 text-xs leading-relaxed line-clamp-2 group-hover:line-clamp-none transition-all">
                            {review.reviewContent}
                          </p>
                        </div>
                      </td>
                      <td className="v2-table-td text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 text-[11px] font-bold">
                          <Star className="w-3 h-3 text-indigo-400 fill-indigo-400" />
                          {skuAverageMap[review.sku] ?? "-"}
                        </span>
                      </td>
                      <td className="v2-table-td text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => openEditModal(review)}
                            className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded transition-all"
                            title="编辑"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(review.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all"
                            title="删除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ============ Modal Overlay ============ */}
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
              className="relative w-full max-w-lg bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-xl overflow-hidden text-slate-800"
            >
              {/* Header */}
              <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" />
                  {editingId ? "编辑评价" : "新建评价"}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
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

                {/* Review Time */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    评价时间 <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.reviewTime}
                    onChange={(e) =>
                      setForm({ ...form, reviewTime: e.target.value })
                    }
                    className="v2-input"
                  />
                </div>

                {/* Review Score */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    评价分数
                  </label>
                  <div className="flex gap-2">
                    {SCORE_OPTIONS.map((score) => (
                      <button
                        key={score}
                        type="button"
                        onClick={() => setForm({ ...form, reviewScore: score })}
                        className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                          form.reviewScore === score
                            ? "bg-amber-500/10 border-amber-400 text-amber-600"
                            : "bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300"
                        }`}
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            form.reviewScore === score
                              ? "text-amber-400 fill-amber-400"
                              : "text-slate-300"
                          }`}
                        />
                        {score}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Review Content */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    评价内容 <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    value={form.reviewContent}
                    onChange={(e) =>
                      setForm({ ...form, reviewContent: e.target.value })
                    }
                    placeholder="请输入评价内容..."
                    rows={4}
                    className="v2-input resize-none min-h-[80px]"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 p-5 border-t border-slate-100 bg-slate-50/50">
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
