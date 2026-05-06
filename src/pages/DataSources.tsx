import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  ExternalLink,
  FileText,
  X,
  Save,
  Database,
  Globe,
  Download,
} from "lucide-react";
import { supabaseNew as supabase } from "../lib/supabase";

interface DataSource {
  id: string;
  table_name: string;
  download_url: string;
  download_options: string;
  notes: string;
  related_section: string;
  created_at: string;
}

const RELATED_SECTIONS = [
  "数据大屏",
  "SKU成本管理",
  "刷单支出",
  "货损支出",
  "SKU数据总览",
  "数据清洗",
  "运营动作",
  "链接评价",
  "竞品数据",
  "账号健康",
  "新品核价",
  "软件迭代建议",
];

const emptyForm: Omit<DataSource, "id" | "created_at"> = {
  table_name: "",
  download_url: "",
  download_options: "",
  notes: "",
  related_section: RELATED_SECTIONS[0],
};

export default function DataSources() {
  const [data, setData] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const { data: records, error } = await supabase
      .from("data_sources")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching data sources:", error);
    } else {
      setData(records || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = (record: DataSource) => {
    setEditingId(record.id);
    setForm({
      table_name: record.table_name,
      download_url: record.download_url,
      download_options: record.download_options,
      notes: record.notes,
      related_section: record.related_section,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    if (!form.table_name.trim()) {
      alert("请输入表格名称");
      return;
    }

    setSaving(true);
    let error;

    if (editingId) {
      const { error: err } = await supabase
        .from("data_sources")
        .update(form)
        .eq("id", editingId);
      error = err;
    } else {
      const { error: err } = await supabase
        .from("data_sources")
        .insert([form]);
      error = err;
    }

    setSaving(false);

    if (error) {
      alert("保存失败: " + error.message);
    } else {
      closeModal();
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这条记录吗？")) return;
    const { error } = await supabase.from("data_sources").delete().eq("id", id);
    if (error) {
      alert("删除失败");
    } else {
      fetchData();
    }
  };

  return (
    <div className="v2-page-container">
      <div className="v2-inner-container">
        {/* Header */}
        <header className="v2-header">
          <div className="flex items-center space-x-3">
            <div className="v2-header-icon bg-gradient-to-br from-emerald-500 to-teal-600">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h1 className="v2-header-title">数据来源说明</h1>
              <p className="v2-header-subtitle">
                记录所有表格的下载来源与用途
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchData}
              className="p-2.5 bg-white border border-slate-200 text-slate-500 hover:text-teal-600 hover:border-teal-200 hover:bg-teal-50 rounded-xl transition-all shadow-sm"
              title="刷新数据"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={openCreateModal}
              className="bg-slate-900 hover:bg-slate-800 text-white transition-all px-5 py-2.5 rounded-xl flex items-center justify-center space-x-2 shadow-lg active:scale-95 text-xs font-bold"
            >
              <Plus className="w-4 h-4" />
              <span>新增数据来源</span>
            </button>
          </div>
        </header>

        {/* Stat Cards */}
        {!loading && data.length > 0 && (
          <div className="v2-stats-grid">
            <div className="v2-stat-card bg-white/80 border-slate-200/60 shadow-lg">
              <span className="v2-stat-label text-slate-400 font-bold">
                数据来源总数
              </span>
              <div className="v2-stat-value text-slate-900">{data.length}</div>
            </div>
            <div className="v2-stat-card bg-emerald-500/5 border-emerald-500/20 shadow-lg">
              <span className="v2-stat-label text-emerald-600 font-bold">
                表格来源
              </span>
              <div className="v2-stat-value text-emerald-600">
                {
                  new Set(data.map((d) => d.table_name)).size
                }
              </div>
            </div>
            <div className="v2-stat-card bg-teal-500/5 border-teal-500/20 shadow-lg">
              <span className="v2-stat-label text-teal-600 font-bold">
                覆盖板块
              </span>
              <div className="v2-stat-value text-teal-600">
                {new Set(data.map((d) => d.related_section)).size}
              </div>
            </div>
            <div className="v2-stat-card bg-white/80 border-slate-200/60 shadow-lg">
              <span className="v2-stat-label text-slate-400 font-bold flex items-center gap-1.5">
                <Globe className="w-3 h-3" /> 关联网页
              </span>
              <div className="v2-stat-value text-slate-400 text-sm">
                {data.filter((d) => d.download_url).length} 个
              </div>
            </div>
          </div>
        )}

        {/* Table Card */}
        <div className="v2-card">
          <div className="v2-card-header">
            <h2 className="v2-card-title text-slate-800">
              <FileText className="w-4 h-4 text-emerald-500" />
              数据来源明细
            </h2>
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-100 rounded-full">
              <Database className="w-3 h-3 text-slate-400" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                共 {data.length} 条
              </span>
            </div>
          </div>

          <div className="v2-table-wrapper max-h-[650px] custom-scrollbar">
            <table className="v2-table">
              <thead className="v2-table-thead">
                <tr>
                  <th className="v2-table-th">表格名称</th>
                  <th className="v2-table-th">下载网页</th>
                  <th className="v2-table-th">下载选项</th>
                  <th className="v2-table-th">备注</th>
                  <th className="v2-table-th">对应板块</th>
                  <th className="v2-table-th text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="v2-table-td py-20 text-center">
                      <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="v2-table-td py-20 text-center text-slate-400 italic"
                    >
                      <Database className="w-12 h-12 mx-auto mb-4 opacity-5" />
                      <p className="text-sm font-bold opacity-60">
                        暂无数据来源记录
                      </p>
                    </td>
                  </tr>
                ) : (
                  data.map((record) => (
                    <tr key={record.id} className="v2-table-tr group">
                      <td className="v2-table-td">
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100 text-[11px] font-bold shadow-sm">
                          {record.table_name}
                        </span>
                      </td>
                      <td className="v2-table-td">
                        {record.download_url ? (
                          <a
                            href={record.download_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sky-600 hover:text-sky-700 text-xs font-medium transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[200px]">
                              {record.download_url.replace(/^https?:\/\//, "")}
                            </span>
                          </a>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="v2-table-td">
                        <div className="flex items-center gap-1.5">
                          <Download className="w-3 h-3 text-slate-400" />
                          <span className="text-slate-600 text-xs font-medium">
                            {record.download_options || "—"}
                          </span>
                        </div>
                      </td>
                      <td className="v2-table-td">
                        <p className="text-slate-600 text-xs max-w-[200px] truncate leading-relaxed group-hover:text-slate-900 transition-colors">
                          {record.notes || "—"}
                        </p>
                      </td>
                      <td className="v2-table-td">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[10px] font-semibold border border-slate-200">
                          {record.related_section}
                        </span>
                      </td>
                      <td className="v2-table-td text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => openEditModal(record)}
                            className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded transition-all"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(record.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all"
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

      {/* Create / Edit Modal */}
      <AnimatePresence>
        {modalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
              style={{ zIndex: 9998 }}
              onClick={closeModal}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-0 flex items-center justify-center p-4"
              style={{ zIndex: 9999 }}
            >
              <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-white flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      {editingId ? (
                        <Edit2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <Plus className="w-5 h-5 text-emerald-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900">
                        {editingId ? "编辑数据来源" : "新增数据来源"}
                      </h3>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                        {editingId
                          ? "修改已有数据来源信息"
                          : "添加新的数据来源记录"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={closeModal}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                  {/* 表格名称 */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                      表格名称 <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.table_name}
                      onChange={(e) =>
                        setForm({ ...form, table_name: e.target.value })
                      }
                      className="v2-input w-full"
                      placeholder="例如：SKU成本明细表"
                    />
                  </div>

                  {/* 下载网页 */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                      下载网页
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="url"
                        value={form.download_url}
                        onChange={(e) =>
                          setForm({ ...form, download_url: e.target.value })
                        }
                        className="v2-input w-full pl-9"
                        placeholder="https://example.com/download"
                      />
                    </div>
                  </div>

                  {/* 下载选项 */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                      下载选项
                    </label>
                    <input
                      type="text"
                      value={form.download_options}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          download_options: e.target.value,
                        })
                      }
                      className="v2-input w-full"
                      placeholder="例如：选择 日期范围 → 导出CSV"
                    />
                  </div>

                  {/* 备注 */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                      备注
                    </label>
                    <textarea
                      value={form.notes}
                      onChange={(e) =>
                        setForm({ ...form, notes: e.target.value })
                      }
                      className="v2-input w-full min-h-[80px] resize-y"
                      placeholder="描述该表格的用途、更新频率等"
                      rows={3}
                    />
                  </div>

                  {/* 对应板块 */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                      对应侧边栏板块
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {RELATED_SECTIONS.map((section) => (
                        <button
                          key={section}
                          type="button"
                          onClick={() =>
                            setForm({ ...form, related_section: section })
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                            form.related_section === section
                              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-600"
                              : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300"
                          }`}
                        >
                          {section}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3 shrink-0">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 text-xs font-bold text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-all"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-all flex items-center gap-2 shadow-sm active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    {editingId ? "保存修改" : "确认添加"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
