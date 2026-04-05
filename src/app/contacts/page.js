import { getContacts } from '@/lib/actions';
import ContactsClient from './ContactsClient';

export default async function ContactsPage() {
  const contacts = await getContacts();
  return <ContactsClient contacts={contacts} />;
}
