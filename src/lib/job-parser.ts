import { getOpenAIClient } from '@/lib/openai'
import { generateEmbedding } from '@/lib/openai'

// 求人情報の構造化データ型
export interface ParsedJobData {
  company_name: string
  job_title: string
  department?: string
  job_description: string
  requirements?: string
  skills?: string[]
  employment_type?: string
  location?: string
  salary_range?: {
    min?: number
    max?: number
    currency?: string
  }
}

// ファイル名から基本情報を抽出
export function parseFileNameInfo(fileName: string): Partial<ParsedJobData> {
  const baseName = fileName.replace(/\.(pdf|docx|txt)$/i, '')
  
  // パターン1: 企業名_職種名
  // パターン2: 企業名_部門名_職種名
  const patterns = [
    /^(.+?)_(.+?)_(.+?)$/,  // 3部構成
    /^(.+?)_(.+?)$/,         // 2部構成
  ]
  
  for (const pattern of patterns) {
    const match = baseName.match(pattern)
    if (match) {
      if (match.length === 4) {
        // 3部構成: 企業名_部門名_職種名
        return {
          company_name: match[1].trim(),
          department: match[2].trim(),
          job_title: match[3].trim()
        }
      } else if (match.length === 3) {
        // 2部構成: 企業名_職種名
        return {
          company_name: match[1].trim(),
          job_title: match[2].trim()
        }
      }
    }
  }
  
  // パターンにマッチしない場合
  return {
    job_title: baseName
  }
}

// OpenAI APIを使用して求人情報を構造化
export async function parseJobContent(
  content: string,
  fileNameInfo: Partial<ParsedJobData>
): Promise<ParsedJobData> {
  const openai = getOpenAIClient()
  
  const systemPrompt = `あなたは求人情報を解析して構造化データに変換する専門家です。
以下の求人情報から、必要な情報を抽出してJSON形式で返してください。

抽出する項目：
- company_name: 企業名（ファイル名から推測された場合はそれを優先）
- job_title: 職種名・ポジション名
- department: 部署名（あれば）
- job_description: 職務内容の詳細説明
- requirements: 必須要件・応募資格
- skills: 求められるスキル（配列形式）
- employment_type: 雇用形態（正社員、契約社員等）
- location: 勤務地
- salary_range: 給与レンジ（min, max, currency）

注意事項：
- 情報が明記されていない項目はnullまたは空配列で返す
- スキルは具体的な技術名やツール名を抽出
- 給与情報は数値で抽出（例：年収500万円→{min: 5000000, max: 5000000, currency: "JPY"}）`

  const userPrompt = `ファイル名情報：
企業名: ${fileNameInfo.company_name || '不明'}
部署: ${fileNameInfo.department || 'なし'}
職種: ${fileNameInfo.job_title || '不明'}

求人内容：
${content.substring(0, 8000)} // 最初の8000文字のみ送信（トークン制限）`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    })

    const parsedData = JSON.parse(response.choices[0].message.content || '{}')
    
    // ファイル名から取得した情報で上書き（より信頼性が高い）
    if (fileNameInfo.company_name) {
      parsedData.company_name = fileNameInfo.company_name
    }
    if (fileNameInfo.job_title && !parsedData.job_title) {
      parsedData.job_title = fileNameInfo.job_title
    }
    if (fileNameInfo.department) {
      parsedData.department = fileNameInfo.department
    }
    
    return parsedData as ParsedJobData
  } catch (error) {
    console.error('求人情報の解析エラー:', error)
    // エラー時は最小限の情報を返す
    return {
      company_name: fileNameInfo.company_name || '不明',
      job_title: fileNameInfo.job_title || '不明',
      department: fileNameInfo.department,
      job_description: content.substring(0, 500),
      requirements: ''
    }
  }
}

// 求人情報のベクトル化用テキスト生成
export function generateJobEmbeddingText(job: ParsedJobData): string {
  const parts = [
    `企業: ${job.company_name}`,
    `職種: ${job.job_title}`,
    job.department ? `部署: ${job.department}` : '',
    `職務内容: ${job.job_description}`,
    job.requirements ? `要件: ${job.requirements}` : '',
    job.skills && job.skills.length > 0 ? `スキル: ${job.skills.join(', ')}` : '',
    job.location ? `勤務地: ${job.location}` : '',
    job.employment_type ? `雇用形態: ${job.employment_type}` : ''
  ].filter(Boolean)
  
  return parts.join('\n')
}

// 求人情報のベクトル化
export async function generateJobEmbedding(job: ParsedJobData): Promise<number[]> {
  const embeddingText = generateJobEmbeddingText(job)
  return await generateEmbedding(embeddingText)
}