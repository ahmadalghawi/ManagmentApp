import { getContacts, getSetting, getWorkspaceProfiles } from '@/lib/actions';
import SettingsClient from './SettingsClient';

export const metadata = {
  title: 'Settings - MeM',
};

export default async function SettingsPage() {
  const contacts = await getContacts();
  
  // Fetch settings from DB
  const currentLang = await getSetting('app-lang') || 'en';
  const currentTheme = await getSetting('theme') || 'dark';
  const currentThemeColor = await getSetting('themeColor') || 'blue';
  const appName = await getSetting('custom-app-name') || 'MeM';
  const workspaceState = await getWorkspaceProfiles();

  const initialSettings = {
    lang: currentLang,
    theme: currentTheme,
    themeColor: currentThemeColor,
    appName: appName,
    workspace: workspaceState.profiles.find(p => p.id === workspaceState.activeProfile) || null
  };

  return (
    <SettingsClient 
      initialSettings={initialSettings}
      contacts={contacts} 
    />
  );
}
