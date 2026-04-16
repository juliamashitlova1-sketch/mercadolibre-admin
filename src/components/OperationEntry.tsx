import { useForm } from 'react-hook-form';
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
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { SKUStats } from '../types';

const operationSchema = z.object({
  sku: z.string().min(1, '请选择或输入SKU'),
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
  const { register, handleSubmit, formState: { isSubmitting, errors }, reset, setValue, watch } = useForm({
    resolver: zodResolver(operationSchema),
    defaultValues: {
      sku: initialSku || '',
      date: format(new Date(), 'yyyy-MM-dd'),
      actionType: 'Price' as const,
      description: '',
    }
  });

  const selectedActionType = watch('actionType');

  const onSubmit = async (data: any) => {
    try {
      const { error } = await supabase.from('operation_logs').insert([{
        date: data.date,
        action: `[${data.actionType}] ${data.description}`,
        sku: data.sku,
        details: JSON.stringify(data),
      }]);
      if (error) throw error;
      onSuccess();
      onOpenChange(false);
      reset();
    } catch (error) {
      console.error('Error saving operation log:', error);
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

        <form id="operation-entry-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="sku" className="text-xs">SKU</Label>
              <Select 
                defaultValue={initialSku || ''} 
                onValueChange={(val) => setValue('sku', val)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="选择SKU" />
                </SelectTrigger>
                <SelectContent>
                  {skuData.map((s) => (
                    <SelectItem key={s.sku} value={s.sku}>{s.sku}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.sku && <p className="text-[10px] text-danger">{errors.sku.message as string}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="date" className="text-xs">操作日期</Label>
              <Input {...register('date')} type="date" className="h-8 text-xs" />
              {errors.date && <p className="text-[10px] text-danger">{errors.date.message as string}</p>}
            </div>
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="actionType" className="text-xs">操作类型</Label>
            <Select 
              defaultValue="Price" 
              onValueChange={(val: any) => setValue('actionType', val)}
            >
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
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs">操作详情</Label>
            <Textarea 
              {...register('description')} 
              placeholder="描述具体做了什么，例如：价格从 349 降至 299，增加主图视频" 
              className="text-xs min-h-[100px]"
            />
            {errors.description && <p className="text-[10px] text-danger">{errors.description.message as string}</p>}
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button type="submit" form="operation-entry-form" disabled={isSubmitting}>
            {isSubmitting ? '保存中...' : '保存记录'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
