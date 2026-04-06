import { getDashboardData, getWorkspaceProfiles } from '@/lib/actions';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const data = await getDashboardData();
  const workspaceState = await getWorkspaceProfiles();
  const activeProfileId = workspaceState.activeProfile;
  const activeProfile = workspaceState.profiles.find(p => p.id === activeProfileId) || { name: 'MeM' };

  return <DashboardClient data={data} activeProfile={activeProfile} />;
}
