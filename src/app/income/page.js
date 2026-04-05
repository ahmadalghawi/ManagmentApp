import { getIncomeSources, getContacts } from '@/lib/actions';
import IncomeClient from './IncomeClient';

export default async function IncomePage() {
  const [sources, contacts] = await Promise.all([
    getIncomeSources(),
    getContacts(),
  ]);
  return <IncomeClient sources={sources} contacts={contacts} />;
}
