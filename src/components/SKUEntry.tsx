import { useForm, useWatch, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, ExternalLink, X } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { SKUStats } from '../types';
import { useEffect, useState } from 'react';
import { getMexicoDateString } from '../lib/time';
import { USD_TO_MXN } from '../constants';

const skuSchema = z.object({
  sku: z.string().min(1),
  skuName: z.string().min(1),
  date: z.string(),
  sales: z.number().min(0),
  orders: z.number().min(0),
  stock: z.number().min(0),
  avgSalesSinceListing: z.number().min(0),
  slowStock: z.number().min(0),
  adSpend: z.number().min(0),
  impressions: z.number().min(0),
  clicks: z.number().min(0),
  cpc: z.number().min(0),
  roas: z.number().min(0),
  acos: z.number().min(0),
  adOrders: z.number().min(0),
  purchasePrice: z.number().min(0),
  sellingPrice: z.number().min(0),
  specs: z.string().optional(),
  reviewCount: z.number().min(0).optional(),
  rating: z.number().min(0).max(5).optional(),
  unitProfitExclAds: z.number().min(0),
  inTransitStock: z.number().min(0),
  inProductionStock: z.number().min(0),
  leadTimeDays: z.number().min(0),
  imageUrl: z.string().optional(),
  competitors: z.array(z.object({
    id: z.string(),
    url: z.string().url().or(z.string().length(0)),
    name: z.string(), // 店铺等级
    specs: z.string().optional(),
    imageUrl: z.string().url().or(z.string().length(0)).optional(),
    currentPrice: z.number().min(0),
    reviewCount: z.number().min(0),
    rating: z.number().min(0).max(5),
    lastUpdated: z.string(),
  })).optional(),
});

interface SKUEntryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sku?: SKUStats | null;
  onSuccess: () => void;
  mode?: 'full' | 'competitors';
}

