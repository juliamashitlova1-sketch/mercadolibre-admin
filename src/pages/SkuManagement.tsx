import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Plus, X, Save, RefreshCw, PackageX, Loader2 
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

import { supabase } from '../lib/supabase';
import SkuTableRow from '../components/sku/SkuTableRow';

export default function SkuManagement() {
  const [skus, setSkus] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  
  const { operationLogs } = useOutletContext<any>() || { operationLogs: [] };

  // Load Mercado Libre Data for Analytics
  const [mlData, setMlData] = useState<any>({ validSales: [], cancellations: [], refunds: [] });
  const [visitsHistory, setVisitsHistory] = useState<any>({});
  const [adsHistory, setAdsHistory] = useState<any>({});
  const [isLoadingAux, setIsLoadingAux] = useState(true);

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

  const fetchAuxiliaryData = async () => {
    setIsLoadingAux(true);
    try {
      // 1. Fetch Sales Data
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
      const visitsObj: any = {};
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
      const adsObj: any = {};
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
    } catch (err) {
      console.error('Error fetching local aux data:', err);
    } finally {
      setIsLoadingAux(false);
    }
  };

  useEffect(() => {
    fetchCloudData();
    fetchAuxiliaryData();
  }, []);

  const handleStatusChange = async (skuCode: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('skus')
        .update({ status: newStatus })
        .eq('sku', skuCode);
      
      if (error) throw error;
      setSkus(prev => prev.map(s => s.sku === skuCode ? { ...s, status: newStatus } : s));
    } catch (err: any) {
      alert('状态更新失败: ' + err.message);
    }
  };

  const globalSkuMetrics = useMemo(() => {
    const metrics: any = {};
    if (!mlData?.validSales) return metrics;
    mlData.validSales.forEach((entry: any) => {
      const sku = entry._sku;
      if (!sku) return;
      if (!metrics[sku]) metrics[sku] = { totalUnits: 0 };
      metrics[sku].totalUnits += parseInt(entry._units, 10) || 1;
    });
    return metrics;
  }, [mlData]);

  const initialFormState = {
    sku: '',
    productName: '',
    imageUrl: '',
    costRMB: '',
    priceMXN: '',
    inventory: '',
    replenishInventory: '',
    listedDate: new Date().toISOString().split('T')[0],
    status: '活跃中'
  };
  
  const [formData, setFormData] = useState(initialFormState);

  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openForm = (index: number | null = null) => {
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

  const saveSku = async (e: any) => {
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
    } catch (err: any) {
      alert('保存失败: ' + err.message);
    }
  };

  const deleteSku = async (index: number) => {
    if (window.confirm('确定要删除这个产品档案吗？相关数据分析可能会受影响。')) {
      try {
        const skuToDelete = skus[index].sku;
        const { error } = await supabase
          .from('skus')
          .delete()
          .eq('sku', skuToDelete);

        if (error) throw error;
        await fetchCloudData();
      } catch (err: any) {
        alert('删除失败: ' + err.message);
      }
    }
  };

  const handleExportPdf = useCallback(async (skuCode: string) => {
    const element = document.getElementById(`sku-dashboard-${skuCode}`);
    if (!element) return;

    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      const canvas = await html2canvas(element, {
        backgroundColor: '#0f172a',
        scale: 1.5,
        useCORS: true,
        allowTaint: false,
        imageTimeout: 15000,
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height],
      });
      
      pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
      pdf.save(`SKU_Report_${skuCode}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err: any) {
      console.error('PDF Export Error:', err);
    }
  }, []);

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
              className="cursor-pointer bg-sky-600 hover:bg-sky-50 text-white transition-all px-4 py-2 rounded-lg flex items-center justify-center space-x-2 shadow-md active:scale-95 text-xs font-medium"
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
                    <td colSpan={11} className="v2-table-td py-16 text-center italic text-slate-500">
                      暂无数据，点击右上角新建 SKU
                    </td>
                  </tr>
                ) : (
                  skus.map((item, index) => (
                    <SkuTableRow 
                      key={item.sku}
                      item={item}
                      index={index}
                      isExpanded={expandedIndex === index}
                      onExpand={setExpandedIndex}
                      onEdit={openForm}
                      onDelete={deleteSku}
                      onStatusChange={handleStatusChange}
                      onExportPdf={handleExportPdf}
                      globalSkuMetrics={globalSkuMetrics}
                      mlData={mlData}
                      visitsHistory={visitsHistory}
                      adsHistory={adsHistory}
                      operationLogs={operationLogs}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Form */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-800">{editingIndex !== null ? '编辑 SKU 档案' : '新增 SKU 档案'}</h3>
                <button onClick={closeForm} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <form onSubmit={saveSku} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 ml-1">SKU 编码</label>
                    <input 
                      name="sku" value={formData.sku} onChange={handleInputChange} 
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20" 
                      placeholder="e.g. MLY-001" required
                      disabled={editingIndex !== null}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 ml-1">产品缩写/名称</label>
                    <input 
                      name="productName" value={formData.productName} onChange={handleInputChange} 
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20" 
                      placeholder="e.g. 蓝牙耳机" required
                    />
                  </div>
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 ml-1">产品主图 URL</label>
                  <input 
                    name="imageUrl" value={formData.imageUrl} onChange={handleInputChange} 
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20" 
                    placeholder="https://..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 ml-1">成本 (RMB)</label>
                    <input 
                      name="costRMB" type="number" step="0.01" value={formData.costRMB} onChange={handleInputChange} 
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20" 
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 ml-1">售价 (MXN)</label>
                    <input 
                      name="priceMXN" type="number" step="0.01" value={formData.priceMXN} onChange={handleInputChange} 
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20" 
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 ml-1">初始库存 (件)</label>
                    <input 
                      name="inventory" type="number" value={formData.inventory} onChange={handleInputChange} 
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20" 
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 ml-1">上架日期</label>
                    <input 
                      name="listedDate" type="date" value={formData.listedDate} onChange={handleInputChange} 
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20" 
                    />
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button type="button" onClick={closeForm} className="flex-1 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors">取消</button>
                  <button type="submit" className="flex-2 bg-sky-600 hover:bg-sky-500 text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95">
                    <Save className="w-4 h-4" />
                    保存档案
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
