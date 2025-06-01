'use client'

import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Message } from '@/types'
import { cn, formatDate, getRoleDisplayName } from '@/lib/utils'

interface ChatInterfaceProps {
  messages: Message[]
  onSendMessage: (content: string) => void
  isLoading?: boolean
  isStreaming?: boolean
  streamingContent?: string
  className?: string
}

export function ChatInterface({
  messages,
  onSendMessage,
  isLoading,
  isStreaming,
  streamingContent,
  className
}: ChatInterfaceProps) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingContent])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!input.trim() || isLoading || isStreaming) {
      return
    }

    onSendMessage(input.trim())
    setInput('')
    
    // フォーカスを維持
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 日本語入力中（IME変換中）は何もしない
    if (e.nativeEvent.isComposing || e.keyCode === 229) {
      return
    }
    
    // Enterで送信、Shift+Enterで改行
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }
  
  // テキストエリアの高さを自動調整
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const scrollHeight = textareaRef.current.scrollHeight
      // 最小60px、最大200pxの範囲で自動調整
      textareaRef.current.style.height = `${Math.min(Math.max(60, scrollHeight), 200)}px`
    }
  }, [input])

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* メッセージ表示エリア */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        
        {/* ストリーミング中のメッセージ */}
        {isStreaming && streamingContent && (
          <MessageBubble
            message={{
              id: 'streaming',
              session_id: '',
              role: 'assistant',
              content: streamingContent,
              created_at: new Date().toISOString()
            }}
            isStreaming
          />
        )}
        
        {/* ローディング表示 */}
        {isLoading && !isStreaming && (
          <div className="flex items-center space-x-2 text-muted-foreground">
            <Spinner size="sm" />
            <span className="text-sm">AIが考えています...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* 入力エリア */}
      <Card className="m-4 p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="メッセージを入力してください... (Enterで送信、Shift+Enterで改行)"
            className="flex-1 min-h-[60px] max-h-[200px] resize-none overflow-y-auto"
            disabled={isLoading || isStreaming}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading || isStreaming}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </Card>
    </div>
  )
}

interface MessageBubbleProps {
  message: Message
  isStreaming?: boolean
}

function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  
  return (
    <div
      className={cn(
        "flex message-fade-in",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[70%] rounded-lg px-4 py-3",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        )}
      >
        <div className="text-xs opacity-70 mb-1">
          {getRoleDisplayName(message.role)}
          {!isStreaming && (
            <span className="ml-2">{formatDate(message.created_at)}</span>
          )}
        </div>
        
        <div className={cn("prose prose-sm", isUser && "prose-invert")}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeSanitize]}
            components={{
              // スクリプトタグを無効化
              script: () => null,
              // iframeを無効化
              iframe: () => null,
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
        
        {isStreaming && (
          <div className="typing-indicator mt-2">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
        )}
      </div>
    </div>
  )
}