export default function SKUEntry({ open, onOpenChange, sku, onSuccess, mode = 'full' }: SKUEntryProps) {
  const [saveError, setSaveError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { isSubmitting }, reset, setValue, control, watch } = useForm({
    resolver: zodResolver(skuSchema),
    values: sku ? {
      ...sku,
      competitors: sku.competitors || [],
      date: getMexicoDateString()
    } : {
      sku: '',
      skuName: '',
      date: getMexicoDateString(),
      sales: 0,
      orders: 0,
      stock: 0,
      avgSalesSinceListing: 0,
      slowStock: 0,
      adSpend: 0,
      impressions: 0,
      clicks: 0,
      cpc: 0,
      roas: 0,
      acos: 0,
      adOrders: 0,
      purchasePrice: 0,
      sellingPrice: 0,
      specs: '',
      reviewCount: 0,
      rating: 0,
      unitProfitExclAds: 0,
      inTransitStock: 0,
      inProductionStock: 0,
      leadTimeDays: 7,
      imageUrl: '',
      competitors: [],
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "competitors"
  });

  const watchedAdSpend = watch('adSpend');
  const watchedClicks = watch('clicks');
  const watchedAdOrders = watch('adOrders');
  const watchedPrice = watch('sellingPrice');
  const watchedSales = watch('sales');
  const watchedCpc = watch('cpc');
  const watchedRoas = watch('roas');
  const watchedAcos = watch('acos');
  const watchedCompetitors = watch('competitors') || [];

  useEffect(() => {
    if (watchedAdSpend && watchedClicks) {
      // watchedAdSpend 是美元 (USD)
      setValue('cpc', Number((watchedAdSpend / watchedClicks).toFixed(2)));
    } else {
      setValue('cpc', 0);
    }
  }, [watchedAdSpend, watchedClicks, setValue]);

  useEffect(() => {
    if (watchedAdOrders && watchedPrice && watchedAdSpend) {
      // 核心修正：ACOS/ROAS 基于广告带来的订单计算
      const adSalesUsd = (watchedAdOrders * watchedPrice) / USD_TO_MXN;
      setValue('roas', Number((adSalesUsd / watchedAdSpend).toFixed(2)));
      setValue('acos', Number(((watchedAdSpend / adSalesUsd) * 100).toFixed(2)));
    } else {
      setValue('roas', 0);
      setValue('acos', 0);
    }
  }, [watchedAdOrders, watchedPrice, watchedAdSpend, setValue]);

  // Reset form when opening with new sku or closing
  useEffect(() => {
    if (!open) {
      setSaveError(null);
    }
  }, [open]);

  const onSubmit = async (data: any) => {
    setSaveError(null);
    try {
      const docId = `${data.sku}_${data.date}`;
      console.log('正在保存 SKU 数据:', docId, data);
      const { error } = await supabase.from('sku_stats').upsert({
        doc_id: docId,
        sku: data.sku,
        sku_name: data.skuName,
        date: data.date,
        sales: data.sales || 0,
        orders: data.orders || 0,
        stock: data.stock || 0,
        avg_sales_since_listing: data.avgSalesSinceListing || 0,
        slow_stock: data.slowStock || 0,
        ad_spend: (data.adSpend || 0) * USD_TO_MXN,
        impressions: data.impressions || 0,
        clicks: data.clicks || 0,
        cpc: data.cpc || 0,
        roas: data.roas || 0,
        acos: data.acos || 0,
        ad_orders: data.adOrders || 0,
        purchase_price: data.purchasePrice || 0,
        selling_price: data.sellingPrice || 0,
        specs: data.specs || '',
        review_count: data.reviewCount || 0,
        rating: data.rating || 0,
        unit_profit_excl_ads: data.unitProfitExclAds || 0,
        in_transit_stock: data.inTransitStock || 0,
        in_production_stock: data.inProductionStock || 0,
        lead_time_days: data.leadTimeDays || 7,
        competitors: data.competitors || [],
      }, { onConflict: 'doc_id' });
      
      if (error) {
        console.error('Supabase 保存错误:', error);
        throw new Error(error.message || '数据库保存失败');
      }

      // Metadata Sync (Important for Cross-Device Consistency)
      const metadataPayload: any = {
        sku: data.sku,
        name: data.skuName || undefined,
        purchase_price: data.purchasePrice || undefined,
        updated_at: new Date().toISOString()
      };
      
      if (data.imageUrl) {
         metadataPayload.image_url = data.imageUrl;
      }

      await supabase.from('sku_metadata').upsert(metadataPayload, { onConflict: 'sku' });

      // Local cache management
      try {
        const meta = JSON.parse(localStorage.getItem('milyfly_sku_metadata') || '{}');
        if (!meta[data.sku]) meta[data.sku] = {};
        if (data.skuName) meta[data.sku].name = data.skuName;
        if (data.purchasePrice) meta[data.sku].purchasePrice = data.purchasePrice;
        if (data.imageUrl) meta[data.sku].image = data.imageUrl;
        else if (sku && sku.imageUrl) delete meta[data.sku].image;
        localStorage.setItem('milyfly_sku_metadata', JSON.stringify(meta));
      } catch {}

      if (!data.imageUrl && sku && sku.imageUrl) {
        // Specifically unset image in DB if it was cleared
        await supabase.from('sku_metadata').update({ image_url: null }).eq('sku', data.sku);
      }
      console.log('保存成功！');

      // --- Automated Operational Logging ---
      const changes: string[] = [];
      if (sku) {
        if (data.sellingPrice !== sku.sellingPrice) changes.push(`价格: $${sku.sellingPrice} -> $${data.sellingPrice}`);
        if (data.specs !== sku.specs) changes.push(`规格: [${sku.specs || '空'}] -> [${data.specs || '空'}]`);
        if (data.reviewCount !== sku.reviewCount) changes.push(`评价数: ${sku.reviewCount || 0} -> ${data.reviewCount || 0}`);
        if (data.rating !== sku.rating) changes.push(`评分: ${sku.rating || 0} -> ${data.rating || 0}`);
      } else {
        changes.push(`初始录入数据 (售价: $${data.sellingPrice})`);
      }

      if (changes.length > 0) {
        const actionMessage = changes.join('; ');
        const logPayload = {
          date: data.date,
          sku: data.sku,
          action: `[自动记录] ${actionMessage}`,
          details: JSON.stringify({
            sku: data.sku,
            date: data.date,
            actionType: 'Other',
            description: actionMessage,
            fullData: data
          }),
          created_at: new Date().toISOString()
        };
        
        await supabase.from('operation_logs').upsert([logPayload]);
        console.log('自动操作日志已保存');
      }
      // -------------------------------------

      onSuccess();
      onOpenChange(false);
      reset();
    } catch (error: any) {
      console.error('Error saving SKU data:', error);
      setSaveError(error.message || '保存失败，请检查网络后重试');
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 z-40 transition-opacity" 
        onClick={() => onOpenChange(false)}
      />
      
      {/* Right Slide Panel */}
      <div className="fixed top-0 right-0 h-full w-[520px] bg-white text-slate-900 shadow-2xl z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <div>
            <h2 className="text-base font-bold text-text-main">
              {sku ? `更新 SKU: ${sku.sku}` : '新增 SKU 数据'}
            </h2>
            <p className="text-[11px] text-text-sub mt-0.5">录入特定 SKU 的每日销售、库存及竞争数据</p>
          </div>
          <button 
            onClick={() => onOpenChange(false)}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <ScrollArea className="flex-1">
          <form id="sku-entry-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sku" className="text-xs text-slate-700">SKU 编码</Label>
                <Input {...register('sku')} disabled={!!sku} className="h-8 text-xs font-bold disabled:opacity-100 disabled:bg-slate-50 disabled:text-slate-900" placeholder="A16" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="skuName" className="text-xs text-slate-700">SKU 中文名称</Label>
                <Input {...register('skuName')} disabled={mode === 'competitors'} placeholder="例如: 蓝牙耳机-黑色" className="h-8 text-xs font-bold disabled:opacity-100 disabled:bg-slate-50 disabled:text-slate-900" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="date" className="text-xs text-slate-700 font-bold">数据记录日期（业务日期）</Label>
              <Input type="date" {...register('date')} className="h-9 text-xs font-bold bg-slate-50 border-slate-300" />
            </div>

            {mode === 'full' && (
              <>

            <div className="grid grid-cols-1 gap-3 items-end">
              <div className="flex items-center gap-2 mb-0.5">
                 <div className="relative w-8 h-8 rounded border border-slate-300 bg-slate-50 overflow-hidden flex items-center justify-center group/entryimg">
                    {watch('imageUrl') ? (
                       <>
                          <img src={watch('imageUrl')} className="w-full h-full object-cover" />
                          <button 
                            type="button"
                            onClick={(e) => { e.preventDefault(); setValue('imageUrl', ''); }}
                            className="absolute inset-0 bg-rose-500/80 text-white flex items-center justify-center opacity-0 group-hover/entryimg:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                       </>
                    ) : (
                       <Plus className="w-3 h-3 text-slate-400" />
                    )}
                 </div>
                 <Label className="text-[10px] text-slate-500 text-slate-600">
                    {watch('imageUrl') ? '已有关联图片' : '未关联图片'}
                 </Label>
              </div>
            </div>

            <Separator />
            <h3 className="font-bold text-[11px] text-primary uppercase tracking-tight">销售与库存（已满）</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sales" className="text-xs">今日销售额 (MXN)</Label>
                <Input type="number" step="0.01" {...register('sales', { valueAsNumber: true })} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="orders" className="text-xs">今日订单量</Label>
                <Input type="number" {...register('orders', { valueAsNumber: true })} className="h-8 text-xs" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="stock" className="text-xs">当前全部库存</Label>
                <Input type="number" {...register('stock', { valueAsNumber: true })} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inTransitStock" className="text-xs">在途库存（在途）</Label>
                <Input type="number" {...register('inTransitStock', { valueAsNumber: true })} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inProductionStock" className="text-xs">生产中库存（生产）</Label>
                <Input type="number" {...register('inProductionStock', { valueAsNumber: true })} className="h-8 text-xs" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="avgSalesSinceListing" className="text-xs">上架至今均销</Label>
                <Input type="number" step="0.1" {...register('avgSalesSinceListing', { valueAsNumber: true })} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="leadTimeDays" className="text-xs">头程时效 (天)</Label>
                <Input type="number" {...register('leadTimeDays', { valueAsNumber: true })} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="slowStock" className="text-xs">滞销库存 (&gt;60d)</Label>
                <Input type="number" {...register('slowStock', { valueAsNumber: true })} className="h-8 text-xs" />
              </div>
            </div>

            <Separator />
            <h3 className="font-bold text-[11px] text-primary uppercase tracking-tight">财务成本（财努）</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="purchasePrice" className="text-xs">采购价 (元)</Label>
                <Input type="number" step="0.01" {...register('purchasePrice', { valueAsNumber: true })} className="h-8 text-xs font-bold border-slate-300" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unitProfitExclAds" className="text-xs">单品纯利润 (MXN)</Label>
                <Input type="number" step="0.01" {...register('unitProfitExclAds', { valueAsNumber: true })} className="h-8 text-xs font-bold border-slate-300" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sellingPrice" className="text-xs font-bold text-sky-600">我的售价 (MXN)</Label>
                <Input type="number" step="0.01" {...register('sellingPrice', { valueAsNumber: true })} className="h-8 text-xs font-bold border-sky-300 bg-sky-50/30" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="specs" className="text-xs font-bold text-sky-600">我的产品规格</Label>
                <Input {...register('specs')} placeholder="黑色-标准版" className="h-8 text-xs font-bold border-sky-300 bg-sky-50/30" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="reviewCount" className="text-xs font-bold text-sky-600">我的评价数量</Label>
                <Input type="number" {...register('reviewCount', { valueAsNumber: true })} className="h-8 text-xs font-bold border-sky-300 bg-sky-50/30" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rating" className="text-xs font-bold text-sky-600">我的评分 (0-5)</Label>
                <Input type="number" step="0.1" {...register('rating', { valueAsNumber: true })} className="h-8 text-xs font-bold border-sky-300 bg-sky-50/30" />
              </div>
            </div>

            <Separator />
            <h3 className="font-bold text-[11px] text-primary uppercase tracking-tight">广告与竞争</h3>
            
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="adSpend" className="text-xs">广告消耗 (USD)</Label>
                <Input type="number" step="0.01" {...register('adSpend', { valueAsNumber: true })} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="impressions" className="text-xs">曝光</Label>
                <Input type="number" {...register('impressions', { valueAsNumber: true })} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="clicks" className="text-xs">点击</Label>
                <Input type="number" {...register('clicks', { valueAsNumber: true })} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="adOrders" className="text-xs">广告订单</Label>
                <Input type="number" {...register('adOrders', { valueAsNumber: true })} className="h-8 text-xs" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div className="space-y-1.5">
                <Label className="text-[10px] text-slate-500">CPC (自动)</Label>
                <div className="h-8 flex items-center px-3 bg-white border rounded-md text-xs font-medium text-slate-700">
                  ${Number(watchedCpc || 0).toFixed(2)}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] text-slate-500">ROAS (自动)</Label>
                <div className="h-8 flex items-center px-3 bg-white border rounded-md text-xs font-medium text-slate-700">
                  {Number(watchedRoas || 0).toFixed(2)}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] text-slate-500">ACOS % (自动)</Label>
                <div className="h-8 flex items-center px-3 bg-white border rounded-md text-xs font-medium text-slate-700">
                  {Number(watchedAcos || 0).toFixed(2)}%
                </div>
              </div>
            </div>
            </>
            )}

            {mode === 'full' && <Separator />}
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[11px] text-blue-700 uppercase tracking-tight">竞品监控 (Competitors)</h3>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="h-7 text-[10px] gap-1"
                onClick={() => append({ 
                  id: Math.random().toString(36).substr(2, 9),
                  url: '', 
                  name: '', 
                  currentPrice: 0, 
                  reviewCount: 0, 
                  rating: 0, 
                  lastUpdated: getMexicoDateString() 
                })}
              >
                <Plus className="w-3 h-3" /> 添加竞品
              </Button>
            </div>

            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="p-3 border rounded-lg bg-slate-50/50 space-y-3 relative group">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 text-slate-400 hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>

                  <div className="grid grid-cols-[100px_1fr] gap-4">
                    <div className="space-y-1.5 flex flex-col items-center">
                      <Label className="text-[10px] text-slate-500">竞品主图</Label>
                      <div className="w-20 h-20 rounded border border-slate-200 bg-white overflow-hidden flex items-center justify-center relative group/compimg">
                        {watchedCompetitors[index]?.imageUrl ? (
                          <img src={watchedCompetitors[index].imageUrl} className="w-full h-full object-cover" />
                        ) : (
                          <Plus className="w-4 h-4 text-slate-300" />
                        )}
                      </div>
                    </div>

                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] text-slate-600">竞品图片 URL</Label>
                          <Input {...register(`competitors.${index}.imageUrl`)} placeholder="https://..." className="h-7 text-xs bg-white" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] text-slate-500 font-bold text-blue-600">店铺等级</Label>
                          <Input {...register(`competitors.${index}.name`)} placeholder="例如: 铂金/优秀" className="h-7 text-xs bg-white" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] text-slate-500">竞品规格</Label>
                          <Input {...register(`competitors.${index}.specs`)} placeholder="例如: 黑色-加厚款" className="h-7 text-xs bg-white" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] text-slate-500">竞品链接 (URL)</Label>
                          <div className="flex gap-1">
                            <Input {...register(`competitors.${index}.url`)} placeholder="https://..." className="h-7 text-xs bg-white flex-1" />
                            {watchedCompetitors[index]?.url && (
                              <Button 
                                type="button" 
                                variant="outline" 
                                size="icon" 
                                className="h-7 w-7"
                                onClick={() => window.open(watchedCompetitors[index].url, '_blank')}
                              >
                                <ExternalLink className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-slate-500">当日售价 (MXN)</Label>
                      <Input type="number" step="0.01" {...register(`competitors.${index}.currentPrice`, { valueAsNumber: true })} className="h-7 text-xs bg-white" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-slate-500">评价数量</Label>
                      <Input type="number" {...register(`competitors.${index}.reviewCount`, { valueAsNumber: true })} className="h-7 text-xs bg-white" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] text-slate-500">评分 (0-5)</Label>
                      <Input type="number" step="0.1" {...register(`competitors.${index}.rating`, { valueAsNumber: true })} className="h-7 text-xs bg-white" />
                    </div>
                  </div>
                </div>
              ))}
              {fields.length === 0 && (
                <div className="text-center py-6 border border-dashed rounded-lg text-slate-400 text-xs">
                  暂无竞品监控，点击上方按钮添加
                </div>
              )}
            </div>
          </form>
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 shrink-0 space-y-2">
          {saveError && (
            <div className="text-xs text-rose-500 bg-rose-50 px-3 py-2 rounded-md text-center">
              {saveError}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button type="submit" form="sku-entry-form" disabled={isSubmitting}>
              {isSubmitting ? '保存中...' : '保存SKU数据'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
