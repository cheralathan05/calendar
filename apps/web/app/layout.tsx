import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'Calendar',
    template: '%s · Calendar',
  },
  description: 'Google Calendar clone built with Next.js',
};

// ---------------------------------------------------------------------------
// Inline script injected into <head> before first paint.
// Reads the stored theme and applies the "dark" class to <html> immediately
// so there is no flash of wrong theme on load.
// The key name must match STORAGE_KEY in lib/theme/useTheme.ts.
// ---------------------------------------------------------------------------
const THEME_SCRIPT = `(function(){
  var t=localStorage.getItem('calendar-theme')||'system';
  if(t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme:dark)').matches)){
    document.documentElement.classList.add('dark');
  }
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
          Icon with a build-time version query — avoids calling new Date()
          on every request which would opt the layout out of static caching.
          Next.js replaces process.env.NEXT_PUBLIC_BUILD_ID at build time;
          falls back to 'dev' locally so the icon still loads.
        */}
        <link rel="icon" href={`/icon.png?v=${process.env.NEXT_PUBLIC_BUILD_ID ?? 'dev'}`} />
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }}
      >
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
