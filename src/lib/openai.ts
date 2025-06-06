import OpenAI from 'openai'
import { debugLog } from './debug-logger'

// OpenAIクライアントの遅延初期化
let openai: OpenAI | null = null

export function getOpenAIClient(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY
    
    if (!apiKey) {
      debugLog.error('⚠️ OpenAI API key is not set. Please check your .env.local file.')
      throw new Error('OpenAI APIキーが設定されていません。.env.localファイルを確認してください。')
    }
    
    // Validate API key format
    const trimmedKey = apiKey.trim()
    if (trimmedKey !== apiKey) {
      debugLog.warn('⚠️ OpenAI API key has leading/trailing whitespace')
    }
    
    if (!trimmedKey.startsWith('sk-')) {
      debugLog.error('⚠️ OpenAI API key should start with "sk-"')
      throw new Error('OpenAI APIキーの形式が正しくありません。')
    }
    
    openai = new OpenAI({
      apiKey: trimmedKey,
    })
  }
  
  return openai
}

// CV要約生成
export async function generateCVSummary(cvText: string): Promise<string> {
  try {
    debugLog.log('Generating CV summary...');
    debugLog.log('OpenAI API key exists:', !!process.env.OPENAI_API_KEY);
    debugLog.log('CV text length:', cvText.length);
    
    const client = getOpenAIClient();
    debugLog.log('OpenAI client created successfully');
    
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini', // 一時的に安価なモデルを使用
      messages: [
        {
          role: 'system',
          content: 'あなたは経験豊富なキャリアアドバイザーです。様々な業界・職種に精通しており、候補者の職務経歴書から重要な情報を抽出し、その人物のキャリアの強みと可能性を見出すことができます。'
        },
        {
          role: 'user',
          content: `以下の職務経歴書を分析し、候補者の主要な経験、スキル、強み、キャリアの特徴を簡潔にまとめてください：\n\n${cvText.substring(0, 1500)}` // 最初の1500文字のみ使用
        }
      ],
      temperature: 0.3,
      max_tokens: 500,
    })

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI APIからの応答が空です');
    }
    
    debugLog.log('生成されたCV要約:', content);
    return content;
  } catch (error: any) {
    debugLog.error('CV要約生成エラー詳細:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      headers: error.response?.headers,
      error: error.error,
      type: error.type,
      code: error.code,
      fullError: error
    })
    
    // OpenAI specific error handling
    if (error.status === 404) {
      throw new Error(`モデル 'gpt-4.1' にアクセスできません。利用可能なモデルを確認してください。`)
    }
    if (error.status === 401 || error.code === 'invalid_api_key') {
      throw new Error('OpenAI APIキーが無効です。正しいキーか確認してください。')
    }
    if (error.status === 429) {
      throw new Error('OpenAI APIのレート制限に達しました。しばらく待ってから再試行してください。')
    }
    if (error.message?.toLowerCase().includes('api key')) {
      throw new Error('OpenAI APIキーが設定されていません。.env.localファイルを確認してください。')
    }
    
    throw new Error(`CV要約の生成に失敗しました: ${error.message || 'Unknown error'}`)
  }
}

// 初回質問生成
export async function generateInitialQuestions(
  cvSummary: string,
  jobDescription?: string
): Promise<string[]> {
  const maxRetries = 3
  let lastError: any
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      debugLog.log('=== generateInitialQuestions ===')
      debugLog.log(`試行 ${attempt}/${maxRetries}`)
      debugLog.log('入力されたCV要約:', cvSummary)
      debugLog.log('職種指定:', jobDescription || '指定なし')
      
      const response = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o-mini', // 一時的に安価なモデルを使用
      messages: [
        {
          role: 'system',
          content: `あなたは経験豊富なキャリアアドバイザーです。候補者との面談を開始するための質問を作成してください。

${cvSummary.includes('読み込むことができませんでした') 
  ? `候補者の職務経歴書を読み込むことができなかったため、一般的なキャリア相談として質問を作成してください。

以下の形式で、番号付きリストとして5つの質問を作成してください：

1. 現在のお仕事では、どのような業務を担当していて、特にやりがいを感じる部分はどこですか？
2. これまでのキャリアの中で、特に印象に残っているプロジェクトや経験について教えていただけますか？
3. ご自身の得意分野やスキルについて、具体的にどのような点をアピールしたいと思いますか？
4. 今後のキャリアにおいて、どのような方向性や目標を持っていますか？
5. 転職を考えている理由や、今の職場での課題についてお話しいただけますか？

必ず上記の形式で回答してください。` 
  : `候補者の職務経歴書の内容に基づいて、その人の経験や専門分野に特化した質問を作成してください。

以下の形式で、番号付きリストとして5-7つの質問を作成してください：

1. [質問内容]
2. [質問内容]
...

重要なルール：
- 番号付きリスト形式で回答する
- 候補者の実際の職歴・専門分野に関連する質問のみ作成
- 職務経歴書に記載されている具体的な技術、プロジェクト、役割に基づく
- 1つの質問は1〜2文以内
- 「はい/いいえ」で終わらない開かれた質問
- 親しみやすく答えやすい聞き方`}`
        },
        {
          role: 'user',
          content: `職務経歴書の要約: ${cvSummary}${jobDescription ? `\n\n募集ポジション: ${jobDescription}` : ''}`
        }
      ],
      temperature: 0.4,
      max_tokens: 800,
      top_p: 0.9,
    })

    const content = response.choices[0].message.content || ''
    debugLog.log('OpenAIからの生の回答:', content)
    
    // 質問を番号付きリストから抽出
    const questions = content
      .split('\n')
      .filter(line => line.trim())
      .filter(line => /^\d+\.\s/.test(line.trim())) // 番号付きの行のみ
      .map(line => line.replace(/^\d+\.\s*/, '').trim()) // 番号を除去
      .filter(q => q.length > 10) // 10文字以上の質問のみ

      debugLog.log('解析後の質問配列:', questions)
      
      if (questions.length === 0) {
        debugLog.warn('質問が抽出できませんでした。元のレスポンス:', content)
        // フォールバック用の質問
        return [
          '現在のお仕事では、どのような業務を担当していますか？',
          'これまでのキャリアで特に印象に残っている経験について教えてください',
          'ご自身の強みやアピールポイントについて聞かせてください',
          '今後のキャリアでどのような目標をお持ちですか？',
          '転職を検討している理由について教えていただけますか？'
        ]
      }
      
      return questions.slice(0, 7)
    } catch (error: any) {
      lastError = error
      debugLog.error(`初回質問生成エラー (試行 ${attempt}/${maxRetries}):`, {
        message: error.message,
        status: error.status,
        statusText: error.response?.statusText,
        headers: error.response?.headers,
        error: error.error,
        type: error.type,
        code: error.code,
        fullError: error
      })
      
      // レート制限エラーの場合はリトライ
      if (error.status === 429 && attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt) * 1000 // 指数バックオフ: 2秒, 4秒, 8秒
        debugLog.log(`レート制限エラー。${waitTime}ms待機して再試行します...`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        continue
      }
      
      // その他のエラーは即座に投げる
      break
    }
  }
  
  // すべての試行が失敗した場合
  // OpenAI API特有のエラーハンドリング
  if (lastError.status === 404) {
    throw new Error(`モデル 'gpt-4.1' にアクセスできません。利用可能なモデルを確認してください。`)
  }
  if (lastError.status === 401) {
    throw new Error('OpenAI APIキーが無効です。')
  }
  if (lastError.status === 429) {
    throw new Error('OpenAI APIのレート制限に達しました。しばらく待ってから再度お試しください。')
  }
  // 詳細なエラー情報を含めて投げる
  throw new Error(`質問の生成に失敗しました: ${lastError.message || 'Unknown error'}`)
}

