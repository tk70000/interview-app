'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, Github, MessageSquare, Plus, Calendar } from 'lucide-react'
import { SessionManagerClient } from '@/lib/session-manager-client'
import { getCurrentUser } from '@/lib/auth-client'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export default function DashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const errorDetails = searchParams.get('details')
  const githubConnected = searchParams.get('github') === 'connected'
  const [hasExistingSession, setHasExistingSession] = useState(false)
  const [sessions, setSessions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // ログインチェック（簡易版）
    const isTestModeEnabled = process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true'
    const isAuthenticated = localStorage.getItem('isAuthenticated')
    
    if (!isTestModeEnabled && !isAuthenticated) {
      router.push('/auth/signin?redirect=/dashboard')
      return
    }
    
    // セッション情報を取得
    loadSessions()
  }, [router])

  const loadSessions = async () => {
    try {
      setIsLoading(true)
      // TODO: 実際のユーザーIDを取得
      const userId = localStorage.getItem('userId') || 'test-user-id'
      const userSessions = await SessionManagerClient.getUserSessions(userId)
      setSessions(userSessions)
      setHasExistingSession(userSessions.length > 0)
    } catch (error) {
      console.error('Error loading sessions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const continueLastSession = () => {
    if (sessions.length > 0) {
      const latestSession = sessions[0]
      localStorage.setItem('currentSessionId', latestSession.id)
      localStorage.setItem('candidateName', latestSession.candidate?.name || '')
      localStorage.setItem('userEmail', latestSession.candidate?.email || '')
      router.push('/chat')
    }
  }

  const startNewSession = () => {
    router.push('/upload')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
        
        {/* エラー表示 */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Error:</strong> {error}
              {errorDetails && (
                <div className="mt-2 text-sm">
                  <strong>Details:</strong> {errorDetails}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
        
        {/* 成功メッセージ */}
        {githubConnected && (
          <Alert className="mb-6">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              GitHub connected successfully!
            </AlertDescription>
          </Alert>
        )}
        
        {/* キャリア相談セクション */}
        {hasExistingSession && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>キャリア相談を続ける</CardTitle>
              <CardDescription>
                前回の相談から{sessions[0] && format(new Date(sessions[0].created_at), 'M月d日', { locale: ja })}に開始
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button onClick={continueLastSession} className="w-full">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  前回の続きからチャットを続ける
                </Button>
                <Button onClick={startNewSession} variant="outline" className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  新しい相談を始める
                </Button>
              </div>
              
              {/* 過去のセッション一覧 */}
              {sessions.length > 1 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium mb-3">過去の相談履歴</h3>
                  <div className="space-y-2">
                    {sessions.slice(1).map((session) => (
                      <div key={session.id} className="p-3 border rounded-lg hover:bg-muted cursor-pointer"
                        onClick={() => {
                          localStorage.setItem('currentSessionId', session.id)
                          localStorage.setItem('candidateName', session.candidate?.name || '')
                          localStorage.setItem('userEmail', session.candidate?.email || '')
                          router.push('/chat')
                        }}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium">
                              {format(new Date(session.created_at), 'yyyy年M月d日', { locale: ja })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              メッセージ数: {session.message_count?.[0]?.count || 0}
                            </p>
                          </div>
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* メインコンテンツ */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>GitHub Integration</CardTitle>
              <CardDescription>
                Connect your GitHub account to enable repository management
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={() => router.push('/github-status')}
                variant="outline"
                className="w-full"
              >
                <Github className="mr-2 h-4 w-4" />
                Check GitHub Status
              </Button>
              
              <Button 
                onClick={() => router.push('/github-actions-test')}
                variant="outline"
                className="w-full"
              >
                Test GitHub Actions
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common tasks and navigation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={() => router.push('/upload')}
                variant="outline"
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                新規CV Upload
              </Button>
              
              <Button 
                onClick={() => router.push('/chat')}
                variant="outline"
                className="w-full"
              >
                Start Chat
              </Button>
            </CardContent>
          </Card>
        </div>
        
        {/* デバッグ情報 */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>Current URL: {window.location.href}</p>
              <p>Error: {error || 'None'}</p>
              <p>Error Details: {errorDetails || 'None'}</p>
              <p>GitHub Status: {githubConnected ? 'Connected' : 'Not specified'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}