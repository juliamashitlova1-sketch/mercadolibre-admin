import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Brain, Sparkles, AlertTriangle, Loader2,
  MessageSquare, Download, Terminal, TrendingUp,
  Shield, Target, BarChart3
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { analyzeStoreData, getPredictiveAnalysis, getCompetitiveAnalysis } from '../lib/deepseek';

interface SkuAiAnalysisProps {
  sku: string;
  skuName: string;
  skuStats: any[];
  operationLogs: any[];
}

type AnalysisMode = 'standard' | 'predictive' | 'competitive' | 'custom';

const ANALYSIS_MODES = [
  { id: 'standard', label: '标准分析', icon: Brain, color: 'purple', description: '全维度运营诊断' },
  { id: 'predictive', label: '预测分析', icon: TrendingUp, color: 'sky', description: '销量预测与库存预警' },
  { id: 'competitive', label: '竞争分析', icon: Shield, color: 'amber', description: '竞争力评估与定价建议' },
] as const;

const QUICK_PROMPTS: Record<AnalysisMode, string[]> = {
  standard: [
    '深度AB测试复盘：分析近期改动对转化的影响',
    '库存预警：分析DOH与流量匹配情况',
    '竞争策略：分析流量流失率与保本底线',
  ],
  predictive: [
    '预测未来7天销量走势及补货建议',
    '分析库存可售天数与头程时效匹配度',
    '基于历史数据预测最优补货量',
  ],
  competitive: [
    '分析当前定价在市场中的竞争力',
    '对比竞品价格给出差异化定价建议',
    '分析评论数和评分对转化率的影响',
  ],
  custom: [],
};

export default function SkuAiAnalysis({ sku, skuName, skuStats, operationLogs }: SkuAiAnalysisProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [extraPrompt, setExtraPrompt] = useState<string>('');
  const [mode, setMode] = useState<AnalysisMode>('standard');

  const handleAnalyze = async (overridePrompt?: string) => {
    const promptToUse = typeof overridePrompt === 'string' ? overridePrompt : extraPrompt;
    setAnalyzing(true);
    setError(null);
    try {
      const today = new Date();
      const thirtyDaysAgo = new Date(new Date().setDate(today.getDate() - 30)).toISOString().split('T')[0];
      const endStr = today.toISOString().split('T')[0];

      let analysis: string;

      if (mode === 'predictive') {
        analysis = await getPredictiveAnalysis(skuStats, sku);
      } else if (mode === 'competitive') {
        analysis = await getCompetitiveAnalysis(skuStats, sku);
      } else {
        analysis = await analyzeStoreData(
          thirtyDaysAgo,
          endStr,
          skuStats,
          operationLogs,
          sku,
          promptToUse
        );
      }

      setResult(analysis);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '分析失败，请重试';
      setError(message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleExportWord = () => {
    if (!result) return;
    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><style>
        body { font-family: 'SimSun', serif; line-height: 1.5; }
        h2 { color: #2563eb; border-bottom: 1px solid #eee; padding-bottom: 5px; }
        h3 { color: #475569; }
        p { margin-bottom: 10px; }
      </style></head><body>
    `;
    const footer = '</body></html>';
    const htmlContent = result
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>');

    const sourceHTML = header + htmlContent + footer;
    const blob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AI智能诊断报告_${sku}_${new Date().toISOString().split('T')[0]}.doc`;
    a.click();
  };

  const currentPrompts = QUICK_PROMPTS[mode] || [];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">AI 智能辅助分析</h4>
            <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Powered by DeepSeek</p>
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

      <div className="flex gap-1.5 mb-3">
        {ANALYSIS_MODES.map(m => {
          const Icon = m.icon;
          const isActive = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => { setMode(m.id as AnalysisMode); setResult(null); setError(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                isActive
                  ? `bg-${m.color}-500/10 text-${m.color}-600 border border-${m.color}-500/30`
                  : 'bg-white text-slate-400 border border-slate-100 hover:border-slate-200'
              }`}
            >
              <Icon className="w-3 h-3" />
              {m.label}
            </button>
          );
        })}
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
              <h5 className="text-xs font-bold text-slate-700 mb-2">
                {ANALYSIS_MODES.find(m => m.id === mode)?.description || '准备好开启深度洞察了吗？'}
              </h5>

              {currentPrompts.length > 0 && (
                <div className="w-full space-y-2 mb-4">
                  {currentPrompts.map(prompt => (
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
              )}

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
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest animate-pulse">
                {mode === 'predictive' ? '正在构建预测模型...' : mode === 'competitive' ? '正在分析竞争格局...' : '正在深度分析数据流水...'}
              </p>
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
                <span className="text-[9px] font-black text-purple-400 uppercase tracking-[0.2em]">
                  {mode === 'predictive' ? '预测分析报告' : mode === 'competitive' ? '竞争分析报告' : '智能诊断报告'}
                </span>
                <button
                  onClick={handleExportWord}
                  className="text-[9px] font-bold text-sky-400 flex items-center gap-1 hover:text-sky-300 transition-colors"
                >
                  <Download className="w-3 h-3" /> 下载 Word 报告
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <div className="prose prose-sm max-w-none text-[11px] leading-relaxed text-slate-700">
                  <ReactMarkdown>{result}</ReactMarkdown>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
