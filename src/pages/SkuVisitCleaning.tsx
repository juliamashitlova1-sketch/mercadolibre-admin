import React, { useState, useEffect } from 'react';
import { Search, Upload, AlertCircle, CheckCircle, Loader2, TrendingUp, BarChart2 } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

interface CleanedVisit {
  date: string;
  sku: string;
  unique_visits: number;
  total_reviews?: number;
  negative_reviews?: number;
  positive_reviews?: number;
}

export default function SkuVisitCleaning() {
  const [data, setData] = useState<CleanedVisit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [manualDate, setManualDate] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });

  useEffect(() => {
    fetchCloudData();
  }, []);

  const fetchCloudData = async () => {
    setIsLoading(true);
    try {
      const { data: visits, error } = await supabase
        .from('sku_visits')
        .select('*')
        .order('date', { ascending: false });
      if (error) {
        if (error.code === '42P01') {
          console.warn('sku_visits table is not created yet.');
          setData([]);
          return;
        }
        throw error;
      }
      if (visits) setData(visits);
    } catch (err: any) {
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const parseDate = (str: string) => {
    if (!str) return '';
    // Format: "This report includes metrics on the performance of your listings on April 24, 2026."
    const match = str.match(/on ([\w]+ \d{1,2}, \d{4})/i);
    if (match) {
        const d = new Date(match[1]);
        if (!isNaN(d.getTime())) {
            return d.toISOString().split('T')[0];
        }
    }
    return '';
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setSyncStatus({ type: null, message: '正在处理文件...' });

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null }) as any[][];
      
      let reportDate = '';
      if (rawData[2] && rawData[2][0]) {
          reportDate = parseDate(String(rawData[2][0]));
      }

      if (!reportDate) {
           // Try to parse from filename if not in header
           const dateMatch = file.name.match(/(\d{4})[.-](\d{1,2})[.-](\d{1,2})/) || file.name.match(/(\d{1,2})[.-](\d{1,2})/);
           if (dateMatch) {
               // handle various date formats if needed
           }
           // Fallback to today if still empty but warn
           reportDate = new Date().toISOString().split('T')[0];
      }

      let headerRowIndex = -1;
      let skuIdx = -1, visitsIdx = -1, totalReviewsIdx = -1, negReviewsIdx = -1, posReviewsIdx = -1;

      for (let i = 0; i < Math.min(40, rawData.length); i++) {
        const row = rawData[i];
        if (!row) continue;
        const currentSkuIdx = row.findIndex(val => String(val).toLowerCase() === 'sku' || String(val) === '商品编码');
        if (currentSkuIdx !== -1) {
          headerRowIndex = i;
          skuIdx = currentSkuIdx;
          visitsIdx = row.findIndex(val => String(val).toLowerCase().includes('unique visits') || String(val).includes('独立访问量'));
          totalReviewsIdx = row.findIndex(val => String(val).toLowerCase().includes('total reviews') || String(val).includes('总评论'));
          negReviewsIdx = row.findIndex(val => String(val).toLowerCase().includes('negative reviews') || String(val).includes('负面评论'));
          posReviewsIdx = row.findIndex(val => String(val).toLowerCase().includes('positive reviews') || String(val).includes('正面评论'));
          break;
        }
      }

      if (headerRowIndex === -1 || skuIdx === -1) {
        throw new Error('未找到包含 "SKU" 的表头行。请确保上传了正确的访问数据报表。');
      }

      // Use manual date if provided, otherwise use parsed date
      const finalReportDate = manualDate || reportDate;
      if (!finalReportDate) {
        throw new Error('无法识别报表日期，请手动选择上传日期。');
      }

      const parsedRecords: CleanedVisit[] = [];

      for (let i = headerRowIndex + 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || !row[skuIdx]) continue;
        
        const sku = String(row[skuIdx]).trim();
        if (!sku || sku.toLowerCase() === 'total') continue;

        const visits = visitsIdx !== -1 && row[visitsIdx] ? parseInt(String(row[visitsIdx])) : 0;
        const totalReviews = totalReviewsIdx !== -1 && row[totalReviewsIdx] ? parseInt(String(row[totalReviewsIdx])) : 0;
        const negReviews = negReviewsIdx !== -1 && row[negReviewsIdx] ? parseInt(String(row[negReviewsIdx])) : 0;
        const posReviews = posReviewsIdx !== -1 && row[posReviewsIdx] ? parseInt(String(row[posReviewsIdx])) : 0;

        parsedRecords.push({
          date: finalReportDate,
          sku: sku,
          unique_visits: visits,
          total_reviews: totalReviews,
          negative_reviews: negReviews,
          positive_reviews: posReviews,
        });
      }

      if (parsedRecords.length === 0) {
        throw new Error('未提取到有效的数据行，请检查表格内容。');
      }

      // Deduplicate records to prevent "ON CONFLICT DO UPDATE command cannot affect row a second time"
      const uniqueMap = new Map();
      parsedRecords.forEach(record => {
          uniqueMap.set(record.sku, record);
      });
      const deduplicatedRecords = Array.from(uniqueMap.values());

      setSyncStatus({ type: null, message: `解析成功（日期: ${finalReportDate}），共 ${deduplicatedRecords.length} 条唯一数据，正在同步...` });
      
      const { error } = await supabase
        .from('sku_visits')
        .upsert(deduplicatedRecords, { onConflict: 'date,sku' });

      if (error) throw error;

      setSyncStatus({ type: 'success', message: `成功同步 ${parsedRecords.length} 条访问数据！` });
      
      fetchCloudData();
    } catch (err: any) {
      setSyncStatus({ type: 'error', message: '处理错误: ' + err.message });
      console.error(err);
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  return (
    <div className="v2-page-container custom-scrollbar">
      <div className="v2-inner-container">
        {/* Header Compact */}
        <header className="v2-header">
          <div className="flex items-center space-x-3">
            <div className="v2-header-icon bg-gradient-to-br from-purple-500 to-indigo-600">
              <Search className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="v2-header-title">
                各 SKU 访问数据清洗
              </h1>
              <p className="v2-header-subtitle">从 Mercado Libre 流量报表提取独立访问量，同步至 SKU 销量追踪引擎</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
               <span className="text-xs text-slate-500">选择上传日期:</span>
               <input 
                 type="date" 
                 value={manualDate} 
                 onChange={(e) => setManualDate(e.target.value)}
                 className="bg-transparent text-xs text-slate-700 outline-none cursor-pointer"
               />
            </div>

            <label className="cursor-pointer bg-purple-600 hover:bg-purple-500 text-white transition-all px-4 py-2 rounded-lg flex items-center justify-center space-x-2 shadow-md active:scale-95 text-xs">
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <span className="font-medium">{isUploading ? '处理中...' : '上传流量报表 (.xlsx)'}</span>
              <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} disabled={isUploading} />
            </label>
          </div>
        </header>

        {syncStatus.message && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }} 
            animate={{ opacity: 1, scale: 1 }}
            className={`p-3 rounded-lg flex items-center space-x-2 border shadow-sm text-xs ${
              syncStatus.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
              syncStatus.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-700' :
              'bg-purple-50 border-purple-200 text-purple-700'
            }`}
          >
            {syncStatus.type === 'success' && <CheckCircle className="w-4 h-4" />}
            {syncStatus.type === 'error' && <AlertCircle className="w-4 h-4" />}
            {!syncStatus.type && <Loader2 className="w-4 h-4 animate-spin" />}
            <span className="font-medium">{syncStatus.message}</span>
          </motion.div>
        )}

        {/* List Table */}
        <div className="v2-card">
          <div className="v2-card-header">
            <h2 className="v2-card-title">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              已清洗流量数据 ({data.length})
            </h2>
          </div>
          <div className="v2-table-wrapper max-h-[600px] custom-scrollbar">
            <table className="v2-table">
              <thead className="v2-table-thead">
                <tr>
                  <th className="v2-table-th">日期</th>
                  <th className="v2-table-th">SKU</th>
                  <th className="v2-table-th text-right">独立访问量</th>
                  <th className="v2-table-th text-right">总评论</th>
                  <th className="v2-table-th text-right text-emerald-600">正面评论</th>
                  <th className="v2-table-th text-right text-rose-600">负面评论</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="v2-table-td py-20 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                      加载中...
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="v2-table-td py-20 text-center text-slate-400 italic">
                      暂无数据，请上传报表
                    </td>
                  </tr>
                ) : (
                  data.map((row, idx) => (
                    <tr key={idx} className="v2-table-tr">
                      <td className="v2-table-td text-slate-500">{row.date}</td>
                      <td className="v2-table-td text-purple-600 font-black">{row.sku}</td>
                      <td className="v2-table-td text-right text-slate-900 font-black">{row.unique_visits?.toLocaleString()}</td>
                      <td className="v2-table-td text-right text-slate-500">{(row.total_reviews || 0).toLocaleString()}</td>
                      <td className="v2-table-td text-right text-emerald-600 font-bold">{(row.positive_reviews || 0).toLocaleString()}</td>
                      <td className="v2-table-td text-right text-rose-600 font-bold">{(row.negative_reviews || 0).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

