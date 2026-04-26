import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, Calendar, Sparkles, TrendingUp, 
  Target, AlertTriangle, Loader2,
  History, MessageSquare, Download, Terminal, Settings2
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
    <div className="v2-page-container">
      <div className="v2-inner-container">
        {/* Header Section */}
        <header className="v2-header flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex items-center space-x-3">
            <div className="v2-header-icon bg-gradient-to-br from-purple-500 to-indigo-600">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h1 className="v2-header-title">AI 智能大脑</h1>
              <p className="v2-header-subtitle">基于 DeepSeek V3 深度学习模型，拆解广告效率与利润表现。</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-xl ml-auto">
            {/* SKU Selector */}
            <div className="flex items-center gap-2 px-3 h-9 bg-slate-800/50 rounded-lg border border-slate-700 min-w-[160px]">
              <Target className="w-3.5 h-3.5 text-purple-400" />
              <select 
                value={selectedSku}
                onChange={e => setSelectedSku(e.target.value)}
                className="bg-transparent text-[11px] font-bold text-slate-300 outline-none w-full cursor-pointer appearance-none"
              >
                <option value="all">全店汇总分析</option>
                {uniqueSkus.map(sku => (
                  <option key={sku} value={sku}>{sku}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 px-3 h-9 bg-slate-800/50 rounded-lg border border-slate-700">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <input 
                type="date" 
                value={dateRange.start} 
                onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="bg-transparent text-[11px] font-bold text-slate-400 outline-none"
              />
              <span className="text-slate-600 font-bold mx-1">-</span>
              <input 
                type="date" 
                value={dateRange.end}
                onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="bg-transparent text-[11px] font-bold text-slate-400 outline-none"
              />
            </div>
            <button 
              onClick={handleAnalyze}
              disabled={analyzing}
              className="flex items-center gap-2 px-4 h-9 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-[11px] font-bold rounded-lg shadow-lg active:scale-95 group transition-all"
            >
              {analyzing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
              )}
              {analyzing ? '计算中...' : '启动分析'}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column: Context Cards */}
          <div className="lg:col-span-1 space-y-4">
            <div className="v2-card p-5 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-sky-400" /> Context Info
                </h3>
                <span className="text-[9px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 font-mono">LIVE</span>
              </div>
              <div className="space-y-3">
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                  <div className="text-[9px] text-slate-500 font-bold uppercase mb-1">SKU Range</div>
                  <div className="text-sm font-black text-slate-200">
                    {new Set(allSkuData.filter(s => s.date >= dateRange.start && s.date <= dateRange.end).map(s => s.sku)).size} Active
                  </div>
                </div>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                  <div className="text-[9px] text-slate-500 font-bold uppercase mb-1">Synced Logs</div>
                  <div className="text-sm font-black text-slate-200">
                    {operationLogs.filter(l => l.date >= dateRange.start && l.date <= dateRange.end).length} Entries
                  </div>
                </div>
              </div>
              
              <div className="pt-2">
                <div className="flex items-start gap-2.5 p-3 bg-purple-500/5 border border-purple-500/20 rounded-lg">
                  <Target className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[10px] font-black text-purple-300 uppercase tracking-wider">Analysis Bias</div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      模型将重点对比操作日期前后的 ACOS/ROAS 波动。
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="v2-card p-5 bg-gradient-to-br from-slate-900 to-black text-white relative overflow-hidden group border-slate-800">
               <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-purple-600/10 blur-2xl rounded-full" />
               <div className="relative z-10 space-y-4">
                  <div className="flex items-center justify-between">
                     <h4 className="text-[9px] font-black text-purple-400 uppercase tracking-widest">Model Config</h4>
                     <Settings2 className="w-3 h-3 text-slate-600" />
                  </div>
                  <div>
                    <div className="text-lg font-black tracking-tight">DeepSeek V3</div>
                    <div className="text-[10px] text-slate-500 font-bold">Inference Engine</div>
                  </div>
                  <div className="space-y-2 border-t border-slate-800 pt-3">
                     <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-500">Context</span>
                        <span className="text-slate-300 font-mono">128k Tokens</span>
                     </div>
                     <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-500">Quality</span>
                        <span className="text-emerald-400 font-bold">Ultra Precise</span>
                     </div>
                  </div>
               </div>
            </div>
          </div>

          {/* Right Column: Content Area */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              {!result && !analyzing && !error && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="v2-card bg-slate-900/40 border-dashed border-slate-800 flex flex-col items-center justify-center p-12 text-center h-full min-h-[500px]"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl ring-4 ring-purple-500/10">
                    <MessageSquare className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-lg font-black text-white mb-2">准备好开启智能洞察了吗？</h2>
                  <p className="text-[11px] text-slate-500 mb-8 max-w-sm mx-auto uppercase font-bold tracking-wider">选择下方指令或直接启动分析</p>
                  
                  <div className="w-full max-w-lg space-y-3">
                     {quickPrompts.map(prompt => (
                        <button
                          key={prompt}
                          onClick={() => {
                             setExtraPrompt(prompt);
                             handleAnalyze(prompt);
                          }}
                          className="w-full px-5 py-4 text-[11px] font-bold text-left bg-slate-900 border border-slate-800 rounded-xl hover:border-purple-500/50 hover:text-purple-400 transition-all text-slate-400 flex items-center justify-between group"
                        >
                          <span>{prompt}</span>
                          <Sparkles className="w-4 h-4 text-purple-500 opacity-0 group-hover:opacity-100 transition-all shrink-0" />
                        </button>
                     ))}
                  </div>
                </motion.div>
              )}

              {analyzing && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="v2-card bg-slate-900/40 border-slate-800 flex flex-col items-center justify-center p-12 h-full min-h-[500px]"
                >
                  <div className="relative mb-8">
                    <div className="w-16 h-16 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
                    <Brain className="w-6 h-6 text-purple-500 absolute top-5 left-5" />
                  </div>
                  <h2 className="text-[11px] font-black text-white mb-3 uppercase tracking-[0.2em]">正在分析海量经营数据...</h2>
                  <div className="flex gap-1.5 justify-center">
                     {[0,1,2].map(i => (
                       <motion.div 
                         key={i}
                         animate={{ opacity: [0.2, 1, 0.2] }}
                         transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2 }}
                         className="w-1 h-1 rounded-full bg-purple-500" 
                       />
                     ))}
                  </div>
                  <p className="text-[9px] text-slate-600 mt-8 font-mono tracking-widest font-black">SYSTEM STATUS: COMPUTING_METRICS...</p>
                </motion.div>
              )}

              {error && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="v2-card bg-slate-900 border-rose-500/20 flex flex-col items-center justify-center p-12 text-center h-full min-h-[500px]"
                >
                  <div className="w-14 h-14 bg-rose-500/10 rounded-full flex items-center justify-center mb-4">
                    <AlertTriangle className="w-6 h-6 text-rose-500" />
                  </div>
                  <h2 className="text-sm font-black text-white mb-2">分析请求失败</h2>
                  <p className="text-[11px] text-rose-400 bg-rose-500/5 px-4 py-2 rounded-lg mb-6 max-w-sm border border-rose-500/10">
                    {error}
                  </p>
                  <button 
                    onClick={() => handleAnalyze()}
                    className="px-6 py-2 bg-slate-800 text-white rounded-lg text-[11px] font-black border border-slate-700 hover:bg-slate-700 transition-all"
                  >
                    重试分析
                  </button>
                </motion.div>
              )}

              {result && !analyzing && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="v2-card p-8 bg-slate-900/60 border-slate-800"
                >
                  <div className="flex items-center justify-between pb-6 border-b border-slate-800 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="px-3 py-1 bg-purple-600 text-white text-[9px] font-black rounded-full uppercase tracking-widest">Analysis Result</div>
                      <span className="text-[9px] font-mono text-slate-500 font-bold uppercase tracking-tight">TIMESTAMP: {new Date().toLocaleTimeString()}</span>
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
                      className="text-[10px] font-black text-sky-400 hover:text-sky-300 transition-all flex items-center gap-1.5 uppercase"
                    >
                      <Download className="w-3.5 h-3.5" /> 下载报告
                    </button>
                  </div>
                  
                  <div className="v2-markdown-body prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{result}</ReactMarkdown>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

