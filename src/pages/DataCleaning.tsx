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
        if (!row || !Array.isArray(row)) continue;
        
        // Find Order # column (Spanish: # de venta, Orden #; Chinese: 订单号)
        const currentOrderIdIdx = row.findIndex(val => {
          const s = String(val).toLowerCase();
          return s.includes('order #') || s.includes('订单号') || s.includes('# de venta') || s.includes('orden #') || s.includes('订单?');
        });

        if (currentOrderIdIdx !== -1) {
          headerRowIndex = i;
          orderIdIdx = currentOrderIdIdx;
          
          // Find Order Date (Spanish: Fecha de venta, Fecha; Chinese: 销售日期, 订单时间)
          orderDateIdx = row.findIndex(val => {
            const s = String(val).toLowerCase();
            return s.includes('order date') || s.includes('订单时间') || s.includes('销售日期') || s.includes('fecha') || s.includes('销售日?');
          });
          
          // Find Units (Chinese: 件数, 单位, 数量; Spanish: Unidades, Cantidad)
          unitsIdx = row.findIndex(val => {
            const s = String(val).toLowerCase();
            return s === 'units' || s.includes('件数') || s === '单位' || s.includes('数量') || s.includes('unidades') || s.includes('cantidad');
          });
          
          // Find Address (pick the last "Address" / "地址" column usually found in ML reports)
          const addressIndices = row.map((val, idx) => {
            const s = String(val).toLowerCase();
            return (s === 'address' || s.includes('地址') || s.includes('dirección')) ? idx : -1;
          }).filter(idx => idx !== -1);
          addressIdx = addressIndices.length > 0 ? addressIndices[addressIndices.length - 1] : -1;
          
          // Find SKU (explicit match)
          skuIdx = row.findIndex(val => {
            const s = String(val).toLowerCase();
            return s === 'sku' || s === '商品编码' || s === '商品代码';
          });
          if (skuIdx === -1 && row.length > 24) skuIdx = 24; // Fallback to column Y
          
          // Find Status (Spanish: Estado; Chinese: 运输状态)
          statusIdx = row.findIndex(val => {
            const s = String(val).toLowerCase();
            return s.includes('shipment status') || s.includes('运输状态') || s.includes('estado');
          });
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
        if (statusStr.includes('cancel') || statusStr.includes('取消') || statusStr.includes('cancela')) {
            _type = 'cancel';
        } else if (statusStr.includes('return') || statusStr.includes('refund') || statusStr.includes('退款') || statusStr.includes('devolu')) {
            _type = 'refund';
        }

        // Clean up the date string (e.g. from "四月 27, 2026 01:06 AM" to "2026-04-27")
        let rawDate = orderDateIdx !== -1 && row[orderDateIdx] ? String(row[orderDateIdx]) : '';
        let cleanedDate = rawDate;
        
        // Basic extraction of Date part if it looks like "Month DD, YYYY ..."
        if (rawDate.includes(', 202')) {
          const parts = rawDate.split(',');
          if (parts.length >= 2) {
             const monthDay = parts[0].trim(); // e.g. "四月 27"
             const yearPart = parts[1].trim().split(' ')[0]; // e.g. "2026"
             
             const monthMap: {[key: string]: string} = {
               '一月': '01', '二月': '02', '三月': '03', '四月': '04', '五月': '05', '六月': '06',
               '七月': '07', '八月': '08', '九月': '09', '十月': '10', '十一月': '11', '十二月': '12',
               'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04', 'mayo': '05', 'junio': '06',
               'julio': '07', 'agosto': '08', 'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
             };

             let month = '01';
             let day = '01';
             
             Object.keys(monthMap).forEach(m => {
               if (monthDay.includes(m)) month = monthMap[m];
             });
             
             const dayMatch = monthDay.match(/\d+/);
             if (dayMatch) day = dayMatch[0].padStart(2, '0');
             
             cleanedDate = `${yearPart}-${month}-${day}`;
          }
        }

        parsedRecords.push({
          order_id: orderId,
          order_date: cleanedDate || rawDate,
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
      <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl overflow-hidden shadow-lg mb-4">
        <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between bg-slate-800/30">
          <h2 className="text-xs font-semibold text-white tracking-tight flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${badgeColor}`}></span>
            {title} ({orders.length})
          </h2>
        </div>
        <div className="overflow-x-auto max-h-[250px] custom-scrollbar">
          <table className="w-full text-[11px] text-left">
            <thead className="bg-slate-800/90 text-slate-400 tracking-wider sticky top-0 z-10 font-medium">
              <tr>
                <th className="px-4 py-2 border-b border-slate-700/50">状态</th>
                <th className="px-4 py-2 border-b border-slate-700/50">订单号 (Order #)</th>
                <th className="px-4 py-2 border-b border-slate-700/50">订单时间</th>
                <th className="px-4 py-2 border-b border-slate-700/50">SKU</th>
                <th className="px-4 py-2 border-b border-slate-700/50 text-center">件数</th>
                <th className="px-4 py-2 border-b border-slate-700/50">买家地址</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {orders.map((order) => (
                <tr key={order.order_id} className="hover:bg-slate-800/80 transition-colors">
                  <td className="px-4 py-1.5">
                    {order.status === 'valid' && <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-medium bg-emerald-500/10 text-emerald-400">有效</span>}
                    {order.status === 'cancel' && <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-medium bg-rose-500/10 text-rose-400">取消</span>}
                    {order.status === 'refund' && <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-medium bg-orange-500/10 text-orange-400">退款</span>}
                  </td>
                  <td className="px-4 py-1.5 font-mono text-sky-400">{order.order_id}</td>
                  <td className="px-4 py-1.5 text-slate-300 whitespace-nowrap">{order.order_date.substring(0, 20)}</td>
                  <td className="px-4 py-1.5 text-purple-400 font-semibold">{order.sku}</td>
                  <td className="px-4 py-1.5 text-center text-slate-300 font-bold">{order.units}</td>
                  <td className="px-4 py-1.5 text-slate-400 leading-relaxed truncate max-w-[250px]" title={order.buyer_address}>
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
        <header className="flex justify-between items-center bg-slate-900/50 backdrop-blur-md p-4 rounded-xl border border-slate-800 shadow-md">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-lg shadow-sm">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-sky-100 tracking-tight">
                订单及销售数量清洗
              </h1>
              <p className="text-[11px] text-slate-400 mt-0.5">从 Mercado Libre 订单表提取与清洗，分为有效、取消与退款</p>
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
             <div className="bg-slate-900/50 backdrop-blur border border-slate-800 p-3 rounded-xl flex flex-col justify-center shadow-sm">
                <span className="text-[10px] text-slate-500 font-medium tracking-wide uppercase mb-0.5">总订单 (Total)</span>
                <div className="text-xl font-bold text-white leading-tight">{data.length}</div>
             </div>
             <div className="bg-emerald-500/10 backdrop-blur border border-emerald-500/20 p-3 rounded-xl flex justify-between items-center shadow-sm">
                <div className="flex flex-col">
                  <span className="text-[10px] text-emerald-500/80 font-medium tracking-wide uppercase mb-0.5">有效成交 (Valid)</span>
                  <div className="text-xl font-bold text-emerald-400 leading-tight">{validOrders.length}</div>
                </div>
                <TrendingUp className="w-6 h-6 text-emerald-500/30" />
             </div>
             <div className="bg-rose-500/10 backdrop-blur border border-rose-500/20 p-3 rounded-xl flex justify-between items-center shadow-sm">
                <div className="flex flex-col">
                  <span className="text-[10px] text-rose-500/80 font-medium tracking-wide uppercase mb-0.5">取消拦截 (Cancel)</span>
                  <div className="text-xl font-bold text-rose-400 leading-tight">{cancelOrders.length}</div>
                </div>
                <CopyX className="w-6 h-6 text-rose-500/30" />
             </div>
             <div className="bg-orange-500/10 backdrop-blur border border-orange-500/20 p-3 rounded-xl flex justify-between items-center shadow-sm">
                <div className="flex flex-col">
                   <span className="text-[10px] text-orange-500/80 font-medium tracking-wide uppercase mb-0.5">退款损失 (Refund)</span>
                   <div className="text-xl font-bold text-orange-400 leading-tight">{refundOrders.length}</div>
                </div>
                <PackageX className="w-6 h-6 text-orange-500/30" />
             </div>
          </div>
        )}

        {/* Separated Tables */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 bg-slate-900/30 rounded-xl border border-slate-800">
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
            <div className="py-20 text-center text-slate-500 bg-slate-900/30 rounded-xl border border-slate-800">
              <Database className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">此表暂无数据，请上传包含订单的 Excel 表格</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
