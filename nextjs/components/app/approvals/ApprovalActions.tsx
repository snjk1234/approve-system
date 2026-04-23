'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface ApprovalActionsProps {
  documentId: string;
  stepId: string;
}

export default function ApprovalActions({ documentId, stepId }: ApprovalActionsProps) {
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState<null | 'approve' | 'reject'>(null);
  const router = useRouter();
  const { toast } = useToast();

  const handleAction = async (action: 'approve' | 'reject') => {
    setLoading(action);
    try {
      const response = await fetch(`/api/approvals/${documentId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stepId,
          action,
          comment
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to process action');

      toast({
        title: action === 'approve' ? 'تمت الموافقة بنجاح' : 'تم رفض الطلب',
        description: action === 'approve' ? 'تم نقل الطلب للمرحلة التالية' : 'تم إغلاق الطلب كمرفوض',
      });

      router.refresh();
    } catch (error: any) {
      toast({
        title: 'حدث خطأ',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card className="border-brand/20 bg-brand/5 shadow-lg animate-in zoom-in-95 duration-300">
      <CardHeader>
        <CardTitle className="text-lg">اتخاذ قرار بشأن هذا الطلب</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">ملاحظات (اختياري)</label>
          <Textarea 
            placeholder="اكتب ملاحظاتك هنا..." 
            className="bg-background/50 border-brand/10 focus:border-brand/30"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>
        
        <div className="flex gap-3 pt-2">
          <Button 
            className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2"
            onClick={() => handleAction('approve')}
            disabled={loading !== null}
          >
            {loading === 'approve' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            موافقة واعتماد
          </Button>
          <Button 
            variant="destructive" 
            className="flex-1 gap-2"
            onClick={() => handleAction('reject')}
            disabled={loading !== null}
          >
            {loading === 'reject' ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            رفض الطلب
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
