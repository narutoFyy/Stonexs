import dynamic from 'next/dynamic';

const ChatInterface = dynamic(() => import('@/components/chat-interface').then((module) => module.ChatInterface), {
  ssr: true,
  loading: () => <div style={{ minHeight: 240 }} />,
});

export default function AssistantPage() {
  return <ChatInterface />;
}
