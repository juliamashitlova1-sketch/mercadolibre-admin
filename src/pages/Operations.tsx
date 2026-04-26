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
      case 'Image': return <ImageIcon className="w-4 h-4 text-blue-400" />;
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

  return (
    <div className="theme-v2 min-h-[calc(100vh-80px)] p-4 sm:p-8 space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <span className="p-2 bg-sky-500/20 rounded-xl">
              <Activity className="w-8 h-8 text-sky-400" />
            </span>
            运营操作日志
          </h1>
          <p className="text-slate-400 mt-2 flex items-center gap-2">
            记录针对 SKU 的具体优化动作，沉淀运营经验
            <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px]">
              V2 风格
            </span>
          </p>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={refreshLogs} 
            className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
            title="刷新数据"
          >
            <RefreshCw className="w-5 h-5 text-slate-300" />
          </button>
          <button 
            onClick={onAddLog}
            className="btn-primary group"
          >
            <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
            新建操作记录
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6">
        <div className="glass-panel rounded-2xl overflow-hidden border border-white/10">
          <div className="px-6 py-4 bg-white/5 border-b border-white/10 flex justify-between items-center">
            <h3 className="font-bold flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-400" />
              历史日志
            </h3>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Filter className="w-3 h-3" />
              共 {operationLogs.length} 条记录
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 text-slate-500 text-[11px] uppercase tracking-wider">
                  <th className="px-6 py-4 font-medium">日期</th>
                  <th className="px-6 py-4 font-medium">SKU</th>
                  <th className="px-6 py-4 font-medium text-center">类型</th>
                  <th className="px-6 py-4 font-medium">操作详情</th>
                  <th className="px-6 py-4 font-medium text-right">管理</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {operationLogs.length > 0 ? (
                  operationLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span className="text-sm font-medium text-slate-300">{log.date}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-sky-500/10 text-sky-400 rounded border border-sky-500/20 text-xs font-mono font-bold">
                          {log.sku}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <div className="flex flex-col items-center gap-1">
                            {getActionIcon(log.actionType)}
                            <span className="text-[10px] text-slate-400 font-medium">{getActionLabel(log.actionType)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-[500px]">
                          <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed truncate group-hover:whitespace-normal group-hover:overflow-visible">
                            {log.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-600">
                            <span>{format(parseISO(log.createdAt), 'HH:mm:ss')} 记录</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleDelete(log.id)}
                          className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <AlertCircle className="w-12 h-12 text-slate-700" />
                        <p className="text-slate-500 text-sm">还没有任何操作记录，开启您的第一笔打卡吧</p>
                        <button onClick={onAddLog} className="mt-2 text-sky-400 hover:underline text-xs">点击记录新操作</button>
                      </div>
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

