'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Info, CheckCircle, UserCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChatInterface } from '@/components/chat-interface'
import { InterviewSchedulerModal } from '@/components/interview-scheduler-modal'
import { JobRecommendations } from '@/components/job-recommendations'
import { Message, ChatStreamEvent } from '@/types'
import { getErrorMessage, generateId } from '@/lib/utils'
import { withErrorBoundary } from '@/components/error-boundary'

function ChatPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [showSummary, setShowSummary] = useState(false)
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [summary, setSummary] = useState('')
  const [showInterviewScheduler, setShowInterviewScheduler] = useState(false)
  const [candidateName, setCandidateName] = useState('')
  const [candidateEmail, setCandidateEmail] = useState('')
  const [showJobRecommendations, setShowJobRecommendations] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)
  const streamingContentRef = useRef<string>('')

  useEffect(() => {
    // セッション情報を取得
    const storedSessionId = localStorage.getItem('currentSessionId')
    const storedCandidateName = localStorage.getItem('candidateName')
    const storedCandidateEmail = localStorage.getItem('userEmail') || ''
    const initialQuestions = localStorage.getItem('initialQuestions')

    if (!storedSessionId || !storedCandidateName) {
      router.push('/upload')
      return
    }

    setSessionId(storedSessionId)
    setCandidateName(storedCandidateName)
    setCandidateEmail(storedCandidateEmail)

    // 初回質問を表示
    if (initialQuestions) {
      try {
        const questions = JSON.parse(initialQuestions)
        let introMessage = `こんにちは、${storedCandidateName}さん。\n`
        
        // CV要約をチェックして、読み込みエラーかどうか判定
        if (questions.some((q: string) => q.includes('お仕事内容') || q.includes('キャリアの概要'))) {
          introMessage += 'CVの読み込みができなかったため、直接お話を伺いながら進めさせていただきます。\n'
        } else {
          introMessage += 'CVを拝見させていただきました。'
        }
        
        introMessage += `いくつか質問させていただきます。\n\n${questions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n\n')}\n\nまずは最初の質問からお答えください。`
        
        const welcomeMessage: Message = {
          id: generateId(),
          session_id: storedSessionId,
          role: 'assistant',
          content: introMessage,
          created_at: new Date().toISOString(),
        }
        setMessages([welcomeMessage])
        localStorage.removeItem('initialQuestions')
      } catch (error) {
        console.error('初回質問の解析エラー:', error)
      }
    }

    // 既存のメッセージを読み込む（実装簡略化のため省略）
  }, [router])

  // クリーンアップ関数
  useEffect(() => {
    return () => {
      // コンポーネントのアンマウント時にEventSourceをクローズ
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }, [])

  const handleSendMessage = async (content: string) => {
    if (!sessionId) return

    const userMessage: Message = {
      id: generateId(),
      session_id: sessionId,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)
    setError('')

    try {
      // メッセージを送信
      const response = await fetch(`/api/v1/chat/${sessionId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'メッセージの送信に失敗しました')
      }

      // ストリーミング応答を開始
      setIsLoading(false)
      setIsStreaming(true)
      setStreamingContent('')
      streamingContentRef.current = ''

      // 既存のEventSourceがあればクローズ
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }

      const eventSource = new EventSource(`/api/v1/chat/${sessionId}/stream`)
      eventSourceRef.current = eventSource

      eventSource.onmessage = (event) => {
        try {
          const data: ChatStreamEvent = JSON.parse(event.data)
          
          switch (data.type) {
            case 'chunk':
              streamingContentRef.current += data.content || ''
              setStreamingContent(streamingContentRef.current)
              break
            case 'end':
              const assistantMessage: Message = {
                id: generateId(),
                session_id: sessionId,
                role: 'assistant',
                content: streamingContentRef.current,
                created_at: new Date().toISOString(),
              }
              setMessages(prev => [...prev, assistantMessage])
              setStreamingContent('')
              streamingContentRef.current = ''
              setIsStreaming(false)
              eventSource.close()
              eventSourceRef.current = null
              break
            case 'error':
              setError(data.error || 'ストリーミングエラーが発生しました')
              setIsStreaming(false)
              eventSource.close()
              break
          }
        } catch (error) {
          console.error('イベント解析エラー:', error)
        }
      }

      eventSource.onerror = () => {
        setError('接続エラーが発生しました')
        setIsStreaming(false)
        eventSource.close()
      }

    } catch (error) {
      setError(getErrorMessage(error))
      setIsLoading(false)
    }
  }

  const handleEndConsultation = async () => {
    setIsGeneratingSummary(true)
    setError('')

    try {
      console.log('現在のセッションID:', sessionId)
      
      // セッションのチャット要約を生成
      const summarizeResponse = await fetch(`/api/v1/chat/${sessionId}/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!summarizeResponse.ok) {
        const errorData = await summarizeResponse.json()
        console.error('要約API エラー:', errorData)
        throw new Error(`要約の生成に失敗しました: ${errorData.error || '不明なエラー'}`)
      }

      const summarizeData = await summarizeResponse.json()
      
      // 既存のサマリー生成APIも呼び出す（表示用）
      const response = await fetch('/api/v1/chat/summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messages,
          sessionId: sessionId,
        }),
      })

      if (!response.ok) {
        throw new Error('サマリーの生成に失敗しました')
      }

      const data = await response.json()
      setSummary(data.summary)
      setShowSummary(true)
      
      // 求人マッチングを実行
      const matchingResponse = await fetch(`/api/v1/job-matching/${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          matchCount: 10,
          minSimilarity: 0.6,
          includeExplanations: true
        }),
      })
      
      if (matchingResponse.ok) {
        const matchingData = await matchingResponse.json()
        console.log('求人マッチング完了:', matchingData)
        // マッチング結果がある場合は求人推薦を表示
        if (matchingData.matches && matchingData.matches.length > 0) {
          setShowJobRecommendations(true)
        }
      }
    } catch (error) {
      setError('キャリアサマリーの生成に失敗しました')
    } finally {
      setIsGeneratingSummary(false)
    }
  }

  // メッセージの往復回数をカウント（ユーザーのメッセージ数）
  const userMessageCount = messages.filter(m => m.role === 'user').length

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.push('/')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            ホームへ
          </Button>

          <div className="flex gap-2">
            {userMessageCount >= 3 && !showSummary && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEndConsultation}
                disabled={isGeneratingSummary}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                {isGeneratingSummary ? '生成中...' : '相談を終了'}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInterviewScheduler(true)}
            >
              <UserCircle className="mr-2 h-4 w-4" />
              キャリアアドバイザーに相談
            </Button>
          </div>
        </div>

        {showSummary ? (
          <Card>
            <CardHeader>
              <CardTitle>キャリア相談サマリー</CardTitle>
              <CardDescription>
                これまでの会話から、あなたのキャリアの方向性をまとめました
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap">{summary}</div>
              </div>
              
              {/* 求人推薦セクション */}
              {showJobRecommendations && sessionId && (
                <div className="border-t pt-6">
                  <JobRecommendations sessionId={sessionId} />
                </div>
              )}
              
              <div className="flex gap-2 pt-4 border-t">
                <Button onClick={() => router.push('/')}>
                  ホームへ戻る
                </Button>
                <Button variant="outline" onClick={() => setShowSummary(false)}>
                  チャットに戻る
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="h-[calc(100vh-120px)]">
            <CardHeader>
              <CardTitle>キャリア相談チャット</CardTitle>
              <CardDescription>
                AIカウンセラーがあなたのキャリアについて詳しくお聞きします
                {userMessageCount < 3 && ` (あと${3 - userMessageCount}回の会話が必要です)`}
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[calc(100%-100px)] p-0">
              <ChatInterface
                messages={messages}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                isStreaming={isStreaming}
                streamingContent={streamingContent}
              />
            </CardContent>
          </Card>
        )}

        {error && (
          <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-lg">
            {error}
          </div>
        )}
      </div>

      <InterviewSchedulerModal
        isOpen={showInterviewScheduler}
        onClose={() => setShowInterviewScheduler(false)}
        candidateName={candidateName}
        candidateEmail={candidateEmail}
        sessionId={sessionId || ''}
      />
    </div>
  )
}

export default withErrorBoundary(ChatPage)
