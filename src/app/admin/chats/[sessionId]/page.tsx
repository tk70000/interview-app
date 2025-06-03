'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { 
  ArrowLeft, 
  User, 
  Bot,
  Clock, 
  MessageSquare,
  Calendar,
  FileText,
  Save,
  Download,
  Mail,
  Hash
} from 'lucide-react'

interface ChatMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
}

interface SessionDetails {
  id: string
  candidate_id: string
  status: string
  started_at: string
  ended_at?: string
  summary?: string
  admin_note?: string
  admin_updated_at?: string
  candidates: {
    id: string
    name: string
    email: string
    cv_summary: string
    cv_url: string
    created_at: string
  }
}

interface SessionStats {
  totalMessages: number
  userMessages: number
  assistantMessages: number
  firstMessageAt: string
  lastMessageAt: string
  sessionDuration: number
}

export default function AdminChatDetailPage({ params }: { params: { sessionId: string } }) {
  const router = useRouter()
  const { sessionId } = params
  
  const [session, setSession] = useState<SessionDetails | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [stats, setStats] = useState<SessionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [adminNote, setAdminNote] = useState('')
  const [saving, setSaving] = useState(false)

  // セッション詳細を取得
  const fetchSessionDetail = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/chats/${sessionId}`, {
        headers: {
          'x-admin-secret': localStorage.getItem('adminSecret') || '',
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'セッション詳細の取得に失敗しました')
      }

      setSession(data.session)
      setMessages(data.messages)
      setStats(data.stats)
      setAdminNote(data.session.admin_note || '')
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    fetchSessionDetail()
  }, [fetchSessionDetail])

  // 管理者メモを保存
  const saveAdminNote = async () => {
    try {
      setSaving(true)
      const response = await fetch(`/api/admin/chats/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': localStorage.getItem('adminSecret') || '',
        },
        body: JSON.stringify({ adminNote })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'メモの保存に失敗しました')
      }

      setSession(data.session)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setSaving(false)
    }
  }

  // チャット履歴をエクスポート
  const exportChat = () => {
    if (!session || !messages) return

    const exportData = {
      session: {
        id: session.id,
        candidate: session.candidates,
        created_at: session.started_at, // SessionDetailsにはcreated_atがないのでstarted_atを使用
        stats
      },
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.created_at
      }))
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chat-${sessionId}-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // 時間フォーマット
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP')
  }

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const hours = Math.floor(minutes / 60)
    if (hours > 0) {
      return `${hours}時間${minutes % 60}分`
    }
    return `${minutes}分`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="mr-2" />
        読み込み中...
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">エラー</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">{error}</p>
            <Button onClick={() => router.push('/admin/chats')} variant="outline">
              戻る
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>セッションが見つかりません</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => router.push('/admin/chats')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            チャット一覧に戻る
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">チャット詳細</h1>
              <p className="text-muted-foreground">
                セッション ID: {sessionId}
              </p>
            </div>
            <Button onClick={exportChat} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              エクスポート
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左側: チャット履歴 */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquare className="mr-2 h-5 w-5" />
                  チャット履歴
                </CardTitle>
                <CardDescription>
                  {stats?.totalMessages || 0} メッセージ
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {messages.map((message, index) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[80%] p-3 rounded-lg ${
                          message.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : message.role === 'assistant'
                            ? 'bg-gray-100 text-gray-900'
                            : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {message.role === 'user' ? (
                            <User className="h-4 w-4" />
                          ) : message.role === 'assistant' ? (
                            <Bot className="h-4 w-4" />
                          ) : (
                            <Hash className="h-4 w-4" />
                          )}
                          <span className="text-xs opacity-75">
                            {formatDate(message.created_at)}
                          </span>
                        </div>
                        <div className={`prose prose-sm max-w-none ${
                          message.role === 'user' ? 'prose-invert' : ''
                        }`}>
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeSanitize]}
                            components={{
                              // カスタムコンポーネントの設定
                              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                              ul: ({ children }) => <ul className="list-disc pl-5 mb-2">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal pl-5 mb-2">{children}</ol>,
                              li: ({ children }) => <li className="mb-1">{children}</li>,
                              code: ({ children }) => (
                                <code className={
                                  message.role === 'user' 
                                    ? "bg-blue-700 px-1 py-0.5 rounded" 
                                    : "bg-gray-200 px-1 py-0.5 rounded"
                                }>
                                  {children}
                                </code>
                              ),
                              pre: ({ children }) => (
                                <pre className={
                                  message.role === 'user'
                                    ? "bg-blue-700 p-2 rounded overflow-x-auto"
                                    : "bg-gray-100 p-2 rounded overflow-x-auto"
                                }>
                                  {children}
                                </pre>
                              ),
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右側: セッション情報と管理機能 */}
          <div className="space-y-6">
            {/* 候補者情報 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="mr-2 h-5 w-5" />
                  候補者情報
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm text-muted-foreground">名前</Label>
                  <p className="font-medium">{session.candidates.name}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">メールアドレス</Label>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm">{session.candidates.email}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">登録日</Label>
                  <p className="text-sm">{formatDate(session.candidates.created_at)}</p>
                </div>
                {session.candidates.cv_summary && (
                  <div>
                    <Label className="text-sm text-muted-foreground">CV要約</Label>
                    <p className="text-sm bg-gray-50 p-2 rounded text-gray-700">
                      {session.candidates.cv_summary.slice(0, 200)}...
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* セッション統計 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="mr-2 h-5 w-5" />
                  セッション統計
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">開始時刻</span>
                  <span className="text-sm font-medium">
                    {stats?.firstMessageAt ? formatDate(stats.firstMessageAt) : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">最終メッセージ</span>
                  <span className="text-sm font-medium">
                    {stats?.lastMessageAt ? formatDate(stats.lastMessageAt) : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">セッション時間</span>
                  <span className="text-sm font-medium">
                    {stats?.sessionDuration ? formatDuration(stats.sessionDuration) : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">ユーザーメッセージ</span>
                  <span className="text-sm font-medium">{stats?.userMessages || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">AIレスポンス</span>
                  <span className="text-sm font-medium">{stats?.assistantMessages || 0}</span>
                </div>
              </CardContent>
            </Card>

            {/* 管理者メモ */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="mr-2 h-5 w-5" />
                  管理者メモ
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder="このセッションに関するメモを記録..."
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={4}
                />
                <Button
                  onClick={saveAdminNote}
                  disabled={saving}
                  className="w-full"
                >
                  {saving ? (
                    <>
                      <Spinner className="mr-2" size="sm" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      メモを保存
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}