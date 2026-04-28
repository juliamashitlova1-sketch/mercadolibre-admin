
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, Search, RefreshCw, Calculator, Save, 
  Box, Ruler, Scale, ChevronDown, ChevronUp, Package, Truck, Plane, CreditCard, Info
} from 'lucide-react';
import { supabase } from '../lib/supabase';

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
        .select('*');
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
          airFreightUnitPrice: p?.air_freight_unit_price || 0
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

    const singleUnitVolumetricWeight = (f.unitLength * f.unitWidth * f.unitHeight) / 6000;
    const ar59Weight = Math.max(f.productWeight, singleUnitVolumetricWeight);
    
    let calculatedFixed = 0;
    if (f.sellingPriceMxn < 299) {
      const buckets = [0.3, 0.5, 1, 2, 3, 4, 5, 7, 9, 12, 15, 20, 30, Infinity];
      const idx = buckets.findIndex(b => ar59Weight <= b);
      const tableA = [25, 28.5, 33, 35, 37, 39, 40, 45, 51, 59, 69, 81, 102, 126];
      const tableB = [32, 34, 38, 40, 46, 50, 53, 59, 67, 78, 92, 108, 137, 170];
      const tableC = [35, 38, 39, 41, 48, 54, 59, 70, 81, 96, 113, 140, 195, 250];
      if (f.sellingPriceMxn < 99) calculatedFixed = tableA[idx];
      else if (f.sellingPriceMxn < 199) calculatedFixed = tableB[idx];
      else calculatedFixed = tableC[idx];
    }

    let calculatedLastMile = 0;
    if (f.sellingPriceMxn >= 299) {
      const lmBuckets = [0.3, 0.5, 1, 2, 3, 4, 5, 7, 9, 12, 15, 20, 30, Infinity];
      const lmIdx = lmBuckets.findIndex(b => ar59Weight <= b);
      const lmTable299To499 = [52.40, 56.00, 59.60, 67.60, 76.00, 82.40, 88.00, 98.00, 111.60, 129.20, 152.00, 178.00, 225.20, 260];
      const lmTableAbove499 = [65.50, 70.00, 74.50, 84.50, 95.00, 103.00, 110.00, 122.50, 139.50, 161.50, 190.00, 222.50, 281.50, 320];
      if (f.sellingPriceMxn <= 499) calculatedLastMile = lmTable299To499[lmIdx];
      else calculatedLastMile = lmTableAbove499[lmIdx];
    }

    const commissionMxn = f.sellingPriceMxn * f.commissionRate;
    const adFeeMxn = f.sellingPriceMxn * f.adRate;
    const returnFeeMxn = f.sellingPriceMxn * f.returnRate;
    const taxMxn = f.sellingPriceMxn * f.taxRate;
    const totalFeesMxn = commissionMxn + calculatedFixed + calculatedLastMile + adFeeMxn + returnFeeMxn + taxMxn;
    
    const payoutMxn = f.sellingPriceMxn - totalFeesMxn;
    const payoutCny = payoutMxn * f.exchangeRate;

    const boxCount = f.packCount > 0 ? (f.replenishmentQty / f.packCount) : 0;
    const singleBoxVolumeM3 = (f.boxLength * f.boxWidth * f.boxHeight) / 1000000;
    const singleBoxVolumetricWeight = (f.boxLength * f.boxWidth * f.boxHeight) / 6000;
    const singleBoxChargeableWeight = Math.max(f.boxWeight, singleBoxVolumetricWeight);
    
    const totalVolume = singleBoxVolumeM3 * boxCount;
    const totalChargeableWeight = singleBoxChargeableWeight * boxCount;

    const seaFreightTotal = totalVolume * f.seaFreightUnitPrice;
    const seaFreightPerUnit = f.replenishmentQty > 0 ? (seaFreightTotal / f.replenishmentQty) : 0;
    
    const airFreightTotal = totalChargeableWeight * f.airFreightUnitPrice;
    const airFreightPerUnit = f.replenishmentQty > 0 ? (airFreightTotal / f.replenishmentQty) : 0;

    const currentFreightPerUnit = f.logisticsMode === '空运' ? airFreightPerUnit : seaFreightPerUnit;

    const unitProfitCny = payoutCny - f.purchasePriceCny - currentFreightPerUnit;
    const totalGrossProfitRmb = unitProfitCny * f.replenishmentQty;
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
        replenishment_qty: f.replenishmentQty,
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
        status: 'priced'
      };

      // 先尝试删除旧记录，确保“覆盖”效果，避开 upsert 对 UNIQUE 约束的依赖
      await supabase.from('sku_pricing').delete().eq('sku', skuKey);
      
      const { error } = await supabase
        .from('sku_pricing')
        .insert([saveData]);

      if (error) throw error;
      alert(`SKU ${sku} 数据同步成功`);
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

  const inputCls = "w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-[11px] font-mono text-white outline-none focus:border-sky-500/50 transition-all";
  const labelCls = "block text-[9px] font-black text-slate-500 uppercase tracking-tighter mb-1";

  return (
    <div className="v2-page-container">
      <div className="v2-inner-container">
        <header className="v2-header">
          <div className="flex items-center space-x-3">
            <div className="v2-header-icon bg-gradient-to-br from-amber-500 to-orange-600">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="v2-header-title">SKU 成本管理 (精简视图)</h1>
              <p className="v2-header-subtitle">已核价成本参数的集中管理与同步中心</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder="搜索 SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-xs text-white outline-none focus:border-sky-500/50 transition-all w-64"
              />
            </div>
            <button onClick={fetchData} className="v2-button-secondary p-2"><RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /></button>
          </div>
        </header>

        <div className="v2-card overflow-hidden">
          <table className="v2-table">
            <thead className="v2-table-thead">
              <tr>
                <th className="v2-table-th">产品详情 (图片 / SKU代码 / 名称)</th>
                <th className="v2-table-th text-center">采购成本</th>
                <th className="v2-table-th text-center">物流分摊</th>
                <th className="v2-table-th text-center">佣金成本</th>
                <th className="v2-table-th text-center">税率成本</th>
                <th className="v2-table-th text-right">管理操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {isLoading ? (
                <tr><td colSpan={2} className="px-4 py-20 text-center text-slate-500 italic text-xs">同步云端中...</td></tr>
              ) : filteredSkus.length === 0 ? (
                <tr><td colSpan={2} className="px-4 py-20 text-center text-slate-500 italic text-xs">未找到符合条件的档案</td></tr>
              ) : filteredSkus.map((skuItem) => {
                const skuKey = skuItem.sku.toUpperCase();
                const f = editedData[skuKey];
                const m = calculateSkuMetrics(skuKey);
                if (!f || !m) return null;
                const isExpanded = expandedSkus[skuKey];

                return (
                  <React.Fragment key={skuItem.id}>
                    <tr className="v2-table-tr group cursor-pointer" onClick={() => toggleExpand(skuKey)}>
                      <td className="v2-table-td">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg border border-slate-700 overflow-hidden bg-slate-800 flex-shrink-0 shadow-lg">
                            <img src={skuItem.image_url} alt="SKU" className="w-full h-full object-cover" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-base font-black text-white flex items-center gap-2">
                              {skuItem.sku}
                              {isExpanded ? <ChevronUp className="w-4 h-4 text-sky-400" /> : <ChevronDown className="w-4 h-4 text-slate-600" />}
                            </div>
                            <div className="text-[10px] text-slate-500 font-bold truncate max-w-[400px] uppercase tracking-tight">
                              {skuItem.product_name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="v2-table-td text-center">
                        <div className="text-[11px] font-mono font-bold text-slate-300">¥{f.purchasePriceCny.toFixed(2)}</div>
                      </td>
                      <td className="v2-table-td text-center">
                        <div className="text-[11px] font-mono font-bold text-sky-400">¥{m.freightPerUnit.toFixed(2)}</div>
                      </td>
                      <td className="v2-table-td text-center">
                        <div className="text-[11px] font-mono font-bold text-rose-400">¥{m.commissionCny.toFixed(2)}</div>
                      </td>
                      <td className="v2-table-td text-center">
                        <div className="text-[11px] font-mono font-bold text-amber-400">¥{m.taxCny.toFixed(2)}</div>
                      </td>
                      <td className="v2-table-td text-right">
                        <div className="flex items-center justify-end gap-4">
                           <div className="text-right">
                              <div className={`text-xs font-black ${m.unitProfitCny > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                预估单盈: ¥{m.unitProfitCny.toFixed(1)}
                              </div>
                              <div className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">
                                Margin: {(m.margin * 100).toFixed(1)}%
                              </div>
                           </div>
                           <button 
                            onClick={(e) => { e.stopPropagation(); handleSave(skuItem.sku); }} 
                            disabled={isSaving}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-[10px] font-black text-white rounded-lg transition-all border border-slate-700/50"
                           >
                              {isSaving ? '...' : '保存修改'}
                           </button>
                        </div>
                      </td>
                    </tr>
                    
                    <AnimatePresence>
                      {isExpanded && (
                        <tr>
                          <td colSpan={2} className="p-0 border-none bg-slate-950/40">
                             <motion.div 
                               initial={{ height: 0, opacity: 0 }} 
                               animate={{ height: 'auto', opacity: 1 }} 
                               exit={{ height: 0, opacity: 0 }}
                               className="overflow-hidden"
                             >
                               <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-8">
                                  {/* Column 1: Core Params */}
                                  <div className="space-y-4">
                                     <h4 className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 mb-3"><TrendingUp className="w-3 h-3" /> 核心定标</h4>
                                     <div className="grid grid-cols-1 gap-3">
                                        <div><label className={labelCls}>Mercado 售价 (MXN)</label><input type="number" step="0.1" value={f.sellingPriceMxn} onChange={e => handleInputChange(skuItem.sku, 'sellingPriceMxn', parseFloat(e.target.value))} className={`${inputCls} border-emerald-500/20 text-emerald-400 font-bold`} /></div>
                                        <div><label className={labelCls}>采购单价 (CNY)</label><input type="number" step="0.1" value={f.purchasePriceCny} onChange={e => handleInputChange(skuItem.sku, 'purchasePriceCny', parseFloat(e.target.value))} className={inputCls} /></div>
                                        <div><label className={labelCls}>补货数量 (PSC)</label><input type="number" value={f.replenishmentQty} onChange={e => handleInputChange(skuItem.sku, 'replenishmentQty', parseInt(e.target.value))} className={inputCls} /></div>
                                     </div>
                                     <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl mt-4">
                                        <div className="text-[10px] font-black text-sky-400 uppercase mb-1">总结汇预估 (CNY)</div>
                                        <div className="text-xl font-mono font-black text-white">¥{m.payoutCny.toLocaleString()}</div>
                                     </div>
                                  </div>

                                  {/* Column 2: Logistics */}
                                  <div className="space-y-4">
                                     <h4 className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 mb-3"><Truck className="w-3 h-3" /> 跨境物流控制</h4>
                                     <div className="flex gap-2 mb-3">
                                        <button onClick={()=>handleInputChange(skuItem.sku, 'logisticsMode', '海运')} className={`flex-1 py-1.5 rounded-lg border text-[10px] font-black transition-all ${f.logisticsMode === '海运' ? 'bg-sky-500/20 border-sky-500/40 text-sky-400 font-black' : 'bg-slate-900 border-slate-800 text-slate-600'}`}>海运</button>
                                        <button onClick={()=>handleInputChange(skuItem.sku, 'logisticsMode', '空运')} className={`flex-1 py-1.5 rounded-lg border text-[10px] font-black transition-all ${f.logisticsMode === '空运' ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400 font-black' : 'bg-slate-900 border-slate-800 text-slate-600'}`}>空运</button>
                                     </div>
                                     <div className="grid grid-cols-2 gap-3">
                                        <div><label className={labelCls}>运费单价</label><input type="number" value={f.logisticsMode === '海运' ? f.seaFreightUnitPrice : f.airFreightUnitPrice} onChange={e=>handleInputChange(skuItem.sku, f.logisticsMode==='海运'?'seaFreightUnitPrice':'airFreightUnitPrice', parseFloat(e.target.value))} className={inputCls} /></div>
                                        <div><label className={labelCls}>单品重(KG)</label><input type="number" step="0.01" value={f.productWeight} onChange={e=>handleInputChange(skuItem.sku, 'productWeight', parseFloat(e.target.value))} className={inputCls} /></div>
                                     </div>
                                     <div className="grid grid-cols-3 gap-2">
                                        {['unitLength', 'unitWidth', 'unitHeight'].map((field, i) => (
                                          <div key={field}><label className={labelCls}>{['长','宽','高'][i]}</label><input type="number" value={f[field]} onChange={e=>handleInputChange(skuItem.sku, field, parseInt(e.target.value))} className={inputCls} /></div>
                                        ))}
                                     </div>
                                  </div>

                                  {/* Column 3: Fees */}
                                  <div className="space-y-4">
                                     <h4 className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 mb-3"><CreditCard className="w-3 h-3" /> 平台费率系数</h4>
                                     <div className="grid grid-cols-2 gap-3">
                                        {['commissionRate', 'adRate', 'returnRate', 'taxRate'].map((fName, i) => (
                                          <div key={fName}>
                                             <label className={labelCls}>{['佣金 %', '广告 %', '退货 %', '税率 %'][i]}</label>
                                             <input type="number" value={(f[fName]*100).toFixed(1)} onChange={e=>handleInputChange(skuItem.sku, fName, parseFloat(e.target.value)/100)} className={inputCls} />
                                          </div>
                                        ))}
                                     </div>
                                     <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                                        <div className="flex justify-between text-[10px] font-bold"><span className="text-slate-500 uppercase">Fixed Fee:</span> <span className="text-rose-400">-${m.fixedFee.toFixed(1)}</span></div>
                                        <div className="flex justify-between text-[10px] font-bold"><span className="text-slate-500 uppercase">Last Mile:</span> <span className="text-rose-400">-${m.lastMileFee.toFixed(1)}</span></div>
                                        <div className="flex justify-between text-[10px] font-bold border-t border-slate-800 pt-2"><span className="text-slate-500 uppercase">物流分摊:</span> <span className="text-sky-400">¥{m.freightPerUnit.toFixed(1)}</span></div>
                                     </div>
                                  </div>

                                  {/* Column 4: Summary & Sync */}
                                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
                                     <div>
                                        <h4 className="text-[10px] font-black text-indigo-400 uppercase flex items-center gap-2 mb-3"><TrendingUp className="w-3 h-3" /> 批次盈利总览</h4>
                                        <div className="space-y-3">
                                           <div className="text-3xl font-mono font-black text-white">¥{m.totalGrossProfitRmb.toLocaleString()}</div>
                                           <div className="flex items-center gap-2">
                                              <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded text-[9px] font-black uppercase">ROI: {((m.unitProfitCny / (f.purchasePriceCny + m.freightPerUnit)) * 100).toFixed(0)}%</span>
                                              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest leading-none">EST. BATCH PROFIT</span>
                                           </div>
                                        </div>
                                     </div>
                                     <div className="mt-6 flex flex-col gap-2">
                                        <div className="flex items-center gap-2 p-2 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                                           <Info className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                           <p className="text-[9px] text-amber-500/80 font-medium leading-tight">计算逻辑已与计算器完全同步。修改后请点击右上角保存。</p>
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
    </div>
  );
}
