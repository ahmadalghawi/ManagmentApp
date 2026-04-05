import { getWithdrawals, getIncomeSources, getContacts, getDistributionTemplates } from '@/lib/actions';
import WithdrawalsClient from './WithdrawalsClient';

export default async function WithdrawalsPage() {
  const [withdrawals, sources, contacts, templates] = await Promise.all([
    getWithdrawals(),
    getIncomeSources(),
    getContacts(),
    getDistributionTemplates()
  ]);
  return <WithdrawalsClient withdrawals={withdrawals} sources={sources} contacts={contacts} templates={templates} />;
}
