import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, Calendar, Sparkles, TrendingUp, 
  Target, AlertTriangle, ChevronRight, Loader2,
  BarChart3, History, MessageSquare
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { analyzeStoreData } from '../lib/deepseek';
import { SKUStats, OperationLog } from '../types';

interface ContextType {
  allSkuData: SKUStats[];
  operationLogs: OperationLog[];
}

export default function AiBrain() {
  const { allSkuData, operationLogs } = useOutletContext<ContextType>();
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedSku, setSelectedSku] = useState<string>('all');
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [extraPrompt, setExtraPrompt] = useState<string>('');

  const quickPrompts = [
     "深度AB测试复盘：重点分析核心改动（如调价/图片）后的环比转化差异",
     "库存与流量预警：结合DOH找出隐患 SKU 以及被压缩自然流量的冗余品",
     "竞品攻防策略：分析因头部竞品降价可能导致的我方流量流失率与保本反击底线"
  ];

  // Get unique SKUs for selector
  const uniqueSkus = Array.from(new Set(allSkuData.map(s => s.sku))).sort();
  const skuInfoMap = allSkuData.reduce((acc, curr) => {
    if (!acc[curr.sku]) acc[curr.sku] = curr.skuName;
    return acc;
  }, {} as Record<string, string>);


  const handleAnalyze = async (overridePrompt?: string | React.MouseEvent) => {
    const promptToUse = typeof overridePrompt === 'string' ? overridePrompt : extraPrompt;
    setAnalyzing(true);
    setError(null);
    try {
      const filteredStats = allSkuData.filter(s => 
        s.date >= dateRange.start && 
        s.date <= dateRange.end && 
        (selectedSku === 'all' || s.sku === selectedSku)
      );
      const filteredLogs = operationLogs.filter(l => 
        l.date >= dateRange.start && 
        l.date <= dateRange.end &&
        (selectedSku === 'all' || l.sku === selectedSku)
      );
      
      const analysis = await analyzeStoreData(
        dateRange.start, 
        dateRange.end, 
        filteredStats, 
        filteredLogs,
        selectedSku,
        promptToUse
      );

      setResult(analysis);
    } catch (err: any) {
      setError(err.message || '分析过程中发生错误，请稍后重试。');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-purple-100 rounded-lg">
              <Brain className="w-5 h-5 text-purple-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 font-heading tracking-tight">AI 智能大脑</h1>
          </div>
          <p className="text-sm text-slate-500">基于 DeepSeek V3 深度学习模型，拆解广告效率与利润表现。</p>
        </div>

        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
          {/* SKU Selector */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100 min-w-[200px]">
            <Target className="w-4 h-4 text-purple-500" />
            <select 
              value={selectedSku}
              onChange={e => setSelectedSku(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none w-full cursor-pointer"
            >
              <option value="all">全店汇总分析</option>
              {uniqueSkus.map(sku => (
                <option key={sku} value={sku}>{sku} - {skuInfoMap[sku]}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">

            <Calendar className="w-4 h-4 text-slate-400" />
            <input 
              type="date" 
              value={dateRange.start} 
              onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="bg-transparent text-xs font-semibold text-slate-600 outline-none"
            />
            <span className="text-slate-300 mx-1">至</span>
            <input 
              type="date" 
              value={dateRange.end}
              onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="bg-transparent text-xs font-semibold text-slate-600 outline-none"
            />
          </div>
          <button 
            onClick={handleAnalyze}
            disabled={analyzing}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-lg shadow-purple-200 transition-all active:scale-95 group"
          >
            {analyzing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            )}
            {analyzing ? '深度分析中...' : '开始智能分析'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Quick Stats Context */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <History className="w-4 h-4 text-sky-500" /> 分析上下文概览
            </h3>
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">覆盖 SKU 数量</div>
                <div className="text-lg font-bold text-slate-700">
                  {new Set(allSkuData.filter(s => s.date >= dateRange.start && s.date <= dateRange.end).map(s => s.sku)).size} 个
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">同步操作日志条数</div>
                <div className="text-lg font-bold text-slate-700">
                  {operationLogs.filter(l => l.date >= dateRange.start && l.date <= dateRange.end).length} 条
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-xl">
                <Target className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-purple-700">AI 关注重点</div>
                  <p className="text-[11px] text-purple-600/80 mt-1 leading-relaxed">
                    模型将重点对比操作日期前后的 ACOS/ROAS 波动，并根据采购价计算各 SKU 的真实利润贡献度。
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden relative group">
             <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-purple-500/20 blur-2xl rounded-full group-hover:bg-purple-500/30 transition-all" />
             <div className="relative z-10">
                <h4 className="text-xs font-bold text-purple-300 uppercase tracking-widest mb-2">模型配置</h4>
                <div className="text-xl font-bold mb-4">DeepSeek V3</div>
                <div className="space-y-2">
                   <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">上下文长度</span>
                      <span className="text-slate-200 font-mono">128k Tokens</span>
                   </div>
                   <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">推理精度</span>
                      <span className="text-slate-200 font-mono">High Quality</span>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Right Column: Analysis Result */}
        <div className="lg:col-span-2 min-h-[600px]">
          <AnimatePresence mode="wait">
            {!result && !analyzing && !error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="h-full glass-panel flex flex-col items-center justify-center p-12 text-center"
              >
                <div className="w-20 h-20 bg-purple-50 rounded-3xl flex items-center justify-center mb-6 shadow-sm">
                  <MessageSquare className="w-10 h-10 text-purple-300" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-8">准备好开启智能洞察了吗？</h2>
                
                <div className="w-full max-w-xl text-left space-y-4">
                   <div className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-2">常用深度分析指令 (Quick Prompts)</div>
                   <div className="flex flex-col gap-3">
                     {quickPrompts.map(prompt => (
                        <button
                          key={prompt}
                          onClick={() => {
                             setExtraPrompt(prompt);
                             handleAnalyze(prompt);
                          }}
                          className="px-5 py-4 text-sm text-left bg-white border border-slate-200 rounded-xl hover:border-purple-300 hover:shadow-lg hover:shadow-purple-500/10 hover:text-purple-700 transition-all text-slate-600 flex items-center justify-between group relative overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <span className="relative z-10">{prompt}</span>
                          <Sparkles className="w-5 h-5 text-purple-400 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 relative z-10" />
                        </button>
                     ))}
                   </div>
                </div>
              </motion.div>
            )}

            {analyzing && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full glass-panel flex flex-col items-center justify-center p-12"
              >
                <div className="relative mb-8">
                  <div className="w-16 h-16 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin" />
                  <Brain className="w-6 h-6 text-purple-600 absolute top-5 left-5" />
                </div>
                <h2 className="text-lg font-bold text-slate-800 mb-2">正在分析海量经营数据...</h2>
                <div className="flex gap-1.5 justify-center">
                   {[0,1,2].map(i => (
                     <motion.div 
                       key={i}
                       animate={{ opacity: [0.2, 1, 0.2] }}
                       transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2 }}
                       className="w-1.5 h-1.5 rounded-full bg-purple-500" 
                     />
                   ))}
                </div>
                <p className="text-xs text-slate-400 mt-6 font-mono">POST: /v1/chat/completions - Payload ready</p>
              </motion.div>
            )}

            {error && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full glass-panel flex flex-col items-center justify-center p-12 text-center"
              >
                <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle className="w-8 h-8 text-rose-500" />
                </div>
                <h2 className="text-lg font-bold text-slate-800 mb-2">分析请求失败</h2>
                <p className="text-sm text-rose-500 bg-rose-50 px-4 py-2 rounded-lg mb-6 max-w-md">
                  {error}
                </p>
                <button 
                  onClick={handleAnalyze}
                  className="px-6 py-2 bg-slate-800 text-white rounded-xl text-sm font-bold"
                >
                  重试分析
                </button>
              </motion.div>
            )}

            {result && !analyzing && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-panel p-8 bg-white/80"
              >
                <div className="flex items-center justify-between pb-6 border-b border-slate-100 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="px-3 py-1 bg-purple-600 text-white text-[10px] font-black rounded-full uppercase tracking-widest">Report</div>
                    <span className="text-xs font-mono text-slate-400">Generated at {new Date().toLocaleTimeString()}</span>
                  </div>
                  <button 
                    onClick={() => {
                       const blob = new Blob([result], { type: 'text/markdown' });
                       const url = window.URL.createObjectURL(blob);
                       const a = document.createElement('a');
                       a.href = url;
                       a.download = `AI_Analysis_${dateRange.start}_${dateRange.end}.md`;
                       a.click();
                    }}
                    className="text-xs font-bold text-slate-500 hover:text-purple-600 transition-colors"
                  >
                    下载分析报告
                  </button>
                </div>
                
                <div className="prose prose-slate prose-sm max-w-none 
                  prose-headings:text-slate-800 prose-headings:font-heading prose-headings:font-bold
                  prose-h2:text-lg prose-h2:pb-2 prose-h2:border-b-2 prose-h2:border-purple-100 prose-h2:mb-4
                  prose-p:text-slate-600 prose-p:leading-relaxed
                  prose-strong:text-slate-900 prose-strong:bg-sky-50 prose-strong:px-1 prose-strong:rounded
                  prose-li:text-slate-600
                  prose-code:text-purple-600 prose-code:bg-purple-50 prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
                ">
                  <ReactMarkdown>{result}</ReactMarkdown>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
