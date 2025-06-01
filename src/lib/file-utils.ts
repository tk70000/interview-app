import { getServiceSupabase } from './supabase-server'
import { SUPPORTED_FILE_TYPES, MAX_FILE_SIZE } from './file-constants'

// Re-export constants for backward compatibility
export { SUPPORTED_FILE_TYPES, MAX_FILE_SIZE }

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

// この関数はサーバーサイドでのみ使用されるため、server-utils.tsに移動しました

// テキスト抽出関数はserver-utils.tsに移動しました
