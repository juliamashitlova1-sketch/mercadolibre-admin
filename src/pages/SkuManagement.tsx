import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { OperationLog } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Edit2, Trash2, X, Save, Image as ImageIcon, 
  ChevronDown, ChevronUp, TrendingUp, AlertTriangle, 
  Activity, Eye, Loader2, PackageX, MousePointer2, 
  BarChart3, RefreshCw, Download, History
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend, AreaChart, Area 
} from 'recharts';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import SkuAiAnalysis from '../components/SkuAiAnalysis';

import { supabase } from '../lib/supabase';
import { USD_TO_MXN } from '../constants';

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
  const [activeTab, setActiveTab] = useState('performance'); 
  
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
        backgroundColor: '#ffffff',
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
        <header className="v2-header mb-10">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-500/20 transform -rotate-3">
              <PackageX className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">SKU 智能经营分析中心</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">实时运营表现与物流链条动态看板</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => { fetchCloudData(); fetchAuxiliaryData(); }}
              className="w-11 h-11 rounded-xl glass-panel flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-all hover:bg-white/60"
              title="同步云端最新数据"
            >
              <RefreshCw className={`w-5 h-5 ${(isLoading || isLoadingAux) ? 'animate-spin' : ''}`} />
            </button>
            <button 
              onClick={() => openForm()}
              className="h-11 px-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-500/30 active:scale-95 transition-all text-xs font-black uppercase tracking-wider"
            >
              <Plus className="w-4 h-4" />
              <span>新建资产档案</span>
            </button>
          </div>
        </header>

        {/* Dynamic Data Table */}
        <div className="v2-card border-white/40 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-white/40 backdrop-blur-md flex items-center justify-between">
             <div className="flex items-center gap-4">
                <div className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-tighter">在线数据库</div>
                <div className="text-xs text-slate-400 font-bold">档案总数: <span className="text-indigo-600">{skus.length} 条记录</span></div>
             </div>
             <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-bold text-slate-500">所有系统连接正常</span>
             </div>
          </div>
          <div className="v2-table-wrapper">
            <table className="v2-table">
              <thead className="bg-slate-50/50 backdrop-blur-md">
                <tr>
                  <th className="w-[6%] px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">图示</th>
                  <th className="w-[12%] px-4 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">SKU 编码</th>
                  <th className="w-[28%] px-4 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">产品档案详细名称</th>
                  <th className="w-[9%] px-4 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">成本 (RMB)</th>
                  <th className="w-[9%] px-4 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">售价 (MXN)</th>
                  <th className="w-[7%] px-4 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">上架数</th>
                  <th className="w-[7%] px-4 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">补货数</th>
                  <th className="w-[7%] px-4 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">实时结余</th>
                  <th className="w-[7%] px-4 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">状态</th>
                  <th className="w-[8%] px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">操作</th>
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
                        className={`v2-table-tr group cursor-pointer transition-all duration-500 ${isExpanded ? 'bg-indigo-50/30' : 'hover:bg-slate-50'}`} 
                        onClick={() => {
                          setExpandedIndex(isExpanded ? null : index);
                          setSelectedVisitDate(null);
                        }}
                      >
                        <td className="v2-table-td pl-8">
                          {item.imageUrl ? (
                            <div className="w-14 h-14 rounded-2xl glass-panel p-1 group-hover:scale-110 transition-transform duration-500 shadow-sm border-white/60 overflow-hidden">
                              <img 
                                 src={item.imageUrl} 
                                alt="SKU 预览" 
                                className="w-full h-full object-cover rounded-xl"
                                loading="lazy"
                                onError={(e: any) => {
                                  e.target.onerror = null; 
                                  e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%239ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';
                                }}
                              />
                            </div>
                          ) : (
                            <div className="w-14 h-14 rounded-2xl glass-panel flex items-center justify-center text-slate-300">
                              <ImageIcon className="w-6 h-6" />
                            </div>
                          )}
                        </td>
                        <td className="v2-table-td">
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-900 tracking-tighter group-hover:text-indigo-600 transition-colors uppercase">{item.sku}</span>
                            <div className="flex items-center gap-1.5 mt-1">
                               <div className={`w-1.5 h-1.5 rounded-full ${isExpanded ? 'bg-indigo-500 animate-ping' : 'bg-slate-300'}`} />
                               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isExpanded ? '正在分析' : '摘要概览'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="v2-table-td">
                            <div className="text-xs font-black text-slate-700 truncate" title={item.productName}>{item.productName}</div>
                            <div className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-tighter">上架日期: {item.listedDate}</div>
                        </td>
                        <td className="v2-table-td font-black text-emerald-600">¥{item.costRMB}</td>
                        <td className="v2-table-td font-black text-indigo-600">${item.priceMXN}</td>
                        <td className="v2-table-td font-bold text-slate-600 tabular-nums">{listedInv}</td>
                        <td className="v2-table-td">
                            {replenishInv > 0 ? (
                                <span className="px-2 py-1 bg-amber-50 text-amber-600 rounded-md text-[10px] font-black border border-amber-100">+{replenishInv}</span>
                            ) : (
                                <span className="text-slate-300">-</span>
                            )}
                        </td>
                        <td className="v2-table-td font-bold text-slate-400 tabular-nums">{currentInv}</td>
                        <td className="v2-table-td">
                           <select 
                             value={item.status || '活跃中'} 
                             onChange={(e) => handleStatusChange(item.sku, e.target.value)}
                             onClick={(e) => e.stopPropagation()}
                             className={`text-[9px] font-black px-3 py-1.5 rounded-xl bg-white border-2 transition-all cursor-pointer outline-none shadow-sm uppercase tracking-widest ${
                               item.status === '缺货' ? 'text-rose-600 border-rose-100' : 
                               item.status === '补货中' ? 'text-amber-500 border-amber-100' : 
                               'text-emerald-600 border-emerald-100'
                             }`}
                           >
                              <option value="活跃中">ACTIVE</option>
                              <option value="补货中">RESTOCK</option>
                              <option value="缺货">OUT</option>
                           </select>
                        </td>
                        <td className="v2-table-td text-right pr-8">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0" onClick={e => e.stopPropagation()}>
                            <button onClick={() => openForm(index)} className="w-9 h-9 flex items-center justify-center bg-white border border-slate-100 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 rounded-xl transition-all shadow-sm">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => deleteSku(index)} className="w-9 h-9 flex items-center justify-center bg-white border border-slate-100 text-slate-400 hover:text-rose-600 hover:border-rose-100 rounded-xl transition-all shadow-sm">
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
                                        const impressions = ads ? (parseInt(ads.impressions, 10) || 0) : 0;
                                        const price = parseFloat(item.priceMXN) || 0;
                                        const adRevenue = adUnits * price / USD_TO_MXN;
                                        const roas = adSpend > 0 ? (adRevenue / adSpend) : 0;
                                        const cpc = clicks > 0 ? adSpend / clicks : 0;
                                        const acos = adRevenue > 0 ? (adSpend / adRevenue) * 100 : 0;
                                        const naturalVisits = Math.max(0, visits - clicks);
                                        const naturalUnits = Math.max(0, (row.unitsCount || 0) - adUnits);
                                        const naturalCV = naturalVisits > 0 ? (naturalUnits / naturalVisits) * 100 : 0;
                                        const adCV = clicks > 0 ? (adUnits / clicks) * 100 : 0;
                                        
                                        return {
                                          ...row,
                                          adUnits,
                                          organicUnits: naturalUnits,
                                          adSpend,
                                          visits,
                                          clicks,
                                          impressions,
                                          roas,
                                          cpc,
                                          acos,
                                          naturalVisits,
                                          naturalUnits,
                                          naturalCV,
                                          adCV,
                                          dateShort: row.date.slice(5)
                                        };
                                      });

                                      const totalUnitsCount = analytics.reduce((acc, curr) => acc + (curr.unitsCount || 0), 0);
                                      const totalAdSpend = enrichedAnalytics.reduce((acc, curr) => acc + curr.adSpend, 0);
                                      const totalVisits = enrichedAnalytics.reduce((acc, curr) => acc + curr.visits, 0);
                                      const totalClicks = enrichedAnalytics.reduce((acc, curr) => acc + curr.clicks, 0);
                                      const totalImps = enrichedAnalytics.reduce((acc, curr) => acc + curr.impressions, 0);
                                      const totalAdUnits = enrichedAnalytics.reduce((acc, curr) => acc + curr.adUnits, 0);

                                          const totalNaturalUnits = Math.max(0, totalUnitsCount - totalAdUnits);
                                          const totalNaturalVisits = Math.max(0, totalVisits - totalClicks);
                                          const totalNaturalCV = totalNaturalVisits > 0 ? (totalNaturalUnits / totalNaturalVisits) * 100 : 0;
                                          const totalAdCV = totalClicks > 0 ? (totalAdUnits / totalClicks) * 100 : 0;

                                          return (
                                            <div className="space-y-8 animate-in fade-in duration-700">
                                              {/* 1. Dashboard Header & Tabs */}
                                              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
                                                <div className="flex items-center gap-4">
                                                  <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-2xl shadow-indigo-500/40 transform rotate-3">
                                                    <Activity className="w-7 h-7 text-white" />
                                                  </div>
                                                  <div>
                                                    <div className="flex items-center gap-2">
                                                       <h4 className="text-xl font-black text-slate-900 tracking-tight">智能经营分析看板</h4>
                                                       <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-black rounded-md border border-indigo-100 uppercase tracking-widest">高级专业版</span>
                                                    </div>
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">正在深度剖析 SKU: <span className="text-indigo-600">{item.sku}</span></p>
                                                  </div>
                                                </div>

                                                <div className="flex items-center bg-white/60 backdrop-blur-xl p-1.5 rounded-2xl border border-white/80 shadow-sm">
                                                  {[
                                                    { id: 'performance', label: '经营表现', icon: BarChart3 },
                                                    { id: 'logistics', label: '物流记录', icon: Activity },
                                                    { id: 'ai', label: 'AI 洞察与历史', icon: History }
                                                  ].map(tab => (
                                                    <button
                                                      key={tab.id}
                                                      onClick={() => setActiveTab(tab.id)}
                                                      className={`
                                                        flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all duration-300
                                                        ${activeTab === tab.id 
                                                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-105' 
                                                          : 'text-slate-500 hover:text-indigo-600 hover:bg-white/40'}
                                                      `}
                                                    >
                                                      <tab.icon className="w-4 h-4" />
                                                      <span>{tab.label}</span>
                                                    </button>
                                                  ))}
                                                </div>
                                              </div>

                                              {/* 2. Tab Content */}
                                              <AnimatePresence mode="wait">
                                                {activeTab === 'performance' && (
                                                  <motion.div 
                                                    key="performance"
                                                    initial={{ opacity: 0, y: 10 }} 
                                                    animate={{ opacity: 1, y: 0 }} 
                                                    exit={{ opacity: 0, y: -10 }}
                                                    className="space-y-8"
                                                  >
                                                    {/* Hero Grid */}
                                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                                      {[
                                                        { label: '累计销售件数', val: totalUnitsCount, sub: `${totalAdUnits} 广告 / ${totalNaturalUnits} 自然`, icon: PackageX, color: 'from-indigo-600 to-violet-700' },
                                                        { label: '广告转化率', val: `${totalAdCV.toFixed(2)}%`, sub: `CVR (广告订单)`, icon: TrendingUp, color: 'from-emerald-500 to-teal-600' },
                                                        { label: '全域曝光量', val: totalImps.toLocaleString(), sub: `${totalClicks.toLocaleString()} 次点击`, icon: Eye, color: 'from-sky-500 to-indigo-600' },
                                                        { label: '广告投入总额', val: `$${totalAdSpend.toFixed(1)}`, sub: `ROAS: ${totalAdUnits > 0 ? (totalUnitsCount/totalAdUnits).toFixed(1) : '计算中'}`, icon: MousePointer2, color: 'from-rose-500 to-purple-600' }
                                                      ].map((hero, hid) => (
                                                        <div key={hid} className="v2-stat-card group relative overflow-hidden p-6">
                                                          <div className={`absolute inset-0 bg-gradient-to-br ${hero.color} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-700`} />
                                                          <div className="flex justify-between items-start mb-6">
                                                            <span className="stat-label">{hero.label}</span>
                                                            <div className={`p-2 bg-gradient-to-br ${hero.color} rounded-xl shadow-lg shadow-indigo-500/10`}>
                                                              <hero.icon className="w-4 h-4 text-white" />
                                                            </div>
                                                          </div>
                                                          <div className="stat-value text-2xl">{hero.val}</div>
                                                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                                            {hero.sub}
                                                          </div>
                                                        </div>
                                                      ))}
                                                    </div>

                                                    {/* Analytics Charts */}
                                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                                      <div className="v2-card bg-white/40 border-white/60 p-8 shadow-xl">
                                                        <div className="flex items-center justify-between mb-8">
                                                          <h5 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                                                            <div className="w-2 h-6 bg-indigo-500 rounded-full" /> 销售表现趋势图
                                                          </h5>
                                                          <button onClick={(e) => { e.stopPropagation(); handleExportPdf(item.sku); }} className="h-9 px-5 glass-panel text-indigo-600 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                                                            <Download className="w-3.5 h-3.5" /> 导出 PDF 报告
                                                          </button>
                                                        </div>
                                                        <div className="h-[280px]">
                                                          <ResponsiveContainer width="100%" height="100%">
                                                            <AreaChart data={enrichedAnalytics.slice(-30)}>
                                                              <defs>
                                                                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                                                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                                                                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                                                </linearGradient>
                                                              </defs>
                                                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                                              <XAxis dataKey="dateShort" fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontWeight: 700}} />
                                                              <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontWeight: 700}} />
                                                              <Tooltip 
                                                                contentStyle={{ backgroundColor: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.5)', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.05)' }}
                                                                itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                                                              />
                                                              <Area type="monotone" dataKey="unitsCount" stroke="#6366f1" fill="url(#colorTotal)" strokeWidth={4} />
                                                              <Area type="monotone" dataKey="adUnits" stroke="#10b981" fill="transparent" strokeWidth={2} />
                                                              <Area type="monotone" dataKey="organicUnits" stroke="#f59e0b" fill="transparent" strokeWidth={2} strokeDasharray="5 5" />
                                                            </AreaChart>
                                                          </ResponsiveContainer>
                                                        </div>
                                                      </div>

                                                      <div className="v2-card bg-white/40 border-white/60 p-8 shadow-xl">
                                                        <div className="flex items-center justify-between mb-8">
                                                          <h5 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                                                            <div className="w-2 h-6 bg-rose-500 rounded-full" /> 广告投放效果洞察
                                                          </h5>
                                                          <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500" /> CPC</div>
                                                            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-sky-500" /> ROAS</div>
                                                            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /> ACOS</div>
                                                          </div>
                                                        </div>
                                                        <div className="h-[280px]">
                                                          <ResponsiveContainer width="100%" height="100%">
                                                            <LineChart data={enrichedAnalytics.slice(-30)}>
                                                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                                              <XAxis dataKey="dateShort" fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontWeight: 700}} />
                                                              <YAxis yAxisId="left" fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontWeight: 700}} />
                                                              <YAxis yAxisId="right" orientation="right" fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontWeight: 700}} />
                                                              <Tooltip 
                                                                contentStyle={{ backgroundColor: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.5)', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.05)' }}
                                                              />
                                                              <Line yAxisId="left" type="monotone" dataKey="cpc" stroke="#ef4444" strokeWidth={4} dot={false} />
                                                              <Line yAxisId="left" type="monotone" dataKey="roas" stroke="#0ea5e9" strokeWidth={3} dot={false} />
                                                              <Line yAxisId="right" type="monotone" dataKey="acos" stroke="#10b981" strokeWidth={3} dot={false} />
                                                            </LineChart>
                                                          </ResponsiveContainer>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  </motion.div>
                                                )}

                                                {activeTab === 'logistics' && (
                                                  <motion.div 
                                                    key="logistics"
                                                    initial={{ opacity: 0, x: 20 }} 
                                                    animate={{ opacity: 1, x: 0 }} 
                                                    exit={{ opacity: 0, x: -20 }}
                                                    className="v2-card bg-white/40 border-white/60 p-8 shadow-xl"
                                                  >
                                                    <div className="flex items-center gap-3 mb-8">
                                                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                                        <Activity className="w-5 h-5 text-amber-600" />
                                                      </div>
                                                      <h5 className="text-sm font-black text-slate-900 uppercase tracking-tight">每日经营明细流水账</h5>
                                                    </div>
                                                    
                                                    <div className="v2-table-wrapper max-h-[500px] overflow-y-auto custom-scrollbar border border-white/50 rounded-2xl">
                                                      <table className="v2-table border-separate border-spacing-0">
                                                        <thead className="bg-white/80 backdrop-blur sticky top-0 z-10 text-[10px] uppercase font-black text-slate-400">
                                                          <tr>
                                                            <th className="px-6 py-4 text-left border-b border-slate-100">日期</th>
                                                            <th className="px-6 py-4 text-center border-b border-slate-100">流量概览 (访客/点击/曝光)</th>
                                                            <th className="px-6 py-4 text-center border-b border-slate-100">销量分布 (总数/广告/自然)</th>
                                                            <th className="px-6 py-4 text-center border-b border-slate-100">广告效率 (CPC/ROAS/ACOS)</th>
                                                            <th className="px-6 py-4 text-right border-b border-slate-100">净损益 (USD)</th>
                                                          </tr>
                                                        </thead>
                                                        <tbody className="text-[11px] font-bold divide-y divide-slate-50">
                                                          {analytics.map((row, rid) => {
                                                            const rowE = enrichedAnalytics.find(e => e.date === row.date);
                                                            return (
                                                              <tr key={rid} className="hover:bg-indigo-50/30 transition-colors">
                                                                <td className="px-6 py-4 text-left text-slate-500">{row.date}</td>
                                                                <td className="px-6 py-4 text-center text-slate-400">{rowE?.visits} <span className="opacity-30">/</span> {rowE?.clicks} <span className="opacity-30">/</span> {rowE?.impressions}</td>
                                                                <td className="px-6 py-4 text-center">
                                                                  <span className="text-indigo-600 font-black">{row.unitsCount}</span>
                                                                  <span className="mx-2 opacity-20">/</span>
                                                                  <span className="text-emerald-500">{rowE?.adUnits}</span>
                                                                  <span className="mx-2 opacity-20">/</span>
                                                                  <span className="text-amber-500">{rowE?.organicUnits}</span>
                                                                </td>
                                                                <td className="px-6 py-4 text-center">
                                                                  <span className="text-rose-500">${rowE?.cpc.toFixed(1)}</span>
                                                                  <span className="mx-2 opacity-20">|</span>
                                                                  <span className="text-sky-600">{rowE?.roas.toFixed(2)}</span>
                                                                  <span className="mx-2 opacity-20">|</span>
                                                                  <span className="text-emerald-600">{rowE?.acos.toFixed(1)}%</span>
                                                                </td>
                                                                <td className="px-6 py-4 text-right font-black text-rose-500">
                                                                  {row.lossUsd > 0 ? `-$${row.lossUsd.toFixed(1)}` : '-'}
                                                                </td>
                                                              </tr>
                                                            );
                                                          })}
                                                        </tbody>
                                                      </table>
                                                    </div>
                                                  </motion.div>
                                                )}

                                                {activeTab === 'ai' && (
                                                  <motion.div 
                                                    key="ai"
                                                    initial={{ opacity: 0, scale: 0.98 }} 
                                                    animate={{ opacity: 1, scale: 1 }} 
                                                    exit={{ opacity: 0, scale: 0.98 }}
                                                    className="grid grid-cols-1 lg:grid-cols-5 gap-8"
                                                  >
                                                    <div className="lg:col-span-3">
                                                      <SkuAiAnalysis 
                                                        sku={item.sku} 
                                                        skuName={item.productName} 
                                                        skuStats={analytics}
                                                        operationLogs={operationLogs.filter((op: any) => op.sku === item.sku)}
                                                      />
                                                    </div>
                                                    
                                                    <div className="lg:col-span-2 v2-card bg-white/40 border-white/60 p-8 shadow-xl overflow-hidden">
                                                      <div className="flex items-center gap-3 mb-8">
                                                        <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                                          <History className="w-5 h-5 text-white" />
                                                        </div>
                                                        <h5 className="text-sm font-black text-slate-900 uppercase tracking-tight">操作历史轨迹</h5>
                                                      </div>
                                                      
                                                      <div className="space-y-4 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
                                                        {(() => {
                                                          const skuLogs = operationLogs.filter((op: any) => op.sku === item.sku);
                                                          if (skuLogs.length === 0) {
                                                            return <div className="py-20 text-center text-slate-400 italic text-xs">暂无该 SKU 的历史操作记录。</div>;
                                                          }
                                                          return skuLogs.map((log: any, lid: number) => (
                                                            <div key={lid} className="group relative pl-6 pb-6 border-l-2 border-slate-100 last:pb-0">
                                                              <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-indigo-500 z-10" />
                                                              <div className="flex items-center justify-between mb-2">
                                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-tighter ${
                                                                  log.actionType === 'Price' ? 'bg-rose-500 text-white' :
                                                                  log.actionType === 'Stock' ? 'bg-emerald-500 text-white' :
                                                                  log.actionType === 'Ads' ? 'bg-sky-500 text-white' :
                                                                  'bg-slate-500 text-white'
                                                                }`}>
                                                                  {log.actionType === 'Price' ? '调价' : 
                                                                   log.actionType === 'Stock' ? '库存' : 
                                                                   log.actionType === 'Ads' ? '广告' : log.actionType}
                                                                </span>
                                                                <span className="text-[10px] text-slate-400 font-bold font-mono">{log.date}</span>
                                                              </div>
                                                              <p className="text-xs font-bold text-slate-700 leading-relaxed">{log.description}</p>
                                                              <div className="mt-2 text-[9px] text-slate-300 uppercase tracking-widest font-black">
                                                                {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                              </div>
                                                            </div>
                                                          ));
                                                        })()}
                                                      </div>
                                                    </div>
                                                  </motion.div>
                                                )}
                                              </AnimatePresence>
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
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
              onClick={closeForm}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="relative w-full max-w-2xl bg-white/90 backdrop-blur-2xl border border-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] rounded-[32px] overflow-hidden"
            >
              <div className="flex justify-between items-center p-8 border-b border-slate-100 bg-white/50">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                      <PackageX className="w-6 h-6 text-white" />
                   </div>
                   <div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">
                        {editingIndex !== null ? '修改资产档案' : '录入新产品'}
                      </h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">智能数据库资产管理系统</p>
                   </div>
                </div>
                <button onClick={closeForm} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-rose-600 transition-all rounded-xl hover:bg-rose-50">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={saveSku} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">SKU 唯一标识符</label>
                    <input required type="text" name="sku" value={formData.sku} onChange={handleInputChange} className="v2-input h-12 px-4" placeholder="MILY-X-001" />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">首发上架日期</label>
                    <input required type="date" name="listedDate" value={formData.listedDate} onChange={handleInputChange} className="v2-input h-12 px-4" />
                  </div>
                  
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">产品完整标题 / 规格参数</label>
                    <input required type="text" name="productName" value={formData.productName} onChange={handleInputChange} className="v2-input h-12 px-4" placeholder="Full product description..." />
                  </div>

                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">当前运营状态</label>
                    <select name="status" value={formData.status} onChange={handleInputChange} className="v2-input h-12 px-4 appearance-none cursor-pointer">
                      <option value="活跃中">活跃 (正常销售中)</option>
                      <option value="补货中">补货 (在途或生产中)</option>
                      <option value="缺货">缺货 (暂时停止销售)</option>
                    </select>
                  </div>

                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">资产预览图片 URL</label>
                    <div className="flex gap-4">
                      <input type="url" name="imageUrl" value={formData.imageUrl} onChange={handleInputChange} className="v2-input h-12 px-4 flex-1" placeholder="Image HTTPS Link" />
                      {formData.imageUrl && (
                        <div className="w-12 h-12 rounded-xl glass-panel p-1 border-white/60 overflow-hidden shrink-0">
                           <img src={formData.imageUrl} className="w-full h-full object-cover rounded-lg" alt="Preview" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="col-span-2 grid grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">采购成本 (CNY)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">¥</span>
                        <input required type="number" step="0.01" name="costRMB" value={formData.costRMB} onChange={handleInputChange} className="v2-input h-12 pl-8 pr-4" placeholder="0.00" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">销售价格 (MXN)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                        <input required type="number" step="0.01" name="priceMXN" value={formData.priceMXN} onChange={handleInputChange} className="v2-input h-12 pl-8 pr-4" placeholder="0.00" />
                      </div>
                    </div>
                  </div>

                  <div className="col-span-2 grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">仓库现有库存</label>
                      <input required type="number" name="inventory" value={formData.inventory} onChange={handleInputChange} className="v2-input h-12 px-4" placeholder="Physical count" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">供应链补货 (在途)</label>
                      <input type="number" name="replenishInventory" value={formData.replenishInventory || ''} onChange={handleInputChange} className="v2-input h-12 px-4" placeholder="Transit count" />
                    </div>
                  </div>
                </div>

                <div className="pt-8 flex justify-end items-center gap-4">
                  <button type="button" onClick={closeForm} className="px-8 py-3 rounded-2xl text-slate-500 hover:text-slate-900 font-black text-xs uppercase tracking-widest transition-all">
                    取消返回
                  </button>
                  <button type="submit" className="h-14 px-10 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-indigo-500/30 active:scale-95 transition-all">
                    <Save className="w-4 h-4" />
                    保存资产档案
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
