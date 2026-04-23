import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  PauseCircle,
  FileText,
  ChevronLeft
} from 'lucide-react';
import Link from 'next/link';
import { DocumentStatus } from '@/utils/supabase/enterprise-types';

export default async function ApprovalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  // Fetch documents created by me
  const { data: myRequests } = await supabase
    .from('documents')
    .select(`
      *,
      creator:profiles!creator_id(full_name, avatar_url)
    `)
    .eq('creator_id', user.id)
    .order('created_at', { ascending: false });

  // Fetch documents awaiting my approval
  const { data: awaitingApprovals } = await supabase
    .from('approval_steps')
    .select(`
      *,
      document:documents(
        *,
        creator:profiles!creator_id(full_name, avatar_url)
      )
    `)
    .eq('approver_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  const getStatusBadge = (status: DocumentStatus) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border-yellow-200"><Clock className="w-3 h-3 ml-1" /> قيد المراجعة</Badge>;
      case 'in_progress':
        return <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-200"><Clock className="w-3 h-3 ml-1" /> جاري التنفيذ</Badge>;
      case 'completed':
        return <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-200"><CheckCircle2 className="w-3 h-3 ml-1" /> مكتمل</Badge>;
      case 'cancelled':
        return <Badge variant="secondary" className="bg-red-500/10 text-red-600 border-red-200"><XCircle className="w-3 h-3 ml-1" /> ملغي</Badge>;
      case 'paused':
        return <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 border-orange-200"><PauseCircle className="w-3 h-3 ml-1" /> متوقف للنقاش</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">طلبات الاعتماد</h1>
          <p className="text-muted-foreground mt-1">إدارة مسارات الاعتماد والموافقات الخاصة بك</p>
        </div>
        <Link href="/approvals/new">
          <Button className="bg-brand hover:bg-brand/90 text-brand-foreground gap-2">
            <Plus className="w-4 h-4" />
            طلب اعتماد جديد
          </Button>
        </Link>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Awaiting My Approval Section */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5 text-brand" />
            طلبات بانتظار موافقتك
            {awaitingApprovals && awaitingApprovals.length > 0 && (
              <span className="bg-brand text-brand-foreground text-xs px-2 py-0.5 rounded-full">
                {awaitingApprovals.length}
              </span>
            )}
          </h2>
          
          <div className="space-y-3">
            {awaitingApprovals && awaitingApprovals.length > 0 ? (
              awaitingApprovals.map((step: any) => (
                <Link key={step.id} href={`/approvals/${step.document_id}`}>
                  <Card className="hover:border-brand/50 transition-colors cursor-pointer glass-2 overflow-hidden group">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center text-brand">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <p className="font-bold text-foreground truncate group-hover:text-brand transition-colors">
                            {step.document.title}
                          </p>
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded uppercase font-mono">
                            #{step.document.request_number}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          بواسطة: {step.document.creator.full_name}
                        </p>
                      </div>
                      <ChevronLeft className="w-5 h-5 text-muted-foreground group-hover:text-brand transition-colors" />
                    </CardContent>
                  </Card>
                </Link>
              ))
            ) : (
              <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed">
                <CheckCircle2 className="w-8 h-8 mx-auto text-muted-foreground opacity-30 mb-2" />
                <p className="text-sm text-muted-foreground">لا توجد طلبات بانتظارك حالياً</p>
              </div>
            )}
          </div>
        </section>

        {/* My Requests Section */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-muted-foreground" />
            طلباتي الأخيرة
          </h2>
          
          <div className="space-y-3">
            {myRequests && myRequests.length > 0 ? (
              myRequests.map((doc: any) => (
                <Link key={doc.id} href={`/approvals/${doc.id}`}>
                  <Card className="hover:border-border/80 transition-colors cursor-pointer bg-card/50 overflow-hidden group">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-brand/5 group-hover:text-brand transition-colors">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <p className="font-semibold text-foreground truncate">
                            {doc.title}
                          </p>
                          {getStatusBadge(doc.status)}
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <p className="text-xs text-muted-foreground">
                            تاريخ الطلب: {new Date(doc.created_at).toLocaleDateString('ar-EG')}
                          </p>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            #{doc.request_number}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))
            ) : (
              <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed">
                <p className="text-sm text-muted-foreground">لم تقم بإنشاء أي طلبات بعد</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
