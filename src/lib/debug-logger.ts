/**
 * 本番環境では表示されないログ関数
 */
export const debugLog = {
  log: (...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(...args)
    }
  },
  
  warn: (...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(...args)
    }
  },
  
  error: (...args: any[]) => {
    // エラーは本番環境でも表示（ただし詳細は非表示）
    if (process.env.NODE_ENV === 'production') {
      console.error('An error occurred')
    } else {
      console.error(...args)
    }
  }
}