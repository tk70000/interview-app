'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, RefreshCw, Search, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { DashboardOverview } from '@/components/dashboard-overview'
import { Spinner } from '@/components/ui/spinner'
import { Candidate, Session, DashboardStats } from '@/types'
import { getErrorMessage } from '@/lib/utils'

export default function DashboardPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [stats, setStats] = useState<DashboardStats>({
    total_candidates: 0,
    active_sessions: 0,
    completed_sessions: 0,
    average_session_duration_minutes: 0,
    average_messages_per_session: 0,
  })
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [activeSessions, setActiveSessions] = useState<Session[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  const fetchDashboardData = async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/v1/dashboard/candidates')
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'データの取得に失敗しました')
      }

      setStats(data.stats)
      setCandidates(data.candidates)
      setActiveSessions(data.activeSessions)
    } catch (error) {
      setError(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const handleViewCandidate = (candidateId: string) => {
    // 候補者詳細ページへ遷移（実装簡略化のため省略）
    console.log('View candidate:', candidateId)
  }

  const handleViewSession = (sessionId: string) => {
    // セッション詳細ページへ遷移（実装簡略化のため省略）
    console.log('View session:', sessionId)
  }

  const handleExport = () => {
    // エクスポート機能（実装簡略化のため省略）
    console.log('Export data')
  }

  const filteredCandidates = candidates.filter(candidate => 
    candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    candidate.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              ホームへ
            </Button>

            <h1 className="text-2xl font-bold">管理ダッシュボード</h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDashboardData}
              disabled={isLoading}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              更新
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
            >
              <Download className="mr-2 h-4 w-4" />
              エクスポート
            </Button>
          </div>
        </div>

        {/* 検索バー */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="候補者を検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Spinner className="mx-auto mb-4" />
              <p className="text-muted-foreground">データを読み込んでいます...</p>
            </div>
          </div>
        ) : error ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={fetchDashboardData}>
                再試行
              </Button>
            </CardContent>
          </Card>
        ) : (
          <DashboardOverview
            stats={stats}
            recentCandidates={searchQuery ? filteredCandidates : candidates.slice(0, 5)}
            activeSessions={activeSessions}
            onViewCandidate={handleViewCandidate}
            onViewSession={handleViewSession}
          />
        )}

        {/* 認証に関する注意事項 */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">セキュリティに関する注意</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              このダッシュボードは採用担当者専用です。
              実際の運用では、Supabase Authによる認証と権限管理が必要です。
              候補者の個人情報は適切に保護され、アクセス権限のあるユーザーのみが閲覧できるように設定してください。
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
