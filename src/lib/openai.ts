import OpenAI from 'openai'

// OpenAIクライアントの遅延初期化
let openai: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY
    
    if (!apiKey) {
      console.error('⚠️ OpenAI API key is not set. Please check your .env.local file.')
      throw new Error('OpenAI APIキーが設定されていません。.env.localファイルを確認してください。')
    }
    
    // Validate API key format
    const trimmedKey = apiKey.trim()
    if (trimmedKey !== apiKey) {
      console.warn('⚠️ OpenAI API key has leading/trailing whitespace')
    }
    
    if (!trimmedKey.startsWith('sk-')) {
      console.error('⚠️ OpenAI API key should start with "sk-"')
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
    console.log('Generating CV summary...');
    console.log('OpenAI API key exists:', !!process.env.OPENAI_API_KEY);
    console.log('CV text length:', cvText.length);
    
    const client = getOpenAIClient();
    console.log('OpenAI client created successfully');
    
    const response = await client.chat.completions.create({
      model: 'gpt-4.1',
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
    
    return content;
  } catch (error: any) {
    console.error('CV要約生成エラー詳細:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      error: error.error,
      type: error.type,
    })
    
    // OpenAI specific error handling
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
  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        {
          role: 'system',
          content: `あなたは優秀なキャリアアドバイザーです。
候補者とテンポよく会話を進めるため、短く答えやすい質問を作成してください。

重要なルール：
- 1つの質問は1〜2文以内
- 具体的で答えやすい内容
- 「はい/いいえ」で終わらない開かれた質問
- 相手が話したくなるような親しみやすい聞き方

5〜7つの質問を作成してください。`
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
    // 質問を行ごとに分割して配列化
    const questions = content.split('\n')
      .filter(line => line.trim())
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(q => q.length > 10)

    return questions.slice(0, 7)
  } catch (error) {
    console.error('初回質問生成エラー:', error)
    throw new Error('質問の生成に失敗しました')
  }
}

// フォローアップ質問生成
export async function generateFollowUpQuestion(
  previousQuestion: string,
  userAnswer: string,
  conversationHistory: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
): Promise<{ question: string; shouldAskFollowUp: boolean }> {
  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4.1',
      messages: [
        {
          role: 'system',
          content: `あなたは優秀なキャリアアドバイザーです。
候補者の回答を聞いて、必要な場合のみ短いフォローアップ質問をしてください。

フォローアップが必要な場合：
- もう少し具体的に聞きたい時
- 興味深い点を掘り下げたい時

質問は必ず1文で、20文字以内を目安に。
追加質問が不要なら"NO_FOLLOW_UP"と返してください。`
        },
        ...conversationHistory.slice(-4),
        {
          role: 'user',
          content: `質問: ${previousQuestion}\n回答: ${userAnswer}`
        }
      ],
      temperature: 0.4,
      max_tokens: 256,
    })

    const content = response.choices[0].message.content || ''
    
    if (content.includes('NO_FOLLOW_UP')) {
      return { question: '', shouldAskFollowUp: false }
    }

    return { question: content, shouldAskFollowUp: true }
  } catch (error) {
    console.error('フォローアップ質問生成エラー:', error)
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
    console.error('埋め込み生成エラー:', error)
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
      model: 'gpt-4.1',
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
    console.error('ストリーミング応答エラー:', error)
    throw new Error('応答の生成に失敗しました')
  }
}
