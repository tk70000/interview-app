import { NextRequest, NextResponse } from 'next/server'
import { Message } from '@/types'
import OpenAI from 'openai'

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY
  
  if (!apiKey) {
    throw new Error('OpenAI APIキーが設定されていません')
  }
  
  return new OpenAI({
    apiKey: apiKey.trim(),
  })
}

export async function POST(request: NextRequest) {
  try {
    const { messages, sessionId } = await request.json()

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'メッセージ履歴が必要です' },
        { status: 400 }
      )
    }

    // メッセージ履歴を整形
    const conversationHistory = messages
      .map((msg: Message) => `${msg.role === 'user' ? '候補者' : 'AI'}: ${msg.content}`)
      .join('\n\n')

    // OpenAIでサマリーを生成
    const openai = getOpenAIClient()
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        {
          role: 'system',
          content: `あなたは優秀なキャリアアドバイザーです。
候補者との会話履歴を分析し、以下の観点でキャリアの方向性をまとめてください：

1. 【現在の強み・経験】
   - 技術スキル
   - マネジメント経験
   - 特筆すべき実績

2. 【キャリアの志向性】
   - 興味・関心のある分野
   - 重視している価値観
   - 将来的な目標

3. 【推奨されるキャリアパス】
   - 短期的な目標（1-2年）
   - 中長期的な目標（3-5年）
   - 具体的な職種・ポジション例

4. 【成長のためのアドバイス】
   - 強化すべきスキル
   - 取得を推奨する資格
   - ネットワーキングの方向性

要点を箇条書きで整理し、具体的で実践的なアドバイスを含めてください。`
        },
        {
          role: 'user',
          content: `以下の会話履歴から、候補者のキャリアの方向性をまとめてください：\n\n${conversationHistory}`
        }
      ],
      temperature: 0.3,
      max_tokens: 1500,
    })

    const summary = response.choices[0]?.message?.content || 'サマリーの生成に失敗しました'

    return NextResponse.json({ summary })

  } catch (error) {
    console.error('サマリー生成エラー:', error)
    return NextResponse.json(
      { error: 'サマリーの生成に失敗しました' },
      { status: 500 }
    )
  }
}