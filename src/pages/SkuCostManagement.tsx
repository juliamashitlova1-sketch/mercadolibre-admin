import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, Search, RefreshCw, Calculator, Save, 
  Box, Ruler, Scale, ChevronDown, ChevronUp, Package, Truck, Plane, CreditCard, Info, Clock,
  BarChart3
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { calculatePlatformFees } from '../utils/calculator';

export default function SkuCostManagement() {
  const [skus, setSkus] = useState([]);
  const [pricingRecords, setPricingRecords] = useState({});
  const [allPricingRecords, setAllPricingRecords] = useState({}); // sku -> records[]
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editedData, setEditedData] = useState({});
  const [expandedSkus, setExpandedSkus] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: skuData, error: skuError } = await supabase
        .from('skus')
        .select('*')
        .order('created_at', { ascending: false });
      if (skuError) throw skuError;

      const { data: priceData, error: priceError } = await supabase
        .from('sku_pricing')
        .select('*')
        .order('created_at', { ascending: false }); // 最新记录在前
      if (priceError) throw priceError;

      const priceMap = {};
      const fullPriceMap = {};
      priceData.forEach(item => {
        const skuKey = item.sku?.toUpperCase();
        if (skuKey) {
          if (!fullPriceMap[skuKey]) fullPriceMap[skuKey] = [];
          fullPriceMap[skuKey].push(item);
          if (!priceMap[skuKey]) priceMap[skuKey] = item;
        }
      });

      setSkus(skuData || []);
      setPricingRecords(priceMap);
      setAllPricingRecords(fullPriceMap);
      
      const initialEdited = {};
      skuData.forEach(s => {
        const p = priceMap[s.sku.toUpperCase()];
        initialEdited[s.sku.toUpperCase()] = {
          purchasePriceCny: p?.purchase_price_cny || parseFloat(s.cost_rmb) || 0,
          replenishmentQty: p?.replenishment_qty || 0,
          sellingPriceMxn: p?.selling_price_mxn || parseFloat(s.price_mxn) || 0,
          exchangeRate: p?.exchange_rate || 0.3891,
          commissionRate: p?.commission_rate !== undefined ? p.commission_rate : 0.175,
          adRate: p?.ad_rate !== undefined ? p.ad_rate : 0.08,
          returnRate: p?.return_rate !== undefined ? p.return_rate : 0.02,
          taxRate: p?.tax_rate !== undefined ? p.tax_rate : 0.0905,
          boxLength: p?.box_length || 0,
          boxWidth: p?.box_width || 0,
          boxHeight: p?.box_height || 0,
          packCount: p?.pack_count || 0,
          boxWeight: p?.box_weight || 0,
          unitLength: p?.unit_length || 0,
          unitWidth: p?.unit_width || 0,
          unitHeight: p?.unit_height || 0,
          productWeight: p?.product_weight || 0,
          logisticsMode: p?.logistics_mode || '海运',
          seaFreightUnitPrice: p?.sea_freight_unit_price || 0,
          airFreightUnitPrice: p?.air_freight_unit_price || 0,
          boxCount: p?.pack_count > 0 ? (p.replenishment_qty / p.pack_count) : 0,
          purchaseLogistics: p?.logistics_provider || ''
        };
      });
      setEditedData(initialEdited);

    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (sku, field, value) => {
    const skuKey = sku.toUpperCase();
    if (field === 'all') {
      const record = value;
      setEditedData(prev => ({
        ...prev,
        [skuKey]: {
          ...prev[skuKey],
          purchasePriceCny: record.purchase_price_cny || 0,
          replenishmentQty: record.replenishment_qty || 100,
          sellingPriceMxn: record.selling_price_mxn || 0,
          exchangeRate: record.exchange_rate || 0.3891,
          commissionRate: record.commission_rate || 0.175,
          adRate: record.ad_rate || 0.08,
          returnRate: record.return_rate || 0.02,
          taxRate: record.tax_rate || 0.0905,
          boxLength: record.box_length || 40,
          boxWidth: record.box_width || 30,
          boxHeight: record.box_height || 30,
          packCount: record.pack_count || 100,
          boxWeight: record.box_weight || 15,
          unitLength: record.unit_length || 10,
          unitWidth: record.unit_width || 5,
          unitHeight: record.unit_height || 5,
          productWeight: record.product_weight || 0.15,
          logisticsMode: record.logistics_mode || '海运',
          seaFreightUnitPrice: record.sea_freight_unit_price || 3100,
          airFreightUnitPrice: record.air_freight_unit_price || 95,
          boxCount: (record.replenishment_qty > 0 && record.pack_count > 0) ? Math.ceil(record.replenishment_qty / record.pack_count) : 1,
          purchaseLogistics: record.logistics_provider || ''
        }
      }));
    } else {
      setEditedData(prev => ({
        ...prev,
        [skuKey]: {
          ...prev[skuKey],
          [field]: value
        }
      }));
    }
  };

  const toggleExpand = (sku) => {
    setExpandedSkus(prev => ({
      ...prev,
      [sku]: !prev[sku]
    }));
  };

  const calculateSkuMetrics = (skuKey) => {
    const f = editedData[skuKey];
    if (!f) return null;

    const { fixedFee, lastMileFee, volumetricWeight, ar59Weight } = calculatePlatformFees(
      f.sellingPriceMxn,
      f.productWeight,
      f.unitLength,
      f.unitWidth,
      f.unitHeight
    );

    const commissionMxn = f.sellingPriceMxn * f.commissionRate;
    const adFeeMxn = f.sellingPriceMxn * f.adRate;
    const returnFeeMxn = f.sellingPriceMxn * f.returnRate;
    const taxMxn = f.sellingPriceMxn * f.taxRate;
    const totalFeesMxn = commissionMxn + fixedFee + lastMileFee + adFeeMxn + returnFeeMxn + taxMxn;
    
    const payoutMxn = f.sellingPriceMxn - totalFeesMxn;
    const payoutCny = payoutMxn * f.exchangeRate;

    const replenishmentQty = f.boxCount * f.packCount;
    const boxCount = f.boxCount;
    const singleBoxVolumeM3 = (f.boxLength * f.boxWidth * f.boxHeight) / 1000000;
    const singleBoxVolumetricWeight = (f.boxLength * f.boxWidth * f.boxHeight) / 6000;
    const singleBoxChargeableWeight = Math.max(f.boxWeight, singleBoxVolumetricWeight);
    
    const totalVolume = singleBoxVolumeM3 * boxCount;
    const totalChargeableWeight = singleBoxChargeableWeight * boxCount;

    const seaFreightTotal = totalVolume * f.seaFreightUnitPrice;
    const seaFreightPerUnit = replenishmentQty > 0 ? (seaFreightTotal / replenishmentQty) : 0;
    
    const airFreightTotal = totalChargeableWeight * f.airFreightUnitPrice;
    const airFreightPerUnit = replenishmentQty > 0 ? (airFreightTotal / replenishmentQty) : 0;

    const currentFreightPerUnit = f.logisticsMode === '空运' ? airFreightPerUnit : seaFreightPerUnit;

    const unitProfitCny = payoutCny - f.purchasePriceCny - currentFreightPerUnit;
    const margin = (f.sellingPriceMxn * f.exchangeRate) > 0 ? (unitProfitCny / (f.sellingPriceMxn * f.exchangeRate)) : 0;
    const roi = (f.purchasePriceCny + currentFreightPerUnit) > 0 ? (unitProfitCny / (f.purchasePriceCny + currentFreightPerUnit)) : 0;

    const feeRateSum = f.commissionRate + f.adRate + f.returnRate + f.taxRate;
    const breakEvenSellingMxn = (1 - feeRateSum) > 0 
      ? ( ( (f.purchasePriceCny + currentFreightPerUnit) / f.exchangeRate) + fixedFee + lastMileFee ) / (1 - feeRateSum)
      : 0;

    return {
      fixedFee,
      lastMileFee,
      singleUnitVolumetricWeight: volumetricWeight,
      ar59Weight,
      commissionMxn,
      commissionCny: commissionMxn * f.exchangeRate,
      adFeeMxn,
      taxMxn,
      taxCny: taxMxn * f.exchangeRate,
      totalFeesMxn,
      payoutCny,
      freightPerUnit: currentFreightPerUnit,
      unitProfitCny,
      totalGrossProfitRmb: unitProfitCny * replenishmentQty,
      margin,
      roi,
      breakEvenSellingMxn,
      totalVolume,
      seaFreightPerUnit,
      airFreightPerUnit
    };
  };

  const handleSave = async (sku) => {
    const skuKey = sku.toUpperCase();
    const f = editedData[skuKey];
    const m = calculateSkuMetrics(skuKey);
    if (!f || !m) return;

    setIsSaving(true);
    try {
      const saveData = {
        sku: skuKey,
        purchase_price_cny: f.purchasePriceCny,
        replenishment_qty: f.boxCount * f.packCount,
        selling_price_mxn: f.sellingPriceMxn,
        exchange_rate: f.exchangeRate,
        commission_rate: f.commissionRate,
        ad_rate: f.adRate,
        return_rate: f.returnRate,
        tax_rate: f.taxRate,
        box_length: f.boxLength,
        box_width: f.boxWidth,
        box_height: f.boxHeight,
        pack_count: f.packCount,
        box_weight: f.boxWeight,
        unit_length: f.unitLength,
        unit_width: f.unitWidth,
        unit_height: f.unitHeight,
        product_weight: f.productWeight,
        logistics_mode: f.logisticsMode,
        sea_freight_unit_price: f.seaFreightUnitPrice,
        air_freight_unit_price: f.airFreightUnitPrice,
        fixed_fee: m.fixedFee,
        last_mile_fee: m.lastMileFee,
        margin: m.margin * 100,
        roi: (f.purchasePriceCny + m.freightPerUnit) > 0 ? (m.unitProfitCny / (f.purchasePriceCny + m.freightPerUnit)) : 0,
        unit_profit_cny: m.unitProfitCny,
        logistics_provider: f.purchaseLogistics,
        status: 'priced'
      };

      await supabase.from('skus').update({
        cost_rmb: f.purchasePriceCny,
        price_mxn: f.sellingPriceMxn
      }).eq('sku', skuKey);

      const { error } = await supabase
        .from('sku_pricing')
        .insert([saveData]);

      if (error) throw error;
      alert(`SKU ${sku} 数据同步成功，主表基础价已更新`);
    } catch (err) {
      console.error('Error saving data:', err);
      alert('保存失败: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredSkus = useMemo(() => {
    return skus.filter(s => 
      s.sku?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.product_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [skus, searchTerm]);

  const inputCls = "w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-2 text-[11px] font-mono text-slate-900 outline-none focus:border-sky-500 focus:bg-white transition-all";
  const labelCls = "block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 px-0.5";

  return (
    <div className="v2-page-container">
      <div className="v2-inner-container">
        <header className="v2-header">
          <div className="flex items-center space-x-4">
            <div className="v2-header-icon bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-orange-500/20">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="v2-header-title text-slate-900">SKU 成本细节管理</h1>
              <p className="v2-header-subtitle font-medium">统一调度各 SKU 的采购、物流及平台费率参数</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
              <input 
                type="text"
                placeholder="搜索 SKU 或 品名..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-sky-500 focus:shadow-lg focus:shadow-sky-500/10 transition-all w-72 shadow-sm font-medium"
              />
            </div>
            <button 
              onClick={fetchData} 
              className="p-2.5 bg-white border border-slate-200 text-slate-500 hover:text-sky-600 hover:bg-sky-50 hover:border-sky-100 rounded-xl transition-all shadow-sm"
              title="刷新数据"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        <div className="v2-card shadow-2xl shadow-slate-200/50">
          <div className="v2-table-wrapper max-h-[750px] custom-scrollbar">
            <table className="v2-table">
              <thead className="v2-table-thead">
                <tr>
                  <th className="v2-table-th">产品基础信息</th>
                  <th className="v2-table-th text-center">采购成本</th>
                  <th className="v2-table-th text-center">物流分摊</th>
                  <th className="v2-table-th text-center">预估佣金</th>
                  <th className="v2-table-th text-center">增值税</th>
                  <th className="v2-table-th text-center">盈利</th>
                  <th className="v2-table-th text-right">控制</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr><td colSpan={7} className="px-4 py-32 text-center text-slate-400 font-bold italic text-sm">正在同步云端核价库...</td></tr>
                ) : filteredSkus.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-32 text-center text-slate-400 font-bold italic text-sm">未找到匹配的 SKU 档案</td></tr>
                ) : filteredSkus.map((skuItem) => {
                  const skuKey = skuItem.sku.toUpperCase();
                  const f = editedData[skuKey];
                  const m = calculateSkuMetrics(skuKey);
                  if (!f || !m) return null;
                  const isExpanded = expandedSkus[skuKey];

                  return (
                    <React.Fragment key={skuItem.id}>
                      <tr className={`v2-table-tr group cursor-pointer transition-colors ${isExpanded ? 'bg-sky-50/30' : ''}`} onClick={() => toggleExpand(skuKey)}>
                        <td className="v2-table-td">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl border border-slate-100 overflow-hidden bg-white flex-shrink-0 shadow-md group-hover:scale-105 transition-transform">
                              <img src={skuItem.image_url} alt="SKU" className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-base font-black text-slate-900 flex items-center gap-2">
                                {skuItem.sku}
                                {isExpanded ? <ChevronUp className="w-4 h-4 text-sky-500" /> : <ChevronDown className="w-4 h-4 text-slate-300" />}
                              </div>
                              <div className="text-[10px] text-slate-400 font-bold truncate max-w-[300px] uppercase tracking-wide mt-0.5">
                                {skuItem.product_name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="v2-table-td text-center">
                          <div className="text-xs font-mono font-black text-slate-600">¥{f.purchasePriceCny.toFixed(2)}</div>
                        </td>
                        <td className="v2-table-td text-center">
                          <div className="text-xs font-mono font-black text-sky-600">¥{m.freightPerUnit.toFixed(2)}</div>
                        </td>
                        <td className="v2-table-td text-center">
                          <div className="text-xs font-mono font-black text-rose-600">¥{m.commissionCny.toFixed(2)}</div>
                        </td>
                        <td className="v2-table-td text-center">
                          <div className="text-xs font-mono font-black text-amber-600">¥{m.taxCny.toFixed(2)}</div>
                        </td>
                        <td className="v2-table-td text-center">
                           <div className="flex flex-col items-center justify-center">
                              <div className={`text-sm font-black ${m.unitProfitCny > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                ¥{m.unitProfitCny.toFixed(1)}
                              </div>
                              <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5">
                                Margin: {(m.margin * 100).toFixed(1)}%
                              </div>
                           </div>
                        </td>
                        <td className="v2-table-td text-right">
                           <button 
                            onClick={(e) => { e.stopPropagation(); handleSave(skuItem.sku); }} 
                            disabled={isSaving}
                            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-[11px] font-black text-white rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 inline-block"
                           >
                              {isSaving ? '...' : '保存修改'}
                           </button>
                        </td>
                      </tr>
                      
                      <AnimatePresence>
                        {isExpanded && (
                          <tr>
                            <td colSpan={7} className="p-0 border-none bg-slate-50/50">
                               <motion.div 
                                 initial={{ height: 0, opacity: 0 }} 
                                 animate={{ height: 'auto', opacity: 1 }} 
                                 exit={{ height: 0, opacity: 0 }}
                                 className="overflow-hidden"
                               >
                                 <div className="p-8 space-y-8">
                                    {/* 0. 待核价记录选择 */}
                                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                                       <div className="flex items-center gap-4">
                                          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 shadow-sm">
                                             <Clock className="w-6 h-6" />
                                          </div>
                                          <div>
                                             <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">加载新品核价库记录</div>
                                             <select 
                                               className="text-sm font-black text-slate-900 bg-transparent outline-none cursor-pointer mt-0.5"
                                               onChange={(e) => {
                                                  const selectedId = e.target.value;
                                                  const record = allPricingRecords[skuKey]?.find(r => r.id === selectedId);
                                                  if (record) handleInputChange(skuKey, 'all', record);
                                               }}
                                             >
                                                <option value="">-- 选择待核价记录进行同步 --</option>
                                                {allPricingRecords[skuKey]?.filter(r => r.status === 'priced').map(r => (
                                                   <option key={r.id} value={r.id}>
                                                      [待核价] {r.created_at.slice(0,16)} | ¥{r.purchase_price_cny} → ${r.selling_price_mxn} | {r.auditor || '系统'}
                                                   </option>
                                                ))}
                                             </select>
                                          </div>
                                       </div>
                                       <div className="flex items-center gap-4">
                                          <div className="v2-stat-card bg-slate-50 border-slate-200/60 px-4 py-2 flex flex-col items-center min-w-[100px]">
                                             <span className="text-[8px] font-bold text-slate-400 uppercase">当前汇率</span>
                                             <input type="number" step="0.0001" value={f.exchangeRate} onChange={e=>handleInputChange(skuItem.sku, 'exchangeRate', Number(e.target.value))} className="text-sm font-mono font-black text-indigo-600 outline-none w-full text-center bg-transparent mt-0.5" />
                                          </div>
                                       </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                       {/* 1. Core Params & Logistics Specs */}
                                       <div className="lg:col-span-8 space-y-6">
                                          <div className="v2-card p-6 bg-white border-slate-100 shadow-lg">
                                             <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                                <div>
                                                   <label className={labelCls}>采购价 (¥)</label>
                                                   <input className={`${inputCls} bg-sky-50 font-black border-sky-200 text-sky-700 h-10`} type="number" step="0.1" value={f.purchasePriceCny} onChange={e=>handleInputChange(skuItem.sku, 'purchasePriceCny', parseFloat(e.target.value))} />
                                                </div>
                                                <div>
                                                   <label className={labelCls}>墨西哥售价 ($)</label>
                                                   <input className={`${inputCls} bg-emerald-50 font-black border-emerald-200 text-emerald-700 h-10`} type="number" step="0.1" value={f.sellingPriceMxn} onChange={e=>handleInputChange(skuItem.sku, 'sellingPriceMxn', parseFloat(e.target.value))} />
                                                </div>
                                                <div>
                                                   <label className={labelCls}>装箱数</label>
                                                   <input className={`${inputCls} h-10`} type="number" value={f.packCount} onChange={e=>{
                                                      const val = parseInt(e.target.value);
                                                      handleInputChange(skuItem.sku, 'packCount', val);
                                                   }} />
                                                </div>
                                                <div>
                                                   <label className={labelCls}>箱数</label>
                                                   <input className={`${inputCls} bg-amber-50 border-amber-200 h-10`} type="number" value={f.boxCount} onChange={e=>{
                                                      const val = parseInt(e.target.value);
                                                      handleInputChange(skuItem.sku, 'boxCount', val);
                                                   }} />
                                                </div>
                                             </div>

                                             <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8 pt-8 border-t border-slate-50">
                                                <div className="space-y-4">
                                                   <h4 className="text-[11px] font-black text-slate-400 uppercase flex items-center gap-2"><Package className="w-3.5 h-3.5" /> 产品实物规格</h4>
                                                   <div className="grid grid-cols-3 gap-2">
                                                      <input className={inputCls} type="number" placeholder="长" value={f.unitLength} onChange={e=>handleInputChange(skuItem.sku, 'unitLength', parseInt(e.target.value))} />
                                                      <input className={inputCls} type="number" placeholder="宽" value={f.unitWidth} onChange={e=>handleInputChange(skuItem.sku, 'unitWidth', parseInt(e.target.value))} />
                                                      <input className={inputCls} type="number" placeholder="高" value={f.unitHeight} onChange={e=>handleInputChange(skuItem.sku, 'unitHeight', parseInt(e.target.value))} />
                                                   </div>
                                                   <div className="grid grid-cols-2 gap-2 mt-2">
                                                      <div><label className={labelCls}>重量 (KG)</label><input className={inputCls} type="number" step="0.01" value={f.productWeight} onChange={e=>handleInputChange(skuItem.sku, 'productWeight', parseFloat(e.target.value))} /></div>
                                                      <div><label className={labelCls}>抛重体积</label><div className="px-3 py-2 bg-slate-50 rounded text-xs font-mono font-bold text-slate-500 border border-slate-100 h-8 flex items-center">{m.singleUnitVolumetricWeight.toFixed(2)}</div></div>
                                                   </div>
                                                </div>

                                                <div className="space-y-4">
                                                   <h4 className="text-[11px] font-black text-slate-400 uppercase flex items-center gap-2"><Box className="w-3.5 h-3.5" /> 物流打包规格</h4>
                                                   <div className="grid grid-cols-3 gap-2">
                                                      <input className={inputCls} type="number" placeholder="箱长" value={f.boxLength} onChange={e=>handleInputChange(skuItem.sku, 'boxLength', parseInt(e.target.value))} />
                                                      <input className={inputCls} type="number" placeholder="箱宽" value={f.boxWidth} onChange={e=>handleInputChange(skuItem.sku, 'boxWidth', parseInt(e.target.value))} />
                                                      <input className={inputCls} type="number" placeholder="箱高" value={f.boxHeight} onChange={e=>handleInputChange(skuItem.sku, 'boxHeight', parseInt(e.target.value))} />
                                                   </div>
                                                   <div className="grid grid-cols-2 gap-2 mt-2">
                                                      <div><label className={labelCls}>整箱重</label><input className={inputCls} type="number" value={f.boxWeight} onChange={e=>handleInputChange(skuItem.sku, 'boxWeight', parseFloat(e.target.value))} /></div>
                                                      <div><label className={labelCls}>采购物流</label><input className={inputCls} placeholder="如：顺丰" value={f.purchaseLogistics} onChange={e=>handleInputChange(skuItem.sku, 'purchaseLogistics', e.target.value)} /></div>
                                                   </div>
                                                </div>

                                                <div className="space-y-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                                                   <h4 className="text-[11px] font-black text-slate-400 uppercase flex items-center gap-2"><Truck className="w-3.5 h-3.5" /> 运费成本单价</h4>
                                                   <div className="flex gap-1 mb-3 bg-white p-1 rounded-lg border border-slate-100">
                                                      <button onClick={()=>handleInputChange(skuItem.sku, 'logisticsMode', '海运')} className={`flex-1 py-1 rounded text-[9px] font-black transition-all ${f.logisticsMode === '海运' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400'}`}>海运</button>
                                                      <button onClick={()=>handleInputChange(skuItem.sku, 'logisticsMode', '空运')} className={`flex-1 py-1 rounded text-[9px] font-black transition-all ${f.logisticsMode === '空运' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400'}`}>空运</button>
                                                   </div>
                                                   <div className="grid grid-cols-2 gap-2">
                                                      <div>
                                                         <label className={labelCls}>单价</label>
                                                         <input className={`${inputCls} h-8 text-[10px]`} type="number" value={f.logisticsMode === '海运' ? f.seaFreightUnitPrice : f.airFreightUnitPrice} onChange={e=>handleInputChange(skuItem.sku, f.logisticsMode==='海运'?'seaFreightUnitPrice':'airFreightUnitPrice', parseFloat(e.target.value))} />
                                                      </div>
                                                      <div>
                                                         <label className={labelCls}>单品分摊</label>
                                                         <div className="px-3 py-2 bg-white rounded text-xs font-mono font-bold text-indigo-600 border border-slate-100 h-8 flex items-center">¥{m.freightPerUnit.toFixed(2)}</div>
                                                      </div>
                                                   </div>
                                                </div>
                                             </div>

                                             <div className="mt-8 grid grid-cols-2 lg:grid-cols-6 gap-4 pt-8 border-t border-slate-50">
                                                {['佣金 %', '固定费', '尾程费', '广告 %', '退货 %', '税率 %'].map((l, i) => {
                                                   const fields = ['commissionRate', 'fixedFee', 'lastMileFee', 'adRate', 'returnRate', 'taxRate'];
                                                   const field = fields[i];
                                                   const isRate = l.includes('%');
                                                   const isAuto = l === '固定费' || l === '尾程费';
                                                   const value = isAuto 
                                                   ? (field === 'fixedFee' ? m.fixedFee : m.lastMileFee)
                                                   : (isRate ? (f[field as keyof typeof f] as number)*100 : f[field as keyof typeof f]);

                                                   return (
                                                   <div key={l}>
                                                      <label className={labelCls}>{l} {isAuto && '(联动)'}</label>
                                                      <input 
                                                         className={`${inputCls} ${isAuto ? 'bg-slate-100 border-transparent text-slate-400 font-bold shadow-none' : ''}`} 
                                                         type="number" 
                                                         value={value} 
                                                         readOnly={isAuto}
                                                         onChange={e=>{
                                                            if (!isAuto) {
                                                            handleInputChange(skuItem.sku, field, isRate ? Number(e.target.value)/100 : Number(e.target.value));
                                                            }
                                                         }} 
                                                      />
                                                   </div>
                                                   );
                                                })}
                                             </div>
                                          </div>

                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                             <div className="v2-card p-6 bg-white border-slate-100 shadow-md">
                                                <div className="flex items-center gap-3 mb-6">
                                                   <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 shadow-sm"><TrendingUp className="w-6 h-6" /></div>
                                                   <h4 className="text-xs font-black text-emerald-700 uppercase tracking-widest">盈亏建议</h4>
                                                </div>
                                                <div className="flex justify-between items-center bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                                                   <span className="text-xs font-black text-emerald-700">建议盈亏平衡价 (MXN)</span>
                                                   <span className="text-3xl font-mono font-black text-emerald-600">${m.breakEvenSellingMxn.toFixed(0)}</span>
                                                </div>
                                             </div>
                                             <div className="v2-card p-6 bg-slate-900 border-none shadow-xl flex flex-col justify-center">
                                                <button onClick={() => handleSave(skuItem.sku)} disabled={isSaving} className="w-full py-4 bg-white hover:bg-slate-100 text-slate-900 rounded-xl font-black text-sm flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all">
                                                   <Save className="w-5 h-5" /> {isSaving ? '正在保存...' : '确认同步到全局'}
                                                </button>
                                                <p className="text-[9px] text-slate-500 font-bold text-center mt-3 uppercase tracking-widest">保存后将自动更新 SKU 档案的基础成本和售价</p>
                                             </div>
                                          </div>
                                       </div>

                                       {/* 2. Analysis Dashboard Sidebar */}
                                       <div className="lg:col-span-4 space-y-6">
                                          <div className="v2-card bg-slate-900 p-8 text-white relative overflow-hidden shadow-2xl border-none">
                                             <div className="relative z-10 space-y-10">
                                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-3"><BarChart3 className="w-6 h-6" /> 利润分析看板</h3>
                                                
                                                <div className="space-y-8">
                                                   <div className="space-y-2">
                                                      <span className="text-[10px] font-black text-slate-500 uppercase">预计单品净利 (CNY)</span>
                                                      <div className={`text-5xl font-mono font-black tracking-tighter ${m.unitProfitCny > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>¥{m.unitProfitCny.toFixed(1)}</div>
                                                      <div className="flex items-center gap-3 mt-2">
                                                         <span className="text-[10px] font-black px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-lg italic">ROI: {(m.roi*100).toFixed(0)}%</span>
                                                         <span className="text-[10px] font-bold text-slate-500">{(m.margin*100).toFixed(1)}% 净利率</span>
                                                      </div>
                                                   </div>
                                                   <div className="space-y-2">
                                                      <span className="text-[10px] font-black text-slate-500 uppercase">批次预估总收益 (CNY)</span>
                                                      <div className="text-3xl font-mono font-black text-white tracking-tighter">¥{m.totalGrossProfitRmb.toLocaleString()}</div>
                                                   </div>
                                                </div>

                                                <div className="pt-10 border-t border-slate-800 space-y-6">
                                                   <div className="flex justify-between items-center p-5 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                                                      <span className="text-xs font-black text-indigo-300 flex items-center gap-2">总结汇回款 (CNY)</span>
                                                      <span className="text-3xl font-mono font-black text-white">¥{m.payoutCny.toFixed(2)}</span>
                                                   </div>
                                                </div>
                                             </div>
                                             <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20" />
                                          </div>
                                          
                                          <div className="v2-card p-5 border-amber-100 bg-amber-50/50 shadow-sm">
                                             <div className="flex items-start gap-3">
                                                <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                                <p className="text-[10px] text-amber-700 font-bold leading-relaxed uppercase">此处的参数修改将影响全局利润看板的计算。您可以选择核价历史记录进行快速填充，也可以在此直接调整实时测算。</p>
                                             </div>
                                          </div>
                                       </div>
                                    </div>
                                 </div>
                               </motion.div>
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="mt-8 flex items-center justify-center gap-4 text-slate-400">
          <Clock className="w-4 h-4" />
          <span className="text-[11px] font-black uppercase tracking-[0.2em]">Data Synced with Cloud Database V2.0</span>
        </div>
      </div>
    </div>
  );
}
