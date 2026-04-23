'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Plus, 
  Trash2, 
  MoveUp, 
  MoveDown, 
  FileUp, 
  Loader2,
  UserPlus,
  Search as SearchIcon,
  Check
} from 'lucide-react';
import { User } from '@/utils/supabase/enterprise-types';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function NewApprovalPage() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [approvers, setApprovers] = useState<Profile[]>([]);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      // Fetch from 'profiles' table (renamed from users)
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user?.id)
        .eq('is_active', true);
      
      if (profiles) {
        setAllUsers(profiles as Profile[]);
      }
    }
    fetchData();
  }, [supabase]);

  const filteredUsers = allUsers.filter(user => 
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleApprover = (user: Profile) => {
    if (approvers.some(a => a.id === user.id)) {
      setApprovers(approvers.filter(a => a.id !== user.id));
    } else {
      setApprovers([...approvers, user]);
    }
  };

  const handleRemoveApprover = (id: string) => {
    setApprovers(approvers.filter(a => a.id !== id));
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newApprovers = [...approvers];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= approvers.length) return;
    
    [newApprovers[index], newApprovers[targetIndex]] = [newApprovers[targetIndex], newApprovers[index]];
    setApprovers(newApprovers);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || approvers.length === 0) {
      toast({
        title: 'يرجى إكمال البيانات',
        description: 'يجب إدخال العنوان واختيار معتمد واحد على الأقل',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      let fileUrl = null;
      let fileName = null;

      if (file) {
        // التحقق من الجلسة قبل الرفع
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('انتهت جلستك، يرجى إعادة تسجيل الدخول');
        }

        // تنظيف اسم الملف من الأحرف غير اللاتينية لضمان قبوله في التخزين
        const safeFileName = file.name.replace(/[^\x00-\x7F]/g, "file").replace(/\s+/g, "_");
        fileName = `${Date.now()}-${safeFileName}`;
        
        const { data, error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Detailed Storage Error:', {
            message: uploadError.message,
            name: uploadError.name,
            stack: (uploadError as any).stack,
            full: uploadError
          });
          throw new Error(`فشل رفع الملف: ${uploadError.message || 'خطأ في الاتصال بالخادم'}. تأكد من وجود المجلد (Bucket) باسم documents وصلاحيات الرفع.`);
        }
        fileUrl = fileName; 
      }

      // Call our API route
      const response = await fetch('/api/approvals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          file_url: fileUrl,
          file_name: file?.name || null,
          approver_ids: approvers.map(a => a.id)
        }),
      });

      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error('Non-JSON response received:', text);
        throw new Error('حدث خطأ في الخادم (Server Error). يرجى التأكد من تطبيق ملف الـ Migration الخاص بقاعدة البيانات.');
      }

      const result = await response.json();
      if (!response.ok) {
        console.error('API Response Error:', result);
        throw new Error(result.error || 'فشل في إنشاء الطلب');
      }

      toast({
        title: 'تم إنشاء الطلب بنجاح',
        description: 'تم إرسال الطلب للمعتمد الأول'
      });

      router.push('/approvals');
    } catch (error: any) {
      console.error('Full Error Object:', error);
      toast({
        title: 'حدث خطأ',
        description: error.message || 'حدث خطأ غير متوقع أثناء معالجة الطلب',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">طلب اعتماد جديد</h1>
          <p className="text-muted-foreground mt-1">قم برفع المستند وتحديد مسار الاعتماد</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="glass-2">
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">عنوان الطلب</Label>
              <Input 
                id="title" 
                placeholder="مثال: اعتماد فاتورة المشتريات - أبريل 2024" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-background/50"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">الوصف (اختياري)</Label>
              <textarea 
                id="description" 
                placeholder="تفاصيل إضافية حول الطلب..."
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>المستند</Label>
              <div 
                className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:bg-accent/50 transition-colors cursor-pointer relative"
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <input 
                  type="file" 
                  id="file-upload" 
                  className="hidden" 
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                {file ? (
                  <div className="flex items-center justify-center gap-2 text-primary font-medium">
                    <FileUp className="w-5 h-5" />
                    <span>{file.name}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive h-8 w-8 ml-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <FileUp className="w-10 h-10 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">انقر هنا لرفع المستند (PDF, Word, Image)</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label className="text-lg font-semibold">مسار الاعتماد (بالترتيب)</Label>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" className="gap-2">
                  <UserPlus className="w-4 h-4" />
                  إضافة معتمدين
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md gap-0 p-0">
                <DialogHeader className="p-4 border-b">
                  <DialogTitle>اختيار المعتمدين</DialogTitle>
                </DialogHeader>
                <div className="p-4 border-b bg-muted/30">
                  <div className="relative">
                    <SearchIcon className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="ابحث عن اسم أو بريد إلكتروني..."
                      className="pr-9"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <ScrollArea className="h-[300px]">
                  <div className="p-2">
                    {filteredUsers.length === 0 ? (
                      <p className="text-center py-8 text-sm text-muted-foreground">لا يوجد نتائج</p>
                    ) : (
                      filteredUsers.map((user) => {
                        const selectedIndex = approvers.findIndex(a => a.id === user.id);
                        const isSelected = selectedIndex !== -1;
                        return (
                          <div
                            key={user.id}
                            className={`flex items-center gap-3 p-3 rounded-md cursor-pointer transition-colors ${
                              isSelected ? 'bg-primary/5 border border-primary/20' : 'hover:bg-accent'
                            }`}
                            onClick={() => toggleApprover(user)}
                          >
                            <div className="relative">
                              <Avatar className="h-9 w-9">
                                <AvatarImage src={user.avatar_url || ''} />
                                <AvatarFallback>{user.full_name?.substring(0, 2)}</AvatarFallback>
                              </Avatar>
                              {isSelected && (
                                <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-background">
                                  {selectedIndex + 1}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{user.full_name}</p>
                              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                            </div>
                            {isSelected && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
                <div className="p-4 border-t flex justify-between items-center bg-muted/10">
                  <p className="text-xs text-muted-foreground">تم اختيار {approvers.length} شخص</p>
                  <Button size="sm" onClick={() => setIsDialogOpen(false)}>موافق</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-3">
            {approvers.length === 0 ? (
              <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed">
                <UserPlus className="w-8 h-8 mx-auto text-muted-foreground opacity-50 mb-2" />
                <p className="text-sm text-muted-foreground">لم يتم إضافة معتمدين بعد</p>
              </div>
            ) : (
              approvers.map((approver, index) => (
                <div 
                  key={approver.id}
                  className="flex items-center gap-4 bg-card p-3 rounded-lg border border-border shadow-sm group animate-in slide-in-from-right-2"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                    {index + 1}
                  </div>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={approver.avatar_url || ''} />
                    <AvatarFallback className="bg-primary/5 text-primary">
                      {approver.full_name?.substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{approver.full_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{approver.role}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMove(index, 'up')}
                    >
                      <MoveUp className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      type="button"
                      disabled={index === approvers.length - 1}
                      onClick={() => handleMove(index, 'down')}
                    >
                      <MoveDown className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive"
                      type="button"
                      onClick={() => handleRemoveApprover(approver.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => router.back()}
            disabled={loading}
          >
            إلغاء
          </Button>
          <Button 
            type="submit" 
            className="bg-brand hover:bg-brand/90 text-brand-foreground min-w-[120px]"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                جاري الإرسال...
              </>
            ) : (
              'إرسال الطلب'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
