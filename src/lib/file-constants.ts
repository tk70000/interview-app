// サポートされるファイルタイプ
export const SUPPORTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc'],
  'application/json': ['.json'], // LinkedIn JSON
}

// ファイルサイズ制限
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// クライアントサイドでのファイル検証
export function validateFileClient(file: File): { valid: boolean; error?: string } {
  // ファイルタイプチェック
  if (!Object.keys(SUPPORTED_FILE_TYPES).includes(file.type)) {
    const supportedFormats = Object.values(SUPPORTED_FILE_TYPES).flat().join(', ')
    return { 
      valid: false, 
      error: `サポートされていないファイル形式です。対応形式: ${supportedFormats}` 
    }
  }
  
  // ファイルサイズチェック
  if (file.size > MAX_FILE_SIZE) {
    return { 
      valid: false, 
      error: `ファイルサイズが大きすぎます。最大サイズ: ${MAX_FILE_SIZE / 1024 / 1024}MB` 
    }
  }
  
  return { valid: true }
}