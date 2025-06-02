import { 
  candidateSchema, 
  messageSchema, 
  sessionIdSchema, 
  fileSchema,
  sanitizeApiResponse,
  escapeHtml 
} from '../validators'

describe('Validators', () => {
  describe('candidateSchema', () => {
    test('有効な候補者情報を受け入れる', () => {
      const validCandidate = {
        name: '山田太郎',
        email: 'yamada@example.com'
      }
      
      const result = candidateSchema.safeParse(validCandidate)
      expect(result.success).toBe(true)
    })

    test('英語名を受け入れる', () => {
      const validCandidate = {
        name: 'John Smith',
        email: 'john@example.com'
      }
      
      const result = candidateSchema.safeParse(validCandidate)
      expect(result.success).toBe(true)
    })

    test('空の名前を拒否する', () => {
      const invalidCandidate = {
        name: '',
        email: 'test@example.com'
      }
      
      const result = candidateSchema.safeParse(invalidCandidate)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('名前は必須です')
    })

    test('無効なメールアドレスを拒否する', () => {
      const invalidCandidate = {
        name: '山田太郎',
        email: 'invalid-email'
      }
      
      const result = candidateSchema.safeParse(invalidCandidate)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('有効なメールアドレスを入力してください')
    })

    test('特殊文字を含む名前を拒否する', () => {
      const invalidCandidate = {
        name: '山田@太郎#',
        email: 'yamada@example.com'
      }
      
      const result = candidateSchema.safeParse(invalidCandidate)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('使用できない文字が含まれています')
    })

    test('メールアドレスを小文字に変換する', () => {
      const candidateWithUpperEmail = {
        name: '山田太郎',
        email: 'YAMADA@EXAMPLE.COM'
      }
      
      const result = candidateSchema.parse(candidateWithUpperEmail)
      expect(result.email).toBe('yamada@example.com')
    })
  })

  describe('messageSchema', () => {
    test('有効なメッセージを受け入れる', () => {
      const validMessage = {
        content: 'これはテストメッセージです。'
      }
      
      const result = messageSchema.safeParse(validMessage)
      expect(result.success).toBe(true)
    })

    test('空のメッセージを拒否する', () => {
      const invalidMessage = {
        content: ''
      }
      
      const result = messageSchema.safeParse(invalidMessage)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('メッセージを入力してください')
    })

    test('10000文字を超えるメッセージを拒否する', () => {
      const invalidMessage = {
        content: 'x'.repeat(10001)
      }
      
      const result = messageSchema.safeParse(invalidMessage)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('メッセージは10000文字以内で入力してください')
    })

    test('前後の空白を削除する', () => {
      const messageWithSpaces = {
        content: '  テストメッセージ  '
      }
      
      const result = messageSchema.parse(messageWithSpaces)
      expect(result.content).toBe('テストメッセージ')
    })
  })

  describe('sessionIdSchema', () => {
    test('有効なUUIDを受け入れる', () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000'
      
      const result = sessionIdSchema.safeParse(validUuid)
      expect(result.success).toBe(true)
    })

    test('無効なUUIDを拒否する', () => {
      const invalidUuid = 'not-a-uuid'
      
      const result = sessionIdSchema.safeParse(invalidUuid)
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('無効なセッションIDです')
    })
  })

  describe('fileSchema', () => {
    test('有効なPDFファイルを受け入れる', () => {
      const validFile = {
        name: 'resume.pdf',
        type: 'application/pdf',
        size: 1024 * 1024 // 1MB
      }
      
      const result = fileSchema.safeParse(validFile)
      expect(result.success).toBe(true)
    })

    test('サポートされていないファイルタイプを拒否する', () => {
      const invalidFile = {
        name: 'image.jpg',
        type: 'image/jpeg',
        size: 1024
      }
      
      const result = fileSchema.safeParse(invalidFile)
      expect(result.success).toBe(false)
    })

    test('5MBを超えるファイルを拒否する', () => {
      const largeFile = {
        name: 'large.pdf',
        type: 'application/pdf',
        size: 6 * 1024 * 1024 // 6MB
      }
      
      const result = fileSchema.safeParse(largeFile)
      expect(result.success).toBe(false)
    })
  })

  describe('sanitizeApiResponse', () => {
    test('センシティブな情報を除去する', () => {
      const dataWithSensitive = {
        name: 'Test User',
        password: 'secret123',
        api_key: 'sk-1234567890',
        access_token: 'Bearer xyz',
        secret_key: 'very-secret'
      }
      
      const sanitized = sanitizeApiResponse(dataWithSensitive)
      
      expect(sanitized.name).toBe('Test User')
      expect(sanitized.password).toBe('[REDACTED]')
      expect(sanitized.api_key).toBe('[REDACTED]')
      expect(sanitized.access_token).toBe('[REDACTED]')
      expect(sanitized.secret_key).toBe('[REDACTED]')
    })

    test('ネストされたオブジェクトのセンシティブ情報も除去する', () => {
      const nestedData = {
        user: {
          name: 'Test User',
          auth: {
            password: 'secret123',
            token: 'abc123'
          }
        }
      }
      
      const sanitized = sanitizeApiResponse(nestedData)
      
      expect(sanitized.user.name).toBe('Test User')
      expect(sanitized.user.auth.password).toBe('[REDACTED]')
      expect(sanitized.user.auth.token).toBe('[REDACTED]')
    })
  })

  describe('escapeHtml', () => {
    test('HTMLタグをエスケープする', () => {
      const html = '<script>alert("XSS")</script>'
      const escaped = escapeHtml(html)
      
      expect(escaped).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;')
    })

    test('特殊文字をエスケープする', () => {
      const text = 'Test & "quoted" \'text\' < >'
      const escaped = escapeHtml(text)
      
      expect(escaped).toBe('Test &amp; &quot;quoted&quot; &#039;text&#039; &lt; &gt;')
    })

    test('通常のテキストは変更しない', () => {
      const text = 'This is normal text without special characters'
      const escaped = escapeHtml(text)
      
      expect(escaped).toBe(text)
    })
  })
})