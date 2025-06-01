import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    
    if (!apiKey) {
      return NextResponse.json({
        error: 'APIキーが設定されていません',
        apiKeyExists: false
      })
    }

    const openai = new OpenAI({
      apiKey: apiKey.trim(),
    })

    // 利用可能なモデルをテスト
    const modelsToTest = [
      'gpt-4.1',
      'gpt-4',
      'gpt-4-turbo',
      'gpt-4-turbo-preview',
      'gpt-4-1106-preview',
      'gpt-3.5-turbo',
      'gpt-4o',
      'gpt-4-vision-preview'
    ]

    const results: any = {
      apiKeyExists: true,
      apiKeyPrefix: apiKey.substring(0, 10) + '...',
      testedModels: {}
    }

    // 各モデルをテスト
    for (const model of modelsToTest) {
      try {
        const response = await openai.chat.completions.create({
          model: model,
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 5
        })
        results.testedModels[model] = {
          success: true,
          response: response.choices[0]?.message?.content
        }
      } catch (error: any) {
        results.testedModels[model] = {
          success: false,
          error: error.message,
          status: error.status,
          type: error.type,
          code: error.code
        }
      }
    }

    // 利用可能なモデルのリストを取得
    try {
      const modelsResponse = await openai.models.list()
      results.availableModels = modelsResponse.data
        .map(m => m.id)
        .filter(id => id.includes('gpt'))
        .sort()
    } catch (error: any) {
      results.modelListError = {
        message: error.message,
        status: error.status
      }
    }

    return NextResponse.json(results)
  } catch (error: any) {
    return NextResponse.json({
      error: 'テスト失敗',
      details: {
        message: error.message,
        stack: error.stack
      }
    }, { status: 500 })
  }
}