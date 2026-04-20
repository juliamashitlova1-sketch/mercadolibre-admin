import React, { useState } from 'react';
import { Download, Calendar, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format, parseISO } from 'date-fns';
import { supabase } from '../lib/supabase';

interface DataExporterProps {
  skuData: any[];
  dailyData: any[];
  fakeOrders: any[];
  cargoDamage: any[];
  operationLogs: any[];
}

export default function DataExporter({ skuData }: DataExporterProps) {
  const [startDate, setStartDate] = useState(format(new Date(new Date().setDate(new Date().getDate() - 30)), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // 1. Fetch Full Data from Supabase for the specified range
      // We do this directly to bypass UI limits (like the 30-day dashboard limit)
      
      const [
        { data: rawDaily },
        { data: rawFakeOrders },
        { data: rawCargoDamage },
        { data: rawLogs },
        { data: rawMetadata }
      ] = await Promise.all([
        supabase.from('daily_stats').select('*').gte('date', startDate).lte('date', endDate).order('date', { ascending: true }),
        supabase.from('fake_orders').select('*').gte('date', startDate).lte('date', endDate).order('date', { ascending: true }),
        supabase.from('cargo_damage').select('*').gte('date', startDate).lte('date', endDate).order('date', { ascending: true }),
        supabase.from('operation_logs').select('*').gte('date', startDate).lte('date', endDate).order('date', { ascending: true }),
        supabase.from('sku_metadata').select('*')
      ]);

      const metaMap: Record<string, string> = {};
      rawMetadata?.forEach(m => { metaMap[m.sku] = m.name; });

      // 2. Prepare Sheets
      const wb = XLSX.utils.book_new();

      // Sheet 1: SKU Overview
      const skuSheetData = skuData.map(s => ({
        'SKU ID': s.sku || s.id,
        'SKU 名称': s.skuName,
        '当前库存': s.stock || 0,
        '日均销量': s.avgSalesSinceListing || 0,
        '创建时间': s.listedAt || '-'
      }));
      const wsSku = XLSX.utils.json_to_sheet(skuSheetData);
      XLSX.utils.book_append_sheet(wb, wsSku, "SKU总览");

      // Sheet 2: Daily Performance (All matching records)
      const dailySheetData = (rawDaily || []).map(d => ({
        '日期': d.date,
        '店铺/SKU': d.sku_id || '全店',
        '销售额 (MXN)': d.total_sales || 0,
        '订单数': d.total_orders || 0,
        '广告费 (MXN)': d.ad_spend || 0,
        '广告占比': d.total_sales > 0 ? ((d.ad_spend / d.total_sales) * 100).toFixed(2) + '%' : '0%',
        '净利润 (CNY)': d.calculated_profit || 0,
      }));
      const wsDaily = XLSX.utils.json_to_sheet(dailySheetData);
      XLSX.utils.book_append_sheet(wb, wsDaily, "每日业绩");

      // Sheet 3: Fake Orders (测评)
      const fakeSheetData = (rawFakeOrders || []).map(d => ({
        '日期': d.date,
        'SKU': d.sku,
        '产品名称': d.sku_name || metaMap[d.sku] || '-',
        '测评费 (CNY)': d.review_fee_cny || 0,
        '回款 (USD)': d.refund_amount_usd || 0,
        '实际损益 (CNY)': (Number(d.review_fee_cny) || 0) - ((Number(d.refund_amount_usd) || 0) * 7.2)
      }));
      const wsFake = XLSX.utils.json_to_sheet(fakeSheetData);
      XLSX.utils.book_append_sheet(wb, wsFake, "刷单支出");

      // Sheet 4: Cargo Damage (货损)
      const damageSheetData = (rawCargoDamage || []).map(d => ({
        '日期': d.date,
        'SKU': d.sku,
        '产品名称': d.sku_name || metaMap[d.sku] || '-',
        '数量': d.quantity || 0,
        'SKU货值 (CNY)': d.sku_value_cny || 0,
        '总损失 (CNY)': (Number(d.quantity) || 0) * (Number(d.sku_value_cny) || 0),
        '原因': d.reason || '-'
      }));
      const wsDamage = XLSX.utils.json_to_sheet(damageSheetData);
      XLSX.utils.book_append_sheet(wb, wsDamage, "货损记录");

      // Sheet 5: Operation Logs
      const logSheetData = (rawLogs || []).map(d => ({
        '日期': d.date,
        'SKU': d.sku || '-',
        '操作项': d.action || '-',
        '详细内容': d.details || '-',
        '操作人': d.operator || 'Admin'
      }));
      const wsLogs = XLSX.utils.json_to_sheet(logSheetData);
      XLSX.utils.book_append_sheet(wb, wsLogs, "操作日志");

      // 3. Download
      const fileName = `MILYFLY_FullReport_${startDate}_to_${endDate}.xlsx`;
      XLSX.writeFile(wb, fileName);

    } catch (error) {
      console.error('Export error:', error);
      alert('导出失败，请检查数据连接。');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 bg-white border-2 border-sky-400/30 rounded-2xl p-4 shadow-xl hover:border-sky-500 transition-all">
      <div className="flex flex-col gap-2.5">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-sky-500" /> 报表日期范围选择
        </label>
        
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 w-4">从</span>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="flex-1 bg-slate-100/50 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-900 outline-none border border-slate-200 focus:border-sky-400 focus:bg-white transition-all cursor-pointer"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 w-4">至</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="flex-1 bg-slate-100/50 rounded-xl px-3 py-2 text-[11px] font-bold text-slate-900 outline-none border border-slate-200 focus:border-sky-400 focus:bg-white transition-all cursor-pointer"
            />
          </div>
        </div>
      </div>
      
      <div className="w-full h-[1px] bg-sky-50" />
      
      <button 
        onClick={handleExport}
        disabled={isExporting}
        className="w-full py-2.5 bg-sky-500 hover:bg-sky-600 active:scale-95 text-white rounded-xl shadow-lg shadow-sky-100 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
      >
        {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        <span className="text-xs font-black">导出 Excel 报表</span>
      </button>
    </div>
  );
}
