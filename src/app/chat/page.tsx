'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChatInterface } from '@/components/chat-interface'
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
  const eventSourceRef = useRef<EventSource | null>(null)
  const streamingContentRef = useRef<string>('')

  useEffect(() => {
    // セッション情報を取得
    const storedSessionId = localStorage.getItem('currentSessionId')
    const candidateName = localStorage.getItem('candidateName')
    const initialQuestions = localStorage.getItem('initialQuestions')

    if (!storedSessionId || !candidateName) {
      router.push('/upload')
      return
    }

    setSessionId(storedSessionId)

    // 初回質問を表示
    if (initialQuestions) {
      try {
        const questions = JSON.parse(initialQuestions)
        const welcomeMessage: Message = {
          id: generateId(),
          session_id: storedSessionId,
          role: 'assistant',
          content: `こんにちは、${candidateName}さん。\nCVを拝見させていただきました。いくつか質問させていただきます。\n\n${questions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n\n')}\n\nまずは最初の質問からお答えください。`,
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

          <Button
            variant="outline"
            size="sm"
          >
            <Info className="mr-2 h-4 w-4" />
            セッション情報
          </Button>
        </div>

        <Card className="h-[calc(100vh-120px)]">
          <CardHeader>
            <CardTitle>キャリア相談チャット</CardTitle>
            <CardDescription>
              AIカウンセラーがあなたのキャリアについて詳しくお聞きします
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

        {error && (
          <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-lg">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}

export default withErrorBoundary(ChatPage)
