'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, Github } from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const errorDetails = searchParams.get('details')
  const githubConnected = searchParams.get('github') === 'connected'

  useEffect(() => {
    // ログインチェック（簡易版）
    const isAuthenticated = localStorage.getItem('isAuthenticated')
    if (!isAuthenticated) {
      router.push('/auth/signin')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
        
        {/* エラー表示 */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Error:</strong> {error}
              {errorDetails && (
                <div className="mt-2 text-sm">
                  <strong>Details:</strong> {errorDetails}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
        
        {/* 成功メッセージ */}
        {githubConnected && (
          <Alert className="mb-6">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              GitHub connected successfully!
            </AlertDescription>
          </Alert>
        )}
        
        {/* メインコンテンツ */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>GitHub Integration</CardTitle>
              <CardDescription>
                Connect your GitHub account to enable repository management
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={() => router.push('/github-status')}
                variant="outline"
                className="w-full"
              >
                <Github className="mr-2 h-4 w-4" />
                Check GitHub Status
              </Button>
              
              <Button 
                onClick={() => router.push('/github-actions-test')}
                variant="outline"
                className="w-full"
              >
                Test GitHub Actions
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common tasks and navigation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={() => router.push('/upload')}
                variant="outline"
                className="w-full"
              >
                Upload CV
              </Button>
              
              <Button 
                onClick={() => router.push('/chat')}
                variant="outline"
                className="w-full"
              >
                Start Chat
              </Button>
            </CardContent>
          </Card>
        </div>
        
        {/* デバッグ情報 */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>Current URL: {window.location.href}</p>
              <p>Error: {error || 'None'}</p>
              <p>Error Details: {errorDetails || 'None'}</p>
              <p>GitHub Status: {githubConnected ? 'Connected' : 'Not specified'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}