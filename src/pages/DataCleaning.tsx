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
      <div className="v2-card mb-6">
        <div className="v2-card-header">
          <h2 className="v2-card-title">
            <span className={`w-2.5 h-2.5 rounded-full ${badgeColor} shadow-sm`}></span>
            {title} ({orders.length})
          </h2>
        </div>
        <div className="v2-table-wrapper max-h-[400px] custom-scrollbar">
          <table className="v2-table">
            <thead className="v2-table-thead">
              <tr>
                <th className="v2-table-th">状态</th>
                <th className="v2-table-th">订单号 (Order #)</th>
                <th className="v2-table-th">订单时间</th>
                <th className="v2-table-th">SKU</th>
                <th className="v2-table-th text-center">件数</th>
                <th className="v2-table-th">买家地址</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((order) => (
                <tr key={order.order_id} className="v2-table-tr group">
                  <td className="v2-table-td">
                    {order.status === 'valid' && <span className="status-pill pill-success">有效</span>}
                    {order.status === 'cancel' && <span className="status-pill pill-danger">取消</span>}
                    {order.status === 'refund' && <span className="status-pill pill-warning">退款</span>}
                  </td>
                  <td className="v2-table-td font-mono font-bold text-sky-600">{order.order_id}</td>
                  <td className="v2-table-td text-slate-500 whitespace-nowrap">{order.order_date.substring(0, 10)}</td>
                  <td className="v2-table-td text-indigo-600 font-bold">{order.sku}</td>
                  <td className="v2-table-td text-center text-slate-900 font-bold">{order.units}</td>
                  <td className="v2-table-td text-slate-500 leading-relaxed truncate max-w-[250px]" title={order.buyer_address}>
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
    <div className="v2-page-container">
      <div className="v2-inner-container">
        {/* Header Compact */}
        <header className="v2-header">
          <div className="flex items-center space-x-4">
            <div className="v2-header-icon bg-gradient-to-br from-sky-500 to-indigo-600">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="v2-header-title">
                订单及销售数量清洗
              </h1>
              <p className="v2-header-subtitle">同步 Mercado Libre 原始数据，自动分类为有效、取消与退款</p>
            </div>
          </div>
          
          <label className="cursor-pointer bg-sky-600 hover:bg-sky-500 text-white transition-all px-5 py-2.5 rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-sky-500/20 active:scale-95 text-sm font-bold">
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <span>{isUploading ? '正在处理...' : '上传原始报表 (.xlsx)'}</span>
            <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} disabled={isUploading} />
          </label>
        </header>

        {syncStatus.message && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl flex items-center space-x-3 border shadow-sm text-sm ${
              syncStatus.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
              syncStatus.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-700' :
              'bg-sky-50 border-sky-200 text-sky-700'
            }`}
          >
            {syncStatus.type === 'success' && <CheckCircle className="w-5 h-5" />}
            {syncStatus.type === 'error' && <AlertCircle className="w-5 h-5" />}
            {!syncStatus.type && <Loader2 className="w-5 h-5 animate-spin" />}
            <span className="font-bold">{syncStatus.message}</span>
          </motion.div>
        )}

        {/* Summaries */}
        {!isLoading && data.length > 0 && (
          <div className="v2-stats-grid">
             <div className="v2-stat-card bg-white/80 border-slate-200/60 shadow-lg">
                <span className="v2-stat-label text-slate-400">导入总订单</span>
                <div className="v2-stat-value text-slate-900">{data.length.toLocaleString()}</div>
             </div>
             <div className="v2-stat-card bg-emerald-500/5 border-emerald-500/20 shadow-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="v2-stat-label text-emerald-600">有效成交量</span>
                    <div className="v2-stat-value text-emerald-600">{validOrders.length.toLocaleString()}</div>
                  </div>
                  <TrendingUp className="w-8 h-8 text-emerald-500/20" />
                </div>
             </div>
             <div className="v2-stat-card bg-rose-500/5 border-rose-500/20 shadow-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="v2-stat-label text-rose-600">取消/拦截</span>
                    <div className="v2-stat-value text-rose-600">{cancelOrders.length.toLocaleString()}</div>
                  </div>
                  <CopyX className="w-8 h-8 text-rose-500/20" />
                </div>
             </div>
             <div className="v2-stat-card bg-amber-500/5 border-amber-500/20 shadow-lg">
                <div className="flex justify-between items-center">
                  <div>
                     <span className="v2-stat-label text-amber-600">退款/退货</span>
                     <div className="v2-stat-value text-amber-600">{refundOrders.length.toLocaleString()}</div>
                  </div>
                  <PackageX className="w-8 h-8 text-amber-500/20" />
                </div>
             </div>
          </div>
        )}

        {/* Tables */}
        <div className="space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 v2-card bg-white/50">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-sky-500" />
              <p className="text-sm font-bold">正在拉取云端清洗数据...</p>
            </div>
          ) : data.length > 0 ? (
            <>
              {renderTable('有效订单明细 (Valid)', validOrders, 'bg-emerald-500')}
              {renderTable('取消订单记录 (Cancel)', cancelOrders, 'bg-rose-500')}
              {renderTable('退款订单记录 (Refund)', refundOrders, 'bg-amber-500')}
            </>
          ) : (
            <div className="py-32 text-center text-slate-400 v2-card bg-white/50 border-dashed">
              <Database className="w-16 h-16 mx-auto mb-4 opacity-10" />
              <p className="text-base font-bold">暂无清洗记录，请上传 Mercado Libre 原始报表</p>
              <p className="text-xs opacity-60 mt-2">系统将自动识别订单状态并按 SKU 进行分类统计</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

