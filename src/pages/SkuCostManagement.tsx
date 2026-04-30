import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, Search, RefreshCw, Calculator, Save, 
  Box, Ruler, Scale, ChevronDown, ChevronUp, Package, Truck, Plane, CreditCard, Info, Clock
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { calculatePlatformFees } from '../utils/calculator';

export default function SkuCostManagement() {
  const [skus, setSkus] = useState([]);
  const [pricingRecords, setPricingRecords] = useState({});
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
        .order('created_at', { ascending: true }); // 正序排列，这样在 forEach 循环中，最新的记录（后生成的）会覆盖旧记录
      if (priceError) throw priceError;

      const priceMap = {};
      priceData.forEach(item => {
        if (item.sku) priceMap[item.sku.toUpperCase()] = item;
      });

      setSkus(skuData || []);
      setPricingRecords(priceMap);
      
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
    setEditedData(prev => ({
      ...prev,
      [skuKey]: {
        ...prev[skuKey],
        [field]: value
      }
    }));
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

    const { fixedFee: calculatedFixed, lastMileFee: calculatedLastMile, volumetricWeight: singleUnitVolumetricWeight, ar59Weight } = calculatePlatformFees(
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
    const totalFeesMxn = commissionMxn + calculatedFixed + calculatedLastMile + adFeeMxn + returnFeeMxn + taxMxn;
    
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
    const totalGrossProfitRmb = unitProfitCny * replenishmentQty;
    const margin = (f.sellingPriceMxn * f.exchangeRate) > 0 ? (unitProfitCny / (f.sellingPriceMxn * f.exchangeRate)) : 0;

    const commissionCny = commissionMxn * f.exchangeRate;
    const taxCny = taxMxn * f.exchangeRate;

    return {
      fixedFee: calculatedFixed,
      lastMileFee: calculatedLastMile,
      singleUnitVolumetricWeight,
      ar59Weight,
      commissionMxn,
      commissionCny,
      adFeeMxn,
      taxMxn,
      taxCny,
      totalFeesMxn,
      payoutCny,
      freightPerUnit: currentFreightPerUnit,
      unitProfitCny,
      totalGrossProfitRmb,
      margin
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

      await supabase.from('sku_pricing').delete().eq('sku', skuKey);
      
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
                  <th className="v2-table-th text-right">盈利与控制</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr><td colSpan={6} className="px-4 py-32 text-center text-slate-400 font-bold italic text-sm">正在同步云端核价库...</td></tr>
                ) : filteredSkus.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-32 text-center text-slate-400 font-bold italic text-sm">未找到匹配的 SKU 档案</td></tr>
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
                        <td className="v2-table-td text-right">
                          <div className="flex items-center justify-end gap-5">
                             <div className="text-right">
                                <div className={`text-sm font-black ${m.unitProfitCny > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  ¥{m.unitProfitCny.toFixed(1)}
                                </div>
                                <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5">
                                  Profit Margin: {(m.margin * 100).toFixed(1)}%
                                </div>
                             </div>
                             <button 
                              onClick={(e) => { e.stopPropagation(); handleSave(skuItem.sku); }} 
                              disabled={isSaving}
                              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-[11px] font-black text-white rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
                             >
                                {isSaving ? '...' : '保存修改'}
                             </button>
                          </div>
                        </td>
                      </tr>
                      
                      <AnimatePresence>
                        {isExpanded && (
                          <tr>
                            <td colSpan={6} className="p-0 border-none bg-slate-50/50">
                               <motion.div 
                                 initial={{ height: 0, opacity: 0 }} 
                                 animate={{ height: 'auto', opacity: 1 }} 
                                 exit={{ height: 0, opacity: 0 }}
                                 className="overflow-hidden"
                               >
                                 <div className="p-8 grid grid-cols-1 md:grid-cols-4 gap-10">
                                    {/* Column 1: Core Params */}
                                    <div className="space-y-5">
                                       <h4 className="text-[11px] font-black text-slate-400 uppercase flex items-center gap-2 mb-4 tracking-[0.1em] border-b border-slate-100 pb-2"><TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> 核心定标参数</h4>
                                       <div className="grid grid-cols-1 gap-4">
                                          <div>
                                            <label className={labelCls}>售价 (MXN)</label>
                                            <div className="relative">
                                              <input type="number" step="0.1" value={f.sellingPriceMxn} onChange={e => handleInputChange(skuItem.sku, 'sellingPriceMxn', parseFloat(e.target.value))} className={`${inputCls} border-emerald-200 text-emerald-700 font-black bg-emerald-50/30`} />
                                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-600/50">$</span>
                                            </div>
                                          </div>
                                          <div><label className={labelCls}>采购价 (CNY)</label><input type="number" step="0.1" value={f.purchasePriceCny} onChange={e => handleInputChange(skuItem.sku, 'purchasePriceCny', parseFloat(e.target.value))} className={inputCls} /></div>
                                          <div><label className={labelCls}>箱数</label><input type="number" value={f.boxCount} onChange={e => handleInputChange(skuItem.sku, 'boxCount', parseInt(e.target.value))} className={inputCls} /></div>
                                          <div><label className={labelCls}>装箱数</label><input type="number" value={f.packCount} onChange={e => handleInputChange(skuItem.sku, 'packCount', parseInt(e.target.value))} className={inputCls} /></div>
                                          <div><label className={labelCls}>采购物流</label><input type="text" value={f.purchaseLogistics} onChange={e => handleInputChange(skuItem.sku, 'purchaseLogistics', e.target.value)} className={inputCls} placeholder="如：顺丰" /></div>
                                        </div>
                                       <div className="p-4 bg-sky-50 border border-sky-100 rounded-2xl mt-6 shadow-sm">
                                          <div className="text-[10px] font-black text-sky-600 uppercase mb-1 flex items-center gap-1.5"><CreditCard className="w-3 h-3" /> 最终回款预估 (CNY)</div>
                                          <div className="text-2xl font-mono font-black text-slate-900">¥{m.payoutCny.toLocaleString()}</div>
                                       </div>
                                    </div>

                                    {/* Column 2: Logistics */}
                                    <div className="space-y-5">
                                       <h4 className="text-[11px] font-black text-slate-400 uppercase flex items-center gap-2 mb-4 tracking-[0.1em] border-b border-slate-100 pb-2"><Truck className="w-3.5 h-3.5 text-sky-500" /> 物流分摊详情</h4>
                                       <div className="flex gap-2 mb-4 bg-white p-1 rounded-xl border border-slate-100 shadow-sm">
                                          <button onClick={()=>handleInputChange(skuItem.sku, 'logisticsMode', '海运')} className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${f.logisticsMode === '海运' ? 'bg-sky-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>海运</button>
                                          <button onClick={()=>handleInputChange(skuItem.sku, 'logisticsMode', '空运')} className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${f.logisticsMode === '空运' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>空运</button>
                                       </div>
                                       <div className="grid grid-cols-2 gap-4">
                                          <div><label className={labelCls}>运费单价</label><input type="number" value={f.logisticsMode === '海运' ? f.seaFreightUnitPrice : f.airFreightUnitPrice} onChange={e=>handleInputChange(skuItem.sku, f.logisticsMode==='海运'?'seaFreightUnitPrice':'airFreightUnitPrice', parseFloat(e.target.value))} className={inputCls} /></div>
                                          <div><label className={labelCls}>实重(KG)</label><input type="number" step="0.01" value={f.productWeight} onChange={e=>handleInputChange(skuItem.sku, 'productWeight', parseFloat(e.target.value))} className={inputCls} /></div>
                                       </div>
                                       <div className="grid grid-cols-3 gap-2">
                                          {['unitLength', 'unitWidth', 'unitHeight'].map((field, i) => (
                                            <div key={field}><label className={labelCls}>{['长','宽','高'][i]}</label><input type="number" value={f[field]} onChange={e=>handleInputChange(skuItem.sku, field, parseInt(e.target.value))} className={inputCls} /></div>
                                          ))}
                                       </div>
                                    </div>

                                    {/* Column 3: Fees */}
                                    <div className="space-y-5">
                                       <h4 className="text-[11px] font-black text-slate-400 uppercase flex items-center gap-2 mb-4 tracking-[0.1em] border-b border-slate-100 pb-2"><Calculator className="w-3.5 h-3.5 text-rose-500" /> 平台费率设置</h4>
                                       <div className="grid grid-cols-2 gap-4">
                                          {['commissionRate', 'adRate', 'returnRate', 'taxRate'].map((fName, i) => (
                                            <div key={fName}>
                                               <label className={labelCls}>{['佣金 %', '广告 %', '退货 %', '税率 %'][i]}</label>
                                               <input type="number" value={(f[fName]*100).toFixed(1)} onChange={e=>handleInputChange(skuItem.sku, fName, parseFloat(e.target.value)/100)} className={inputCls} />
                                            </div>
                                          ))}
                                       </div>
                                       <div className="p-4 bg-white border border-slate-100 rounded-2xl space-y-2.5 shadow-sm">
                                          <div className="flex justify-between text-[11px] font-bold"><span className="text-slate-400 uppercase">Fixed Fee:</span> <span className="text-rose-600 font-mono">-${m.fixedFee.toFixed(1)}</span></div>
                                          <div className="flex justify-between text-[11px] font-bold"><span className="text-slate-400 uppercase">Last Mile:</span> <span className="text-rose-600 font-mono">-${m.lastMileFee.toFixed(1)}</span></div>
                                          <div className="flex justify-between text-[11px] font-black border-t border-slate-50 pt-2.5"><span className="text-slate-900 uppercase">物流分摊:</span> <span className="text-sky-600 font-mono">¥{m.freightPerUnit.toFixed(1)}</span></div>
                                       </div>
                                    </div>

                                    {/* Column 4: Summary */}
                                    <div className="bg-white border border-slate-200 rounded-[2rem] p-6 flex flex-col justify-between shadow-xl shadow-slate-200/50 relative overflow-hidden">
                                       <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-16 -mt-16" />
                                       <div className="relative z-10">
                                          <h4 className="text-[11px] font-black text-indigo-500 uppercase flex items-center gap-2 mb-4 tracking-widest"><TrendingUp className="w-4 h-4" /> 批次盈利总览</h4>
                                          <div className="space-y-4">
                                             <div className="text-4xl font-mono font-black text-slate-900 tracking-tighter">¥{m.totalGrossProfitRmb.toLocaleString()}</div>
                                             <div className="flex flex-col gap-2">
                                                <div className="flex items-center gap-2">
                                                   <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-[10px] font-black uppercase">ROI: {((m.unitProfitCny / (f.purchasePriceCny + m.freightPerUnit)) * 100).toFixed(0)}%</span>
                                                   <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg text-[10px] font-black uppercase">Margin: {(m.margin * 100).toFixed(1)}%</span>
                                                </div>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-2">ESTIMATED BATCH NET PROFIT</span>
                                             </div>
                                          </div>
                                       </div>
                                       <div className="mt-8 relative z-10">
                                          <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-100 rounded-2xl">
                                             <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                             <p className="text-[10px] text-amber-700 font-bold leading-tight uppercase tracking-tight">
                                               参数已实时重算。确认无误后点击同步，即可更新全局统计仪表盘。
                                             </p>
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
