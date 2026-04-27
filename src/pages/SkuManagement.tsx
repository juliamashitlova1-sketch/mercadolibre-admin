import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { OperationLog } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Edit2, Trash2, X, Save, Image as ImageIcon, 
  ChevronDown, ChevronUp, TrendingUp, AlertTriangle, 
  Activity, Eye, Loader2, PackageX, MousePointer2, 
  BarChart3, RefreshCw
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend, AreaChart, Area 
} from 'recharts';
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
              className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all p-2 rounded-lg flex items-center justify-center shadow-md active:scale-95 border border-slate-700"
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
              <tbody className="divide-y divide-slate-800/50 text-slate-300">
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
                        className={`v2-table-tr group cursor-pointer ${isExpanded ? 'bg-slate-800/50' : ''}`} 
                        onClick={() => {
                          setExpandedIndex(isExpanded ? null : index);
                          setSelectedVisitDate(null);
                        }}
                      >
                        <td className="v2-table-td border-l-4 border-transparent group-hover:border-sky-500 transition-all">
                          {item.imageUrl ? (
                            <div className="w-11 h-11 rounded-md border border-slate-700 overflow-hidden bg-slate-800 flex items-center justify-center">
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
                            <div className="w-11 h-11 rounded-md border border-slate-700 bg-slate-800 flex items-center justify-center text-slate-600">
                              <ImageIcon className="w-4 h-4" />
                            </div>
                          )}
                        </td>
                        <td className="v2-table-td font-semibold text-white">
                          <div className="flex items-center space-x-2">
                            <span>{item.sku}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-sky-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-600" />}
                          </div>
                        </td>
                        <td className="v2-table-td max-w-[180px] truncate text-slate-400" title={item.productName}>{item.productName}</td>
                        <td className="v2-table-td text-emerald-400 font-mono">¥{item.costRMB}</td>
                        <td className="v2-table-td text-sky-400 font-mono">${item.priceMXN}</td>
                        <td className="v2-table-td text-slate-300 font-mono">{listedInv}</td>
                        <td className="v2-table-td text-purple-400 font-mono">{replenishInv > 0 ? `+${replenishInv}` : '-'}</td>
                        <td className="v2-table-td">
                          <div className="font-bold text-emerald-400 bg-emerald-500/10 rounded px-2.5 py-1 inline-flex items-center justify-center min-w-[40px] text-xs">
                            {currentInv}
                          </div>
                        </td>
                        <td className="v2-table-td text-slate-500">{item.listedDate}</td>
                        <td className="v2-table-td">
                           <select 
                             value={item.status || '活跃中'} 
                             onChange={(e) => handleStatusChange(item.sku, e.target.value)}
                             onClick={(e) => e.stopPropagation()}
                             className={`text-[10px] font-bold px-2 py-1 rounded bg-slate-800/80 border transition-all cursor-pointer outline-none ${
                               item.status === '缺货' ? 'text-rose-400 border-rose-500/30' : 
                               item.status === '补货中' ? 'text-yellow-400 border-yellow-500/30' : 
                               'text-emerald-400 border-emerald-500/30'
                             }`}
                           >
                              <option value="活跃中">活跃中</option>
                              <option value="补货中">补货中</option>
                              <option value="缺货">缺货</option>
                           </select>
                        </td>
                        <td className="v2-table-td text-right">
                          <div className="flex justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                            <button onClick={() => openForm(index)} className="p-1.5 text-slate-500 hover:text-sky-400 hover:bg-sky-400/10 rounded transition-all">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => deleteSku(index)} className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 rounded transition-all">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {/* Nested Analytics Row */}
                      <AnimatePresence>
                        {isExpanded && (
                          <tr className="bg-slate-900/30 border-b border-slate-800 relative">
                            <td colSpan={8} className="p-0">
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }} 
                                animate={{ height: 'auto', opacity: 1 }} 
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="p-5">
                                  <div className="v2-card bg-slate-800/30 p-4 border-slate-800">
                                    <div className="flex items-center justify-between mb-3">
                                      <h4 className="text-xs font-bold text-slate-300 flex items-center">
                                        <TrendingUp className="w-3.5 h-3.5 mr-1.5 text-indigo-400" /> 
                                        销量引擎追踪看板 
                                        <span className="ml-2 text-[11px] font-normal text-slate-600 px-1.5 py-0.5 rounded bg-slate-800/50">基于左侧【数据清洗】模块同步分析</span>
                                      </h4>
                                    </div>
                                    
                                    {(() => {
                                      const analytics = getSkuDailyAnalytics(item.sku) as any[];
                                      if (!analytics || analytics.length === 0) {
                                        return <div className="text-center py-6 text-sm text-gray-500">无法从清洗引擎中找到该 SKU 的流水 (可能暂未在引擎中导入相关报表)</div>;
                                      }

                                      // Process analytics for chart and summary
                                      const enrichedAnalytics = [...analytics].reverse().map(row => {
                                        const ads = getSkuAdsForDate(item.sku, row.date);
                                        const visitInfo = getSkuVisitForDate(item.sku, row.date);
                                        const adUnits = ads ? (parseInt(ads.adOrders, 10) || 0) : 0;
                                        const totalUnits = row.unitsCount || 0;
                                        const organicUnits = Math.max(0, totalUnits - adUnits);
                                        const adSpend = ads ? (parseFloat(ads.adSpend) || 0) : 0;
                                        const visits = visitInfo ? visitInfo.uniqueVisits : 0;
                                        
                                        return {
                                          ...row,
                                          adUnits,
                                          organicUnits,
                                          adSpend,
                                          visits,
                                          dateShort: row.date.slice(5) // MM-DD
                                        };
                                      });

                                      const totalSalesCount = analytics.reduce((acc, curr) => acc + curr.salesCount, 0);
                                      const totalUnitsCount = analytics.reduce((acc, curr) => acc + (curr.unitsCount || 0), 0);
                                      const totalSalesMxn = analytics.reduce((acc, curr) => acc + curr.salesMxn, 0);
                                      const totalCancelCount = analytics.reduce((acc, curr) => acc + curr.cancelCount, 0);
                                      const totalCancelUnits = analytics.reduce((acc, curr) => acc + (curr.cancelUnits || 0), 0);
                                      const totalRefundCount = analytics.reduce((acc, curr) => acc + curr.refundCount, 0);
                                      const totalRefundUnits = analytics.reduce((acc, curr) => acc + (curr.refundUnits || 0), 0);
                                      const totalLossUsd = analytics.reduce((acc, curr) => acc + curr.lossUsd, 0);

                                      const totalVisits = enrichedAnalytics.reduce((acc, curr) => acc + curr.visits, 0);
                                      const totalAdUnits = enrichedAnalytics.reduce((acc, curr) => acc + curr.adUnits, 0);
                                      const totalAdSpend = enrichedAnalytics.reduce((acc, curr) => acc + curr.adSpend, 0);
                                      const totalOrganicUnits = Math.max(0, totalUnitsCount - totalAdUnits);
                                      const overallOrganicRate = totalVisits > 0 ? ((totalOrganicUnits / totalVisits) * 100).toFixed(2) : '0';

                                      return (
                                        <div className="space-y-4">
                                          {/* Trend Chart Section */}
                                          <div className="v2-card bg-slate-900/40 p-4 border-slate-800/50">
                                            <div className="flex items-center justify-between mb-4 px-2">
                                              <div className="flex items-center gap-2">
                                                <BarChart3 className="w-4 h-4 text-sky-400" />
                                                <span className="text-xs font-bold text-slate-300">广告与自然销量趋势 (近30天)</span>
                                              </div>
                                              <div className="flex gap-4">
                                                <div className="flex items-center gap-1.5">
                                                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                  <span className="text-[10px] text-slate-500">总件数</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                  <div className="w-2 h-2 rounded-full bg-cyan-400" />
                                                  <span className="text-[10px] text-slate-500">广告单</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                                  <span className="text-[10px] text-slate-500">自然单</span>
                                                </div>
                                              </div>
                                            </div>
                                            <div className="h-[200px] w-full">
                                              <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={enrichedAnalytics.slice(-30)}>
                                                  <defs>
                                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                                    </linearGradient>
                                                  </defs>
                                                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                                  <XAxis dataKey="dateShort" stroke="#475569" fontSize={9} />
                                                  <YAxis stroke="#475569" fontSize={9} />
                                                  <Tooltip 
                                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', fontSize: '10px' }}
                                                  />
                                                  <Area type="monotone" name="总件数" dataKey="unitsCount" stroke="#10b981" fillOpacity={1} fill="url(#colorTotal)" strokeWidth={2} />
                                                  <Area type="monotone" name="广告单" dataKey="adUnits" stroke="#22d3ee" fill="transparent" strokeWidth={2} />
                                                  <Area type="monotone" name="自然单" dataKey="organicUnits" stroke="#6366f1" fill="transparent" strokeWidth={1} strokeDasharray="4 4" />
                                                </AreaChart>
                                              </ResponsiveContainer>
                                            </div>
                                          </div>

                                          <div className="v2-table-wrapper">
                                            <table className="v2-table">
                                              <thead className="bg-slate-800/80 text-slate-500 tracking-wider sticky top-0 z-10 font-medium text-[10px]">
                                                <tr>
                                                  <th className="px-3 py-2 border-b border-slate-700/50 text-left">业务日期</th>
                                                  <th className="px-3 py-2 border-b border-slate-700/50 text-center">流量 (访客 / 广点 / 广曝)</th>
                                                  <th className="px-3 py-2 border-b border-slate-700/50 text-center">销量拆分 (总 / 广告 / 自然)</th>
                                                  <th className="px-3 py-2 border-b border-slate-700/50 text-center">广告数据 (消耗/ROAS)</th>
                                                  <th className="px-3 py-2 border-b border-slate-700/50 text-center">转化率 (自然/全店)</th>
                                                  <th className="px-3 py-2 border-b border-slate-700/50 text-center">取消/退货 (件)</th>
                                                  <th className="px-3 py-2 border-b border-slate-700/50 text-right text-red-400">绝对亏损 (USD)</th>
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-slate-800/50">
                                                {/* 顶部总计汇总行 */}
                                                <tr className="bg-sky-500/5 font-bold border-b border-slate-700/50 text-center v2-table-tr">
                                                  <td className="px-3 py-2.5 text-sky-300 text-left text-xs font-bold">全局汇总</td>
                                                  <td className="px-3 py-2.5 text-slate-400 font-mono text-[11px]">
                                                    {totalVisits > 0 ? totalVisits.toLocaleString() : '-'} 访客
                                                  </td>
                                                  <td className="px-3 py-2.5 text-emerald-400 text-xs text-center">
                                                    总 {totalUnitsCount} <span className="text-slate-500">/</span> <span className="text-cyan-400">{totalAdUnits}</span> <span className="text-slate-500">/</span> <span className="text-indigo-400">{totalOrganicUnits}</span>
                                                  </td>
                                                  <td className="px-3 py-2.5 text-rose-400 font-mono text-[11px]">
                                                    Spend: ${totalAdSpend.toFixed(2)}
                                                  </td>
                                                  <td className="px-3 py-2.5 text-yellow-400 font-mono text-[11px]">
                                                    Conv: {((totalUnitsCount / (totalVisits || 1)) * 100).toFixed(2)}%
                                                  </td>
                                                  <td className="px-3 py-2.5 text-slate-500 text-[11px]">
                                                    -{totalCancelUnits} / -{totalRefundUnits}
                                                  </td>
                                                  <td className="px-3 py-2.5 text-right font-mono text-red-400">
                                                    {totalLossUsd > 0 ? 
                                                      <span className="flex items-center justify-end"><AlertTriangle className="w-3 h-3 mr-1" />- ${totalLossUsd.toFixed(2)}</span> : 
                                                      <span className="text-slate-700">-</span>
                                                    }
                                                  </td>
                                                </tr>

                                                
                                                {/* 逐日明细行 */}
                                                {analytics.map((row: any, rIdx: number) => {
                                                  const adsD = getSkuAdsForDate(item.sku, row.date);
                                                  const adUnits = enrichedAnalytics.find(e => e.date === row.date)?.adUnits || 0;
                                                  const totalUnits = row.unitsCount || 0;
                                                  const organicUnits = Math.max(0, totalUnits - adUnits);
                                                  
                                                  const visitInfo = getSkuVisitForDate(item.sku, row.date);
                                                  const totalCVR = visitInfo && visitInfo.uniqueVisits > 0 ? parseFloat(((totalUnits / visitInfo.uniqueVisits) * 100).toFixed(2)) : 0;
                                                  const organicCVR = visitInfo && visitInfo.uniqueVisits > 0 ? parseFloat(((organicUnits / visitInfo.uniqueVisits) * 100).toFixed(2)) : 0;
                                                  
                                                  const adSpend = adsD ? (parseFloat(adsD.adSpend) || 0) : 0;
                                                  const clicks = adsD ? (parseInt(adsD.clicks, 10) || 0) : 0;
                                                  const imps = adsD ? (parseInt(adsD.impressions, 10) || 0) : 0;
                                                  const roas = adSpend > 0 ? ( (adUnits * (parseFloat(item.priceMXN) || 0)) / 17.3 / adSpend ).toFixed(2) : '0';

                                                  return (
                                                    <tr 
                                                      key={rIdx} 
                                                      className="v2-table-tr text-center"
                                                    >
                                                      <td className="px-3 py-2 text-slate-400 text-left text-[10px] font-mono">
                                                        {row.date}
                                                      </td>
                                                      <td className="px-3 py-2 text-slate-500 font-mono text-[10px]">
                                                        <span className="text-purple-400" title="自然访客 (独立访问量)">{visits || '-'}</span>
                                                        <span className="mx-1 text-slate-800">/</span>
                                                        <span className="text-sky-400" title="广告点击">{clicks || '-'}</span>
                                                        <span className="mx-1 text-slate-800">/</span>
                                                        <span className="text-slate-600" title="广告曝光">{imps || '-'}</span>
                                                      </td>
                                                      <td className="px-3 py-2">
                                                        <div className={`px-2 py-0.5 rounded inline-flex items-center gap-1.5 text-[10px] ${row.salesCount > 0 ? 'bg-slate-800/80 border border-slate-700/50' : 'text-slate-600'}`}>
                                                          <span className="text-emerald-400 font-bold">{totalUnits}</span>
                                                          <span className="text-slate-700">|</span>
                                                          <span className="text-cyan-400">{adUnits}</span>
                                                          <span className="text-slate-700">|</span>
                                                          <span className="text-indigo-400">{organicUnits}</span>
                                                        </div>
                                                      </td>
                                                      <td className="px-3 py-2 font-mono text-[10px]">
                                                        {adSpend > 0 ? (
                                                          <div className="flex flex-col items-center">
                                                            <span className="text-rose-400">${adSpend.toFixed(1)}</span>
                                                            <span className="text-[9px] text-slate-600">ROAS: {roas}</span>
                                                          </div>
                                                        ) : '-'}
                                                      </td>
                                                      <td className="px-3 py-2 font-mono text-[10px]">
                                                        {visitInfo && visitInfo.uniqueVisits > 0 ? (
                                                          <div className="flex flex-col items-center">
                                                            <span className={organicCVR >= 3 ? 'text-emerald-400' : 'text-slate-500'}>
                                                              Org: {organicCVR}%
                                                            </span>
                                                            <span className="text-[9px] text-slate-600">All: {totalCVR}%</span>
                                                          </div>
                                                        ) : '-'}
                                                      </td>
                                                      <td className="px-3 py-2 text-slate-500 text-[10px]">
                                                        {row.cancelUnits > 0 || row.refundUnits > 0 ? (
                                                          <span className={row.refundUnits > 0 ? 'text-orange-400' : ''}>
                                                            -{row.cancelUnits || 0} / -{row.refundUnits || 0}
                                                          </span>
                                                        ) : '-'}
                                                      </td>
                                                      <td className="px-3 py-2 text-right font-mono text-[10px]">
                                                        {row.lossUsd > 0 ? (
                                                          <span className="text-red-400 flex items-center justify-end">
                                                            <AlertTriangle className="w-2.5 h-2.5 mr-1" />
                                                            -${row.lossUsd.toFixed(1)}
                                                          </span>
                                                        ) : (
                                                          <span className="text-slate-800">-</span>
                                                        )}
                                                      </td>
                                                    </tr>
                                                  );
                                                })}

                                              </tbody>
                                            </table>
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>


                                  
                                  {/* Operation Actions Nested Panel */}
                                  <div className="v2-card bg-slate-800/30 p-4 mt-4 border-slate-800">
                                    <div className="flex items-center justify-between mb-3">
                                      <h4 className="text-xs font-bold text-slate-300 flex items-center">
                                        <Activity className="w-3.5 h-3.5 mr-1.5 text-orange-400" /> 
                                        运营动作与策略跟踪
                                        <span className="ml-2 text-[11px] font-normal text-slate-600 px-1.5 py-0.5 rounded bg-slate-800/50">全局【运营动作】同步</span>
                                      </h4>
                                    </div>
                                    {(() => {
                                      const skuOps = (operationLogs || []).filter((op: any) => op.sku === item.sku);
                                      if (skuOps.length === 0) {
                                        return <div className="text-center py-4 text-sm text-gray-500">该 SKU 暂无相关的运营打卡记录</div>;
                                      }

                                      const getCategoryColor = (cat) => {
                                        switch(cat) {
                                          case '广告': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
                                          case '调价': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
                                          case '改图': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
                                          case '标题': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
                                          case '库存': return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
                                          default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
                                        }
                                      };

                                      return (
                                        <div className="v2-table-wrapper">
                                          <table className="v2-table">
                                            <thead className="bg-slate-800/80 text-slate-500 tracking-wider sticky top-0 z-10 font-medium text-[10px]">
                                              <tr>
                                                <th className="px-3 py-2 border-b border-slate-700/50 w-28">业务日期</th>
                                                <th className="px-3 py-2 border-b border-slate-700/50 w-20">操作类型</th>
                                                <th className="px-3 py-2 border-b border-slate-700/50">调整详情</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800/50">
                                              {skuOps.map((op: any, oIdx: number) => {
                                                const displayType = op.actionType === 'Price' ? '调价' : 
                                                                  op.actionType === 'Image' ? '改图' : 
                                                                  op.actionType === 'Ads' ? '广告' : 
                                                                  op.actionType === 'Title' ? '标题' : 
                                                                  op.actionType === 'Stock' ? '库存' : '其他';
                                                return (
                                                  <tr key={oIdx} className="v2-table-tr">
                                                    <td className="px-3 py-2 text-slate-400 text-xs">{op.date}</td>
                                                    <td className="px-3 py-2">
                                                      <span className={`px-1.5 py-0.5 rounded border text-[11px] font-bold ${getCategoryColor(displayType)}`}>
                                                        {displayType}
                                                      </span>
                                                    </td>
                                                    <td className="px-3 py-2 text-slate-500 whitespace-normal min-w-[280px] text-xs">
                                                      {op.description || op.action}
                                                    </td>
                                                  </tr>
                                                );
                                              })}
                                            </tbody>
                                          </table>
                                        </div>
                                      );
                                    })()}
                                  </div>
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
              className="relative w-full max-w-lg bg-slate-900/95 backdrop-blur-xl border border-slate-700 shadow-2xl rounded-xl overflow-hidden"
            >
              <div className="flex justify-between items-center p-5 border-b border-slate-800 bg-slate-800/50">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <PackageX className="w-4 h-4 text-sky-400" />
                  {editingIndex !== null ? '修改 SKU' : '新增 SKU'}
                </h3>
                <button onClick={closeForm} className="text-slate-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800">
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

                <div className="pt-4 mt-3 border-t border-slate-800 flex justify-end space-x-2">
                  <button type="button" onClick={closeForm} className="px-5 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition text-xs font-medium">
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
