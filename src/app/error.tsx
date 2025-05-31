'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>エラーが発生しました</CardTitle>
          <CardDescription>
            申し訳ございません。予期しないエラーが発生しました。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {error.message || 'エラーの詳細を取得できませんでした。'}
          </p>
          <div className="flex gap-2">
            <Button onClick={reset}>
              再試行
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/'}>
              ホームへ戻る
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
