'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { 
  MessageSquare, 
  Users, 
  Clock, 
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  Search,
  Calendar,
  User
} from 'lucide-react'

interface ChatSession {
  id: string
  candidate_id: string
  status: string
  started_at: string
  ended_at?: string
  summary?: string
  admin_note?: string
  message_count: number
  candidates: {
    id: string
    name: string
    email: string
    cv_summary: string
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function AdminChatsPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  // フィルター状態
  const [filters, setFilters] = useState({
    candidateId: '',
    sessionId: '',
    startDate: '',
    endDate: '',
    searchTerm: ''
  })

  const [adminAuth, setAdminAuth] = useState<any>(null)

  // セッション一覧を取得
  const fetchSessions = useCallback(async (page = 1) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.candidateId && { candidateId: filters.candidateId }),
        ...(filters.sessionId && { sessionId: filters.sessionId }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate })
      })

      const response = await fetch(`/api/admin/chats?${params}`, {
        headers: {
          'x-admin-secret': localStorage.getItem('adminSecret') || '',
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'セッションの取得に失敗しました')
      }

      setSessions(data.sessions)
      setPagination(data.pagination)
      setAdminAuth(data.adminAuth)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }, [filters, pagination.limit])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  // フィルター適用
  const applyFilters = () => {
    fetchSessions(1)
  }

  // フィルターリセット
  const resetFilters = () => {
    setFilters({
      candidateId: '',
      sessionId: '',
      startDate: '',
      endDate: '',
      searchTerm: ''
    })
    setTimeout(() => fetchSessions(1), 100)
  }

  // セッション詳細表示
  const viewSession = (sessionId: string) => {
    router.push(`/admin/chats/${sessionId}`)
  }

  // 日時フォーマット
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP')
  }

  // 検索結果フィルタリング
  const filteredSessions = sessions.filter(session => {
    if (!filters.searchTerm) return true
    const searchLower = filters.searchTerm.toLowerCase()
    return (
      session.candidates.name.toLowerCase().includes(searchLower) ||
      session.candidates.email.toLowerCase().includes(searchLower) ||
      session.id.toLowerCase().includes(searchLower)
    )
  })

  if (error && error.includes('管理者権限')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">アクセス拒否</CardTitle>
            <CardDescription>管理者権限が必要です</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="adminSecret">管理者シークレット</Label>
              <Input
                id="adminSecret"
                type="password"
                placeholder="管理者用シークレットキーを入力"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const target = e.target as HTMLInputElement
                    localStorage.setItem('adminSecret', target.value)
                    window.location.reload()
                  }
                }}
              />
            </div>
            <Button 
              onClick={() => router.push('/')}
              variant="outline"
              className="w-full"
            >
              ホームに戻る
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">管理者ダッシュボード</h1>
              <p className="text-muted-foreground mt-2">
                ユーザーのチャット履歴を管理・閲覧できます
              </p>
              {adminAuth && (
                <p className="text-sm text-green-600 mt-1">
                  認証方法: {adminAuth.method} {adminAuth.email && `(${adminAuth.email})`}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              onClick={() => router.push('/admin')}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              管理者ホーム
            </Button>
          </div>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">総セッション数</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pagination.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">アクティブユーザー</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(sessions.map(s => s.candidate_id)).size}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">今日のセッション</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {sessions.filter(s => 
                  new Date(s.started_at).toDateString() === new Date().toDateString()
                ).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* フィルター */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="mr-2 h-5 w-5" />
              フィルター
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="searchTerm">検索</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="searchTerm"
                    placeholder="名前、メール、セッションIDで検索"
                    value={filters.searchTerm}
                    onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="startDate">開始日</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="endDate">終了日</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                />
              </div>
            </div>
            
            <div className="flex gap-2 mt-4">
              <Button onClick={applyFilters}>フィルター適用</Button>
              <Button variant="outline" onClick={resetFilters}>リセット</Button>
            </div>
          </CardContent>
        </Card>

        {/* セッション一覧 */}
        <Card>
          <CardHeader>
            <CardTitle>チャットセッション一覧</CardTitle>
            <CardDescription>
              {filteredSessions.length} / {pagination.total} セッション
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner className="mr-2" />
                読み込み中...
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-600">
                エラー: {error}
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                セッションが見つかりません
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <User className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">{session.candidates.name}</span>
                        <span className="text-sm text-muted-foreground">
                          ({session.candidates.email})
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          session.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {session.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {session.message_count} メッセージ
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(session.started_at)}
                        </div>
                        <div className="text-xs text-gray-500">
                          ID: {session.id.slice(0, 8)}...
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => viewSession(session.id)}
                      variant="outline"
                      size="sm"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      詳細表示
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* ページネーション */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-muted-foreground">
                  {pagination.total} 件中 {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} 件
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchSessions(pagination.page - 1)}
                    disabled={pagination.page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="flex items-center px-3 text-sm">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchSessions(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}