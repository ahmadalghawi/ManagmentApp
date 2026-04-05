import { getWorkLogs, getContacts } from '@/lib/actions';
import TimelogClient from './TimelogClient';

export default async function TimelogPage() {
  const [logs, contacts] = await Promise.all([
    getWorkLogs(),
    getContacts(),
  ]);
  return <TimelogClient logs={logs} contacts={contacts} />;
}
