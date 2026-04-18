import { Metadata } from 'next';
import { PropsWithChildren } from 'react';
import { getURL } from '@/utils/helpers';
import '@/styles/main.css';
import { PHProvider } from './providers';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/toaster';
import { Tajawal } from 'next/font/google';

const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['200', '300', '400', '500', '700', '800', '900'],
  display: 'swap',
  variable: '--font-tajawal'
});

const meta = {
  title: 'فلورينا - نظام المحادثات والاعتمادات',
  description:
    'نظام المحادثات المؤسسية ومسار الاعتماد التسلسلي',
  cardImage: getURL('/api/og'),
  robots: 'follow, index',
  favicon: '/favicon.ico',
  url: getURL()
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: meta.title,
    description: meta.description,
    referrer: 'origin-when-cross-origin',
    keywords: ['Enterprise', 'Chat', 'Approval', 'Workflow', 'فلورينا'],
    robots: meta.robots,
    icons: { icon: meta.favicon },
    metadataBase: new URL(meta.url),
    openGraph: {
      url: meta.url,
      title: meta.title,
      description: meta.description,
      images: [{ url: meta.cardImage, width: 1200, height: 630 }],
      type: 'website',
      siteName: meta.title
    }
  };
}

export default async function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning className={tajawal.variable}>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <PHProvider>
            <main id="skip">
              {children}
            </main>
            <Toaster />
          </PHProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
