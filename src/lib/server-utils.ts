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

// PDFからテキスト抽出（GPT-4oを使用）
export async function extractTextFromPDF(fileUrl: string): Promise<string> {
  try {
    console.log('PDFテキスト抽出開始（GPT-4o使用）:', fileUrl)
    
    let base64Data: string
    
    if (fileUrl.startsWith('data:')) {
      // Data URLの場合
      base64Data = fileUrl.split(',')[1]
    } else {
      // 通常のURLの場合
      const response = await fetch(fileUrl)
      if (!response.ok) {
        throw new Error(`ファイルの取得に失敗しました: ${response.status}`)
      }
      
      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      base64Data = buffer.toString('base64')
    }
    
    console.log('PDFファイルをGPT-4oで処理中...')
    
    const openai = getOpenAIClient()
    
    // GPT-4oはPDFを画像として処理します
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'あなたはPDFドキュメントからテキストを抽出する専門家です。与えられたPDFから、すべてのテキスト内容を正確に抽出し、元の文書の構造と改行を保持したまま出力してください。画像や図表がある場合は、その内容も説明してください。'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'このPDFファイルからすべてのテキストを抽出してください。職務経歴書の場合は、個人情報、職歴、スキル、資格などすべての情報を含めてください。'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:application/pdf;base64,${base64Data}`,
                detail: 'high'
              }
            }
          ]
        }
      ],
      temperature: 0.1,
      max_tokens: 4000,
    })
    
    const extractedText = response.choices[0]?.message?.content || ''
    
    console.log('抽出されたテキスト文字数:', extractedText.length)
    console.log('抽出されたテキストの最初の200文字:', extractedText.substring(0, 200))
    
    if (!extractedText) {
      throw new Error('PDFからテキストを抽出できませんでした。')
    }
    
    return extractedText
    
  } catch (error) {
    console.error('PDFテキスト抽出エラー:', error)
    // エラーをそのまま投げる（ダミーデータは返さない）
    throw new Error(`PDFからのテキスト抽出に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// DOCXからテキスト抽出（GPT-4oを使用）
export async function extractTextFromDOCX(fileUrl: string): Promise<string> {
  try {
    console.log('DOCXテキスト抽出開始（GPT-4o使用）:', fileUrl)
    
    let base64Data: string
    
    if (fileUrl.startsWith('data:')) {
      // Data URLの場合
      base64Data = fileUrl.split(',')[1]
    } else {
      // 通常のURLの場合
      const response = await fetch(fileUrl)
      if (!response.ok) {
        throw new Error(`ファイルの取得に失敗しました: ${response.status}`)
      }
      
      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      base64Data = buffer.toString('base64')
    }
    
    console.log('DOCXファイルをGPT-4oで処理中...')
    
    const openai = getOpenAIClient()
    
    // GPT-4oはDOCXも処理可能
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'あなたはDOCXドキュメントからテキストを抽出する専門家です。与えられたDOCXファイルから、すべてのテキスト内容を正確に抽出し、元の文書の構造と改行を保持したまま出力してください。表や図表がある場合は、その内容も説明してください。'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'このDOCXファイルからすべてのテキストを抽出してください。職務経歴書の場合は、個人情報、職歴、スキル、資格などすべての情報を含めてください。'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${base64Data}`,
                detail: 'high'
              }
            }
          ]
        }
      ],
      temperature: 0.1,
      max_tokens: 4000,
    })
    
    const extractedText = response.choices[0]?.message?.content || ''
    
    console.log('抽出されたテキスト文字数:', extractedText.length)
    console.log('抽出されたテキストの最初の200文字:', extractedText.substring(0, 200))
    
    if (!extractedText) {
      throw new Error('DOCXからテキストを抽出できませんでした。')
    }
    
    return extractedText
    
  } catch (error) {
    console.error('DOCXテキスト抽出エラー:', error)
    // エラーをそのまま投げる（ダミーデータは返さない）
    throw new Error(`DOCXからのテキスト抽出に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
export async function extractTextFromFile(fileUrl: string, fileType: string): Promise<string> {
  switch (fileType) {
    case 'application/pdf':
      return extractTextFromPDF(fileUrl)
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    case 'application/msword':
      return extractTextFromDOCX(fileUrl)
    case 'application/json':
      return extractTextFromLinkedInJSON(fileUrl)
    default:
      throw new Error('サポートされていないファイル形式です')
  }
}