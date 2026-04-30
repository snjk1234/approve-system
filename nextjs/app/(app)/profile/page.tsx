'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { User, Mail, Phone, Building2, Save, LogOut } from 'lucide-react';
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
    const [roles, setRoles] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        full_name: '',
        phone: '',
        department_id: '',
        role_id: ''
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
                    .select('*, departments(name), roles(name)' as any)
                    .eq('id', authUser.id)
                    .single();

                if (userData) {
                    const u = userData as any;
                    setUser(u);
                    setFormData({
                        full_name: u.full_name || '',
                        phone: u.phone || '',
                        department_id: u.department_id || '',
                        role_id: u.role_id || ''
                    });
                }
            }

            const { data: depts } = await supabase.from('departments' as any).select('id, name');
            if (depts) setDepartments(depts);

            const { data: rolesData } = await supabase.from('roles' as any).select('id, name');
            if (rolesData) setRoles(rolesData);

            setLoading(false);
        }

        fetchData();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

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
                role_id: formData.role_id,
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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">الملف الشخصي</h1>
                    <p className="text-muted-foreground mt-2">إدارة بياناتك الشخصية وإعدادات الحساب</p>
                </div>
                <Button
                    variant="outline"
                    onClick={handleLogout}
                    className="rounded-xl border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all gap-2"
                >
                    <LogOut size={18} />
                    تسجيل الخروج
                </Button>
            </div>

            <div className="grid gap-6 bg-card border border-border/50 p-8 rounded-2xl shadow-sm">
                <div className="flex items-center gap-6 pb-6 border-b border-border/50">
                    <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        <User size={40} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">{formData.full_name || 'موظف'}</h2>
                        <div className="flex flex-col gap-1 mt-1">
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Mail size={14} />
                                {user?.email}
                            </p>
                            {user?.roles?.name && (
                                <p className="text-sm font-medium text-primary">
                                    {user.roles.name}
                                </p>
                            )}
                        </div>
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
                    <div className="grid gap-2 text-right">
                        <Label htmlFor="role" className="text-sm font-medium">المسمى الوظيفي (الدور)</Label>
                        <div className="relative">
                            <select
                                id="role"
                                value={formData.role_id}
                                onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                                className="flex h-12 w-full rounded-xl border border-border/50 bg-background px-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
                            >
                                <option value="" disabled>اختر الدور</option>
                                {roles.map((r) => (
                                    <option key={r.id} value={r.id}>
                                        {r.name}
                                    </option>
                                ))}
                            </select>
                            <User className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
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
