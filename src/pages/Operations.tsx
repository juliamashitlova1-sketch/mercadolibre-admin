import React from 'react';
import { 
  Plus, Trash2, Calendar, Activity, FileText, 
  RefreshCw, Filter, DollarSign, Image as ImageIcon, 
  Zap, Type, Package, Clock
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { OperationLog } from '../types';

interface ContextType {
  operationLogs: OperationLog[];
  onAddLog: () => void;
  refreshLogs: () => void;
}

export default function Operations() {
  const { operationLogs, onAddLog, refreshLogs } = useOutletContext<ContextType>();

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条记录吗？')) return;
    try {
      const { error } = await supabase.from('operation_logs').delete().eq('id', id);
      if (error) throw error;
      refreshLogs();
    } catch (error) {
      console.error('Error deleting log:', error);
      alert('删除失败，请稍后重试');
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'Price': return <DollarSign className="w-3.5 h-3.5" />;
      case 'Image': return <ImageIcon className="w-3.5 h-3.5" />;
      case 'Ads': return <Zap className="w-3.5 h-3.5" />;
      case 'Title': return <Type className="w-3.5 h-3.5" />;
      case 'Stock': return <Package className="w-3.5 h-3.5" />;
      default: return <Activity className="w-3.5 h-3.5" />;
    }
  };

  const getActionLabel = (type: string) => {
    switch (type) {
      case 'Price': return '调价';
      case 'Image': return '改图';
      case 'Ads': return '广告';
      case 'Title': return '标题';
      case 'Stock': return '库存';
      default: return '其他';
    }
  };

  const getCategoryColor = (type: string) => {
    switch (type) {
      case 'Price': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'Image': return 'bg-sky-50 text-sky-600 border-sky-100';
      case 'Ads': return 'bg-purple-50 text-purple-600 border-purple-100';
      case 'Title': return 'bg-orange-50 text-orange-600 border-orange-100';
      case 'Stock': return 'bg-cyan-50 text-cyan-600 border-cyan-100';
      default: return 'bg-slate-50 text-slate-500 border-slate-100';
    }
  };

  return (
    <div className="v2-page-container">
      <div className="v2-inner-container">
        <header className="v2-header">
          <div className="flex items-center space-x-4">
            <div className="v2-header-icon bg-gradient-to-br from-indigo-500 to-sky-600">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="v2-header-title">运营动作日志</h1>
              <p className="v2-header-subtitle font-medium">记录 SKU 优化轨迹，沉淀运营决策经验</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={refreshLogs} 
              className="p-2.5 bg-white border border-slate-200 text-slate-500 hover:text-sky-600 hover:border-sky-200 hover:bg-sky-50 rounded-xl transition-all shadow-sm"
              title="刷新数据"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button 
              onClick={onAddLog}
              className="bg-slate-900 hover:bg-slate-800 text-white transition-all px-5 py-2.5 rounded-xl flex items-center justify-center space-x-2 shadow-lg active:scale-95 text-xs font-bold"
            >
              <Plus className="w-4 h-4" />
              <span>新建操作记录</span>
            </button>
          </div>
        </header>

        {operationLogs.length > 0 && (
          <div className="v2-stats-grid">
             <div className="v2-stat-card bg-white/80 border-slate-200/60 shadow-lg">
                <span className="v2-stat-label text-slate-400 font-bold">累计操作</span>
                <div className="v2-stat-value text-slate-900">{operationLogs.length}</div>
             </div>
             <div className="v2-stat-card bg-white/80 border-slate-200/60 shadow-lg">
                <span className="v2-stat-label text-sky-600 font-bold">本月活跃记录</span>
                <div className="v2-stat-value text-sky-600">
                  {operationLogs.filter(l => l.date.startsWith(new Date().toISOString().substring(0, 7))).length}
                </div>
             </div>
             <div className="v2-stat-card bg-white/80 border-slate-200/60 shadow-lg">
                <span className="v2-stat-label text-indigo-600 font-bold">广告优化次数</span>
                <div className="v2-stat-value text-indigo-600">{operationLogs.filter(l => l.actionType === 'Ads').length}</div>
             </div>
             <div className="v2-stat-card bg-white/80 border-slate-200/60 shadow-lg">
                <span className="v2-stat-label text-slate-400 font-bold flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> 最近更新
                </span>
                <div className="v2-stat-value text-slate-500 text-sm font-mono">{operationLogs[0]?.date}</div>
             </div>
          </div>
        )}

        <div className="v2-card">
          <div className="v2-card-header">
            <h2 className="v2-card-title text-slate-800">
              <FileText className="w-4 h-4 text-sky-500" />
              运营记录明细
            </h2>
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-100 rounded-full">
              <Filter className="w-3 h-3 text-slate-400" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">共 {operationLogs.length} 条</span>
            </div>
          </div>

          <div className="v2-table-wrapper max-h-[650px] custom-scrollbar">
            <table className="v2-table">
              <thead className="v2-table-thead">
                <tr>
                  <th className="v2-table-th">执行日期</th>
                  <th className="v2-table-th">关联 SKU</th>
                  <th className="v2-table-th text-center">动作类型</th>
                  <th className="v2-table-th">具体操作描述</th>
                  <th className="v2-table-th text-right">管理</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {operationLogs.length > 0 ? (
                  operationLogs.map((log) => (
                    <tr key={log.id} className="v2-table-tr group">
                      <td className="v2-table-td">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-300" />
                          <span className="text-slate-500 font-mono font-medium">{log.date}</span>
                        </div>
                      </td>
                      <td className="v2-table-td">
                        <span className="px-2.5 py-1 bg-sky-50 text-sky-600 rounded-lg border border-sky-100 text-[11px] font-bold shadow-sm">
                          {log.sku}
                        </span>
                      </td>
                      <td className="v2-table-td">
                        <div className="flex justify-center">
                          <div className={`px-2.5 py-1 rounded-full border text-[10px] font-black tracking-wide shadow-sm flex items-center gap-1.5 ${getCategoryColor(log.actionType)}`}>
                            {getActionIcon(log.actionType)}
                            {getActionLabel(log.actionType)}
                          </div>
                        </div>
                      </td>
                      <td className="v2-table-td">
                        <div className="max-w-[500px]">
                          <p className="text-slate-700 whitespace-pre-wrap leading-relaxed text-xs font-medium group-hover:text-slate-900 transition-colors">
                            {log.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400 font-mono">
                            <Clock className="w-3 h-3" />
                            <span>{format(parseISO(log.createdAt), 'HH:mm:ss')} 自动归档</span>
                          </div>
                        </div>
                      </td>
                      <td className="v2-table-td text-right">
                        <button 
                          onClick={() => handleDelete(log.id)}
                          className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-32 text-center text-slate-400 italic">
                      <Activity className="w-12 h-12 mx-auto mb-4 opacity-5" />
                      <p className="text-sm font-bold opacity-60">暂无运营操作记录</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
