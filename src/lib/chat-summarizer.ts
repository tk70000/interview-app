import { getOpenAIClient, generateEmbedding } from '@/lib/openai'
import { getServiceSupabase } from '@/lib/supabase-server'

// チャットメッセージの型
interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

// チャット要約の結果型
export interface ChatSummaryResult {
  summary: string
  extractedRequirements: {
    desiredRole?: string
    desiredIndustry?: string
    skills?: string[]
    experience?: string
    location?: string
    salaryExpectation?: string
    workStyle?: string
    careerGoals?: string
    concerns?: string[]
  }
  embedding: number[]
}

// チャットセッションを要約
export async function generateChatSummary(
  messages: ChatMessage[],
  cvSummary?: string
): Promise<ChatSummaryResult> {
  const openai = getOpenAIClient()
  
  // 会話履歴を整形
  const conversationText = messages
    .filter(msg => msg.role !== 'system')
    .map(msg => `${msg.role === 'user' ? '候補者' : 'アドバイザー'}: ${msg.content}`)
    .join('\n\n')
  
  // 要約とキー情報抽出のプロンプト
  const systemPrompt = `あなたはキャリア相談の内容を分析する専門家です。
以下の会話から、候補者の転職に関する重要な情報を抽出してください。

返却するJSON形式:
{
  "summary": "会話全体の要約（200-300文字）",
  "extractedRequirements": {
    "desiredRole": "希望職種",
    "desiredIndustry": "希望業界",
    "skills": ["スキル1", "スキル2"],
    "experience": "経験年数や具体的な経験",
    "location": "希望勤務地",
    "salaryExpectation": "希望年収",
    "workStyle": "働き方の希望（リモート、フレックス等）",
    "careerGoals": "キャリア目標",
    "concerns": ["懸念事項1", "懸念事項2"]
  }
}

注意事項：
- 会話から読み取れない項目はnullまたは空配列にする
- 候補者の発言を重視して情報を抽出する
- 具体的かつ簡潔に記載する`

  try {
    // OpenAIで要約と情報抽出
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `${cvSummary ? `CV要約:\n${cvSummary}\n\n` : ''}会話履歴:\n${conversationText}` }
      ],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: "json_object" }
    })

    const result = JSON.parse(response.choices[0].message.content || '{}')
    
    // 要約テキストのベクトル化
    const embeddingText = generateEmbeddingTextForChat(result, cvSummary)
    const embedding = await generateEmbedding(embeddingText)
    
    return {
      summary: result.summary || '',
      extractedRequirements: result.extractedRequirements || {},
      embedding
    }
  } catch (error) {
    console.error('チャット要約生成エラー:', error)
    throw new Error('チャット要約の生成に失敗しました')
  }
}

// チャット情報をベクトル化用テキストに変換
function generateEmbeddingTextForChat(
  summaryResult: any,
  cvSummary?: string
): string {
  const parts = []
  
  // CV要約があれば追加
  if (cvSummary) {
    parts.push(`職務経歴: ${cvSummary}`)
  }
  
  // チャット要約
  parts.push(`相談内容: ${summaryResult.summary}`)
  
  // 抽出された要件
  const req = summaryResult.extractedRequirements
  if (req.desiredRole) parts.push(`希望職種: ${req.desiredRole}`)
  if (req.desiredIndustry) parts.push(`希望業界: ${req.desiredIndustry}`)
  if (req.skills?.length > 0) parts.push(`スキル: ${req.skills.join(', ')}`)
  if (req.experience) parts.push(`経験: ${req.experience}`)
  if (req.location) parts.push(`希望勤務地: ${req.location}`)
  if (req.salaryExpectation) parts.push(`希望年収: ${req.salaryExpectation}`)
  if (req.workStyle) parts.push(`働き方: ${req.workStyle}`)
  if (req.careerGoals) parts.push(`キャリア目標: ${req.careerGoals}`)
  if (req.concerns?.length > 0) parts.push(`懸念事項: ${req.concerns.join(', ')}`)
  
  return parts.join('\n')
}