// フォローアップ質問生成
export async function generateFollowUpQuestion(
  previousQuestion: string,
  userAnswer: string,
  conversationHistory: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
): Promise<{ question: string; shouldAskFollowUp: boolean }> {
  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o-mini', // 一時的に安価なモデルを使用
      messages: [
        {
          role: 'system',
          content: `あなたは優秀なキャリアアドバイザーです。
候補者の回答を聞いて、より深い理解を得るために適切なフォローアップの質問や共感的なコメントを返してください。

応答のガイドライン：
- 候補者の経験や感情に共感を示す
- 具体的な事例や詳細を引き出す質問をする
- 候補者の強みやポテンシャルを見出してフィードバックする
- 必要に応じて複数の質問を含めても構いません
- 温かく親しみやすいトーンで

追加の質問が不要で会話を終了する場合のみ"NO_FOLLOW_UP"と返してください。`
        },
        ...conversationHistory.slice(-4),
        {
          role: 'user',
          content: `質問: ${previousQuestion}\n回答: ${userAnswer}`
        }
      ],
      temperature: 0.7,
      max_tokens: 800,
    })

    const content = response.choices[0].message.content || ''
    
    // デバッグ: OpenAIからの生の応答を確認
    debugLog.log('=== OpenAI Response Debug ===')
    debugLog.log('Response length:', content.length)
    debugLog.log('Contains newlines:', content.includes('\n'))
    debugLog.log('Line count:', content.split('\n').length)
    debugLog.log('First 200 chars:', content.substring(0, 200))
    debugLog.log('Full content:', JSON.stringify(content))
    debugLog.log('=============================')
    
    if (content.includes('NO_FOLLOW_UP')) {
      return { question: '', shouldAskFollowUp: false }
    }

    return { question: content, shouldAskFollowUp: true }
  } catch (error) {
    debugLog.error('フォローアップ質問生成エラー:', error)
    return { question: '', shouldAskFollowUp: false }
  }
}

// テキストの埋め込みベクトル生成
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await getOpenAIClient().embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    })

    return response.data[0].embedding
  } catch (error) {
    debugLog.error('埋め込み生成エラー:', error)
    throw new Error('埋め込みベクトルの生成に失敗しました')
  }
}

// チャット応答のストリーミング
export async function* streamChatResponse(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  context?: string
): AsyncGenerator<string> {
  try {
    const systemMessage = context
      ? `あなたは経験豊富なキャリアアドバイザーです。様々な業界・職種の知識を持ち、候補者の可能性を最大限に引き出すことができます。以下のコンテキストを考慮して応答してください：\n${context}`
      : 'あなたは親切で専門的なキャリアアドバイザーです。候補者の話を傾聴し、適切な質問と洞察的なフィードバックを提供します。'

    const stream = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o-mini', // 一時的に安価なモデルを使用
      messages: [
        { role: 'system', content: systemMessage },
        ...messages
      ],
      temperature: 0.7,
      max_tokens: 1000,
      stream: true,
    })

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content
      if (content) {
        yield content
      }
    }
  } catch (error) {
    debugLog.error('ストリーミング応答エラー:', error)
    throw new Error('応答の生成に失敗しました')
  }
}
