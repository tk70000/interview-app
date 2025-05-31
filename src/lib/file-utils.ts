import { getServiceSupabase } from './supabase'

// サポートされるファイルタイプ
export const SUPPORTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc'],
  'application/json': ['.json'], // LinkedIn JSON
}

export const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

// ファイルバリデーション
export function validateFile(file: File): { valid: boolean; error?: string } {
  // ファイルタイプチェック
  const supportedTypes = Object.keys(SUPPORTED_FILE_TYPES)
  if (!supportedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'サポートされていないファイル形式です。PDF、DOCX、またはLinkedIn JSONをアップロードしてください。'
    }
  }

  // ファイルサイズチェック
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: 'ファイルサイズは5MB以下にしてください。'
    }
  }

  return { valid: true }
}

// ファイル名のサニタイゼーション
function sanitizeFilename(filename: string): string {
  // 拡張子を取得
  const lastDotIndex = filename.lastIndexOf('.');
  const ext = lastDotIndex > 0 ? filename.substring(lastDotIndex) : '';
  const name = lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
  
  // 危険な文字を削除
  const sanitizedName = name
    .replace(/[^a-zA-Z0-9-_]/g, '_')  // 英数字、ハイフン、アンダースコア以外を置換
    .substring(0, 50);                 // 名前部分は50文字まで
  
  return sanitizedName + ext;
}

// ファイルアップロード
export async function uploadFile(file: File, candidateId: string): Promise<string> {
  const supabase = getServiceSupabase()
  
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'unknown'
  const sanitizedExt = fileExt.replace(/[^a-z0-9]/g, '')
  const fileName = `${candidateId}/cv_${Date.now()}.${sanitizedExt}`
  
  const { data, error } = await supabase.storage
    .from('cv-uploads')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) {
    throw new Error(`ファイルアップロードエラー: ${error.message}`)
  }

  // 公開URLを取得
  const { data: { publicUrl } } = supabase.storage
    .from('cv-uploads')
    .getPublicUrl(fileName)

  return publicUrl
}

// PDFからテキスト抽出（実際の実装ではAWS Textractを使用）
export async function extractTextFromPDF(fileUrl: string): Promise<string> {
  // 注意: これはモックの実装です
  // 実際の実装では、AWS Textract APIを呼び出します
  
  // モック実装として、簡単なテキストを返す
  return `
    山田太郎
    データサイエンティスト
    
    【職歴】
    2020年4月〜現在: 株式会社ABC データ分析部門
    - 機械学習モデルの開発と運用
    - ビッグデータ分析基盤の構築
    - A/Bテストの設計と分析
    
    【スキル】
    - Python, R, SQL
    - TensorFlow, PyTorch, scikit-learn
    - AWS, GCP
    - 統計学、機械学習、深層学習
    
    【学歴】
    2018年3月: XYZ大学 情報工学部 卒業
  `
}

// DOCXからテキスト抽出
export async function extractTextFromDOCX(fileUrl: string): Promise<string> {
  // 注意: これはモックの実装です
  // 実際の実装では、mammothなどのライブラリを使用
  
  return extractTextFromPDF(fileUrl) // モックとして同じテキストを返す
}

// LinkedIn JSONからテキスト抽出
export async function extractTextFromLinkedInJSON(fileUrl: string): Promise<string> {
  // 注意: これはモックの実装です
  // 実際の実装では、JSONをパースして構造化データを抽出
  
  return extractTextFromPDF(fileUrl) // モックとして同じテキストを返す
}

// ファイルタイプに応じたテキスト抽出
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
