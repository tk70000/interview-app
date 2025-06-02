import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-server'

interface InterviewAvailabilityRequest {
  sessionId: string
  candidateName: string
  candidateEmail: string
  availableDates: Array<{
    date: string
    timePreference: 'morning' | 'afternoon' | 'full-day'
  }>
  additionalNotes?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: InterviewAvailabilityRequest = await request.json()
    const { sessionId, candidateName, candidateEmail, availableDates, additionalNotes } = body

    if (!sessionId || !candidateName || !candidateEmail || !availableDates || availableDates.length === 0) {
      return NextResponse.json(
        { error: '必須項目が入力されていません' },
        { status: 400 }
      )
    }

    const supabase = getServiceSupabase()

    // セッション情報から候補者IDを取得
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('candidate_id')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'セッション情報が見つかりません' },
        { status: 404 }
      )
    }

    // 面接可能日情報を保存
    const { error: insertError } = await supabase
      .from('interview_availability')
      .insert({
        candidate_id: session.candidate_id,
        available_dates: availableDates,
        additional_notes: additionalNotes,
      })

    if (insertError) {
      console.error('Error saving interview availability:', insertError)
      return NextResponse.json(
        { error: '面接可能日の保存に失敗しました' },
        { status: 500 }
      )
    }

    // メール送信（仮実装）
    await sendInterviewAvailabilityEmail({
      candidateName,
      candidateEmail,
      availableDates,
      additionalNotes,
      sessionId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in interview availability API:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

// メール送信関数（仮実装）
async function sendInterviewAvailabilityEmail(data: {
  candidateName: string
  candidateEmail: string
  availableDates: Array<{ date: string; timePreference: string }>
  additionalNotes?: string
  sessionId: string
}) {
  // TODO: 実際のメール送信実装
  // 現在は console.log で代替
  console.log('面接可能日メール送信:', {
    to: process.env.CAREER_ADVISOR_EMAIL_LIST || 'advisor@example.com',
    subject: `【面接日程調整】${data.candidateName}様`,
    body: `
面接希望日程が届きました。

■ 求職者情報
氏名: ${data.candidateName}
メール: ${data.candidateEmail}

■ 面接可能日時
${data.availableDates
  .map((d) => {
    const timeText = 
      d.timePreference === 'morning' ? '午前' :
      d.timePreference === 'afternoon' ? '午後' : '終日'
    return `- ${d.date} ${timeText}`
  })
  .join('\n')}

■ 備考
${data.additionalNotes || 'なし'}

■ セッションID
${data.sessionId}
    `,
  })
}