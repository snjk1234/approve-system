'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { User, Mail, Phone, Building2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

export default function ProfilePage() {
    const { toast } = useToast();
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [departments, setDepartments] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        full_name: '',
        phone: '',
        department_id: ''
    });

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            const { data: { user: authUser } } = await supabase.auth.getUser();

            if (!authUser) {
                setLoading(false);
                router.push('/login');
                return;
            }

            if (authUser) {
                const { data: userData } = await supabase
                    .from('profiles' as any)
                    .select('*, departments(name)' as any)
                    .eq('id', authUser.id)
                    .single();

                if (userData) {
                    const u = userData as any;
                    setUser(u);
                    setFormData({
                        full_name: u.full_name || '',
                        phone: u.phone || '',
                        department_id: u.department_id || ''
                    });
                }
            }

            const { data: depts } = await supabase.from('departments' as any).select('id, name');
            if (depts) setDepartments(depts);

            setLoading(false);
        }

        fetchData();
    }, []);

    const handleSave = async () => {
        if (!user) {
            router.push('/login');
            return;
        }
        setSaving(true);
        const { error } = await supabase
            .from('profiles' as any)
            .update({
                full_name: formData.full_name,
                phone: formData.phone,
                department_id: formData.department_id,
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

        if (error) {
            toast({
                title: 'خطأ',
                description: 'حدث خطأ أثناء حفظ البيانات',
                variant: 'destructive'
            });
        } else {
            toast({
                title: 'تم بنجاح',
                description: 'تم تحديث البيانات الشخصية بنجاح'
            });
        }
        setSaving(false);
    };

    if (loading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-8 font-tajawal" dir="rtl">
            <div>
                <h1 className="text-3xl font-bold text-foreground">الملف الشخصي</h1>
                <p className="text-muted-foreground mt-2">إدارة بياناتك الشخصية وإعدادات الحساب</p>
            </div>

            <div className="grid gap-6 bg-card border border-border/50 p-8 rounded-2xl shadow-sm">
                <div className="flex items-center gap-6 pb-6 border-b border-border/50">
                    <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        <User size={40} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">{formData.full_name || 'موظف'}</h2>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <Mail size={14} />
                            {user?.email}
                        </p>
                    </div>
                </div>

                <div className="grid gap-5">
                    <div className="grid gap-2 text-right">
                        <Label htmlFor="fullName" className="text-sm font-medium">الاسم الكامل</Label>
                        <div className="relative">
                            <Input
                                id="fullName"
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                className="pr-10 h-12 rounded-xl"
                            />
                            <User className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        </div>
                    </div>

                    <div className="grid gap-2 text-right">
                        <Label htmlFor="phone" className="text-sm font-medium">رقم الهاتف</Label>
                        <div className="relative">
                            <Input
                                id="phone"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="pr-10 h-12 rounded-xl"
                                dir="ltr"
                            />
                            <Phone className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        </div>
                    </div>

                    <div className="grid gap-2 text-right">
                        <Label htmlFor="department" className="text-sm font-medium">الإدارة</Label>
                        <div className="relative">
                            <select
                                id="department"
                                value={formData.department_id}
                                onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                                className="flex h-12 w-full rounded-xl border border-border/50 bg-background px-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
                            >
                                {departments.map((dept) => (
                                    <option key={dept.id} value={dept.id}>
                                        {dept.name}
                                    </option>
                                ))}
                            </select>
                            <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        </div>
                    </div>
                </div>

                <div className="pt-4">
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full h-12 rounded-xl font-bold gap-2 shadow-lg shadow-primary/20"
                    >
                        <Save size={18} />
                        {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
