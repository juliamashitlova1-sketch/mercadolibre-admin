
import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign, Package, TrendingUp, Search, Info, 
  ArrowRight, Truck, Plane, ShoppingBag, CreditCard,
  RefreshCw, ChevronRight, Calculator, AlertTriangle
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function SkuCostManagement() {
  const [skus, setSkus] = useState([]);
  const [pricingRecords, setPricingRecords] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch SKUs
      const { data: skuData, error: skuError } = await supabase
        .from('skus')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (skuError) throw skuError;

      // 2. Fetch Pricing Records
      const { data: priceData, error: priceError } = await supabase
        .from('sku_pricing')
        .select('*');
      
      if (priceError) throw priceError;

      // Map pricing data to an object for easy lookup
      const priceMap = {};
      priceData.forEach(item => {
        if (item.sku) priceMap[item.sku.toUpperCase()] = item;
      });

      setSkus(skuData || []);
      setPricingRecords(priceMap);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSkus = useMemo(() => {
    return skus.filter(s => 
      s.sku?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.product_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [skus, searchTerm]);

  const calculateMetrics = (skuItem) => {
    const pricing = pricingRecords[skuItem.sku.toUpperCase()];
    
    // Fallback values if no pricing record exists
    const sellingPriceMxn = parseFloat(skuItem.priceMXN || skuItem.price_mxn) || (pricing?.selling_price_mxn) || 0;
    const purchasePriceCny = parseFloat(skuItem.costRMB || skuItem.cost_rmb) || (pricing?.purchase_price_cny) || 0;
    
    const exchangeRate = pricing?.exchange_rate || 0.3891;
    const commissionRate = pricing?.commission_rate || 0.175;
    const adRate = pricing?.ad_rate || 0.08;
    const returnRate = pricing?.return_rate || 0.02;
    const taxRate = pricing?.tax_rate || 0.0905;
    const fixedFee = pricing?.fixed_fee || 0;
    const lastMileFee = pricing?.last_mile_fee || 0;

    // Platform Fees (MXN)
    const commissionMxn = sellingPriceMxn * commissionRate;
    const adFeeMxn = sellingPriceMxn * adRate;
    const returnFeeMxn = sellingPriceMxn * returnRate;
    const taxMxn = sellingPriceMxn * taxRate;
    const totalFeesMxn = commissionMxn + (fixedFee || 0) + (lastMileFee || 0) + adFeeMxn + returnFeeMxn + taxMxn;
    
    const payoutMxn = sellingPriceMxn - totalFeesMxn;
    const payoutCny = payoutMxn * exchangeRate;

    // Logistics (CNY)
    let logisticsCost = 0;
    if (pricing) {
        if (pricing.logistics_mode === '空运') {
            const singleBoxVolumetricWeight = (pricing.box_length * pricing.box_width * pricing.box_height) / 6000;
            const singleBoxChargeableWeight = Math.max(pricing.box_weight, singleBoxVolumetricWeight);
            logisticsCost = pricing.pack_count > 0 ? (singleBoxChargeableWeight * pricing.air_freight_unit_price / pricing.pack_count) : 0;
        } else {
            const singleBoxVolumeM3 = (pricing.box_length * pricing.box_width * pricing.box_height) / 1000000;
            logisticsCost = pricing.pack_count > 0 ? (singleBoxVolumeM3 * pricing.sea_freight_unit_price / pricing.pack_count) : 0;
        }
    }
    
    const totalCostCny = purchasePriceCny + logisticsCost;
    const profitUnit = payoutCny - totalCostCny;
    const margin = (sellingPriceMxn * exchangeRate) > 0 ? (profitUnit / (sellingPriceMxn * exchangeRate)) : 0;
    const roi = totalCostCny > 0 ? (profitUnit / totalCostCny) : 0;

    return {
      hasPricing: !!pricing,
      logisticsMode: pricing?.logistics_mode || '未设置',
      sellingPriceMxn,
      purchasePriceCny,
      commissionMxn,
      fixedFee,
      lastMileFee,
      adFeeMxn,
      returnFeeMxn,
      taxMxn,
      totalFeesMxn,
      payoutCny,
      logisticsCost,
      profitUnit,
      margin,
      roi
    };
  };

  return (
    <div className="v2-page-container">
      <div className="v2-inner-container">
        <header className="v2-header">
          <div className="flex items-center space-x-3">
            <div className="v2-header-icon bg-gradient-to-br from-amber-500 to-orange-600">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="v2-header-title">SKU 成本管理</h1>
              <p className="v2-header-subtitle">同步 SKU 档案并应用核价逻辑分析各环节成本与利润</p>
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
                className="pl-9 pr-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-xs text-white outline-none focus:border-amber-500/50 transition-all w-64"
              />
            </div>
            <button 
              onClick={fetchData}
              className="v2-button-secondary p-2"
              title="刷新数据"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        <div className="v2-card overflow-hidden">
          <div className="v2-table-wrapper">
            <table className="v2-table">
              <thead className="v2-table-thead">
                <tr>
                  <th className="v2-table-th">产品信息</th>
                  <th className="v2-table-th text-center">基础财务 (售价/采购)</th>
                  <th className="v2-table-th text-center">平台总扣费 (MXN)</th>
                  <th className="v2-table-th text-center">物流成本 (CNY)</th>
                  <th className="v2-table-th text-center">净利润 (CNY)</th>
                  <th className="v2-table-th text-center">毛利率 / ROI</th>
                  <th className="v2-table-th text-right">核价状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-20 text-center">
                      <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-2" />
                      <p className="text-slate-500 text-xs">加载数据中...</p>
                    </td>
                  </tr>
                ) : filteredSkus.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-20 text-center text-slate-500 italic text-xs">未找到符合条件的 SKU 数据</td>
                  </tr>
                ) : (
                  filteredSkus.map((item, index) => {
                    const m = calculateMetrics(item);
                    return (
                      <tr key={item.id || index} className="v2-table-tr group">
                        <td className="v2-table-td">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg border border-slate-700 overflow-hidden bg-slate-800/50 flex-shrink-0">
                              <img 
                                src={item.image_url || 'https://via.placeholder.com/80'} 
                                alt="SKU" 
                                className="w-full h-full object-cover"
                                onError={(e: any) => {
                                  e.target.onerror = null; 
                                  e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23334155" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>';
                                }}
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-black text-white truncate max-w-[150px]">{item.sku}</div>
                              <div className="text-[10px] text-slate-500 font-bold truncate max-w-[150px]" title={item.product_name}>
                                {item.product_name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="v2-table-td text-center">
                          <div className="space-y-1">
                            <div className="text-xs font-bold text-emerald-400">${m.sellingPriceMxn} MXN</div>
                            <div className="text-[10px] font-bold text-slate-500">¥{m.purchasePriceCny} CNY</div>
                          </div>
                        </td>
                        <td className="v2-table-td text-center">
                          <div className="group/fee relative inline-block">
                            <span className="text-xs font-bold text-rose-400 cursor-help border-b border-rose-400/30">-${m.totalFeesMxn.toFixed(1)}</span>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-900 border border-slate-700 p-2 rounded-lg shadow-xl opacity-0 invisible group-hover/fee:opacity-100 group-hover/fee:visible transition-all z-20">
                              <div className="text-[9px] space-y-1">
                                <div className="flex justify-between"><span>佣金:</span> <span className="text-rose-400">-${m.commissionMxn.toFixed(1)}</span></div>
                                <div className="flex justify-between"><span>固定费:</span> <span className="text-rose-400">-${m.fixedFee.toFixed(1)}</span></div>
                                <div className="flex justify-between"><span>尾程费:</span> <span className="text-rose-400">-${m.lastMileFee.toFixed(1)}</span></div>
                                <div className="flex justify-between"><span>广告/税/退:</span> <span className="text-rose-400">-${(m.adFeeMxn + m.taxMxn + m.returnFeeMxn).toFixed(1)}</span></div>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="v2-table-td text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {m.logisticsMode === '空运' ? (
                              <Plane className="w-3 h-3 text-sky-400" />
                            ) : m.logisticsMode === '海运' ? (
                              <Truck className="w-3 h-3 text-indigo-400" />
                            ) : null}
                            <span className="text-xs font-bold text-slate-300">¥{m.logisticsCost.toFixed(1)}</span>
                          </div>
                          <div className="text-[9px] text-slate-600 font-bold uppercase">{m.logisticsMode}</div>
                        </td>
                        <td className="v2-table-td text-center">
                          <div className={`text-sm font-black ${m.profitUnit > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            ¥{m.profitUnit.toFixed(1)}
                          </div>
                          <div className="text-[9px] text-slate-600 font-bold">每件净得</div>
                        </td>
                        <td className="v2-table-td text-center">
                          <div className="space-y-0.5">
                            <div className={`text-xs font-black ${m.margin > 0.15 ? 'text-emerald-400' : m.margin > 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                              {(m.margin * 100).toFixed(1)}%
                            </div>
                            <div className="text-[10px] font-bold text-slate-500 italic">ROI: {(m.roi * 100).toFixed(0)}%</div>
                          </div>
                        </td>
                        <td className="v2-table-td text-right">
                          {m.hasPricing ? (
                             <div className="flex items-center justify-end gap-1.5 text-emerald-400">
                                <span className="text-[10px] font-bold uppercase tracking-tight">已核价</span>
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                             </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5 text-slate-600">
                                <span className="text-[10px] font-bold uppercase tracking-tight">缺失核价</span>
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend / Info Section */}
        <div className="mt-6 flex flex-wrap gap-4">
           <div className="flex-1 min-w-[300px] bg-sky-500/5 border border-sky-500/20 rounded-xl p-4 flex gap-3 items-start">
             <Calculator className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
             <div>
                <h4 className="text-xs font-bold text-sky-300 mb-1">成本计算模型说明</h4>
                <p className="text-[10px] text-sky-400/70 leading-relaxed font-medium">
                  本模块自动关联 <strong>SKU 档案</strong> 与 <strong>新品核价</strong> 记录。若存在核价记录，则采用详细的物流(材积/抛重)计算逻辑；若无核价记录，则采用基础参数进行粗略估算。建议定期在“新品核价”模块中完善核价细节。
                </p>
             </div>
           </div>
           
           <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex gap-3 items-start w-full md:w-auto md:min-w-[400px]">
             <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
             <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-bold text-slate-400">利润率 {'>'} 15%：健康</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-[10px] font-bold text-slate-400">利润率 0-15%：偏低</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="text-[10px] font-bold text-slate-400">利润率 {'<'} 0%：亏损</span>
                </div>
                <div className="flex items-center gap-2">
                   <Info className="w-3 h-3 text-slate-500" />
                   <span className="text-[10px] font-bold text-slate-500">基于比索汇率: 0.3891</span>
                </div>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}
