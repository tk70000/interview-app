import { getServiceSupabase } from '@/lib/supabase-server'
import { getOpenAIClient } from '@/lib/openai'

// マッチング結果の型定義
export interface JobMatch {
  job_id: string
  company_name: string
  job_title: string
  department?: string
  similarity: number
  match_reasons: {
    profile_match?: number
    chat_match?: number
    skill_match?: string[]
    location_match?: boolean
    salary_match?: boolean
  }
  ranking: number
}

export interface MatchingResult {
  matches: JobMatch[]
  total_found: number
  session_id: string
  candidate_id: string
}

// 求人マッチングを実行
export async function matchJobsForSession(
  sessionId: string,
  matchCount: number = 5,
  minSimilarity: number = 0.0
): Promise<MatchingResult> {
  const supabase = getServiceSupabase()
  
  // セッション情報を取得
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single()
    
  if (sessionError || !session) {
    throw new Error('セッションが見つかりません')
  }
  
  // 候補者情報を別途取得
  let candidate = null
  if (session.candidate_id) {
    const { data: candidateData, error: candidateError } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', session.candidate_id)
      .single()
      
    if (!candidateError && candidateData) {
      candidate = candidateData
    }
  }
  
  const sessionWithCandidate = {
    ...session,
    candidates: candidate
  }
  
  if (!sessionWithCandidate.chat_embedding && !sessionWithCandidate.candidates?.profile_embedding) {
    throw new Error('マッチングに必要なベクトルデータがありません')
  }
  
  // PostgreSQL関数を使用してマッチング実行
  const { data: matchResults, error: matchError } = await supabase
    .rpc('match_jobs_for_candidate', {
      p_candidate_id: sessionWithCandidate.candidate_id,
      p_session_id: sessionId,
      match_count: matchCount
    })
    
  if (matchError) {
    console.error('求人マッチングエラー詳細:', {
      error: matchError,
      errorCode: matchError.code,
      errorMessage: matchError.message,
      errorDetails: matchError.details,
      errorHint: matchError.hint,
      sessionId,
      candidateId: sessionWithCandidate.candidate_id,
      hasProfileEmbedding: sessionWithCandidate.candidates?.profile_embedding != null,
      hasChatEmbedding: sessionWithCandidate.chat_embedding != null
    })
    throw new Error(`求人マッチングに失敗しました: ${matchError.message}`)
  }
  
  // 追加のフィルタリングとスコアリング（上位件数でフィルタ）
  const enhancedMatches = await enhanceMatchResults(
    matchResults,
    sessionWithCandidate,
    matchCount
  )
  
  // マッチング結果をデータベースに保存
  await saveMatchResults(sessionId, sessionWithCandidate.candidate_id, enhancedMatches)
  
  return {
    matches: enhancedMatches,
    total_found: enhancedMatches.length,
    session_id: sessionId,
    candidate_id: sessionWithCandidate.candidate_id
  }
}

// マッチング結果を詳細化
async function enhanceMatchResults(
  rawMatches: any[],
  session: any,
  topCount: number
): Promise<JobMatch[]> {
  const supabase = getServiceSupabase()
  
  // 類似度で降順ソートして上位N件を取得
  const sortedMatches = rawMatches
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topCount)
  
  const filteredMatches = sortedMatches
  
  // 求人の詳細情報を取得
  const jobIds = filteredMatches.map(m => m.job_id)
  const { data: jobs } = await supabase
    .from('jobs')
    .select('*')
    .in('id', jobIds)
    
  const jobMap = new Map(jobs?.map(j => [j.id, j]) || [])
  
  // 各マッチングに詳細情報を追加
  const enhancedMatches = filteredMatches.map((match, index) => {
    const job = jobMap.get(match.job_id)
    if (!job) return null
    
    // スキルマッチング
    const candidateSkills = session.candidates?.skills_extracted || []
    const requiredSkills = session.extracted_requirements?.skills || []
    const jobSkills = job.skills || []
    const allCandidateSkills = Array.from(new Set([...candidateSkills, ...requiredSkills]))
    
    const matchedSkills = jobSkills.filter((skill: string) => 
      allCandidateSkills.some(cs => 
        cs.toLowerCase().includes(skill.toLowerCase()) ||
        skill.toLowerCase().includes(cs.toLowerCase())
      )
    )
    
    // 勤務地マッチング
    const desiredLocation = session.extracted_requirements?.location
    const locationMatch = !desiredLocation || 
      job.location?.includes(desiredLocation) ||
      job.location?.includes('リモート') ||
      job.location?.includes('フルリモート')
    
    // 給与マッチング
    const salaryExpectation = session.extracted_requirements?.salaryExpectation
    let salaryMatch = true
    if (salaryExpectation && job.salary_range) {
      const expectedMin = parseInt(salaryExpectation.replace(/[^0-9]/g, '')) * 10000
      salaryMatch = !job.salary_range.min || job.salary_range.min >= expectedMin * 0.8
    }
    
    return {
      job_id: match.job_id,
      company_name: job.company_name,
      job_title: job.job_title,
      department: job.department,
      similarity: match.similarity,
      match_reasons: {
        profile_match: match.match_reasons?.profile_match,
        chat_match: match.match_reasons?.chat_match,
        skill_match: matchedSkills,
        location_match: locationMatch,
        salary_match: salaryMatch
      },
      ranking: index + 1
    }
  }).filter(Boolean) as JobMatch[]
  
  return enhancedMatches
}

