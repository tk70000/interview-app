'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CVUpload } from '@/components/cv-upload'
import { Spinner } from '@/components/ui/spinner'
import { getErrorMessage } from '@/lib/utils'

export default function UploadPage() {
  const router = useRouter()
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')

  useEffect(() => {
    // ユーザー情報を取得
    const email = localStorage.getItem('userEmail')
    if (!email) {
      // ログインしていない場合はサインインページへ
      router.push('/auth/signin')
      return
    }
    
    setUserEmail(email)
    // メールアドレスから名前を推測（@マーク前の部分）
    const nameFromEmail = email.split('@')[0]
      .replace(/[._-]/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase())
    setUserName(nameFromEmail)
  }, [router])

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedFile) {
      setError('ファイルを選択してください')
      return
    }

    if (!userEmail) {
      setError('ログインが必要です')
      router.push('/auth/signin')
      return
    }

    setIsUploading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('name', userName)
      formData.append('email', userEmail)

      const response = await fetch('/api/v1/cv', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'アップロードに失敗しました')
      }

      // セッション情報をローカルストレージに保存
      if (data.sessionId) {
        localStorage.setItem('currentSessionId', data.sessionId)
        localStorage.setItem('candidateName', userName)
        localStorage.setItem('candidateEmail', userEmail)
        
        // 初回質問も保存
        if (data.initial_questions) {
          localStorage.setItem('initialQuestions', JSON.stringify(data.initial_questions))
        }
      }

      // チャットページへ遷移
      router.push('/chat')
    } catch (error) {
      setError(getErrorMessage(error))
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => router.push('/')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          戻る
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>CVアップロード</CardTitle>
            <CardDescription>
              履歴書・職務経歴書をアップロードして、キャリア相談を開始しましょう
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* ログイン中のユーザー情報を表示 */}
              {userEmail && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">ログイン中のアカウント</p>
                  <p className="font-medium">{userEmail}</p>
                </div>
              )}

              <div>
                <Label>CV（履歴書・職務経歴書）*</Label>
                <CVUpload
                  onFileSelect={handleFileSelect}
                  isUploading={isUploading}
                  className="mt-2"
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={!selectedFile || isUploading}
              >
                {isUploading ? (
                  <>
                    <Spinner className="mr-2" size="sm" />
                    アップロード中...
                  </>
                ) : (
                  'アップロードして開始'
                )}
              </Button>
            </form>

            <div className="mt-8 p-4 bg-muted rounded-lg">
              <h3 className="font-medium mb-2">ご利用にあたって</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• アップロードされたファイルは安全に暗号化されます</li>
                <li>• 個人情報は採用目的以外には使用されません</li>
                <li>• いつでもデータの削除をリクエストできます</li>
                <li>• セッションは30分でタイムアウトします</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
