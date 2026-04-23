import { createClient } from '@/utils/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText, 
  ArrowRight, 
  Download,
  User as UserIcon,
  MessageSquare
} from 'lucide-react';
import Link from 'next/link';
import { DocumentStatus, StepStatus } from '@/utils/supabase/enterprise-types';
import ApprovalActions from '@/components/app/approvals/ApprovalActions';

export default async function ApprovalDetailsPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  // Fetch document with steps and profiles
  const { data: document, error } = await supabase
    .from('documents')
    .select(`
      *,
      creator:profiles!creator_id(full_name, avatar_url, email),
      steps:approval_steps(
        *,
        approver:profiles!approver_id(full_name, avatar_url, email)
      )
    `)
    .eq('id', params.id)
    .single();

  if (error || !document) {
    return notFound();
  }

  // Sort steps by sequence
  const sortedSteps = [...document.steps].sort((a, b) => a.sequence - b.sequence);
  
  // Find if current user is the current pending approver
  const currentStep = sortedSteps.find(s => s.status === 'pending');
  const isCurrentApprover = currentStep?.approver_id === user.id;

  const getStatusBadge = (status: DocumentStatus | StepStatus) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-200"><Clock className="w-3 h-3 ml-1" /> قيد الانتظار</Badge>;
      case 'approved':
      case 'completed':
        return <Badge className="bg-green-500/10 text-green-600 border-green-200"><CheckCircle2 className="w-3 h-3 ml-1" /> معتمد</Badge>;
      case 'rejected':
      case 'cancelled':
        return <Badge className="bg-red-500/10 text-red-600 border-red-200"><XCircle className="w-3 h-3 ml-1" /> مرفوض</Badge>;
      case 'waiting':
        return <Badge variant="outline" className="text-muted-foreground"><Clock className="w-3 h-3 ml-1" /> بانتظار الدور</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/approvals">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{document.title}</h1>
              {getStatusBadge(document.status)}
            </div>
            <p className="text-muted-foreground text-sm mt-1">
              رقم الطلب: <span className="font-mono">#{document.request_number}</span> • 
              تاريخ الإنشاء: {new Date(document.created_at).toLocaleDateString('ar-EG')}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {document.file_url && (
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              تحميل المستند
            </Button>
          )}
          <Button variant="outline" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            فتح نقاش
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          <Card className="glass-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand" />
                تفاصيل الطلب
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider">الوصف</label>
                <p className="text-foreground mt-1 leading-relaxed">
                  {document.description || 'لا يوجد وصف متاح'}
                </p>
              </div>
              
              <div className="pt-4 border-t border-border/50">
                <label className="text-xs text-muted-foreground uppercase tracking-wider">منشئ الطلب</label>
                <div className="flex items-center gap-3 mt-2">
                  <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold">
                    {document.creator.avatar_url ? (
                      <img src={document.creator.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      document.creator.full_name?.[0] || 'U'
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold">{document.creator.full_name}</p>
                    <p className="text-xs text-muted-foreground">{document.creator.email}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Decision Box if Current Approver */}
          {isCurrentApprover && (
            <ApprovalActions documentId={document.id} stepId={currentStep.id} />
          )}
        </div>

        {/* Sidebar: Approval Timeline */}
        <div className="space-y-6">
          <Card className="glass-1 border-brand/10">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-brand" />
                مسار الاعتماد
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative space-y-8 before:absolute before:right-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-muted">
                {sortedSteps.map((step, index) => (
                  <div key={step.id} className="relative flex items-start pr-10 group">
                    {/* Status Icon */}
                    <div className={`absolute right-0 w-8 h-8 rounded-full flex items-center justify-center z-10 border-4 border-background ${
                      step.status === 'approved' ? 'bg-green-500 text-white' :
                      step.status === 'rejected' ? 'bg-red-500 text-white' :
                      step.status === 'pending' ? 'bg-yellow-500 text-white animate-pulse' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {step.status === 'approved' ? <CheckCircle2 className="w-4 h-4" /> :
                       step.status === 'rejected' ? <XCircle className="w-4 h-4" /> :
                       <div className="w-2 h-2 rounded-full bg-current" />}
                    </div>

                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <p className={`text-sm font-bold ${step.status === 'pending' ? 'text-brand' : 'text-foreground'}`}>
                          {step.approver.full_name}
                        </p>
                        <span className="text-[10px] text-muted-foreground font-mono">#{step.sequence}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 italic">{step.status === 'pending' ? 'بانتظار الإجراء...' : step.status}</p>
                      {step.comment && (
                        <div className="mt-2 p-2 rounded bg-muted/50 text-[11px] text-muted-foreground border-r-2 border-brand/20">
                          "{step.comment}"
                        </div>
                      )}
                      {step.acted_at && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {new Date(step.acted_at).toLocaleString('ar-EG')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
