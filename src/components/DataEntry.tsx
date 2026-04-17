import { useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { SKUStats } from '../types';
import { getMexicoDateString } from '../lib/time';

const DRAFT_KEY = 'meikeduo_daily_entry_draft';

const dailySchema = z.object({
  date: z.string(),
  totalSales: z.number().min(0),
  totalOrders: z.number().min(0),
  adSpend: z.number().min(0),
  exchangeRate: z.number().min(0),
  questions: z.number().min(0),
  claims: z.number().min(0),
  reputation: z.enum(['green', 'yellow', 'red']),
  calculatedProfit: z.number().optional(),
});

const skuSchema = z.object({
  sku: z.string().min(1),
  sales: z.number().min(0),
  orders: z.number().min(0),
  adSpend: z.number().min(0),
  stock: z.number().min(0),
  competitorPrice: z.number().min(0),
  rank: z.number().min(0),
  bid: z.number().min(0),
  slowStock: z.number().min(0),
});

interface DataEntryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  skuData: SKUStats[];
}

export default function DataEntry({ open, onOpenChange, onSuccess, skuData }: DataEntryProps) {
  const draftRestored = useRef(false);
  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, watch, reset } = useForm({
    resolver: zodResolver(dailySchema),
    defaultValues: {
      date: getMexicoDateString(),
      totalSales: 0,
      totalOrders: 0,
      adSpend: 0,
      exchangeRate: 0.35,
      questions: 0,
      claims: 0,
      reputation: 'green' as const,
    }
  });

  const selectedDate = watch('date');
  const formValues = watch();

  // Auto-save draft to localStorage (防丢草稿)
  const saveDraft = useCallback((data: any) => {
    if (!data) return;
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      ...data,
      _savedAt: Date.now(),
    }));
  }, []);

  // Debounced auto-save on every form change
  useEffect(() => {
    if (!draftRestored.current) return; // 还没恢复草稿前不要覆盖
    const timer = setTimeout(() => saveDraft(formValues), 800);
    return () => clearTimeout(timer);
  }, [formValues, saveDraft]);

  // Restore draft when dialog opens
  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        // 草稿不超过24小时才恢复
        if (Date.now() - draft._savedAt < 24 * 60 * 60 * 1000) {
          const { _savedAt, ...fields } = draft;
          Object.entries(fields).forEach(([key, val]) => {
            setValue(key as any, val as any);
          });
          draftRestored.current = true;
        }
      }
    } catch {}
    draftRestored.current = true;
  }, [open, setValue]);

  // Auto-calculate totals whenever date or skuData changes
  useEffect(() => {
    const todaySkus = skuData.filter(s => s.date === selectedDate);
    const totalSales = todaySkus.reduce((sum, s) => sum + s.sales, 0);
    const totalOrders = todaySkus.reduce((sum, s) => sum + s.orders, 0);
    const adSpend = todaySkus.reduce((sum, s) => sum + s.adSpend, 0);
    const totalProfit = todaySkus.reduce((sum, s) => sum + (s.orders * (s.unitProfitExclAds || 0)), 0) - adSpend;

    setValue('totalSales', totalSales);
    setValue('totalOrders', totalOrders);
    setValue('adSpend', adSpend);
    setValue('calculatedProfit', totalProfit);
  }, [selectedDate, skuData, setValue]);

  // Clear draft after successful submit
  const clearDraft = () => localStorage.removeItem(DRAFT_KEY);

  const onSubmit = async (data: any) => {
    try {
      const dateStr = data.date;
      await supabase.from('daily_stats').upsert({
        date: dateStr,
        total_sales: data.totalSales,
        total_orders: data.totalOrders,
        ad_spend: data.adSpend,
        exchange_rate: data.exchangeRate,
        questions: data.questions,
        claims: data.claims,
        reputation: data.reputation,
        calculated_profit: data.calculatedProfit,
      }, { onConflict: 'date' });
      clearDraft();
      reset();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>每日运营数据录入</DialogTitle>
          <DialogDescription>
            请输入今日的销售、广告及账号健康数据。系统将自动计算利润与各项指标。
            <span className="text-emerald-600 ml-1 text-[10px]">（数据已自动保存草稿，刷新不丢失）</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-4 -mr-4">
          <form id="data-entry-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="date" className="text-xs">日期</Label>
                <Input type="date" {...register('date')} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exchangeRate" className="text-xs">实时汇率 (MXN to CNY)</Label>
                <Input type="number" step="0.0001" {...register('exchangeRate', { valueAsNumber: true })} className="h-8 text-xs" />
              </div>
            </div>

            <Separator />
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[11px] text-primary uppercase tracking-tight">核心销售与财务 (自动汇总)</h3>
              <span className="text-[10px] text-text-sub italic">数据源自 SKU 每日录入</span>
            </div>
            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div className="space-y-1.5">
                <Label className="text-[10px] text-slate-500">总销售额 (MXN)</Label>
                <div className="h-8 flex items-center px-3 bg-white border rounded-md text-xs font-bold text-slate-700">
                  ${watch('totalSales').toLocaleString()}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] text-slate-500">总订单量</Label>
                <div className="h-8 flex items-center px-3 bg-white border rounded-md text-xs font-bold text-slate-700">
                  {watch('totalOrders')}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] text-slate-500">总广告花费 (MXN)</Label>
                <div className="h-8 flex items-center px-3 bg-white border rounded-md text-xs font-bold text-rose-600">
                  ${watch('adSpend').toLocaleString()}
                </div>
              </div>
            </div>

            <Separator />
            <h3 className="font-bold text-[11px] text-primary uppercase tracking-tight">账号健康</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="questions" className="text-xs">未处理问答</Label>
                <Input type="number" {...register('questions', { valueAsNumber: true })} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="claims" className="text-xs">未处理纠纷</Label>
                <Input type="number" {...register('claims', { valueAsNumber: true })} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">信誉状态</Label>
                <Select onValueChange={(val) => setValue('reputation', val as any)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="选择状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="green">绿色 (Excellent)</SelectItem>
                    <SelectItem value="yellow">黄色 (Warning)</SelectItem>
                    <SelectItem value="red">红色 (Critical)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </form>
        </div>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => { clearDraft(); reset(); onOpenChange(false); }}>取消</Button>
          <Button type="submit" form="data-entry-form" disabled={isSubmitting}>
            {isSubmitting ? '保存中...' : '保存今日数据'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
