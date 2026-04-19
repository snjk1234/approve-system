import { AuthForm } from '@/components/misc/AuthForm';
import { AuthState } from '@/utils/types';

export default function LoginPage() {
    return <AuthForm state={AuthState.Signin} />;
}
