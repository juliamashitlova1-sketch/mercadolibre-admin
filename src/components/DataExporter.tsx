import React, { useState } from 'react';
import { Download, Calendar, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format, parseISO } from 'date-fns';
import { supabase } from '../lib/supabase';

interface DataExporterProps {
  skuData: any[];
}

export default function DataExporter({ skuData }: DataExporterProps) {
  const [startDate, setStartDate] = useState(format(new Date(new Date().setDate(new Date().getDate() - 30)), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
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

      const wb = XLSX.utils.book_new();

      // Sheet 1: SKU Overview
      const skuSheetData = skuData.map(s => ({
        'SKU ID': s.sku || s.id,
        'SKU 名称': s.skuName,
        '当前库存': s.stock || 0,
        '日均销量': s.avgSalesSinceListing || 0,
        '状态': s.status || '在售'
      }));
      const wsSku = XLSX.utils.json_to_sheet(skuSheetData);
      XLSX.utils.book_append_sheet(wb, wsSku, "SKU总览");

      // Sheet 2: Daily Performance
      const dailySheetData = (rawDaily || []).map(d => ({
        '日期': d.date,
        '店铺/SKU': d.sku_id || '全店',
        '销售额 (MXN)': d.total_sales || 0,
        '订单数': d.total_orders || 0,
        '广告费 (MXN)': d.ad_spend || 0,
        '净利润 (CNY)': d.calculated_profit || 0,
      }));
      const wsDaily = XLSX.utils.json_to_sheet(dailySheetData);
      XLSX.utils.book_append_sheet(wb, wsDaily, "每日业绩");

      // Sheet 3: Fake Orders
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

      // Shared logic...
      const fileName = `MILYFLY_Export_${startDate}_to_${endDate}.xlsx`;
      XLSX.writeFile(wb, fileName);

    } catch (error) {
      console.error('Export error:', error);
      alert('导出失败，请检查数据连接。');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-full pl-3 pr-1 h-[34px] shadow-sm hover:border-sky-300 transition-all">
      <div className="flex items-center gap-1.5 text-slate-400">
        <Calendar className="w-3.5 h-3.5" />
        <input 
          type="date" 
          value={startDate} 
          onChange={(e) => setStartDate(e.target.value)}
          className="bg-transparent text-[11px] font-bold text-slate-800 outline-none border-none p-0 cursor-pointer hover:text-sky-600"
        />
        <span className="text-[10px] opacity-30">至</span>
        <input 
          type="date" 
          value={endDate} 
          onChange={(e) => setEndDate(e.target.value)}
          className="bg-transparent text-[11px] font-bold text-slate-800 outline-none border-none p-0 cursor-pointer hover:text-sky-600"
        />
      </div>
      
      <div className="w-[1px] h-3 bg-slate-100 mx-1" />
      
      <button 
        onClick={handleExport}
        disabled={isExporting}
        className="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-600 text-white px-3 h-[26px] rounded-full transition-all disabled:opacity-50"
      >
        {isExporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
        <span className="text-[11px] font-bold">导出报表</span>
      </button>
    </div>
  );
}
