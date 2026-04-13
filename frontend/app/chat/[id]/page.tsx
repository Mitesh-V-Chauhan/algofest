import ChatInterface from '@/components/ChatInterface';

export default async function ChatRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ChatInterface initialChatId={id} />;
}