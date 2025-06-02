// Mock the supabase server module to avoid import issues
jest.mock('../supabase-server', () => ({
  getServiceSupabase: jest.fn()
}))

import { validateFile } from '../file-utils'

describe('CV Upload Validation', () => {
  describe('validateFile', () => {
    test('10MB以上のファイルを拒否する', () => {
      const largeFile = new File(
        ['x'.repeat(11 * 1024 * 1024)], 
        'large.pdf', 
        { type: 'application/pdf' }
      )
      
      const result = validateFile(largeFile)
      
      expect(result.valid).toBe(false)
      expect(result.error).toBe('ファイルサイズは5MB以下にしてください。')
    })

    test('5MBのファイルを受け入れる', () => {
      const normalFile = new File(
        ['x'.repeat(5 * 1024 * 1024)], 
        'normal.pdf', 
        { type: 'application/pdf' }
      )
      
      const result = validateFile(normalFile)
      
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    test('サポートされていないファイル形式を拒否する', () => {
      const invalidFile = new File(
        ['test content'], 
        'test.txt', 
        { type: 'text/plain' }
      )
      
      const result = validateFile(invalidFile)
      
      expect(result.valid).toBe(false)
      expect(result.error).toBe('サポートされていないファイル形式です。PDF、DOCX、またはLinkedIn JSONをアップロードしてください。')
    })

    test('PDFファイルを受け入れる', () => {
      const pdfFile = new File(
        ['PDF content'], 
        'resume.pdf', 
        { type: 'application/pdf' }
      )
      
      const result = validateFile(pdfFile)
      
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    test('DOCXファイルを受け入れる', () => {
      const docxFile = new File(
        ['DOCX content'], 
        'resume.docx', 
        { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
      )
      
      const result = validateFile(docxFile)
      
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    test('DOCファイルを受け入れる', () => {
      const docFile = new File(
        ['DOC content'], 
        'resume.doc', 
        { type: 'application/msword' }
      )
      
      const result = validateFile(docFile)
      
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    test('LinkedIn JSONファイルを受け入れる', () => {
      const jsonFile = new File(
        ['{"name": "Test User"}'], 
        'linkedin.json', 
        { type: 'application/json' }
      )
      
      const result = validateFile(jsonFile)
      
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    test('空のファイルを受け入れる', () => {
      const emptyFile = new File(
        [], 
        'empty.pdf', 
        { type: 'application/pdf' }
      )
      
      const result = validateFile(emptyFile)
      
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    test('ファイル名に特殊文字が含まれていても正しく処理する', () => {
      const specialNameFile = new File(
        ['content'], 
        '履歴書_2024年版@#$%.pdf', 
        { type: 'application/pdf' }
      )
      
      const result = validateFile(specialNameFile)
      
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })
  })
})