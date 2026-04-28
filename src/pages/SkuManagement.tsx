import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { OperationLog } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Edit2, Trash2, X, Save, Image as ImageIcon, 
  ChevronDown, ChevronUp, TrendingUp, AlertTriangle, 
  Activity, Eye, Loader2, PackageX, MousePointer2, 
  BarChart3, RefreshCw, Download
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend, AreaChart, Area 
} from 'recharts';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import SkuAiAnalysis from '../components/SkuAiAnalysis';

import { supabase } from '../lib/supabase';

export default function SkuManagement() {

  const [skus, setSkus] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const { operationLogs } = useOutletContext<any>() || { operationLogs: [] };

  useEffect(() => {
    fetchCloudData();
    fetchAuxiliaryData();
  }, []);

  const fetchCloudData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('skus')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Map database fields to form field names if they differ
      const mappedData = (data || []).map(item => ({
        ...item,
        costRMB: item.cost_rmb,
        priceMXN: item.price_mxn,
        productName: item.product_name,
        imageUrl: item.image_url,
        replenishInventory: item.replenish_inventory,
        listedDate: item.listed_date,
        status: item.status || '活跃中'
      }));
      
      setSkus(mappedData);
    } catch (err) {
      console.error('Error fetching cloud SKUs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [expandedIndex, setExpandedIndex] = useState(null); // Tracks the currently expanded SKU row
  
  // Load Mercado Libre Data for Analytics
  const [mlData, setMlData] = useState<any>({ validSales: [] });
  const [opsData, setOpsData] = useState<any[]>([]);
  const [visitsHistory, setVisitsHistory] = useState<any>({});
  const [adsHistory, setAdsHistory] = useState<any>({});
  const [isLoadingAux, setIsLoadingAux] = useState(true);

  const fetchAuxiliaryData = async () => {
    setIsLoadingAux(true);
    try {
      // 1. Fetch Sales Data (Cleaned Orders)
      const { data: sales, error: salesError } = await supabase.from('cleaned_orders').select('*');
      if (salesError) throw salesError;
      
      const formattedMlData = {
        validSales: sales.filter(s => s.status === 'valid').map(s => ({ ...s, _sku: s.sku, _date: s.order_date, _units: s.units })),
        cancellations: sales.filter(s => s.status === 'cancel').map(s => ({ ...s, _sku: s.sku, _date: s.order_date, _units: s.units })),
        refunds: sales.filter(s => s.status === 'refund').map(s => ({ ...s, _sku: s.sku, _date: s.order_date, _units: s.units }))
      };
      setMlData(formattedMlData);

      // 2. Fetch Visits
      const { data: visits, error: visitsError } = await supabase.from('sku_visits').select('*');
      if (visitsError) throw visitsError;
      // Convert flat array to date-keyed object for component logic
      const visitsObj = {};
      visits.forEach(v => {
        const d = new Date(v.date);
        const dateKey = isNaN(d.getTime()) ? v.date : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (!visitsObj[dateKey]) visitsObj[dateKey] = { skuData: [] };
        visitsObj[dateKey].skuData.push({ sku: String(v.sku).trim().toUpperCase(), uniqueVisits: v.unique_visits });
      });
      setVisitsHistory(visitsObj);

      // 3. Fetch Ads
      const { data: ads, error: adsError } = await supabase.from('sku_ads').select('*');
      if (adsError) throw adsError;
      const adsObj = {};
      ads.forEach(a => {
        const d = new Date(a.date);
        const dateKey = isNaN(d.getTime()) ? a.date : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (!adsObj[dateKey]) adsObj[dateKey] = {};
        adsObj[dateKey][String(a.sku).trim().toUpperCase()] = { 
          adOrders: a.ad_orders, 
          adSpend: a.ad_spend,
          clicks: a.clicks,
          impressions: a.impressions
        };
      });
      setAdsHistory(adsObj);

      // 4. Operations are now handled by operationLogs from context
      setOpsData([]); // Clear local opsData as we use the context one

    } catch (err) {
      console.error('Error fetching local aux data:', err);
    } finally {
      setIsLoadingAux(false);
    }
  };

  const getSkuVisitForDate = (skuCode, dateKey) => {
    const snapshot = visitsHistory?.[dateKey];
    if (!snapshot?.skuData) return null;
    const searchSku = String(skuCode || '').trim().toUpperCase();
    return snapshot.skuData.find(v => v.sku === searchSku) || null;
  };

  const getSkuAdsForDate = (skuCode, dateKey) => {
    const searchSku = String(skuCode || '').trim().toUpperCase();
    return adsHistory?.[dateKey]?.[searchSku] || null;
  };

  const handleStatusChange = async (skuCode, newStatus) => {
    try {
      const { error } = await supabase
        .from('skus')
        .update({ status: newStatus })
        .eq('sku', skuCode);
      
      if (error) throw error;
      
      // Update local state
      setSkus(prev => prev.map(s => s.sku === skuCode ? { ...s, status: newStatus } : s));
    } catch (err) {
      alert('状态更新失败: ' + err.message);
    }
  };

  const [selectedVisitDate, setSelectedVisitDate] = useState(null);

  // Precompute overall metrics per SKU for inventory calculations
  const globalSkuMetrics = useMemo(() => {
    const metrics = {};
    if (!mlData?.validSales) return metrics;
    mlData.validSales.forEach(entry => {
      const sku = entry._sku;
      if (!sku) return;
      if (!metrics[sku]) metrics[sku] = { totalUnits: 0 };
      metrics[sku].totalUnits += parseInt(entry._units, 10) || 1;
    });
    return metrics;
  }, [mlData]);

  // Helper Memoized function to get daily analytics for a SKU
  const getSkuDailyAnalytics = (skuCode) => {
    if (!mlData) return [];
    
    const dailyMap = {};
    
    // Group helper
    const processEntries = (entries, type) => {
      if (!entries) return;
      const searchSku = String(skuCode || '').trim().toUpperCase();
      entries.forEach(entry => {
        if (String(entry._sku || '').trim().toUpperCase() === searchSku) {
          let rawDate = String(entry._date || 'Unknown Date').trim();
          let dateKey = rawDate;
          
          if (rawDate !== 'Unknown Date') {
             const d = new Date(rawDate);
             if (!isNaN(d.getTime())) {
               dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
             } else {
               // Fallback: strip time roughly
               dateKey = rawDate.replace(/\s+\d{1,2}:\d{2}.*/, '').trim() || rawDate;
             }
          }
          if (!dailyMap[dateKey]) {
            dailyMap[dateKey] = { date: dateKey, salesCount: 0, unitsCount: 0, salesMxn: 0, cancelCount: 0, cancelUnits: 0, refundCount: 0, refundUnits: 0, lossUsd: 0 };
          }
          
          const u = parseInt(entry._units, 10) || 1;
          
          if (type === 'valid') {
            dailyMap[dateKey].salesCount++;
            dailyMap[dateKey].unitsCount += u;
            // Note: salesMxn/lossUsd will be 0 as cleaned_orders doesn't store price/loss yet
          } else if (type === 'cancel') {
            dailyMap[dateKey].cancelCount++;
            dailyMap[dateKey].cancelUnits += u;
          } else if (type === 'refund') {
            dailyMap[dateKey].refundCount++;
            dailyMap[dateKey].refundUnits += u;
          }
        }
      });
    };

    processEntries(mlData.validSales, 'valid');
    processEntries(mlData.cancellations, 'cancel');
    processEntries(mlData.refunds, 'refund');

    // Also include dates that have visits but no sales
    if (visitsHistory) {
      const searchSku = String(skuCode || '').trim().toUpperCase();
      Object.keys(visitsHistory).forEach(dateKey => {
        const snapshot = visitsHistory[dateKey];
        if (snapshot.skuData?.some(v => v.sku === searchSku)) {
          if (!dailyMap[dateKey]) {
            dailyMap[dateKey] = { date: dateKey, salesCount: 0, unitsCount: 0, salesMxn: 0, cancelCount: 0, cancelUnits: 0, refundCount: 0, refundUnits: 0, lossUsd: 0 };
          }
        }
      });
    }

    // Also include dates that have ads data but no sales
    if (adsHistory) {
      const searchSku = String(skuCode || '').trim().toUpperCase();
      Object.keys(adsHistory).forEach(dateKey => {
        if (adsHistory[dateKey][searchSku]) {
          if (!dailyMap[dateKey]) {
            dailyMap[dateKey] = { date: dateKey, salesCount: 0, unitsCount: 0, salesMxn: 0, cancelCount: 0, cancelUnits: 0, refundCount: 0, refundUnits: 0, lossUsd: 0 };
          }
        }
      });
    }

    // New: Fill gaps to ensure a continuous timeline from the earliest data point until today
    const dates = Object.keys(dailyMap).map(d => new Date(d).getTime());
    if (dates.length > 0) {
      const minDate = new Date(Math.min(...dates));
      const today = new Date();
      // Set to midnight for easier comparison
      minDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      
      const current = new Date(minDate);
      while (current <= today) {
        const dateKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
        if (!dailyMap[dateKey]) {
          dailyMap[dateKey] = { date: dateKey, salesCount: 0, unitsCount: 0, salesMxn: 0, cancelCount: 0, cancelUnits: 0, refundCount: 0, refundUnits: 0, lossUsd: 0 };
        }
        current.setDate(current.getDate() + 1);
      }
    }
    
    // Convert to sorted array
    return Object.values(dailyMap).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };
  
  const initialFormState = {
    sku: '',
    productName: '',
    imageUrl: '',
    costRMB: '',
    priceMXN: '',
    inventory: '',
    replenishInventory: '', // Added replenishment inventory
    listedDate: new Date().toISOString().split('T')[0],
    status: '活跃中'
  };
  
  const [formData, setFormData] = useState(initialFormState);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openForm = (index = null) => {
    if (index !== null) {
      setEditingIndex(index);
      setFormData(skus[index]);
    } else {
      setEditingIndex(null);
      setFormData(initialFormState);
    }
    setIsModalOpen(true);
  };

  const closeForm = () => {
    setIsModalOpen(false);
    setEditingIndex(null);
    setFormData(initialFormState);
  };

  const saveSku = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        sku: formData.sku,
        product_name: formData.productName,
        image_url: formData.imageUrl,
        cost_rmb: formData.costRMB,
        price_mxn: formData.priceMXN,
        inventory: formData.inventory,
        replenish_inventory: formData.replenishInventory || 0,
        listed_date: formData.listedDate,
        status: formData.status || '活跃中'
      };

      const { error } = await supabase
        .from('skus')
        .upsert(payload, { onConflict: 'sku' });

      if (error) throw error;
      
      await fetchCloudData();
      closeForm();
    } catch (err) {
      alert('保存失败: ' + err.message);
    }
  };

  const deleteSku = async (index) => {
    if (window.confirm('确定要删除这个产品档案吗？相关数据分析可能会受影响。')) {
      try {
        const skuToDelete = skus[index].sku;
        const { error } = await supabase
          .from('skus')
          .delete()
          .eq('sku', skuToDelete);

        if (error) throw error;
        
        await fetchCloudData();
      } catch (err) {
        alert('删除失败: ' + err.message);
      }
    }
  };

  const handleExportPdf = async (skuCode: string) => {
    const element = document.getElementById(`sku-dashboard-${skuCode}`);
    if (!element) {
      alert('未找到看板区域，请展开后再试');
      return;
    }

    try {
      // Add a small delay to ensure all assets (charts, icons) are fully settled
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const canvas = await html2canvas(element, {
        backgroundColor: '#0f172a',
        scale: 1.5, // Reduced slightly for memory safety on mobile/large screens
        logging: true, // Enable logging for easier debugging if it fails again
        useCORS: true,
        allowTaint: false, // Changed to false to avoid SecurityErrors
        imageTimeout: 15000,
        removeContainer: true,
        onclone: (clonedDoc) => {
          const el = clonedDoc.getElementById(`sku-dashboard-${skuCode}`);
          if (el) {
            el.style.padding = '30px';
            el.style.width = 'auto';
            el.style.height = 'auto';
          }
        }
      });
      
      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error('生成的画布无效');
      }

      const imgData = canvas.toDataURL('image/jpeg', 0.95); // Use JPEG for better performance with large areas
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height],
        hotfixes: ["px_scaling"]
      });
      
      pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
      const dateStr = new Date().toISOString().split('T')[0];
      pdf.save(`SKU_Report_${skuCode}_${dateStr}.pdf`);
    } catch (err: any) {
      console.error('PDF Export Error:', err);
      // Give more specific error if possible
      const msg = err.message || '未知错误';
      alert(`导出 PDF 失败 (${msg})。请确保页面已完全加载，或尝试使用更先进的浏览器。`);
    }
  };

  return (
    <div className="v2-page-container">
      <div className="v2-inner-container">
        <header className="v2-header">
          <div className="flex items-center space-x-3">
            <div className="v2-header-icon bg-gradient-to-br from-sky-500 to-cyan-600">
              <PackageX className="w-5 h-5" />
            </div>
            <div>
              <h1 className="v2-header-title">SKU 档案管理</h1>
              <p className="v2-header-subtitle">管理产品图文、成本售价及库存信息</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { fetchCloudData(); fetchAuxiliaryData(); }}
              className="v2-button-secondary p-2"
              title="刷新云端同步数据"
            >
              <RefreshCw className={`w-4 h-4 ${(isLoading || isLoadingAux) ? 'animate-spin' : ''}`} />
            </button>
            <button 
              onClick={() => openForm()}
              className="cursor-pointer bg-sky-600 hover:bg-sky-500 text-white transition-all px-4 py-2 rounded-lg flex items-center justify-center space-x-2 shadow-md active:scale-95 text-xs font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>新增 SKU</span>
            </button>
          </div>
        </header>

        {/* Table Display */}
        <div className="v2-card">
          <div className="v2-table-wrapper">
            <table className="v2-table">
              <thead className="v2-table-thead">
                <tr>
                  <th className="v2-table-th">主图</th>
                  <th className="v2-table-th">SKU</th>
                  <th className="v2-table-th">产品名称</th>
                  <th className="v2-table-th">成本 (RMB)</th>
                  <th className="v2-table-th">售价 (MXN)</th>
                  <th className="v2-table-th">上架库存</th>
                  <th className="v2-table-th">补货库存</th>
                  <th className="v2-table-th">现有库存</th>
                  <th className="v2-table-th">上架时间</th>
                  <th className="v2-table-th">当前状态</th>
                  <th className="v2-table-th text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {skus.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="v2-table-td py-16 text-center italic text-slate-500">
                      暂无数据，点击右上角新建 SKU
                    </td>
                  </tr>
                ) : (
                  skus.map((item, index) => {
                    const isExpanded = expandedIndex === index;
                    const listedInv = parseInt(item.inventory, 10) || 0;
                    const replenishInv = parseInt(item.replenishInventory, 10) || 0;
                    const totalSales = globalSkuMetrics[item.sku]?.totalUnits || 0;
                    const currentInv = listedInv - totalSales;
                    
                    return (
                    <React.Fragment key={index}>
                      <tr 
                        className={`v2-table-tr group cursor-pointer ${isExpanded ? 'bg-slate-50' : ''}`} 
                        onClick={() => {
                          setExpandedIndex(isExpanded ? null : index);
                          setSelectedVisitDate(null);
                        }}
                      >
                        <td className="v2-table-td border-l-4 border-transparent group-hover:border-sky-500 transition-all">
                          {item.imageUrl ? (
                            <div className="w-11 h-11 rounded-md border border-slate-100 overflow-hidden bg-slate-50 flex items-center justify-center">
                              <img 
                                 src={item.imageUrl} 
                                alt="SKU Preview" 
                                className="w-full h-full object-cover object-center"
                                loading="lazy"
                                onError={(e: any) => {
                                  e.target.onerror = null; 
                                  e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%239ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';
                                }}
                              />
                            </div>
                          ) : (
                            <div className="w-11 h-11 rounded-md border border-slate-100 bg-slate-50 flex items-center justify-center text-slate-400">
                              <ImageIcon className="w-4 h-4" />
                            </div>
                          )}
                        </td>
                        <td className="v2-table-td font-semibold text-slate-800">
                          <div className="flex items-center space-x-2">
                            <span>{item.sku}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-sky-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-600" />}
                          </div>
                        </td>
                        <td className="v2-table-td max-w-[180px] truncate text-slate-400" title={item.productName}>{item.productName}</td>
                        <td className="v2-table-td text-emerald-600 font-mono">¥{item.costRMB}</td>
                        <td className="v2-table-td text-sky-600 font-mono">${item.priceMXN}</td>
                        <td className="v2-table-td text-slate-600 font-mono">{listedInv}</td>
                        <td className="v2-table-td text-purple-600 font-mono">{replenishInv > 0 ? `+${replenishInv}` : '-'}</td>
                        <td className="v2-table-td text-slate-400 font-mono">{currentInv}</td>
                        <td className="v2-table-td text-slate-500">{item.listedDate}</td>
                        <td className="v2-table-td">
                           <select 
                             value={item.status || '活跃中'} 
                             onChange={(e) => handleStatusChange(item.sku, e.target.value)}
                             onClick={(e) => e.stopPropagation()}
                             className={`text-[10px] font-bold px-2 py-1 rounded bg-white border transition-all cursor-pointer outline-none ${
                               item.status === '缺货' ? 'text-rose-600 border-rose-200' : 
                               item.status === '补货中' ? 'text-yellow-600 border-yellow-200' : 
                               'text-emerald-600 border-emerald-200'
                             }`}
                           >
                              <option value="活跃中">活跃中</option>
                              <option value="补货中">补货中</option>
                              <option value="缺货">缺货</option>
                           </select>
                        </td>
                        <td className="v2-table-td text-right">
                          <div className="flex justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                            <button onClick={() => openForm(index)} className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded transition-all">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => deleteSku(index)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                        <AnimatePresence>
                          {isExpanded && (
                            <tr className="bg-slate-50/50 border-b border-slate-100 relative">
                              <td colSpan={10} className="p-0">
                                <motion.div 
                                  initial={{ height: 0, opacity: 0 }} 
                                  animate={{ height: 'auto', opacity: 1 }} 
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="p-4 w-full">
                                    {(() => {
                                      const analytics = getSkuDailyAnalytics(item.sku) as any[];
                                      if (!analytics || analytics.length === 0) {
                                        return <div className="v2-card bg-white p-8 text-center text-slate-400 text-xs italic shadow-sm border border-slate-100">无法从清洗引擎中找到该 SKU 的流水数据</div>;
                                      }

                                      // Process analytics
                                      const enrichedAnalytics = [...analytics].reverse().map(row => {
                                        const ads = getSkuAdsForDate(item.sku, row.date);
                                        const visitInfo = getSkuVisitForDate(item.sku, row.date);
                                        const adUnits = ads ? (parseInt(ads.adOrders, 10) || 0) : 0;
                                        const adSpend = ads ? (parseFloat(ads.adSpend) || 0) : 0;
                                        const visits = visitInfo ? visitInfo.uniqueVisits : 0;
                                        const clicks = ads ? (parseInt(ads.clicks, 10) || 0) : 0;
                                        const imps = ads ? (parseInt(ads.impressions, 10) || 0) : 0;
                                        const price = parseFloat(item.priceMXN) || 0;
                                        const roas = adSpend > 0 ? (adUnits * price / 17.3 / adSpend) : 0;
                                        
                                        return {
                                          ...row,
                                          adUnits,
                                          organicUnits: Math.max(0, (row.unitsCount || 0) - adUnits),
                                          adSpend,
                                          visits,
                                          clicks,
                                          impressions,
                                          roas,
                                          dateShort: row.date.slice(5)
                                        };
                                      });

                                      const totalUnitsCount = analytics.reduce((acc, curr) => acc + (curr.unitsCount || 0), 0);
                                      const totalAdSpend = enrichedAnalytics.reduce((acc, curr) => acc + curr.adSpend, 0);
                                      const totalVisits = enrichedAnalytics.reduce((acc, curr) => acc + curr.visits, 0);
                                      const totalClicks = enrichedAnalytics.reduce((acc, curr) => acc + curr.clicks, 0);
                                      const totalImps = enrichedAnalytics.reduce((acc, curr) => acc + curr.impressions, 0);
                                      const totalAdUnits = enrichedAnalytics.reduce((acc, curr) => acc + curr.adUnits, 0);

                                      return (
                                        <div className="space-y-6">
                                          {/* 1. Summary Header */}
                                          <div className="flex items-center justify-between px-1">
                                            <div className="flex items-center gap-3">
                                              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                                                <TrendingUp className="w-4 h-4 text-white" />
                                              </div>
                                              <div>
                                                <h4 className="text-sm font-black text-slate-800 tracking-tight">SKU 深度经营分析看板</h4>
                                                <p className="text-[10px] text-slate-400 font-medium">Auto-synced from MILYFLY Cleaning Engine</p>
                                              </div>
                                            </div>
                                            <div className="flex gap-2">
                                              <button onClick={(e) => { e.stopPropagation(); handleExportPdf(item.sku); }} className="h-8 px-4 bg-slate-900 text-white rounded-lg flex items-center gap-2 text-[10px] font-bold hover:bg-slate-800 transition-all shadow-md">
                                                <Download className="w-3 h-3" /> 导出报告
                                              </button>
                                            </div>
                                          </div>

                                          {/* 2. Summary Cards */}
                                          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4" id={`sku-dashboard-${item.sku}`}>
                                            {[
                                              { label: '广告曝光', val: totalImps.toLocaleString(), color: 'text-slate-600' },
                                              { label: '广告点击', val: totalClicks.toLocaleString(), color: 'text-sky-600' },
                                              { label: '进店访客', val: totalVisits.toLocaleString(), color: 'text-purple-600' },
                                              { label: '广告消耗', val: `$${totalAdSpend.toFixed(1)}`, color: 'text-rose-500' },
                                              { label: '成交总件', val: totalUnitsCount, color: 'text-emerald-600' },
                                              { label: '广告订单', val: totalAdUnits, color: 'text-cyan-600' },
                                              { label: '转化率', val: `${((totalUnitsCount / (totalVisits || 1)) * 100).toFixed(2)}%`, color: 'text-amber-500' }
                                            ].map((card, cid) => (
                                              <div key={cid} className="v2-card bg-white p-3 border-slate-100 shadow-sm text-center">
                                                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">{card.label}</div>
                                                <div className={`text-sm font-black ${card.color}`}>{card.val}</div>
                                              </div>
                                            ))}
                                          </div>

                                          {/* 3. Charts & AI Side-by-Side */}
                                          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                                            <div className="xl:col-span-3 space-y-6">
                                              <div className="v2-card bg-white p-5 border-slate-100 shadow-md">
                                                <div className="flex items-center justify-between mb-6">
                                                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                                                    <BarChart3 className="w-4 h-4 text-sky-600" /> 销售趋势 (Pieces)
                                                  </div>
                                                  <div className="flex gap-3 text-[10px] items-center font-bold">
                                                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500" /> 总数</div>
                                                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> 广告</div>
                                                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500" /> 自然</div>
                                                  </div>
                                                </div>
                                                <div className="h-[180px]">
                                                  <ResponsiveContainer width="100%" height="100%">
                                                    <AreaChart data={enrichedAnalytics.slice(-30)}>
                                                      <defs>
                                                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                                                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                                        </linearGradient>
                                                      </defs>
                                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                      <XAxis dataKey="dateShort" fontSize={9} axisLine={false} tickLine={false} />
                                                      <YAxis fontSize={9} axisLine={false} tickLine={false} />
                                                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '10px' }} />
                                                      <Area type="monotone" dataKey="unitsCount" stroke="#ef4444" fill="url(#colorTotal)" strokeWidth={3} />
                                                      <Area type="monotone" dataKey="adUnits" stroke="#10b981" fill="transparent" strokeWidth={2} />
                                                      <Area type="monotone" dataKey="organicUnits" stroke="#f59e0b" fill="transparent" strokeWidth={1} strokeDasharray="4 4" />
                                                    </AreaChart>
                                                  </ResponsiveContainer>
                                                </div>
                                              </div>

                                              <div className="v2-card bg-white p-5 border-slate-100 shadow-md">
                                                <div className="flex items-center justify-between mb-6">
                                                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                                                    <MousePointer2 className="w-4 h-4 text-rose-500" /> 广告表现 (Ads Insight)
                                                  </div>
                                                  <div className="flex gap-3 text-[10px] items-center font-bold">
                                                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500" /> 消耗</div>
                                                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-sky-500" /> 点击</div>
                                                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> ROAS</div>
                                                  </div>
                                                </div>
                                                <div className="h-[180px]">
                                                  <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={enrichedAnalytics.slice(-30)}>
                                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                      <XAxis dataKey="dateShort" fontSize={9} axisLine={false} tickLine={false} />
                                                      <YAxis yAxisId="left" fontSize={9} axisLine={false} tickLine={false} />
                                                      <YAxis yAxisId="right" orientation="right" fontSize={9} axisLine={false} tickLine={false} />
                                                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                                      <Line yAxisId="left" type="monotone" dataKey="adSpend" stroke="#ef4444" strokeWidth={3} dot={false} />
                                                      <Line yAxisId="left" type="monotone" dataKey="clicks" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                                                      <Line yAxisId="right" type="monotone" dataKey="roas" stroke="#10b981" strokeWidth={2} dot={false} />
                                                    </LineChart>
                                                  </ResponsiveContainer>
                                                </div>
                                              </div>
                                            </div>

                                            <div className="xl:col-span-2">
                                              <SkuAiAnalysis 
                                                sku={item.sku} 
                                                skuName={item.productName} 
                                                skuStats={analytics}
                                                operationLogs={operationLogs.filter((op: any) => op.sku === item.sku)}
                                              />
                                            </div>
                                          </div>

                                          {/* 4. Bottom Table */}
                                          <div className="v2-card bg-white p-5 border-slate-100 shadow-md">
                                            <div className="flex items-center gap-2 mb-4 text-xs font-bold text-slate-700">
                                              <Activity className="w-4 h-4 text-orange-500" /> 每日经营明细表
                                            </div>
                                            <div className="v2-table-wrapper max-h-[350px] overflow-y-auto custom-scrollbar border border-slate-50 rounded-lg">
                                              <table className="v2-table border-separate border-spacing-0">
                                                <thead className="bg-slate-50/80 backdrop-blur sticky top-0 z-10 text-[9px] uppercase font-black text-slate-400">
                                                  <tr>
                                                    <th className="px-3 py-2.5 text-left border-b border-slate-100">日期</th>
                                                    <th className="px-3 py-2.5 text-center border-b border-slate-100">流量 (访/点/曝)</th>
                                                    <th className="px-3 py-2.5 text-center border-b border-slate-100">销量 (总/广/自)</th>
                                                    <th className="px-3 py-2.5 text-center border-b border-slate-100">广告 (耗/ROAS)</th>
                                                    <th className="px-3 py-2.5 text-right border-b border-slate-100">净损益 (USD)</th>
                                                  </tr>
                                                </thead>
                                                <tbody className="text-[10px] font-mono divide-y divide-slate-50">
                                                  {analytics.map((row, rid) => {
                                                    const rowE = enrichedAnalytics.find(e => e.date === row.date);
                                                    return (
                                                      <tr key={rid} className="v2-table-tr hover:bg-slate-50/80 text-center transition-colors">
                                                        <td className="px-3 py-2.5 text-left text-slate-500 font-bold">{row.date}</td>
                                                        <td className="px-3 py-2.5 text-slate-400 font-medium">{rowE?.visits} / {rowE?.clicks} / {rowE?.impressions}</td>
                                                        <td className="px-3 py-2.5">
                                                          <span className="text-rose-600 font-black">{row.unitsCount}</span>
                                                          <span className="mx-1 text-slate-200">/</span>
                                                          <span className="text-emerald-600 font-bold">{rowE?.adUnits}</span>
                                                          <span className="mx-1 text-slate-200">/</span>
                                                          <span className="text-amber-500 font-bold">{rowE?.organicUnits}</span>
                                                        </td>
                                                        <td className="px-3 py-2.5">
                                                          <span className="text-rose-500 font-bold">${rowE?.adSpend.toFixed(1)}</span>
                                                          <span className="mx-1 text-slate-200">|</span>
                                                          <span className="text-emerald-600 font-bold">{rowE?.roas.toFixed(2)}</span>
                                                        </td>
                                                        <td className="px-3 py-2.5 text-right font-black text-rose-600">
                                                          {row.lossUsd > 0 ? `-$${row.lossUsd.toFixed(1)}` : '-'}
                                                        </td>
                                                      </tr>
                                                    );
                                                  })}
                                                </tbody>
                                              </table>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </AnimatePresence>
                    </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Form */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={closeForm}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-xl overflow-hidden text-slate-800"
            >
              <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <PackageX className="w-4 h-4 text-sky-600" />
                  {editingIndex !== null ? '修改 SKU' : '新增 SKU'}
                </h3>
                <button onClick={closeForm} className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={saveSku} className="p-5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">SKU</label>
                    <input required type="text" name="sku" value={formData.sku} onChange={handleInputChange} className="v2-input" placeholder="例如: MILY-A01" />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">上架时间</label>
                    <input required type="date" name="listedDate" value={formData.listedDate} onChange={handleInputChange} className="v2-input" />
                  </div>
                  
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">产品名称</label>
                    <input required type="text" name="productName" value={formData.productName} onChange={handleInputChange} className="v2-input" placeholder="输入完整的商品标题" />
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">当前状态</label>
                    <select name="status" value={formData.status} onChange={handleInputChange} className="v2-input">
                      <option value="活跃中">活跃中 (Active)</option>
                      <option value="补货中">补货中 (Restocking)</option>
                      <option value="缺货">缺货 (Out of Stock)</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">图片 URL (网络地址)</label>
                    <div className="flex gap-3 items-start">
                      <input type="url" name="imageUrl" value={formData.imageUrl} onChange={handleInputChange} className="v2-input flex-1" placeholder="https://example.com/image.png" />
                      {formData.imageUrl && (
                        <div className="w-11 h-11 bg-slate-800 border border-slate-700 rounded-lg overflow-hidden shrink-0">
                           <img src={formData.imageUrl} className="w-full h-full object-cover object-center" alt="Preview" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">成本 (RMB)</label>
                    <input required type="number" step="0.01" name="costRMB" value={formData.costRMB} onChange={handleInputChange} className="v2-input" placeholder="0.00" />
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">售价 (MXN)</label>
                    <input required type="number" step="0.01" name="priceMXN" value={formData.priceMXN} onChange={handleInputChange} className="v2-input" placeholder="0.00" />
                  </div>

                  <div className="col-span-2 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">上架库存</label>
                      <input required type="number" name="inventory" value={formData.inventory} onChange={handleInputChange} className="v2-input" placeholder="库房库存" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">补货库存 (在途/采购)</label>
                      <input type="number" name="replenishInventory" value={formData.replenishInventory || ''} onChange={handleInputChange} className="v2-input" placeholder="0" />
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-3 border-t border-slate-100 flex justify-end space-x-2">
                  <button type="button" onClick={closeForm} className="px-5 py-2 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-50 transition text-xs font-medium">
                    取消
                  </button>
                  <button type="submit" className="bg-sky-600 hover:bg-sky-500 text-white px-5 py-2 rounded-lg font-semibold flex items-center gap-2 shadow-lg shadow-sky-500/20 active:scale-95 transition-all text-xs">
                    <Save className="w-4 h-4" />
                    保存档案
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
