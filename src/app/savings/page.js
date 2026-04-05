import { getSavingsGoals } from '@/lib/actions';
import SavingsClient from './SavingsClient';

export default async function SavingsPage() {
  const goals = await getSavingsGoals();
  return <SavingsClient goals={goals} />;
}
