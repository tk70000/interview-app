import { InterviewAvailability } from "@/types"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@supabase/supabase-js"
import { env } from "@/lib/env"
import nodemailer from "nodemailer"

const interviewAvailabilitySchema = z.object({
  candidateId: z.string(),
  candidateEmail: z.string().email(),
  candidateName: z.string(),
  availableDates: z.array(z.object({
    date: z.string(),
    timePreference: z.enum(["morning", "afternoon", "full-day"])
  })),
  phoneNumber: z.string().optional(),
  additionalNotes: z.string().optional(),
  submittedAt: z.date()
})

// メール送信用のトランスポーター
const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS
  }
})

// 時間帯の表示名を取得
function timePreferenceText(pref: "morning" | "afternoon" | "full-day"): string {
  switch (pref) {
    case "morning": return "午前"
    case "afternoon": return "午後"
    case "full-day": return "終日"
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = interviewAvailabilitySchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: {
          message: "バリデーションエラー",
          details: validation.error.errors
        }
      }, { status: 400 })
    }

    const data = validation.data

    // Supabaseに保存
    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
    
    const { error: dbError } = await supabase
      .from("interview_availability")
      .insert({
        candidate_id: data.candidateId,
        available_dates: data.availableDates,
        phone_number: data.phoneNumber,
        additional_notes: data.additionalNotes
      })

    if (dbError) {
      console.error("Failed to save interview availability:", dbError)
      return NextResponse.json({
        success: false,
        error: {
          message: "データの保存に失敗しました",
          details: dbError
        }
      }, { status: 500 })
    }

    // メーリングリストにメール送信
    const emailText = `件名: 【面接日程調整】${data.candidateName}様 - ${data.submittedAt.toLocaleDateString()}

キャリアアドバイザー各位

以下の求職者から面接希望日程が届きました。

■ 求職者情報
氏名: ${data.candidateName}
メール: ${data.candidateEmail}
電話: ${data.phoneNumber || "未入力"}

■ 面接可能日時
${data.availableDates.map(date => 
  `- ${date.date} ${timePreferenceText(date.timePreference)}`
).join("\n")}

■ 備考
${data.additionalNotes || "なし"}

■ CV要約へのリンク
${env.NEXT_PUBLIC_APP_URL}/cv/${data.candidateId}

よろしくお願いいたします。`

    await transporter.sendMail({
      from: env.SMTP_FROM,
      to: env.CAREER_ADVISOR_EMAIL_LIST.split(","),
      subject: `【面接日程調整】${data.candidateName}様 - ${data.submittedAt.toLocaleDateString()}`,
      text: emailText
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error processing interview availability:", error)
    return NextResponse.json({
      success: false,
      error: {
        message: "サーバーエラー",
        details: error instanceof Error ? error.message : "Unknown error"
      }
    }, { status: 500 })
  }
}