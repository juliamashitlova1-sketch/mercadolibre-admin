import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { OperationLog } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Edit2, Trash2, X, Save, Image as ImageIcon, 
  ChevronDown, ChevronUp, TrendingUp, AlertTriangle, 
  Activity, Eye, Loader2, PackageX, MousePointer2, 
  BarChart3, RefreshCw, Download, History, Users, Calendar
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

  const [skus, setSkus] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAux, setIsLoadingAux] = useState(false);
  const [skuDailyAnalytics, setSkuDailyAnalytics] = useState<any[]>([]);
  const [skuAdData, setSkuAdData] = useState<any[]>([]);
  const [skuVisitData, setSkuVisitData] = useState<any[]>([]);

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
      
      const mappedData = (data || []).map(item => ({
        ...item,
        costRMB: item.cost_rmb,
        priceMXN: item.price_mxn,
        productName: item.product_name,
        imageUrl: item.image_url,
        listedDate: item.listed_date,
        replenishInventory: item.replenish_inventory
      }));
      
      setSkus(mappedData);
    } catch (err) {
      console.error('Error fetching SKUs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAuxiliaryData = async () => {
    setIsLoadingAux(true);
    try {
      const [analyticsRes, adsRes, visitsRes] = await Promise.all([
        supabase.from('sku_daily_analytics').select('*'),
        supabase.from('sku_daily_ad_data_cleaning').select('*'),
        supabase.from('sku_daily_visit_data').select('*')
      ]);

      if (analyticsRes.data) setSkuDailyAnalytics(analyticsRes.data);
      if (adsRes.data) setSkuAdData(adsRes.data);
      if (visitsRes.data) setSkuVisitData(visitsRes.data);
    } catch (err) {
      console.error('Error fetching auxiliary data:', err);
    } finally {
      setIsLoadingAux(false);
    }
  };

  const getSkuDailyAnalytics = (sku: string) => {
    return skuDailyAnalytics
      .filter(item => item.sku.toLowerCase() === sku.toLowerCase())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const getSkuAdsForDate = (sku: string, date: string) => {
    return skuAdData.find(ad => ad.sku.toLowerCase() === sku.toLowerCase() && ad.date === date);
  };

  const getSkuVisitForDate = (sku: string, date: string) => {
    return skuVisitData.find(v => v.sku.toLowerCase() === sku.toLowerCase() && v.date === date);
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    sku: '',
    productName: '',
    costRMB: '',
    priceMXN: '',
    inventory: '0',
    replenishInventory: '0',
    listedDate: new Date().toISOString().split('T')[0],
    status: '活跃中',
    imageUrl: ''
  });

  const [expandedSku, setExpandedSku] = useState<string | null>(null);

  const openForm = (index: number | null = null) => {
    if (index !== null) {
      const sku = skus[index];
      setFormData({
        sku: sku.sku,
        productName: sku.productName,
        costRMB: sku.costRMB.toString(),
        priceMXN: sku.priceMXN.toString(),
        inventory: sku.inventory.toString(),
        replenishInventory: (sku.replenishInventory || 0).toString(),
        listedDate: sku.listedDate,
        status: sku.status,
        imageUrl: sku.imageUrl || ''
      });
      setEditingIndex(index);
    } else {
      setFormData({
        sku: '',
        productName: '',
        costRMB: '',
        priceMXN: '',
        inventory: '0',
        replenishInventory: '0',
        listedDate: new Date().toISOString().split('T')[0],
        status: '活跃中',
        imageUrl: ''
      });
      setEditingIndex(null);
    }
    setIsModalOpen(true);
  };

  const closeForm = () => {
    setIsModalOpen(false);
    setEditingIndex(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const saveSku = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      sku: formData.sku,
      product_name: formData.productName,
      cost_rmb: parseFloat(formData.costRMB),
      price_mxn: parseFloat(formData.priceMXN),
      inventory: parseInt(formData.inventory),
      replenish_inventory: parseInt(formData.replenishInventory),
      listed_date: formData.listedDate,
      status: formData.status,
      image_url: formData.imageUrl
    };

    try {
      if (editingIndex !== null) {
        const { error } = await supabase
          .from('skus')
          .update(payload)
          .eq('id', skus[editingIndex].id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('skus')
          .insert([payload]);
        if (error) throw error;
      }
      fetchCloudData();
      closeForm();
    } catch (err) {
      console.error('Error saving SKU:', err);
      alert('保存失败，请检查网络或数据格式');
    }
  };

  const deleteSku = async (id: string) => {
    if (window.confirm('确定要删除这个 SKU 档案吗？此操作不可撤销。')) {
      try {
        const { error } = await supabase
          .from('skus')
          .delete()
          .eq('id', id);
        if (error) throw error;
        fetchCloudData();
      } catch (err) {
        console.error('Error deleting SKU:', err);
      }
    }
  };

  const handleExportPdf = async (skuCode: string) => {
    const element = document.getElementById(`sku-dashboard-${skuCode}`);
    if (!element) return;
    
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
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
      alert(`导出 PDF 失败: ${err.message}`);
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
            <button onClick={() => { fetchCloudData(); fetchAuxiliaryData(); }} className="v2-button-secondary p-2">
              <RefreshCw className={`w-4 h-4 ${(isLoading || isLoadingAux) ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => openForm()} className="v2-button-primary px-4 py-2 flex items-center gap-2">
              <Plus className="w-4 h-4" /> 新增 SKU
            </button>
          </div>
        </header>

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
                  <th className="v2-table-th">状态</th>
                  <th className="v2-table-th text-right">操作</th>
                </tr>
              </thead>
              <tbody className="v2-table-tbody">
                {isLoading ? (
                  <tr><td colSpan={10} className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-sky-500" /></td></tr>
                ) : skus.length === 0 ? (
                  <tr><td colSpan={10} className="py-20 text-center text-slate-400">暂无 SKU 档案记录</td></tr>
                ) : (
                  skus.map((item, index) => (
                    <React.Fragment key={item.id}>
                      <tr className={`v2-table-tr ${expandedSku === item.sku ? 'bg-sky-50/30' : ''}`}>
                        <td className="v2-table-td">
                          <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden border border-slate-200">
                            {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" alt="" /> : <ImageIcon className="w-full h-full p-3 text-slate-300" />}
                          </div>
                        </td>
                        <td className="v2-table-td font-mono font-bold text-sky-600">{item.sku}</td>
                        <td className="v2-table-td font-medium max-w-[200px] truncate" title={item.productName}>{item.productName}</td>
                        <td className="v2-table-td font-mono">¥{item.costRMB}</td>
                        <td className="v2-table-td font-mono">${item.priceMXN}</td>
                        <td className="v2-table-td text-center">{item.inventory}</td>
                        <td className="v2-table-td text-center text-slate-400">{item.replenishInventory || 0}</td>
                        <td className="v2-table-td text-center font-black">{(parseInt(item.inventory) || 0) + (parseInt(item.replenishInventory) || 0)}</td>
                        <td className="v2-table-td">
                          <span className={`v2-status-badge ${item.status === '活跃中' ? 'v2-status-active' : item.status === '补货中' ? 'v2-status-warning' : 'v2-status-error'}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="v2-table-td">
                          <div className="flex justify-end gap-1.5">
                            <button onClick={() => setExpandedSku(expandedSku === item.sku ? null : item.sku)} className="v2-action-btn hover:bg-sky-100 hover:text-sky-600">
                              <Activity className="w-4 h-4" />
                            </button>
                            <button onClick={() => openForm(index)} className="v2-action-btn hover:bg-slate-100 hover:text-slate-600">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => deleteSku(item.id)} className="v2-action-btn hover:bg-rose-100 hover:text-rose-600">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedSku === item.sku && (
                        <tr>
                          <td colSpan={10} className="p-4 bg-slate-50/50">
                            <div className="bg-white rounded-xl border border-slate-200 shadow-xl p-6">
                              {(() => {
                                const analytics = getSkuDailyAnalytics(item.sku);
                                if (analytics.length === 0) return <div className="py-12 text-center text-slate-400 italic">暂无经营数据</div>;

                                const enrichedAnalytics = analytics.map(row => {
                                  const ads = getSkuAdsForDate(item.sku, row.date);
                                  const visitInfo = getSkuVisitForDate(item.sku, row.date);
                                  const adUnits = ads ? (parseInt(ads.adOrders, 10) || 0) : 0;
                                  const visits = visitInfo ? visitInfo.uniqueVisits : 0;
                                  const clicks = ads ? (parseInt(ads.clicks, 10) || 0) : 0;
                                  const impressions = ads ? (parseInt(ads.impressions, 10) || 0) : 0;
                                  const adSpend = ads ? (parseFloat(ads.adSpend) || 0) : 0;
                                  const roas = row.roas || 0;
                                  const cpc = row.cpc || 0;
                                  const acos = row.acos || 0;

                                  return {
                                    ...row,
                                    adUnits,
                                    organicUnits: Math.max(0, (row.unitsCount || 0) - adUnits),
                                    visits,
                                    clicks,
                                    impressions,
                                    roas,
                                    cpc,
                                    acos,
                                    dateShort: row.date.slice(5)
                                  };
                                });

                                return (
                                  <div className="space-y-6" id={`sku-dashboard-${item.sku}`}>
                                    <div className="flex items-center justify-between border-b pb-4">
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600">
                                          <Activity className="w-6 h-6" />
                                        </div>
                                        <div>
                                          <h4 className="text-sm font-black text-slate-800">{item.productName}</h4>
                                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                                            <span className="font-mono">{item.sku}</span> | <Calendar className="w-3 h-3" /> 过去 30 天数据
                                          </div>
                                        </div>
                                      </div>
                                      <button onClick={() => handleExportPdf(item.sku)} className="v2-button-primary py-1.5 px-3 text-[10px] flex items-center gap-2">
                                        <Download className="w-3 h-3" /> 导出报告
                                      </button>
                                    </div>

                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                      {[
                                        { label: '自然访客', val: enrichedAnalytics.reduce((acc, curr) => acc + (curr.visits || 0), 0), icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                                        { label: '广告曝光', val: enrichedAnalytics.reduce((acc, curr) => acc + (curr.impressions || 0), 0), icon: Activity, color: 'text-sky-600', bg: 'bg-sky-50' },
                                        { label: '自然销量', val: enrichedAnalytics.reduce((acc, curr) => acc + (curr.organicUnits || 0), 0), icon: BarChart3, color: 'text-amber-600', bg: 'bg-amber-50' },
                                        { label: '平均 ROAS', val: (enrichedAnalytics.reduce((acc, curr) => acc + (curr.roas || 0), 0) / enrichedAnalytics.length).toFixed(2), icon: MousePointer2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                                      ].map((card, cid) => (
                                        <div key={cid} className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 shadow-sm">
                                          <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center ${card.color}`}><card.icon className="w-4 h-4" /></div>
                                            <div>
                                              <div className="text-[10px] font-bold text-slate-400 uppercase">{card.label}</div>
                                              <div className="text-base font-black text-slate-700">{card.val}</div>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>

                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                      <div className="v2-card bg-white p-5 border-slate-100 shadow-md">
                                        <div className="text-xs font-black mb-4 flex items-center gap-2 text-slate-700"><BarChart3 className="w-4 h-4 text-sky-600" /> 销售趋势</div>
                                        <div className="h-[220px]">
                                          <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={enrichedAnalytics.slice(-30)}>
                                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                              <XAxis dataKey="dateShort" fontSize={9} axisLine={false} tickLine={false} />
                                              <YAxis fontSize={9} axisLine={false} tickLine={false} />
                                              <Tooltip />
                                              <Area type="monotone" dataKey="unitsCount" stroke="#ef4444" fill="#fee2e2" strokeWidth={3} />
                                              <Area type="monotone" dataKey="adUnits" stroke="#10b981" fill="transparent" strokeWidth={2} />
                                              <Area type="monotone" dataKey="organicUnits" stroke="#f59e0b" fill="transparent" strokeWidth={1} strokeDasharray="4 4" />
                                            </AreaChart>
                                          </ResponsiveContainer>
                                        </div>
                                      </div>

                                      <div className="v2-card bg-white p-5 border-slate-100 shadow-md">
                                        <div className="text-xs font-black mb-4 flex items-center gap-2 text-slate-700"><Activity className="w-4 h-4 text-purple-600" /> 流量曝光对比</div>
                                        <div className="h-[220px]">
                                          <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={enrichedAnalytics.slice(-30)}>
                                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                              <XAxis dataKey="dateShort" fontSize={9} axisLine={false} tickLine={false} />
                                              <YAxis yAxisId="left" fontSize={9} axisLine={false} tickLine={false} />
                                              <YAxis yAxisId="right" orientation="right" fontSize={9} axisLine={false} tickLine={false} />
                                              <Tooltip />
                                              <Line yAxisId="left" type="monotone" dataKey="visits" stroke="#a855f7" strokeWidth={3} dot={false} />
                                              <Line yAxisId="right" type="monotone" dataKey="impressions" stroke="#94a3b8" strokeWidth={2} dot={false} />
                                            </LineChart>
                                          </ResponsiveContainer>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                                      <div className="xl:col-span-3 v2-card bg-white p-5 border-slate-100 shadow-md">
                                        <div className="text-xs font-black mb-4 flex items-center gap-2 text-slate-700"><MousePointer2 className="w-4 h-4 text-rose-500" /> 广告表现 (CPC/ROAS/ACOS)</div>
                                        <div className="h-[220px]">
                                          <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={enrichedAnalytics.slice(-30)}>
                                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                              <XAxis dataKey="dateShort" fontSize={9} axisLine={false} tickLine={false} />
                                              <YAxis yAxisId="left" fontSize={9} axisLine={false} tickLine={false} />
                                              <YAxis yAxisId="right" orientation="right" fontSize={9} axisLine={false} tickLine={false} />
                                              <Tooltip />
                                              <Line yAxisId="left" type="monotone" dataKey="cpc" stroke="#ef4444" strokeWidth={3} dot={false} />
                                              <Line yAxisId="left" type="monotone" dataKey="roas" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                                              <Line yAxisId="right" type="monotone" dataKey="acos" stroke="#10b981" strokeWidth={2} dot={false} />
                                            </LineChart>
                                          </ResponsiveContainer>
                                        </div>
                                      </div>
                                      <div className="xl:col-span-2">
                                        <SkuAiAnalysis sku={item.sku} skuName={item.productName} skuStats={analytics} operationLogs={operationLogs.filter((op: any) => op.sku === item.sku)} />
                                      </div>
                                    </div>

                                    <div className="v2-card bg-white p-5 border-slate-100 shadow-md">
                                      <div className="text-xs font-black mb-4 flex items-center gap-2 text-slate-700"><Activity className="w-4 h-4 text-orange-500" /> 每日明细</div>
                                      <div className="v2-table-wrapper max-h-[300px] overflow-y-auto">
                                        <table className="v2-table">
                                          <thead>
                                            <tr className="text-[9px] uppercase text-slate-400">
                                              <th className="px-3 py-2 text-left">日期</th>
                                              <th className="px-3 py-2">流量 (访/曝)</th>
                                              <th className="px-3 py-2">销量 (总/广/自)</th>
                                              <th className="px-3 py-2">广告 (CPC/ROAS/ACOS)</th>
                                            </tr>
                                          </thead>
                                          <tbody className="text-[10px] font-mono">
                                            {enrichedAnalytics.map((rowE, rid) => (
                                              <tr key={rid} className="hover:bg-slate-50 transition-colors border-t border-slate-50 text-center">
                                                <td className="px-3 py-2 text-left font-bold text-slate-500">{rowE.date}</td>
                                                <td className="px-3 py-2 text-slate-400">{rowE.visits}访 / {rowE.impressions}曝</td>
                                                <td className="px-3 py-2">
                                                  <span className="text-rose-600">{rowE.unitsCount}</span> / <span className="text-emerald-600">{rowE.adUnits}</span> / <span className="text-amber-500">{rowE.organicUnits}</span>
                                                </td>
                                                <td className="px-3 py-2">
                                                  <span className="text-rose-500">${rowE.cpc.toFixed(2)}</span> | <span className="text-sky-600">{rowE.roas.toFixed(2)}</span> | <span className="text-emerald-600">{rowE.acos.toFixed(2)}%</span>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>

                                    <div className="v2-card bg-white p-5 border-slate-100 shadow-md">
                                      <div className="text-xs font-black mb-4 flex items-center gap-2 text-slate-700"><History className="w-4 h-4 text-indigo-500" /> 历史日志</div>
                                      <div className="max-h-[200px] overflow-y-auto text-[10px]">
                                        {(() => {
                                          const skuLogs = operationLogs.filter((op: any) => op.sku === item.sku);
                                          if (skuLogs.length === 0) return <div className="py-4 text-center text-slate-400">暂无历史记录</div>;
                                          return skuLogs.map((log: any, lid: number) => (
                                            <div key={lid} className="flex gap-4 py-2 border-t border-slate-50 first:border-0 hover:bg-slate-50 px-2 rounded-lg">
                                              <div className="font-bold text-slate-500 whitespace-nowrap">{log.date}</div>
                                              <div className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-bold uppercase text-[8px]">{log.actionType}</div>
                                              <div className="text-slate-600 flex-1">{log.description}</div>
                                            </div>
                                          ));
                                        })()}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeForm} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg bg-white border border-slate-200 shadow-2xl rounded-xl overflow-hidden">
              <div className="flex justify-between items-center p-5 border-b">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2"><PackageX className="w-4 h-4 text-sky-600" /> {editingIndex !== null ? '修改 SKU' : '新增 SKU'}</h3>
                <button onClick={closeForm} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={saveSku} className="p-5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">SKU</label>
                    <input required name="sku" value={formData.sku} onChange={handleInputChange} className="v2-input" />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">上架时间</label>
                    <input required type="date" name="listedDate" value={formData.listedDate} onChange={handleInputChange} className="v2-input" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">产品名称</label>
                    <input required name="productName" value={formData.productName} onChange={handleInputChange} className="v2-input" />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">图片 URL</label>
                    <input name="imageUrl" value={formData.imageUrl} onChange={handleInputChange} className="v2-input" />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">成本 (RMB)</label>
                    <input required type="number" step="0.01" name="costRMB" value={formData.costRMB} onChange={handleInputChange} className="v2-input" />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">售价 (MXN)</label>
                    <input required type="number" step="0.01" name="priceMXN" value={formData.priceMXN} onChange={handleInputChange} className="v2-input" />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">库存</label>
                    <input required type="number" name="inventory" value={formData.inventory} onChange={handleInputChange} className="v2-input" />
                  </div>
                </div>
                <div className="pt-4 flex justify-end gap-2">
                  <button type="button" onClick={closeForm} className="v2-button-secondary px-5 py-2">取消</button>
                  <button type="submit" className="v2-button-primary px-5 py-2 flex items-center gap-2"><Save className="w-4 h-4" /> 保存档案</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
