import { AuthForm } from '@/components/misc/AuthForm';
import { AuthState } from '@/utils/types';

export default function RegisterPage() {
    return <AuthForm state={AuthState.Signup} />;
}