// マッチング結果をデータベースに保存
async function saveMatchResults(
  sessionId: string,
  candidateId: string,
  matches: JobMatch[]
): Promise<void> {
  const supabase = getServiceSupabase()
  
  // 既存のマッチング結果を削除
  await supabase
    .from('job_matches')
    .delete()
    .eq('session_id', sessionId)
  
  // 新しいマッチング結果を保存
  const matchRecords = matches.map(match => ({
    session_id: sessionId,
    candidate_id: candidateId,
    job_id: match.job_id,
    similarity_score: match.similarity,
    match_reason: generateMatchReason(match),
    ranking: match.ranking
  }))
  
  if (matchRecords.length > 0) {
    const { error } = await supabase
      .from('job_matches')
      .insert(matchRecords)
      
    if (error) {
      console.error('マッチング結果保存エラー:', error)
      throw new Error('マッチング結果の保存に失敗しました')
    }
  }
}

// マッチング理由を生成
function generateMatchReason(match: JobMatch): string {
  const reasons = []
  
  if (match.similarity >= 0.8) {
    reasons.push('非常に高い適合度')
  } else if (match.similarity >= 0.7) {
    reasons.push('高い適合度')
  }
  
  if (match.match_reasons.skill_match && match.match_reasons.skill_match.length > 0) {
    reasons.push(`スキルマッチ: ${match.match_reasons.skill_match.join(', ')}`)
  }
  
  if (match.match_reasons.location_match) {
    reasons.push('勤務地が希望に合致')
  }
  
  if (match.match_reasons.salary_match) {
    reasons.push('給与条件が希望に合致')
  }
  
  if (match.match_reasons.profile_match && match.match_reasons.profile_match > 0.7) {
    reasons.push('職歴との高い関連性')
  }
  
  if (match.match_reasons.chat_match && match.match_reasons.chat_match > 0.7) {
    reasons.push('相談内容との高い関連性')
  }
  
  return reasons.join(' / ')
}

// マッチング理由の詳細説明を生成（OpenAI使用）
export async function generateDetailedMatchExplanation(
  job: any,
  candidate: any,
  session: any
): Promise<string> {
  const openai = getOpenAIClient()
  
  const prompt = `以下の求人と候補者のマッチング理由を、候補者にわかりやすく説明してください。

求人情報:
- 企業: ${job.company_name}
- 職種: ${job.job_title}
- 職務内容: ${job.job_description}
- 必要スキル: ${job.skills?.join(', ') || 'なし'}
- 勤務地: ${job.location || '不明'}
- 年収: ${job.salary_range ? `${job.salary_range.min}万円〜${job.salary_range.max}万円` : '要相談'}

候補者情報:
- 職歴要約: ${candidate.profile_summary || candidate.cv_summary || 'なし'}
- 保有スキル: ${candidate.skills_extracted?.join(', ') || 'なし'}
- 希望条件: ${JSON.stringify(session.extracted_requirements || {})}

なぜこの求人が候補者にマッチするのか、3-4文で具体的に説明してください。`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'あなたは転職マッチングの専門家です。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 300
    })
    
    return response.choices[0].message.content || ''
  } catch (error) {
    console.error('マッチング説明生成エラー:', error)
    return 'この求人はあなたの経験とスキルに適合しています。'
  }
}