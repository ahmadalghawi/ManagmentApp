import { getIncomeSources, getWithdrawals, getContacts } from '@/lib/actions';
import ReportsClient from './ReportsClient';

export default async function ReportsPage() {
  const [sources, withdrawals, contacts] = await Promise.all([
    getIncomeSources(),
    getWithdrawals(),
    getContacts(),
  ]);
  return <ReportsClient sources={sources} withdrawals={withdrawals} contacts={contacts} />;
}
