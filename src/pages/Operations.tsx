import React from 'react';
import { 
  Plus, Trash2, Calendar, Activity, FileText, 
  RefreshCw, Filter, DollarSign, Image as ImageIcon, 
  Zap, Type, Package, AlertCircle
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
      case 'Price': return <DollarSign className="w-4 h-4 text-emerald-400" />;
      case 'Image': return <ImageIcon className="w-4 h-4 text-sky-400" />;
      case 'Ads': return <Zap className="w-4 h-4 text-purple-400" />;
      case 'Title': return <Type className="w-4 h-4 text-orange-400" />;
      case 'Stock': return <Package className="w-4 h-4 text-cyan-400" />;
      default: return <Activity className="w-4 h-4 text-slate-400" />;
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
      case 'Price': return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
      case 'Image': return 'bg-sky-500/10 border-sky-500/20 text-sky-400';
      case 'Ads': return 'bg-purple-500/10 border-purple-500/20 text-purple-400';
      case 'Title': return 'bg-orange-500/10 border-orange-500/20 text-orange-400';
      case 'Stock': return 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400';
      default: return 'bg-slate-800/50 border-slate-700 text-slate-400';
    }
  };

  return (
    <div className="v2-page-container">
      <div className="v2-inner-container">
        <header className="v2-header">
          <div className="flex items-center space-x-3">
            <div className="v2-header-icon bg-gradient-to-br from-sky-500 to-cyan-600">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h1 className="v2-header-title">运营动作</h1>
              <p className="v2-header-subtitle">记录针对 SKU 的具体优化动作，沉淀运营经验</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={refreshLogs} 
              className="p-2.5 bg-slate-800/50 hover:bg-slate-700 border border-slate-700 rounded-lg transition-all"
              title="刷新数据"
            >
              <RefreshCw className="w-4 h-4 text-slate-300" />
            </button>
            <button 
              onClick={onAddLog}
              className="cursor-pointer bg-sky-600 hover:bg-sky-500 text-white transition-all px-4 py-2 rounded-lg flex items-center justify-center space-x-2 shadow-md active:scale-95 text-xs font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>新建操作记录</span>
            </button>
          </div>
        </header>

        {operationLogs.length > 0 && (
          <div className="v2-stats-grid">
             <div className="v2-stat-card bg-slate-900/50 border-slate-800">
               <span className="v2-stat-label text-slate-500">总记录数</span>
               <div className="v2-stat-value text-white">{operationLogs.length}</div>
             </div>
             <div className="v2-stat-card bg-sky-500/5 border-sky-500/20">
               <span className="v2-stat-label text-sky-500">调价次数</span>
               <div className="v2-stat-value text-sky-400">{operationLogs.filter(l => l.actionType === 'Price').length}</div>
             </div>
             <div className="v2-stat-card bg-purple-500/5 border-purple-500/20">
               <span className="v2-stat-label text-purple-500">广告调整</span>
               <div className="v2-stat-value text-purple-400">{operationLogs.filter(l => l.actionType === 'Ads').length}</div>
             </div>
             <div className="v2-stat-card bg-slate-900/50 border-slate-800">
               <span className="v2-stat-label text-slate-500">最近活跃</span>
               <div className="v2-stat-value text-slate-400 text-sm">{operationLogs[0]?.date}</div>
             </div>
          </div>
        )}

        <div className="v2-card">
          <div className="v2-card-header">
            <h2 className="v2-card-title">
              <FileText className="w-4 h-4 text-sky-400" />
              历史日志
            </h2>
            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Filter className="w-3 h-3" /> 共 {operationLogs.length} 条记录
            </span>
          </div>

          <div className="v2-table-wrapper">
            <table className="v2-table">
              <thead className="v2-table-thead">
                <tr>
                  <th className="v2-table-th">日期</th>
                  <th className="v2-table-th">SKU</th>
                  <th className="v2-table-th text-center">类型</th>
                  <th className="v2-table-th">操作详情</th>
                  <th className="v2-table-th text-right">管理</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {operationLogs.length > 0 ? (
                  operationLogs.map((log) => (
                    <tr key={log.id} className="v2-table-tr group">
                      <td className="v2-table-td">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3 h-3 text-slate-600" />
                          <span className="text-slate-400 font-mono">{log.date}</span>
                        </div>
                      </td>
                      <td className="v2-table-td">
                        <span className="px-2 py-0.5 bg-sky-500/10 text-sky-400 rounded border border-sky-500/20 text-xs font-mono font-bold">
                          {log.sku}
                        </span>
                      </td>
                      <td className="v2-table-td">
                        <div className="flex justify-center">
                          <div className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${getCategoryColor(log.actionType)} flex items-center gap-1.5`}>
                            {getActionIcon(log.actionType)}
                            {getActionLabel(log.actionType)}
                          </div>
                        </div>
                      </td>
                      <td className="v2-table-td">
                        <div className="max-w-[450px]">
                          <p className="text-slate-300 whitespace-pre-wrap leading-relaxed truncate group-hover:whitespace-normal group-hover:overflow-visible text-xs">
                            {log.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-600 font-mono">
                            <span>{format(parseISO(log.createdAt), 'HH:mm:ss')} 记录</span>
                          </div>
                        </div>
                      </td>
                      <td className="v2-table-td text-right">
                        <button 
                          onClick={() => handleDelete(log.id)}
                          className="p-1.5 text-slate-600 hover:text-rose-400 hover:bg-rose-400/10 rounded transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-20 text-center text-slate-500 italic">
                      暂无操作记录
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
