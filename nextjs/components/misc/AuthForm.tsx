'use client';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEffect, useState } from 'react';
import { SiGithub, SiGoogle } from '@icons-pack/react-simple-icons';
import { createApiClient } from '@/utils/supabase/api';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '../ui/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthState, StateInfo } from '@/utils/types';
import { Eye, EyeOff } from 'lucide-react';

export function AuthForm({ state }: { state: AuthState }) {
  const { toast } = useToast();
  const api = createApiClient(createClient());
  const searchParams = useSearchParams();
  const router = useRouter();
  const [authState, setAuthState] = useState(state);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [roleId, setRoleId] = useState('');
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [departmentId, setDepartmentId] = useState('');
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resendTimeout, setResendTimeout] = useState(0);

  // Fetch departments and roles for registration
  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const { data: deptData } = await supabase.from('departments' as any).select('id, name');
      if (deptData) setDepartments(deptData as any);

      const { data: roleData } = await supabase.from('roles' as any).select('id, name');
      if (roleData) setRoles(roleData as any);
    }
    fetchData();
  }, []);

  // Countdown timer for resend button
  useEffect(() => {
    if (resendTimeout > 0) {
      const timer = setTimeout(() => setResendTimeout(resendTimeout - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimeout]);

  const stateInfo: Record<AuthState, StateInfo> = {
    signup: {
      title: 'إنشاء حساب جديد',
      submitText: 'تسجيل',
      hasEmailField: true,
      hasPasswordField: true,
      hasOAuth: false,
      onSubmit: async () => {
        if (!fullName || !phone || !roleId || !departmentId) {
          toast({
            title: 'خطأ',
            description: 'يرجى إكمال جميع الحقول المطلوبة',
            variant: 'destructive'
          });
          return;
        }
        if (password !== confirmPassword) {
          toast({
            title: 'Password Error',
            description: 'Passwords do not match',
            variant: 'destructive'
          });
          return;
        }
        setLoading(true);
        try {
          const res = await api.passwordSignup({
            email,
            password,
            options: {
              data: {
                full_name: fullName,
                department_id: departmentId,
                phone: phone,
                role_id: roleId
              }
            }
          });

          // Check for duplicate email - Supabase returns user with empty identities array
          if (res.user && res.user.identities && res.user.identities.length === 0) {
            toast({
              title: 'Email Already Registered',
              description:
                'This email is already associated with an account. Please sign in or use a different email.',
              variant: 'destructive',
              duration: 5000
            });
            setLoading(false);
            return;
          }

          // Check if email is already verified (e.g., OAuth or pre-verified)
          if (res.user?.user_metadata?.email_verified) {
            router.push('/dashboard');
            router.refresh();
          } else {
            setAuthState(AuthState.VerifyEmail);
          }
        } catch (e) {
          if (e instanceof Error) {
            toast({
              title: 'Auth Error',
              description: e.message,
              variant: 'destructive'
            });
          }
        } finally {
          setTimeout(() => {
            setLoading(false);
          }, 3000);
        }
      }
    },
    signin: {
      title: 'تسجيل الدخول',
      submitText: 'دخول',
      hasEmailField: true,
      hasPasswordField: true,
      hasOAuth: true,
      onSubmit: async () => {
        setLoading(true);
        try {
          await api.passwordSignin({ email, password });
          router.push('/dashboard');
          router.refresh();
        } catch (e) {
          if (e instanceof Error) {
            let err_message = e.message;
            if (e.message.includes('Email not confirmed')) {
              err_message =
                'Your email is not verified. Please navigate to Sign Up tab and verify your email before proceeding.';
            }
            toast({
              title: 'Auth Error',
              description: err_message,
              variant: 'destructive',
              duration: 3000
            });
          }
        } finally {
          setTimeout(() => {
            setLoading(false);
          }, 3000);
        }
      }
    },
    forgot_password: {
      title: 'إعادة تعيين كلمة المرور',
      submitText: 'إرسال البريد',
      hasEmailField: true,
      hasPasswordField: false,
      hasOAuth: false,
      onSubmit: async () => {
        setLoading(true);
        try {
          await api.passwordReset(email);
          toast({
            title: 'Email Sent!',
            description: 'Check your email to reset your password'
          });
        } catch (e) {
          if (e instanceof Error) {
            toast({
              title: 'Auth Error',
              description: e.message,
              variant: 'destructive'
            });
          }
        }
        setLoading(false);
      }
    },
    update_password: {
      title: 'تحديث كلمة المرور',
      submitText: 'تحديث',
      hasEmailField: false,
      hasPasswordField: true,
      hasOAuth: false,
      onSubmit: async () => {
        setLoading(true);
        try {
          await api.passwordUpdate(password);
          toast({
            title: 'Password Updated',
            description: 'Redirecting to the home page...'
          });
          setTimeout(() => router.replace('/'), 3000);
          router.replace('/');
        } catch (e) {
          if (e instanceof Error) {
            toast({
              title: 'Auth Error',
              description: e.message,
              variant: 'destructive'
            });
          }
        }
        setLoading(false);
      }
    },
    verify_email: {
      title: 'تأكيد البريد الإلكتروني',
      description:
        "لقد أرسلنا لك بريداً إلكترونياً للتأكيد. يرجى التحقق من صندوق الوارد والضغط على رابط التأكيد للمتابعة.",
      submitText:
        resendTimeout > 0
          ? `Resend in ${resendTimeout}s`
          : 'Resend Verification Email',
      hasEmailField: false,
      hasPasswordField: false,
      hasOAuth: false,
      onSubmit: async () => {
        if (resendTimeout > 0) return;
        setLoading(true);
        try {
          await api.resendEmailVerification(email);
          setResendTimeout(60);
          toast({
            title: 'Verification Email Sent',
            description: 'Please check your inbox for the verification link.'
          });
        } catch (e) {
          if (e instanceof Error) {
            toast({
              title: 'Auth Error',
              description: e.message,
              variant: 'destructive'
            });
          }
        }
        setLoading(false);
      }
    }
  };

  // add toast if error
  useEffect(() => {
    type ToastVariant = 'destructive' | 'default' | undefined | null;
    const title = searchParams.get('toast_title') || undefined;
    const description = searchParams.get('toast_description') || undefined;
    const variant = searchParams.get('toast_variant') as ToastVariant;
    if (title || description) {
      setTimeout(
        () =>
          toast({
            title,
            description,
            variant
          }),
        100
      );
    }
  }, []);

  const currState = stateInfo[authState];
  return (
    <Card className="mx-auto w-[400px] border-border/50 shadow-xl overflow-hidden font-tajawal text-right" dir="rtl">
      <CardHeader className="space-y-1 bg-muted/30 pb-6">
        <CardTitle className="text-2xl font-bold">{currState.title}</CardTitle>
        {currState.description && (
          <CardDescription className="text-muted-foreground">{currState.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid gap-5">
          {authState === 'signup' && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="fullName" className="text-sm font-medium">الاسم الكامل</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="محمد أحمد"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                  required
                  className="rounded-lg h-11 border-border/50 focus:ring-primary/20"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone" className="text-sm font-medium">رقم الهاتف</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="05XXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={loading}
                  required
                  className="rounded-lg h-11 border-border/50 focus:ring-primary/20 text-right"
                  dir="ltr"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="department" className="text-sm font-medium">الإدارة</Label>
                <select
                  id="department"
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  disabled={loading}
                  className="flex h-11 w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  <option value="" disabled>اختر الإدارة</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role" className="text-sm font-medium">المسمى الوظيفي (الدور)</Label>
                <select
                  id="role"
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                  disabled={loading}
                  className="flex h-11 w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  <option value="" disabled>اختر الدور</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
          {currState.hasEmailField && (
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-sm font-medium">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                className="rounded-lg h-11 border-border/50 focus:ring-primary/20"
              />
            </div>
          )}
          {currState.hasPasswordField && (
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" title="Password" className="text-sm font-medium">كلمة المرور</Label>
                {authState === 'signin' && (
                  <Link
                    href="#"
                    onClick={() => setAuthState(AuthState.ForgotPassword)}
                    className="text-sm text-primary hover:underline transition-all"
                  >
                    نسيت كلمة المرور؟
                  </Link>
                )}
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  disabled={loading}
                  value={password}
                  required
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-lg h-11 pl-10 border-border/50 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowPassword(!showPassword);
                    if (authState === 'signup') {
                      setShowConfirmPassword(!showPassword);
                    }
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          )}
          {authState === 'signup' && (
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword" title="Confirm Password" className="text-sm font-medium">تأكيد كلمة المرور</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  disabled={loading}
                  value={confirmPassword}
                  required
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="rounded-lg h-11 pl-10 border-border/50 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowPassword(!showConfirmPassword);
                    setShowConfirmPassword(!showConfirmPassword);
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={loading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          )}
          <Button
            type="submit"
            className="w-full h-11 rounded-lg font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98] transition-all"
            onClick={currState.onSubmit}
            disabled={loading}
          >
            {loading ? 'جاري التحميل...' : currState.submitText}
          </Button>
          {authState === 'signin' && (
            <div className="text-center text-sm text-muted-foreground">
              ليس لديك حساب؟{' '}
              <Link
                href="#"
                className="font-bold text-primary hover:underline"
                onClick={() => setAuthState(AuthState.Signup)}
              >
                إنشاء حساب جديد
              </Link>
            </div>
          )}
          {authState === 'signup' && (
            <div className="text-center text-sm text-muted-foreground">
              لديك حساب بالفعل؟{' '}
              <Link
                href="#"
                className="font-bold text-primary hover:underline"
                onClick={() => setAuthState(AuthState.Signin)}
              >
                تسجيل الدخول
              </Link>
            </div>
          )}
          {authState === 'forgot_password' && (
            <div className="text-center text-sm">
              Know your password?{' '}
              <Link
                href="#"
                className="underline"
                onClick={() => setAuthState(AuthState.Signin)}
              >
                Sign in
              </Link>
            </div>
          )}
          {authState === 'verify_email' && (
            <>
              <div className="text-center text-sm text-muted-foreground">
                Verification email sent to: <strong>{email}</strong>
              </div>
              <div className="text-center text-sm">
                Already verified?{' '}
                <Link
                  href="#"
                  className="underline"
                  onClick={() => setAuthState(AuthState.Signin)}
                >
                  Sign in
                </Link>
              </div>
            </>
          )}
          {currState.hasOAuth && (
            <>
              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t"></span>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    أو باستخدام
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full h-11 rounded-lg border-border/50 hover:bg-muted"
                onClick={() => api.oauthSignin('google')}
              >
                <SiGoogle className="h-4 w-4 ml-2" /> Google
              </Button>
              <Button
                variant="outline"
                className="w-full h-11 rounded-lg border-border/50 hover:bg-muted"
                onClick={() => api.oauthSignin('github')}
              >
                <SiGithub className="h-4 w-4 ml-2" /> Github
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
