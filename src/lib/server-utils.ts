// サーバーサイド専用のユーティリティ関数
// このファイルはNext.jsのAPI RouteやServer Componentでのみ使用してください

import OpenAI from 'openai'

// OpenAIクライアントの初期化
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY
  
  if (!apiKey) {
    throw new Error('OpenAI APIキーが設定されていません')
  }
  
  return new OpenAI({
    apiKey: apiKey.trim(),
  })
}

// OpenAI Assistants APIを使用したテキスト抽出
export async function extractTextFromFileUpload(
  fileBuffer: Buffer, 
  fileName: string, 
  mimeType: string
): Promise<string> {
  try {
    console.log('OpenAI Assistants APIでテキスト抽出開始:', fileName, mimeType)
    
    const openai = getOpenAIClient()
    
    // ファイルをOpenAIにアップロード
    const file = await openai.files.create({
      file: new File([fileBuffer], fileName, { type: mimeType }),
      purpose: 'assistants'
    })
    
    console.log('ファイルアップロード完了:', file.id)
    
    // アシスタントを作成
    const assistant = await openai.beta.assistants.create({
      name: "CV Text Extractor",
      instructions: `あなたは履歴書・職務経歴書の専門的な読み取りを行うエキスパートです。
アップロードされた文書から、以下の情報を正確に抽出してください：

1. 個人情報（氏名、連絡先、年齢など）
2. 学歴・職歴の詳細（時系列順）
3. スキル・技能・資格
4. プロジェクト経験・実績
5. 自己PR・志望動機

出力形式：
- 元の文書の構造と階層を保持
- 読みにくい部分は [判読困難] と記載
- 表形式のデータは適切にフォーマット
- 日本語として自然な文章に整形`,
      model: "gpt-4o-mini",
      tools: [{ type: "file_search" }]
    })
    
    try {
      // スレッドを作成
      const thread = await openai.beta.threads.create({
        messages: [
          {
            role: "user",
            content: "この履歴書・職務経歴書からすべてのテキスト情報を抽出してください。レイアウトや表の構造も考慮して、読みやすい形式で出力してください。",
            attachments: [
              {
                file_id: file.id,
                tools: [{ type: "file_search" }]
              }
            ]
          }
        ]
      })
      
      // 実行
      const run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: assistant.id
      })
      
      // 完了まで待機
      let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id)
      while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
        await new Promise(resolve => setTimeout(resolve, 1000))
        runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id)
      }
      
      if (runStatus.status !== 'completed') {
        throw new Error(`アシスタント実行が失敗しました: ${runStatus.status}`)
      }
      
      // レスポンスを取得
      const messages = await openai.beta.threads.messages.list(thread.id)
      const extractedText = messages.data[0]?.content[0]?.type === 'text' 
        ? messages.data[0].content[0].text.value 
        : ''
      
      console.log('抽出されたテキスト文字数:', extractedText.length)
      console.log('抽出されたテキストの最初の200文字:', extractedText.substring(0, 200))
      
      if (!extractedText || extractedText.length < 50) {
        throw new Error('ファイルから十分なテキストを抽出できませんでした。')
      }
      
      return extractedText
      
    } finally {
      // クリーンアップ
      try {
        await openai.beta.assistants.del(assistant.id)
        await openai.files.del(file.id)
        console.log('リソースをクリーンアップしました')
      } catch (deleteError) {
        console.warn('クリーンアップに失敗:', deleteError)
      }
    }
    
  } catch (error) {
    console.error('OpenAI Assistants APIエラー:', error)
    throw new Error(`ファイルからのテキスト抽出に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// 求人票専用のテキスト抽出関数
export async function extractJobPostingText(
  fileBuffer: Buffer, 
  fileName: string, 
  mimeType: string
): Promise<string> {
  try {
    console.log('求人票テキスト抽出開始:', fileName, mimeType)
    
    const openai = getOpenAIClient()
    
    // ファイルをOpenAIにアップロード
    const file = await openai.files.create({
      file: new File([fileBuffer], fileName, { type: mimeType }),
      purpose: 'assistants'
    })
    
    console.log('ファイルアップロード完了:', file.id)
    
    // アシスタントを作成
    const assistant = await openai.beta.assistants.create({
      name: "Job Posting Text Extractor",
      instructions: `あなたは求人票・求人情報の専門的な読み取りを行うエキスパートです。
アップロードされた文書から、以下の求人情報を正確に抽出してください：

1. 企業名・会社名
2. 募集職種・ポジション名
3. 職務内容・業務内容の詳細
4. 応募要件・必須スキル・歓迎スキル
5. 雇用形態（正社員、契約社員等）
6. 勤務地・勤務条件
7. 給与・年収レンジ
8. 福利厚生・その他条件

出力形式：
- 元の文書の構造と階層を保持
- 読みにくい部分は [判読困難] と記載
- 表形式のデータは適切にフォーマット
- 求人情報として自然な文章に整形`,
      model: "gpt-4o-mini",
      tools: [{ type: "file_search" }]
    })
    
    try {
      // スレッドを作成
      const thread = await openai.beta.threads.create({
        messages: [
          {
            role: "user",
            content: "この求人票・求人情報からすべてのテキスト情報を抽出してください。レイアウトや表の構造も考慮して、求人情報として読みやすい形式で出力してください。",
            attachments: [
              {
                file_id: file.id,
                tools: [{ type: "file_search" }]
              }
            ]
          }
        ]
      })
      
      // 実行
      const run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: assistant.id
      })
      
      // 完了まで待機
      let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id)
      while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
        await new Promise(resolve => setTimeout(resolve, 1000))
        runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id)
      }
      
      if (runStatus.status !== 'completed') {
        throw new Error(`アシスタント実行が失敗しました: ${runStatus.status}`)
      }
      
      // レスポンスを取得
      const messages = await openai.beta.threads.messages.list(thread.id)
      const extractedText = messages.data[0]?.content[0]?.type === 'text' 
        ? messages.data[0].content[0].text.value 
        : ''
      
      console.log('抽出されたテキスト文字数:', extractedText.length)
      console.log('抽出されたテキストの最初の200文字:', extractedText.substring(0, 200))
      
      if (!extractedText || extractedText.length < 50) {
        throw new Error('ファイルから十分なテキストを抽出できませんでした。')
      }
      
      return extractedText
      
    } finally {
      // クリーンアップ
      try {
        await openai.beta.assistants.del(assistant.id)
        await openai.files.del(file.id)
        console.log('リソースをクリーンアップしました')
      } catch (deleteError) {
        console.warn('クリーンアップに失敗:', deleteError)
      }
    }
    
  } catch (error) {
    console.error('求人票テキスト抽出エラー:', error)
    throw new Error(`求人票からのテキスト抽出に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// LinkedIn JSONからテキスト抽出
export async function extractTextFromLinkedInJSON(fileUrl: string): Promise<string> {
  try {
    console.log('LinkedIn JSONテキスト抽出開始:', fileUrl)
    
    let jsonContent: string
    
    if (fileUrl.startsWith('data:')) {
      // Data URLの場合
      const base64Data = fileUrl.split(',')[1]
      jsonContent = Buffer.from(base64Data, 'base64').toString('utf-8')
    } else {
      // 通常のURLの場合
      const response = await fetch(fileUrl)
      if (!response.ok) {
        throw new Error(`ファイルの取得に失敗しました: ${response.status}`)
      }
      jsonContent = await response.text()
    }
    
    // JSONをパースして構造化データを抽出
    const data = JSON.parse(jsonContent)
    
    // LinkedIn JSONの基本的な情報を抽出
    let extractedText = ''
    
    if (data.firstName && data.lastName) {
      extractedText += `名前: ${data.firstName} ${data.lastName}\n`
    }
    
    if (data.headline) {
      extractedText += `見出し: ${data.headline}\n`
    }
    
    if (data.summary) {
      extractedText += `要約: ${data.summary}\n`
    }
    
    if (data.positions && Array.isArray(data.positions)) {
      extractedText += '\n職歴:\n'
      data.positions.forEach((position: any, index: number) => {
        extractedText += `${index + 1}. ${position.title || ''}`
        if (position.companyName) {
          extractedText += ` - ${position.companyName}`
        }
        if (position.description) {
          extractedText += `\n   ${position.description}`
        }
        extractedText += '\n'
      })
    }
    
    if (data.skills && Array.isArray(data.skills)) {
      extractedText += '\nスキル:\n'
      data.skills.forEach((skill: any) => {
        if (skill.name) {
          extractedText += `- ${skill.name}\n`
        }
      })
    }
    
    console.log('抽出されたテキスト文字数:', extractedText.length)
    
    if (!extractedText.trim()) {
      throw new Error('LinkedIn JSONからテキストを抽出できませんでした。')
    }
    
    return extractedText
    
  } catch (error) {
    console.error('LinkedIn JSONテキスト抽出エラー:', error)
    throw new Error(`LinkedIn JSONからのテキスト抽出に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// ファイルタイプに応じたテキスト抽出（サーバーサイド専用）
export async function extractTextFromFile(
  fileData: Buffer | string, 
  fileType: string,
  fileName: string = 'document'
): Promise<string> {
  switch (fileType) {
    case 'application/pdf':
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    case 'application/msword':
      // Buffer形式に統一
      const buffer = fileData instanceof Buffer 
        ? fileData 
        : Buffer.from((fileData as string).split(',')[1], 'base64')
      return extractTextFromFileUpload(buffer, fileName, fileType)
    
    case 'application/json':
      // JSON の場合は文字列形式で処理
      const jsonString = fileData instanceof Buffer 
        ? fileData.toString('utf-8')
        : fileData
      return extractTextFromLinkedInJSON(jsonString as string)
    
    default:
      throw new Error('サポートされていないファイル形式です')
  }
}