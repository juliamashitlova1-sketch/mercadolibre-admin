import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { supabase } from '../lib/supabase';
import { SKUStats } from '../types';
import { getMexicoDateString } from '../lib/time';

const operationSchema = z.object({
  sku: z.string().min(1, '请选择 SKU'),
  date: z.string().min(1, '日期必填'),
  actionType: z.enum(['Price', 'Image', 'Ads', 'Title', 'Stock', 'Other']),
  description: z.string().min(1, '操作描述必填'),
});

interface OperationEntryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skuData: SKUStats[];
  initialSku?: string;
  onSuccess: () => void;
}

export default function OperationEntry({ open, onOpenChange, skuData, initialSku, onSuccess }: OperationEntryProps) {
  const { register, handleSubmit, control, formState: { isSubmitting, errors }, reset } = useForm({
    resolver: zodResolver(operationSchema),
    defaultValues: {
      sku: initialSku || '',
      date: getMexicoDateString(),
      actionType: 'Price' as const,
      description: '',
    }
  });

  const onSubmit = async (data: any) => {
    try {
      const { error } = await supabase.from('operation_logs').upsert([{
        date: data.date,
        sku: data.sku,
        action_type: data.actionType,
        description: data.description,
        action: `[${data.actionType}] ${data.description}`,
        details: JSON.stringify(data),
      }]);
      if (error) throw error;
      onSuccess();
      onOpenChange(false);
      reset();
    } catch (error: any) {
      console.error('Error saving operation log:', error);
      alert(`保存失败: ${error?.message || '未知错误'}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>记录运营操作</DialogTitle>
          <DialogDescription>
            记录对 SKU 的具体操作（如调价、改图），以便后续分析效果。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">SKU</Label>
              <Controller
                name="sku"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="选择SKU" />
                    </SelectTrigger>
                    <SelectContent>
                      {skuData.map((s) => (
                        <SelectItem key={s.sku} value={s.sku}>
                          {s.sku} {s.skuName ? `(${s.skuName})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.sku && <p className="text-[10px] text-destructive font-bold">{errors.sku.message as string}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="date" className="text-xs">操作日期</Label>
              <Input {...register('date')} type="date" className="h-8 text-xs" />
              {errors.date && <p className="text-[10px] text-destructive font-bold">{errors.date.message as string}</p>}
            </div>
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-xs">操作类型</Label>
            <Controller
              name="actionType"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="选择类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Price">价格调整 (Price)</SelectItem>
                    <SelectItem value="Image">图片更新 (Image)</SelectItem>
                    <SelectItem value="Ads">广告策略 (Ads)</SelectItem>
                    <SelectItem value="Title">标题/文案 (Title)</SelectItem>
                    <SelectItem value="Stock">库存变动 (Stock)</SelectItem>
                    <SelectItem value="Other">其他操作 (Other)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs">操作详情</Label>
            <Textarea 
              {...register('description')} 
              placeholder="描述具体做了什么，例如：价格从 349 降至 299，增加主图视频" 
              className="text-xs min-h-[100px]"
            />
            {errors.description && <p className="text-[10px] text-destructive font-bold">{errors.description.message as string}</p>}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '保存中...' : '保存记录'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
