import React, { useState } from 'react';
import { Download, Calendar, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format, isWithinInterval, parseISO } from 'date-fns';

interface DataExporterProps {
  skuData: any[];
  dailyData: any[];
  fakeOrders: any[];
  cargoDamage: any[];
  operationLogs: any[];
}

export default function DataExporter({ skuData, dailyData, fakeOrders, cargoDamage, operationLogs }: DataExporterProps) {
  const [startDate, setStartDate] = useState(format(new Date(new Date().setDate(new Date().getDate() - 30)), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    setIsExporting(true);
    try {
      const start = parseISO(startDate);
      const end = parseISO(endDate);

      // 1. Filter Data by Date Range
      const filteredDaily = dailyData.filter(d => {
        const dDate = parseISO(d.date);
        return isWithinInterval(dDate, { start, end });
      });

      const filteredFakeOrders = fakeOrders.filter(d => {
        const dDate = parseISO(d.date);
        return isWithinInterval(dDate, { start, end });
      });

      const filteredCargoDamage = cargoDamage.filter(d => {
        const dDate = parseISO(d.date);
        return isWithinInterval(dDate, { start, end });
      });

      const filteredLogs = operationLogs.filter(d => {
        const dDate = parseISO(d.date || d.created_at);
        return isWithinInterval(dDate, { start, end });
      });

      // 2. Prepare Sheets
      const wb = XLSX.utils.book_new();

      // Sheet 1: SKU Overview
      const skuSheetData = skuData.map(s => ({
        'SKU ID': s.id,
        'SKU 名称': s.skuName,
        '当前库存': s.stock || 0,
        '库容健康': s.stockHealth || '正常',
        '日均销量': s.avgSalesSinceListing || 0,
        '创建时间': s.createdAt ? format(parseISO(s.createdAt), 'yyyy-MM-dd HH:mm') : '-'
      }));
      const wsSku = XLSX.utils.json_to_sheet(skuSheetData);
      XLSX.utils.book_append_sheet(wb, wsSku, "SKU总览");

      // Sheet 2: Daily Performance
      const dailySheetData = filteredDaily.map(d => ({
        '日期': d.date,
        'SKU': d.sku_id || '全店',
        '销量 (MXN)': d.sales_mxn || 0,
        '订单数': d.orders || 0,
        '广告费 (MXN)': d.ads_mxn || 0,
        '广告占比': d.sales_mxn > 0 ? ((d.ads_mxn / d.sales_mxn) * 100).toFixed(2) + '%' : '0%',
        '净利润 (CNY)': d.profit_cny || 0,
        '利润率': d.sales_mxn > 0 ? ((d.profit_cny / (d.sales_mxn * 0.365)) * 100).toFixed(2) + '%' : '0%',
      }));
      const wsDaily = XLSX.utils.json_to_sheet(dailySheetData);
      XLSX.utils.book_append_sheet(wb, wsDaily, "每日业绩");

      // Sheet 3: Fake Orders (刷单)
      const fakeSheetData = filteredFakeOrders.map(d => ({
        '日期': d.date,
        'SKU': d.skuId,
        'SKU 名称': d.skuName,
        '测评费用 (CNY)': d.testFeeCNY || 0,
        '回款金额 (USD)': d.refundUSD || 0,
        '实际成本 (CNY)': (d.testFeeCNY || 0) - (d.refundUSD || 0) * 7.24
      }));
      const wsFake = XLSX.utils.json_to_sheet(fakeSheetData);
      XLSX.utils.book_append_sheet(wb, wsFake, "刷单支出");

      // Sheet 4: Cargo Damage (货损)
      const damageSheetData = filteredCargoDamage.map(d => ({
        '日期': d.date,
        'SKU': d.skuId,
        'SKU 名称': d.skuName,
        '数量': d.quantity || 0,
        '原因': d.reason || '-',
        'SKU货值 (CNY)': d.skuValueCNY || 0,
        '总损失 (CNY)': (d.quantity || 0) * (d.skuValueCNY || 0)
      }));
      const wsDamage = XLSX.utils.json_to_sheet(damageSheetData);
      XLSX.utils.book_append_sheet(wb, wsDamage, "货损记录");

      // Sheet 5: Operation Logs (操作日志)
      const logSheetData = filteredLogs.map(d => ({
        '时间': d.date || format(parseISO(d.created_at), 'yyyy-MM-dd'),
        'SKU': d.sku_id || '-',
        '操作内容': d.content || '-',
        '记录人': d.operator || '管理员'
      }));
      const wsLogs = XLSX.utils.json_to_sheet(logSheetData);
      XLSX.utils.book_append_sheet(wb, wsLogs, "操作日志");

      // 3. Download File
      const fileName = `MILYFLY_Export_${startDate}_to_${endDate}.xlsx`;
      XLSX.writeFile(wb, fileName);

    } catch (error) {
      console.error('Export error:', error);
      alert('导出失败，请检查数据。');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-full px-4 h-[32px] shadow-sm ml-2">
      <div className="flex items-center gap-2 text-slate-500">
        <Calendar className="w-3 h-3" />
        <input 
          type="date" 
          value={startDate} 
          onChange={(e) => setStartDate(e.target.value)}
          className="bg-transparent text-[10px] font-bold outline-none border-none p-0 cursor-pointer hover:text-sky-600"
        />
        <span className="text-[10px] opacity-40">至</span>
        <input 
          type="date" 
          value={endDate} 
          onChange={(e) => setEndDate(e.target.value)}
          className="bg-transparent text-[10px] font-bold outline-none border-none p-0 cursor-pointer hover:text-sky-600"
        />
      </div>
      
      <div className="w-[1px] h-3 bg-slate-200" />
      
      <button 
        onClick={handleExport}
        disabled={isExporting}
        className="flex items-center gap-1.5 text-sky-600 hover:text-sky-700 disabled:opacity-50 transition-colors"
      >
        {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
        <span className="text-[11px] font-bold whitespace-nowrap">导出数据</span>
      </button>
    </div>
  );
}
