import { getLedgerEntries, getContacts } from '@/lib/actions';
import LedgerClient from './LedgerClient';

export default async function LedgerPage() {
  const [entries, contacts] = await Promise.all([
    getLedgerEntries(),
    getContacts(),
  ]);
  return <LedgerClient entries={entries} contacts={contacts} />;
}
