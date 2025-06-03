import { NextRequest } from 'next/server'
import { streamChatResponse } from '@/lib/openai'
import { supabase } from '@/lib/supabase'
import { getErrorMessage, generateId } from '@/lib/utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params

  // SSEヘッダーの設定
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  })

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // セッション情報を取得
        const { data: session, error: sessionError } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .single()

        if (sessionError || !session) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ 
              type: 'error', 
              error: 'セッションが見つかりません' 
            })}\n\n`)
          )
          controller.close()
          return
        }

        // 会話履歴を取得（最新10件に制限）
        const { data: messages, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: false })
          .limit(10)

        if (messagesError) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ 
              type: 'error', 
              error: '会話履歴の取得に失敗しました' 
            })}\n\n`)
          )
          controller.close()
          return
        }

        // 関連する過去の回答を検索（RAG）
        const lastUserMessage = messages
          .filter(m => m.role === 'user')
          .pop()

        let context = ''
        if (lastUserMessage) {
          // pgvectorを使用した類似検索（簡易実装）
          // 注: 実際の実装では、OpenAI Embeddings APIを使用してベクトルを生成します
          const dummyEmbedding = new Array(1536).fill(0).map(() => Math.random())
          
          const { data: similarMessages } = await supabase
            .rpc('match_embeddings', {
              query_embedding: dummyEmbedding, // 実際には適切な埋め込みベクトルを渡す
              match_threshold: 0.7,
              match_count: 3,
            })

          if (similarMessages && similarMessages.length > 0) {
            context = similarMessages
              .map((m: any) => m.content)
              .join('\n\n')
          }
        }

        // ストリーミング開始イベント
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'start' })}\n\n`)
        )

        // OpenAI APIからストリーミング（メッセージを時系列順に並び替え）
        const chatMessages = messages
          .reverse() // 降順で取得したものを昇順に戻す
          .map(m => ({
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.content,
          }))

        // ストリーミングしながら完全な応答を収集
        let fullResponse = ''
        
        for await (const chunk of streamChatResponse(chatMessages, context)) {
          fullResponse += chunk
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ 
              type: 'chunk', 
              content: chunk 
            })}\n\n`)
          )
        }

        // 完全な応答をデータベースに保存
        const assistantMessageId = generateId()
        const assistantMessage = {
          id: assistantMessageId,
          session_id: sessionId,
          role: 'assistant',
          content: fullResponse,
          created_at: new Date().toISOString(),
        }

        const { error: saveError } = await supabase
          .from('messages')
          .insert(assistantMessage)

        if (saveError) {
          console.error('アシスタントメッセージの保存エラー:', saveError)
        }

        // ストリーミング終了イベント
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ 
            type: 'end',
            messageId: assistantMessageId 
          })}\n\n`)
        )

        controller.close()
      } catch (error) {
        console.error('Streaming error:', error)
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ 
            type: 'error', 
            error: getErrorMessage(error) 
          })}\n\n`)
        )
        controller.close()
      }
    },
  })

  return new Response(stream, { headers })
}
