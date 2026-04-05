import './globals.css';
import { LanguageProvider } from '@/context/LanguageContext';
import Sidebar from '@/components/Sidebar';
import { ThemeProvider } from '@/context/ThemeContext';

export const metadata = {
  title: 'Income Manager - Personal Finance Tracker',
  description: 'A personal income management app to track salary sources, monthly withdrawals, and money distributions.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" dir="ltr" data-theme="dark">
      <body>
        <ThemeProvider>
          <LanguageProvider>
            <div className="app-layout">
              <Sidebar />
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
