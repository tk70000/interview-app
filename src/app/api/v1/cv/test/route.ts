import { NextRequest, NextResponse } from 'next/server'
import { validateFile } from '@/lib/file-utils'
import { extractTextFromFile } from '@/lib/server-utils'

export async function POST(request: NextRequest) {
  console.log('CV テキスト抽出テスト API called')
  
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが指定されていません' },
        { status: 400 }
      )
    }

    // ファイル検証
    const validation = validateFile(file)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    console.log('テストファイル情報:', {
      name: file.name,
      type: file.type,
      size: file.size
    })

    // ファイルをBase64データURLに変換（一時的なテスト用）
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const dataUrl = `data:${file.type};base64,${base64}`

    // テキスト抽出をテスト
    const extractedText = await extractTextFromFile(dataUrl, file.type)

    return NextResponse.json({
      success: true,
      fileInfo: {
        name: file.name,
        type: file.type,
        size: file.size
      },
      extractedText: extractedText,
      textLength: extractedText.length
    })

  } catch (error: any) {
    console.error('テキスト抽出テストエラー:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'テキスト抽出に失敗しました'
      },
      { status: 500 }
    )
  }
}