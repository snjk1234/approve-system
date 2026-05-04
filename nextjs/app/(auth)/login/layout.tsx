import { PropsWithChildren } from 'react';

export default function LoginLayout({ children }: PropsWithChildren) {
    return (
        <div className="min-h-screen bg-muted/20 flex flex-col items-center justify-center p-4">
            {children}
        </div>
    );
}
