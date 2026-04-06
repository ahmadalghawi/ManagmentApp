import './globals.css';
import { LanguageProvider } from '@/context/LanguageContext';
import Sidebar from '@/components/Sidebar';
import { ThemeProvider } from '@/context/ThemeContext';

import { getWorkspaceProfiles, getSetting } from '@/lib/actions';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'MeM - Personal Finance & Management',
  description: 'Manage Me (MeM) - A personal income and self-management application for tracking work, salary, and distributions.',
};

export default async function RootLayout({ children }) {
  const workspaceState = await getWorkspaceProfiles();

  const savedTheme = await getSetting('theme') || 'dark';
  const savedThemeColor = await getSetting('themeColor') || 'blue';
  const savedLang = await getSetting('app-lang') || 'en';

  return (
    <html lang={savedLang} dir={savedLang === 'ar' ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider initialTheme={savedTheme} initialColor={savedThemeColor}>
          <LanguageProvider initialLang={savedLang}>
            <div className="app-layout">
              <Sidebar workspaceState={workspaceState} />
              <main className="main-content">
                {children}
              </main>
            </div>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
