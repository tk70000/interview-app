import { NextRequest, NextResponse } from 'next/server'
import { generateId, getErrorMessage } from '@/lib/utils'
import { uploadFile, validateFile } from '@/lib/file-utils'
import { extractTextFromFile } from '@/lib/server-utils'
import { generateCVSummary, generateInitialQuestions } from '@/lib/openai'
import { getServiceSupabase } from '@/lib/supabase'
import { CVUploadResponse } from '@/types'

export async function POST(request: NextRequest) {
  console.log('CV upload API called')
  
  // Service Supabaseクライアントを取得
  const supabase = getServiceSupabase()
  
  try {
    let formData: FormData
    try {
      formData = await request.formData()
    } catch (formError) {
      console.error('Form data parsing error:', formError)
      return NextResponse.json(
        { error: '無効なフォームデータです' },
        { status: 400 }
      )
    }
    
    const file = formData.get('file') as File
    const candidateName = formData.get('name') as string
    const candidateEmail = formData.get('email') as string

    if (!file || !candidateName || !candidateEmail) {
      return NextResponse.json(
        { error: '必須項目が不足しています' },
        { status: 400 }
      )
    }

    // サーバー側でのファイル検証
    const validation = validateFile(file)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    // 追加のセキュリティチェック
    // ファイルの実際のMIMEタイプを検証（マジックナンバーチェック）
    const buffer = await file.arrayBuffer()
    const bytes = new Uint8Array(buffer).slice(0, 4)
    
    // PDFマジックナンバー: 25 50 44 46 (PDF)
    const isPDF = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46
    
    // DOCXマジックナンバー: 50 4B 03 04 (PKZip形式)
    const isZip = bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04
    
    // JSONはテキストファイルなので、最初の文字をチェック
    const textDecoder = new TextDecoder()
    const firstChar = textDecoder.decode(bytes.slice(0, 1))
    const isJSON = firstChar === '{' || firstChar === '['
    
    if (!isPDF && !isZip && !isJSON) {
      return NextResponse.json(
        { error: '不正なファイル形式です。実際のファイル内容が指定された形式と一致しません。' },
        { status: 400 }
      )
    }

    // トランザクション処理のためのロールバック関数を準備
    let candidateId: string | null = null
    let sessionId: string | null = null
    let cvUrl: string | null = null

    try {
      // 候補者情報を作成
      candidateId = generateId()
      
      // 認証が無効化されている場合のテスト用user_id（UUID形式）
      const testUserId = process.env.DISABLE_AUTH === 'true' ? '00000000-0000-0000-0000-000000000000' : undefined
      
      const candidateData: any = {
        id: candidateId,
        name: candidateName,
        email: candidateEmail,
      }
      
      // user_idカラムが存在する場合は追加（一時的にコメントアウト）
      // if (testUserId) {
      //   candidateData.user_id = testUserId
      // }
      
      console.log('Inserting candidate data:', candidateData)
      
      const { data: insertedCandidate, error: insertError } = await supabase
        .from('candidates')
        .insert(candidateData)
        .select()
        .single()

      console.log('Insert result:', { data: insertedCandidate, error: insertError })

      if (insertError) {
        console.error('Supabase insert error:', insertError)
        throw new Error(`候補者情報の保存に失敗しました: ${insertError.message || insertError.code || JSON.stringify(insertError)}`)
      }

      // ファイルをアップロード
      try {
        cvUrl = await uploadFile(file, candidateId)
      } catch (uploadError) {
        // 候補者情報を削除（ロールバック）
        await supabase.from('candidates').delete().eq('id', candidateId)
        throw uploadError
      }

      // テキスト抽出（アップロードされたファイルから直接）
      console.log('ファイルからテキスト抽出開始...')
      const arrayBuffer = await file.arrayBuffer()
      const base64 = Buffer.from(arrayBuffer).toString('base64')
      const dataUrl = `data:${file.type};base64,${base64}`
      
      let cvText: string
      let isTextExtractionSuccessful = true
      
      try {
        cvText = await extractTextFromFile(dataUrl, file.type)
        console.log('CV text extracted, length:', cvText.length)
      } catch (extractError) {
        console.error('テキスト抽出に失敗しました:', extractError)
        isTextExtractionSuccessful = false
        cvText = 'CVの内容を読み込むことができませんでした。'
      }

      // CV要約を生成
      console.log('Attempting to generate CV summary...')
      console.log('OpenAI API key exists:', !!process.env.OPENAI_API_KEY)
      console.log('OpenAI API key length:', process.env.OPENAI_API_KEY?.length)
      
      let cvSummary: string
      let initialQuestions: string[]
      
      if (isTextExtractionSuccessful) {
        // テキスト抽出が成功した場合、通常通り処理
        try {
          cvSummary = await generateCVSummary(cvText)
          console.log('CV summary generated successfully')
        } catch (openaiError: any) {
          console.error('OpenAI API Error:', {
            message: openaiError.message,
            status: openaiError.status,
            code: openaiError.code,
          })
          throw new Error(`AI処理エラー: ${openaiError.message}`)
        }
        
        // 初回質問を生成
        initialQuestions = await generateInitialQuestions(cvSummary)
      } else {
        // テキスト抽出が失敗した場合、一般的な質問を生成
        console.log('CVが読み込めなかったため、一般的な質問を生成します。')
        cvSummary = 'CVの内容を読み込むことができませんでした。候補者の経歴について直接お聞きします。'
        
        // 一般的なキャリア相談の質問を生成
        initialQuestions = await generateInitialQuestions(
          '候補者の職務経歴書を読み込むことができませんでした。',
          '一般的なキャリア相談'
        )
      }

      // 候補者情報を更新
      const { error: updateError } = await supabase
        .from('candidates')
        .update({
          cv_url: cvUrl,
          cv_summary: cvSummary,
        })
        .eq('id', candidateId)

      if (updateError) {
        // ファイルを削除
        if (cvUrl) {
          const fileName = cvUrl.split('/').pop()
          await supabase.storage.from('cv-uploads').remove([fileName!])
        }
        // 候補者情報を削除
        await supabase.from('candidates').delete().eq('id', candidateId)
        throw new Error(`候補者情報の更新に失敗しました: ${updateError.message}`)
      }

      // セッションを作成
      sessionId = generateId()
      const { error: sessionError } = await supabase
        .from('sessions')
        .insert({
          id: sessionId,
          candidate_id: candidateId,
          status: 'active',
        })

      if (sessionError) {
        // ファイルを削除
        if (cvUrl) {
          const fileName = cvUrl.split('/').pop()
          await supabase.storage.from('cv-uploads').remove([fileName!])
        }
        // 候補者情報を削除
        await supabase.from('candidates').delete().eq('id', candidateId)
        throw new Error(`セッションの作成に失敗しました: ${sessionError.message}`)
      }

      const response = {
        success: true,
        candidateId,
        sessionId,
        cv_url: cvUrl,
        summary: cvSummary,
        initial_questions: initialQuestions,
      }

      console.log('Sending successful response')
      return NextResponse.json(response)
    } catch (error) {
      // エラーが発生した場合のクリーンアップ
      console.error('CV upload transaction error:', error)
      
      // 部分的に作成されたデータをクリーンアップ
      if (sessionId) {
        await supabase.from('sessions').delete().eq('id', sessionId)
      }
      if (candidateId) {
        await supabase.from('candidates').delete().eq('id', candidateId)
      }
      if (cvUrl) {
        const fileName = cvUrl.split('/').pop()
        if (fileName) {
          await supabase.storage.from('cv-uploads').remove([fileName])
        }
      }
      
      throw error
    }

  } catch (error: any) {
    console.error('CV upload error:', error)
    console.error('Error stack:', error.stack)
    
    // 開発環境では詳細なエラー情報を返す
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    return NextResponse.json(
      { 
        success: false,
        error: getErrorMessage(error),
        ...(isDevelopment && {
          details: {
            message: error.message,
            stack: error.stack,
            name: error.name,
          }
        })
      },
      { status: 500 }
    )
  }
}
