'use client'

import { Users, MessageSquare, Clock, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Candidate, Session, DashboardStats } from '@/types'
import { formatDate, calculateSessionDuration, truncateText } from '@/lib/utils'

interface DashboardOverviewProps {
  stats: DashboardStats
  recentCandidates: Candidate[]
  activeSessions: Session[]
  onViewCandidate: (candidateId: string) => void
  onViewSession: (sessionId: string) => void
}

export function DashboardOverview({
  stats,
  recentCandidates,
  activeSessions,
  onViewCandidate,
  onViewSession
}: DashboardOverviewProps) {
  return (
    <div className="space-y-6">
      {/* 統計カード */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="総候補者数"
          value={stats.total_candidates}
          icon={Users}
          description="登録済み候補者"
        />
        <StatsCard
          title="アクティブセッション"
          value={stats.active_sessions}
          icon={MessageSquare}
          description="現在進行中"
        />
        <StatsCard
          title="平均セッション時間"
          value={`${stats.average_session_duration_minutes}分`}
          icon={Clock}
          description="1セッションあたり"
        />
        <StatsCard
          title="平均メッセージ数"
          value={stats.average_messages_per_session}
          icon={TrendingUp}
          description="1セッションあたり"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 最近の候補者 */}
        <Card>
          <CardHeader>
            <CardTitle>最近の候補者</CardTitle>
            <CardDescription>直近で登録された候補者</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentCandidates.map((candidate) => (
                <div
                  key={candidate.id}
                  className="flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{candidate.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {candidate.email}
                    </p>
                    {candidate.cv_summary && (
                      <p className="text-xs text-muted-foreground">
                        {truncateText(candidate.cv_summary, 50)}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewCandidate(candidate.id)}
                  >
                    詳細
                  </Button>
                </div>
              ))}
              
              {recentCandidates.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  まだ候補者が登録されていません
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* アクティブセッション */}
        <Card>
          <CardHeader>
            <CardTitle>アクティブセッション</CardTitle>
            <CardDescription>現在進行中の面談</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      セッション #{session.id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      開始: {formatDate(session.started_at)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      経過時間: {calculateSessionDuration(session.started_at)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewSession(session.id)}
                  >
                    表示
                  </Button>
                </div>
              ))}
              
              {activeSessions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  アクティブなセッションはありません
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

interface StatsCardProps {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  description: string
}

function StatsCard({ title, value, icon: Icon, description }: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}
