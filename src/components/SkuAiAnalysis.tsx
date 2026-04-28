import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Brain, Sparkles, AlertTriangle, Loader2,
  MessageSquare, Download, Terminal, Settings2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { analyzeStoreData } from '../lib/deepseek';

interface SkuAiAnalysisProps {
  sku: string;
  skuName: string;
  skuStats: any[];
  operationLogs: any[];
}

export default function SkuAiAnalysis({ sku, skuName, skuStats, operationLogs }: SkuAiAnalysisProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [extraPrompt, setExtraPrompt] = useState<string>('');

  const quickPrompts = [
     "深度AB测试复盘：分析近期改动对转化的影响",
     "库存预警：分析DOH与流量匹配情况",
     "竞争策略：分析流量流失率与保本底线"
  ];

  const handleAnalyze = async (overridePrompt?: string) => {
    const promptToUse = typeof overridePrompt === 'string' ? overridePrompt : extraPrompt;
    setAnalyzing(true);
    setError(null);
    try {
      // Use last 30 days of data for context
      const today = new Date();
      const thirtyDaysAgo = new Date(new Date().setDate(today.getDate() - 30)).toISOString().split('T')[0];
      const endStr = today.toISOString().split('T')[0];

      const analysis = await analyzeStoreData(
        thirtyDaysAgo, 
        endStr, 
        skuStats, 
        operationLogs,
        sku,
        promptToUse
      );

      setResult(analysis);
    } catch (err: any) {
      setError(err.message || '分析失败，请重试');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">AI 智能辅助分析</h4>
            <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Powered by DeepSeek-V4-Pro</p>
          </div>
        </div>
        {result && !analyzing && (
          <button 
            onClick={() => setResult(null)}
            className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-all"
          >
            <Terminal className="w-3 h-3" /> 重置分析
          </button>
        )}
      </div>

      <div className="flex-1 min-h-[300px] bg-slate-50/50 border border-slate-100 rounded-xl overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          {!result && !analyzing && !error && (
            <motion.div 
              key="start"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center p-6 text-center"
            >
              <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-4 border border-purple-500/20">
                <Sparkles className="w-6 h-6 text-purple-400" />
              </div>
              <h5 className="text-xs font-bold text-slate-700 mb-4">准备好开启深度洞察了吗？</h5>
              
              <div className="w-full space-y-2 mb-4">
                 {quickPrompts.map(prompt => (
                    <button
                      key={prompt}
                      onClick={() => handleAnalyze(prompt)}
                      className="w-full px-4 py-2.5 text-[10px] font-bold text-left bg-white border border-slate-100 rounded-lg hover:border-purple-500/30 hover:bg-purple-50 transition-all text-slate-500 flex items-center justify-between group"
                    >
                      <span className="truncate">{prompt}</span>
                      <MessageSquare className="w-3 h-3 text-purple-500 shrink-0 ml-2" />
                    </button>
                 ))}
              </div>

              <div className="relative w-full">
                <input 
                  type="text"
                  placeholder="或在此输入特定分析需求..."
                  value={extraPrompt}
                  onChange={e => setExtraPrompt(e.target.value)}
                  className="w-full h-9 bg-white border border-slate-200 rounded-lg pl-3 pr-10 text-[10px] text-slate-900 focus:border-purple-500/50 outline-none"
                  onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
                />
                <button 
                  onClick={() => handleAnalyze()}
                  className="absolute right-1 top-1 w-7 h-7 bg-purple-600 hover:bg-purple-500 text-white rounded-md flex items-center justify-center shadow-lg transition-all"
                >
                  <Sparkles className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          )}

          {analyzing && (
            <motion.div 
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center p-6"
            >
              <div className="relative mb-6">
                <div className="w-12 h-12 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
                <Brain className="w-5 h-5 text-purple-500 absolute top-3.5 left-3.5" />
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest animate-pulse">正在深度分析数据流水...</p>
            </motion.div>
          )}

          {error && (
            <motion.div 
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center p-6 text-center"
            >
              <AlertTriangle className="w-8 h-8 text-rose-500 mb-3" />
              <p className="text-[11px] text-rose-400 mb-4">{error}</p>
              <button 
                onClick={() => handleAnalyze()}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-[10px] font-bold border border-slate-700 hover:bg-slate-700 transition-all"
              >
                重试
              </button>
            </motion.div>
          )}

          {result && !analyzing && (
            <motion.div 
              key="result"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col"
            >
              <div className="flex items-center justify-between p-3 border-b border-slate-100 bg-slate-100/30">
                <span className="text-[9px] font-black text-purple-400 uppercase tracking-[0.2em]">智能诊断报告</span>
                <button 
                  onClick={() => {
                    const blob = new Blob([result], { type: 'text/markdown' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `AI_${sku}_Analysis.md`;
                    a.click();
                  }}
                  className="text-[9px] font-bold text-sky-400 flex items-center gap-1"
                >
                  <Download className="w-3 h-3" /> 下载
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <div className="v2-markdown-body prose prose-slate prose-xs max-w-none">
                  <ReactMarkdown>{result}</ReactMarkdown>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <Settings2 className="w-3 h-3 text-slate-600" />
          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Model: V4-Pro</span>
        </div>
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/30" />
        </div>
      </div>
    </div>
  );
}
