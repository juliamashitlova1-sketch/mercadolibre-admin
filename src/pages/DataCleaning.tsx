import React, { useState, useEffect } from 'react';
import { Database, Upload, AlertCircle, CheckCircle, Loader2, PackageX, CopyX, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';

interface CleanedOrder {
  order_id: string;
  order_date: string;
  sku: string;
  units: number;
  status: 'valid' | 'cancel' | 'refund';
  buyer_address: string;
}

export default function DataCleaning() {
  const [data, setData] = useState<CleanedOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });

  useEffect(() => {
    fetchCloudData();
  }, []);

  const fetchCloudData = async () => {
    setIsLoading(true);
    try {
      const { data: orders, error } = await supabase
        .from('cleaned_orders')
        .select('*')
        .order('order_date', { ascending: false });
      if (error) {
        if (error.code === '42P01') {
          console.warn('cleaned_orders table is not created yet.');
          setData([]);
          return;
        }
        throw error;
      }
      if (orders) setData(orders);
    } catch (err: any) {
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  };

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
      
      let headerRowIndex = -1;
      let orderIdIdx = -1, orderDateIdx = -1, unitsIdx = -1, addressIdx = -1, skuIdx = -1;
      let statusIdx = -1;

      for (let i = 0; i < Math.min(20, rawData.length); i++) {
        const row = rawData[i];
        if (!row) continue;
        const currentOrderIdIdx = row.findIndex(val => String(val).toLowerCase().includes('order #') || String(val).includes('订单号'));
        if (currentOrderIdIdx !== -1) {
          headerRowIndex = i;
          orderIdIdx = currentOrderIdIdx;
          orderDateIdx = row.findIndex(val => String(val).toLowerCase().includes('order date') || String(val).includes('订单时间'));
          
          const unitsIndices = row.map((val, idx) => (String(val).toLowerCase() === 'units' || String(val).includes('件数')) ? idx : -1).filter(idx => idx !== -1);
          unitsIdx = unitsIndices.length > 0 ? unitsIndices[0] : -1;
          
          const addressIndices = row.map((val, idx) => (String(val).toLowerCase() === 'address' || String(val).includes('地址')) ? idx : -1).filter(idx => idx !== -1);
          addressIdx = addressIndices.length > 0 ? addressIndices[addressIndices.length - 1] : -1;
          
          skuIdx = row.findIndex(val => String(val).toLowerCase() === 'sku' || String(val) === '商品编码');
          if (skuIdx === -1 && row.length > 24) skuIdx = 24; // Fallback to column Y
          
          statusIdx = row.findIndex(val => String(val).toLowerCase().includes('shipment status'));
          if (statusIdx === -1 && row.length > 6) statusIdx = 6; // Fallback to column G
          
          break;
        }
      }

      if (headerRowIndex === -1 || orderIdIdx === -1) {
        throw new Error('未找到包含 "Order #" (订单号) 的表头行。请确保上传了正确的 Mercado Libre 报表。');
      }

      const parsedRecords: CleanedOrder[] = [];

      for (let i = headerRowIndex + 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || !row[orderIdIdx]) continue;
        
        const orderId = String(row[orderIdIdx]).trim();
        if (!orderId || orderId.toLowerCase() === 'total' || isNaN(Number(orderId))) continue;

        // Parse status logic from Shipment status (Column G)
        let _type: 'valid' | 'cancel' | 'refund' = 'valid';
        
        const statusStr = statusIdx !== -1 && row[statusIdx] ? String(row[statusIdx]).toLowerCase() : '';
        if (statusStr.includes('cancel')) {
            _type = 'cancel';
        } else if (statusStr.includes('return') || statusStr.includes('refund')) {
            _type = 'refund';
        }

        parsedRecords.push({
          order_id: orderId,
          order_date: orderDateIdx !== -1 && row[orderDateIdx] ? String(row[orderDateIdx]) : '',
          sku: skuIdx !== -1 && row[skuIdx] ? String(row[skuIdx]) : 'N/A',
          units: unitsIdx !== -1 && row[unitsIdx] ? parseInt(String(row[unitsIdx])) : 1,
          status: _type,
          buyer_address: addressIdx !== -1 && row[addressIdx] ? String(row[addressIdx]) : '',
        });
      }

      if (parsedRecords.length === 0) {
        throw new Error('未提取到有效的数据行，请检查表格内容。');
      }

      setSyncStatus({ type: null, message: `解析成功，共 ${parsedRecords.length} 条数据，正在同步...` });
      
      const { error } = await supabase
        .from('cleaned_orders')
        .upsert(parsedRecords, { onConflict: 'order_id' });

      if (error) {
        if (error.message.includes('column') || error.message.includes('does not exist')) {
            throw new Error('数据库 schema 需要更新！请在终端运行 cleaned_orders_migration_v2.sql 脚本以增加 sku 和 status 字段。');
        }
        throw error;
      };

      setSyncStatus({ type: 'success', message: `成功同步 ${parsedRecords.length} 条数据！` });
      
      fetchCloudData();
    } catch (err: any) {
      setSyncStatus({ type: 'error', message: '处理错误: ' + err.message });
      console.error(err);
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const validOrders = data.filter(d => d.status === 'valid');
  const cancelOrders = data.filter(d => d.status === 'cancel');
  const refundOrders = data.filter(d => d.status === 'refund');

  const renderTable = (title: string, orders: CleanedOrder[], badgeColor: string) => {
    if (orders.length === 0) return null;
    return (
      <div className="bg-white/50 backdrop-blur-xl border border-white/40 rounded-xl overflow-hidden shadow-lg mb-4">
        <div className="px-4 py-2 border-b border-white/30 flex items-center justify-between bg-white/30">
          <h2 className="text-xs font-semibold text-slate-800 tracking-tight flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${badgeColor}`}></span>
            {title} ({orders.length})
          </h2>
        </div>
        <div className="overflow-x-auto max-h-[250px] custom-scrollbar">
          <table className="w-full text-[11px] text-left">
            <thead className="bg-slate-100/70 text-slate-500 tracking-wider sticky top-0 z-10 font-medium">
              <tr>
                <th className="px-4 py-2 border-b border-slate-200/50">状态</th>
                <th className="px-4 py-2 border-b border-slate-200/50">订单号 (Order #)</th>
                <th className="px-4 py-2 border-b border-slate-200/50">订单时间</th>
                <th className="px-4 py-2 border-b border-slate-200/50">SKU</th>
                <th className="px-4 py-2 border-b border-slate-200/50 text-center">件数</th>
                <th className="px-4 py-2 border-b border-slate-200/50">买家地址</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/50">
              {orders.map((order) => (
                <tr key={order.order_id} className="hover:bg-slate-100/50 transition-colors">
                  <td className="px-4 py-1.5">
                    {order.status === 'valid' && <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-medium bg-emerald-500/10 text-emerald-600">有效</span>}
                    {order.status === 'cancel' && <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-medium bg-rose-500/10 text-rose-600">取消</span>}
                    {order.status === 'refund' && <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-medium bg-orange-500/10 text-orange-600">退款</span>}
                  </td>
                  <td className="px-4 py-1.5 font-mono text-sky-600">{order.order_id}</td>
                  <td className="px-4 py-1.5 text-slate-700 whitespace-nowrap">{order.order_date.substring(0, 20)}</td>
                  <td className="px-4 py-1.5 text-purple-600 font-semibold">{order.sku}</td>
                  <td className="px-4 py-1.5 text-center text-slate-700 font-bold">{order.units}</td>
                  <td className="px-4 py-1.5 text-slate-600 leading-relaxed truncate max-w-[250px]" title={order.buyer_address}>
                    {order.buyer_address}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto min-h-screen py-6 px-4 bg-transparent custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header Compact */}
        <header className="flex justify-between items-center bg-white/60 backdrop-blur-xl p-4 rounded-xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-lg shadow-sm">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                订单及销售数量清洗
              </h1>
              <p className="text-[11px] text-slate-500 mt-0.5">从 Mercado Libre 订单表提取与清洗，分为有效、取消与退款</p>
            </div>
          </div>
          
          <label className="cursor-pointer bg-sky-600 hover:bg-sky-500 text-white transition-all px-4 py-2 rounded-lg flex items-center justify-center space-x-2 shadow-md active:scale-95 text-xs">
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <span className="font-medium">{isUploading ? '处理中...' : '上传表格 (.xlsx)'}</span>
            <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} disabled={isUploading} />
          </label>
        </header>

        {syncStatus.message && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }} 
            animate={{ opacity: 1, scale: 1 }}
            className={`p-3 rounded-lg flex items-center space-x-2 border shadow-sm text-xs ${
              syncStatus.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
              syncStatus.type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
              'bg-sky-500/10 border-sky-500/20 text-sky-400'
            }`}
          >
            {syncStatus.type === 'success' && <CheckCircle className="w-4 h-4" />}
            {syncStatus.type === 'error' && <AlertCircle className="w-4 h-4" />}
            {!syncStatus.type && <Loader2 className="w-4 h-4 animate-spin" />}
            <span className="font-medium">{syncStatus.message}</span>
          </motion.div>
        )}

        {/* Summaries Compact */}
        {!isLoading && data.length > 0 && (
          <div className="grid grid-cols-4 gap-3">
             <div className="bg-white/50 backdrop-blur-xl border border-white/40 p-3 rounded-xl flex flex-col justify-center shadow-sm">
                <span className="text-[10px] text-slate-500 font-medium tracking-wide uppercase mb-0.5">总订单 (Total)</span>
                <div className="text-xl font-bold text-slate-900 leading-tight">{data.length}</div>
             </div>
             <div className="bg-emerald-500/10 backdrop-blur border border-emerald-500/20 p-3 rounded-xl flex justify-between items-center shadow-sm">
                <div className="flex flex-col">
                  <span className="text-[10px] text-emerald-600 font-medium tracking-wide uppercase mb-0.5">有效成交 (Valid)</span>
                  <div className="text-xl font-bold text-emerald-600 leading-tight">{validOrders.length}</div>
                </div>
                <TrendingUp className="w-6 h-6 text-emerald-500/30" />
             </div>
             <div className="bg-rose-500/10 backdrop-blur border border-rose-500/20 p-3 rounded-xl flex justify-between items-center shadow-sm">
                <div className="flex flex-col">
                  <span className="text-[10px] text-rose-600 font-medium tracking-wide uppercase mb-0.5">取消拦截 (Cancel)</span>
                  <div className="text-xl font-bold text-rose-600 leading-tight">{cancelOrders.length}</div>
                </div>
                <CopyX className="w-6 h-6 text-rose-500/30" />
             </div>
             <div className="bg-orange-500/10 backdrop-blur border border-orange-500/20 p-3 rounded-xl flex justify-between items-center shadow-sm">
                <div className="flex flex-col">
                   <span className="text-[10px] text-orange-600 font-medium tracking-wide uppercase mb-0.5">退款损失 (Refund)</span>
                   <div className="text-xl font-bold text-orange-600 leading-tight">{refundOrders.length}</div>
                </div>
                <PackageX className="w-6 h-6 text-orange-500/30" />
             </div>
          </div>
        )}

        {/* Separated Tables */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 bg-white/40 backdrop-blur-xl rounded-xl border border-white/40">
              <Loader2 className="w-8 h-8 animate-spin mb-4" />
              <p className="text-sm">加载云端数据中...</p>
            </div>
          ) : data.length > 0 ? (
            <>
              {renderTable('有效订单 (Valid)', validOrders, 'bg-emerald-500')}
              {renderTable('取消订单 (Cancel)', cancelOrders, 'bg-rose-500')}
              {renderTable('退款订单 (Refund)', refundOrders, 'bg-orange-500')}
            </>
          ) : (
            <div className="py-20 text-center text-slate-500 bg-white/40 backdrop-blur-xl rounded-xl border border-white/40">
              <Database className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">此表暂无数据，请上传包含订单的 Excel 表格</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
