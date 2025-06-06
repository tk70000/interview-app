'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function SignInPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/upload'
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    console.log('🔍 サインイン開始', { email, redirectTo, searchParams: searchParams.toString() })

    try {
      // 開発環境用のテストアカウント
      const testAccounts = [
        { email: 'test@example.com', password: 'Test1234!' },
        { email: 'admin@example.com', password: 'Admin1234!' },
        { email: 'demo@example.com', password: 'Demo1234!' }
      ]

      // テストアカウントかチェック
      const isTestAccount = testAccounts.some(
        account => account.email === email && account.password === password
      )

      // DISABLE_AUTHが有効な場合のみテストアカウントを許可
      const isTestModeEnabled = process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true'
      console.log('🔧 環境変数チェック', { 
        NODE_ENV: process.env.NODE_ENV,
        NEXT_PUBLIC_DISABLE_AUTH: process.env.NEXT_PUBLIC_DISABLE_AUTH,
        isTestModeEnabled 
      })
      
      if (isTestModeEnabled && isTestAccount) {
        // 開発環境でテストアカウントの場合は、認証をスキップ
        console.log('🧪 テストアカウントでサインイン', { redirectTo })
        localStorage.setItem('isAuthenticated', 'true')
        localStorage.setItem('userEmail', email)
        console.log('🚀 リダイレクト先:', redirectTo)
        router.push(redirectTo)
        return
      }

      // 本番環境または通常のアカウントの場合
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      // サインイン成功後、指定されたページまたはアップロードページへリダイレクト
      console.log('✅ Supabase認証成功、リダイレクト先:', redirectTo)
      router.push(redirectTo)
    } catch (error: any) {
      setError(error.message || 'サインインに失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            ホームへ戻る
          </Button>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">サインイン</CardTitle>
            <CardDescription>
              アカウントにログインしてキャリア相談を始めましょう
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignIn}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">メールアドレス</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <Label htmlFor="password">パスワード</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? 'サインイン中...' : 'サインイン'}
                </Button>
              </div>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">
                アカウントをお持ちでない方は
              </span>{' '}
              <Link href="/auth/signup" className="text-primary hover:underline">
                新規登録
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* 開発環境でのテストアカウント情報 */}
        {process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true' && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg">テストアカウント</CardTitle>
              <CardDescription>
                開発環境では以下のアカウントでログインできます
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="p-3 bg-muted rounded-md">
                <p className="font-medium">一般ユーザー</p>
                <p className="text-muted-foreground">Email: test@example.com</p>
                <p className="text-muted-foreground">Password: Test1234!</p>
              </div>
              <div className="p-3 bg-muted rounded-md">
                <p className="font-medium">管理者</p>
                <p className="text-muted-foreground">Email: admin@example.com</p>
                <p className="text-muted-foreground">Password: Admin1234!</p>
              </div>
              <div className="p-3 bg-muted rounded-md">
                <p className="font-medium">デモユーザー</p>
                <p className="text-muted-foreground">Email: demo@example.com</p>
                <p className="text-muted-foreground">Password: Demo1234!</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}