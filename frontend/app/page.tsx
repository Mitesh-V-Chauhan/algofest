import { redirect } from 'next/navigation';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export default function Home() {
  const id = randomUUID();
  redirect(`/chat/${id}`);
}
