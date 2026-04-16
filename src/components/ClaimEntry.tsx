import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';

const claimSchema = z.object({
  orderId: z.string().min(1, '订单号必填'),
  request: z.string().min(1, '诉求必填'),
  productName: z.string().min(1, '商品名称必填'),
  handlingMethod: z.string().min(1, '处理方式必填'),
  handlingTime: z.string().min(1, '处理时间必填'),
});

interface ClaimEntryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function ClaimEntry({ open, onOpenChange, onSuccess }: ClaimEntryProps) {
  const { register, handleSubmit, formState: { isSubmitting, errors }, reset } = useForm({
    resolver: zodResolver(claimSchema),
    defaultValues: {
      orderId: '',
      request: '',
      productName: '',
      handlingMethod: '',
      handlingTime: format(new Date(), 'yyyy-MM-dd HH:mm'),
    }
  });

  const onSubmit = async (data: any) => {
    try {
      const { error } = await supabase.from('claims').insert([{
        doc_id: `claim_${Date.now()}`,
        claim_id: data.orderId,
        order_number: data.orderId,
        reason: `${data.request} | ${data.handlingMethod} @ ${data.handlingTime}`,
        status: 'open',
        details: JSON.stringify(data),
      }]);
      if (error) throw error;
      onSuccess();
      onOpenChange(false);
      reset();
    } catch (error) {
      console.error('Error saving claim:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>记录新纠纷</DialogTitle>
          <DialogDescription>
            录入近期发生的订单纠纷及处理详情。
          </DialogDescription>
        </DialogHeader>

        <form id="claim-entry-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="orderId" className="text-xs">订单号</Label>
            <Input {...register('orderId')} placeholder="例如: #2000001234" className="h-8 text-xs" />
            {errors.orderId && <p className="text-[10px] text-danger">{errors.orderId.message as string}</p>}
          </div>
          
          <div className="space-y-1.5">
            <Label htmlFor="productName" className="text-xs">商品名称</Label>
            <Input {...register('productName')} placeholder="例如: 蓝牙耳机-黑色" className="h-8 text-xs" />
            {errors.productName && <p className="text-[10px] text-danger">{errors.productName.message as string}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="request" className="text-xs">买家诉求</Label>
            <Input {...register('request')} placeholder="例如: 产品破损要求退款" className="h-8 text-xs" />
            {errors.request && <p className="text-[10px] text-danger">{errors.request.message as string}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="handlingMethod" className="text-xs">处理方式</Label>
            <Input {...register('handlingMethod')} placeholder="例如: 已同意部分退款" className="h-8 text-xs" />
            {errors.handlingMethod && <p className="text-[10px] text-danger">{errors.handlingMethod.message as string}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="handlingTime" className="text-xs">处理时间</Label>
            <Input {...register('handlingTime')} className="h-8 text-xs" />
            {errors.handlingTime && <p className="text-[10px] text-danger">{errors.handlingTime.message as string}</p>}
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button type="submit" form="claim-entry-form" disabled={isSubmitting}>
            {isSubmitting ? '保存中...' : '保存记录'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