// セッションの要約をデータベースに保存
export async function saveChatSummaryToSession(
  sessionId: string,
  summaryResult: ChatSummaryResult
): Promise<void> {
  const supabase = getServiceSupabase()
  
  console.log('セッション要約保存開始:', {
    sessionId,
    summaryLength: summaryResult.summary?.length,
    embeddingLength: summaryResult.embedding?.length,
    requirements: summaryResult.extractedRequirements
  })

  const { error } = await supabase
    .from('sessions')
    .update({
      chat_summary: summaryResult.summary,
      chat_embedding: summaryResult.embedding,
      extracted_requirements: summaryResult.extractedRequirements,
      updated_at: new Date().toISOString()
    })
    .eq('id', sessionId)
    
  if (error) {
    console.error('セッション要約保存エラー詳細:', {
      error,
      errorCode: error.code,
      errorMessage: error.message,
      errorDetails: error.details,
      errorHint: error.hint,
      sessionId
    })
    
    // カラムが存在しない場合のフォールバック
    if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist')) {
      console.warn('新しいカラムが存在しません。基本情報のみ更新します。')
      
      // 既存のカラムのみで更新を試行
      const { error: fallbackError } = await supabase
        .from('sessions')
        .update({
          status: 'summarized',
          ended_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        
      if (fallbackError) {
        throw new Error(`セッション基本情報の更新に失敗しました: ${fallbackError.message}`)
      }
      
      console.log('フォールバック更新成功（要約データは保存されませんでした）')
      return
    }
    
    throw new Error(`セッション要約の保存に失敗しました: ${error.message}`)
  }
  
  console.log('セッション要約保存成功')
}

// 候補者のプロファイルにも統合ベクトルを保存
export async function updateCandidateProfile(
  candidateId: string,
  cvSummary: string,
  chatSummaryResult: ChatSummaryResult
): Promise<void> {
  const supabase = getServiceSupabase()
  
  // CV要約とチャット要約を組み合わせた統合プロファイル
  const combinedProfile = `${cvSummary}\n\n最新の相談内容:\n${chatSummaryResult.summary}`
  
  // 統合プロファイルのベクトル化
  const profileEmbedding = await generateEmbedding(combinedProfile)
  
  // スキルの抽出（既存スキル + チャットから抽出したスキル）
  const { data: candidate } = await supabase
    .from('candidates')
    .select('skills_extracted')
    .eq('id', candidateId)
    .single()
    
  const existingSkills = candidate?.skills_extracted || []
  const newSkills = chatSummaryResult.extractedRequirements.skills || []
  const allSkills = Array.from(new Set([...existingSkills, ...newSkills]))
  
  // 候補者プロファイルを更新
  console.log('候補者プロファイル更新開始:', {
    candidateId,
    profileLength: combinedProfile?.length,
    embeddingLength: profileEmbedding?.length,
    skillsCount: allSkills?.length
  })

  const { error } = await supabase
    .from('candidates')
    .update({
      profile_summary: combinedProfile,
      profile_embedding: profileEmbedding,
      skills_extracted: allSkills,
      preferences: chatSummaryResult.extractedRequirements,
      updated_at: new Date().toISOString()
    })
    .eq('id', candidateId)
    
  if (error) {
    console.error('候補者プロファイル更新エラー詳細:', {
      error,
      errorCode: error.code,
      errorMessage: error.message,
      errorDetails: error.details,
      errorHint: error.hint,
      candidateId
    })
    
    // カラムが存在しない場合のフォールバック
    if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist')) {
      console.warn('新しいカラムが存在しません。基本情報のみ更新します。')
      
      // 既存のカラムのみで更新を試行（candidatesテーブルにはupdated_atが存在）
      const { error: fallbackError } = await supabase
        .from('candidates')
        .update({
          updated_at: new Date().toISOString()
        })
        .eq('id', candidateId)
        
      if (fallbackError) {
        throw new Error(`候補者基本情報の更新に失敗しました: ${fallbackError.message}`)
      }
      
      console.log('候補者フォールバック更新成功（プロファイルデータは保存されませんでした）')
      return
    }
    
    throw new Error(`候補者プロファイルの更新に失敗しました: ${error.message}`)
  }
  
  console.log('候補者プロファイル更新成功')
}