import { useState, useMemo } from 'react';
import { ShoppingBag, FileCheck, AlertCircle, RefreshCcw, Download, CheckCircle2, CloudUpload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { parseMercadoLibreExcel, ParsingSummary, CleanedOrder } from '../utils/mercadoLibreEngine';
import FileUpload from '../components/FileUpload';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '../lib/supabase';
import { useOutletContext } from 'react-router-dom';

interface ContextType {
  refreshSkuData: () => void;
}

export default function OrdersDashboard() {
  const { refreshSkuData } = useOutletContext<ContextType>();
  const [summary, setSummary] = useState<ParsingSummary | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const handleFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const bstr = e.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      
      try {
        const result = parseMercadoLibreExcel(data as any[][]);
        setSummary(result);
        setSyncStatus(null);
      } catch (err: any) {
        setSyncStatus({ type: 'error', message: err.message });
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSyncToCloud = async () => {
    if (!summary || !summary.data.length) return;
    setIsSyncing(true);
    setSyncStatus(null);

    try {
      // 1. Group data by SKU and Date for aggregation
      // Note: dates in Mercado Libre reports might need normalization
      const aggregates: Record<string, { orders: number, sales: number }> = {};
      
      summary.data.forEach(order => {
        if (order.status === 'Valid') {
          // Normalize date format (YYYY-MM-DD)
          // ML date format might vary, simple normalization here
          const date = new Date(order.date).toISOString().split('T')[0];
          const key = `${order.sku}_${date}`;
          
          if (!aggregates[key]) aggregates[key] = { orders: 0, sales: 0 };
          aggregates[key].orders += 1;
          aggregates[key].sales += order.amount;
        }
      });

      // 2. Upsert aggregated data to Supabase (sku_stats)
      const upsertPromises = Object.entries(aggregates).map(async ([key, val]) => {
        const [sku, date] = key.split('_');
        const docId = `${sku}_${date}`;
        
        // Fetch existing data to preserve stock etc if needed
        // But for simplicity, we'll just upsert the orders/sales
        // In a real app, you might want to only update orders/sales columns
        const { error } = await supabase.from('sku_stats').upsert({
          doc_id: docId,
          sku: sku,
          date: date,
          orders: val.orders,
          sales: val.sales,
          updated_at: new Date().toISOString()
        }, { onConflict: 'doc_id' });

        if (error) throw error;
      });

      await Promise.all(upsertPromises);
      
      setSyncStatus({ type: 'success', message: `成功同步 ${Object.keys(aggregates).length} 条日期记录到云端。` });
      refreshSkuData();
    } catch (err: any) {
      console.error('Sync failed:', err);
      setSyncStatus({ type: 'error', message: `同步失败: ${err.message}` });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto py-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 font-heading">订单解析与清洗大盘</h2>
          <p className="text-slate-500 text-sm mt-1">上传 Mercado Libre 原始 Excel 报表，自动解析有效销售、取消与退款。</p>
        </div>
        <div className="flex items-center gap-2">
           <div className="bg-white/50 backdrop-blur border border-slate-200 px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-mono font-bold text-slate-600 shadow-sm">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
             PARSING ENGINE V1.0
           </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card className="glass-panel border-none shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-bl-full pointer-events-none" />
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Download className="w-4 h-4 text-sky-500" /> 数据导入
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FileUpload onFileSelect={handleFileSelect} />
              
              {summary && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-4 rounded-xl bg-slate-50/50 border border-slate-100 flex flex-col gap-4"
                >
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">解析结果摘要</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500">有效订单</span>
                      <span className="text-lg font-black text-emerald-600">{summary.validOrders}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500">累计销售 (USD)</span>
                      <span className="text-lg font-black text-slate-800">${summary.totalAmountUSD.toFixed(1)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500">取消订单</span>
                      <span className="text-lg font-black text-rose-500">{summary.canceledOrders}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500">已退款额</span>
                      <span className="text-lg font-black text-amber-500">{summary.refundedOrders}</span>
                    </div>
                  </div>
                  
                  <button 
                    onClick={handleSyncToCloud}
                    disabled={isSyncing}
                    className="w-full btn-primary flex items-center justify-center gap-2 mt-2 h-11"
                  >
                    {isSyncing ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
                    {isSyncing ? '正在同步到云端...' : '同步清洗结果到云端'}
                  </button>
                  
                  {syncStatus && (
                    <div className={`text-[11px] font-bold p-2.5 rounded-lg flex items-center gap-2 ${
                      syncStatus.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                    }`}>
                      {syncStatus.type === 'success' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                      {syncStatus.message}
                    </div>
                  )}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="glass-panel border-none shadow-xl min-h-[400px] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-500" /> 洗后订单流水
              </CardTitle>
              {summary && (
                <div className="text-[10px] font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-wider">
                  共计 {summary.data.length} 条记录
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0 flex-1">
              <div className="overflow-auto max-h-[600px] custom-scrollbar">
                <Table>
                  <TableHeader className="bg-slate-50 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="text-[10px] uppercase font-black">订单号</TableHead>
                      <TableHead className="text-[10px] uppercase font-black">SKU</TableHead>
                      <TableHead className="text-[10px] uppercase font-black">状态</TableHead>
                      <TableHead className="text-[10px] uppercase font-black">日期</TableHead>
                      <TableHead className="text-[10px] uppercase font-black text-right">金额 (USD)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!summary ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-32 text-slate-300">
                          <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-20" />
                          <p className="text-sm font-medium">请在左侧上传报表以查看数据</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      summary.data.map((order, idx) => (
                        <TableRow key={`${order.orderId}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                          <TableCell className="font-mono text-[11px] font-bold text-slate-600">{order.orderId}</TableCell>
                          <TableCell>
                            <span className="text-[11px] font-black text-sky-600 tracking-wider">
                              {order.sku || 'N/A'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              order.status === 'Valid' ? 'bg-emerald-50 text-emerald-600' :
                              order.status === 'Canceled' ? 'bg-rose-50 text-rose-600' :
                              'bg-amber-50 text-amber-600'
                            }`}>
                              {order.status === 'Valid' ? '有效订单' : order.status === 'Canceled' ? '已取消' : '已退款'}
                            </span>
                          </TableCell>
                          <TableCell className="text-[11px] text-slate-500 font-mono">
                            {new Date(order.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-slate-800">
                            ${order.amount.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
