import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { MessageSquare, Plus } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { SessionManager } from '@/lib/session-manager';

interface SessionSummary {
  id: string;
  createdAt: string;
  lastMessageAt: string;
  messageCount: number;
  summary: string;
}

export function SessionSelector() {
  const router = useRouter();
  const { session } = useSession();

  const continueLastSession = async () => {
    if (!session?.user?.id) return;
    
    try {
      const latestSession = await SessionManager.getLatestSession(session.user.id);
      if (!latestSession?.id) {
        throw new Error('No previous session found');
      }
      
      await SessionManager.continueSession(latestSession.id, session.user.id);
      router.push(`/chat?session=${latestSession.id}`);
    } catch (error) {
      console.error('Failed to continue session:', error);
      // Handle error appropriately
    }
  };

  const startNewSession = () => {
    router.push('/upload');
  };

  const daysSinceLastChat = (lastMessageAt: string) => {
    const days = Math.floor(
      (new Date().getTime() - new Date(lastMessageAt).getTime()) / 
      (1000 * 60 * 60 * 24)
    );
    return days;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>キャリア相談を続ける</CardTitle>
        <CardDescription>
          前回の相談を再開するか、新しい相談を始めることができます
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button onClick={continueLastSession} className="w-full">
            <MessageSquare className="mr-2" />
            前回の続きから始める
          </Button>
          <Button onClick={startNewSession} variant="outline" className="w-full">
            <Plus className="mr-2" />
            新しい相談を始める
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}