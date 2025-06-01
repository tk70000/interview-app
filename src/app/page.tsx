'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, MessageSquare, BarChart3 } from 'lucide-react'

export default function HomePage() {
  const router = useRouter()

  const handleNavigation = (path: string) => {
    console.log(`Navigating to: ${path}`)
    try {
      router.push(path)
    } catch (error) {
      console.error('Navigation error:', error)
    }
  }

  React.useEffect(() => {
    console.log('HomePage mounted, router:', router)
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* ヘッダー */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">キャリア相談AI</h1>
            <div className="space-x-4">
              <Button variant="ghost" onClick={() => handleNavigation('/auth/signin')}>サインイン</Button>
              <Button onClick={() => handleNavigation('/auth/signup')}>新規登録</Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-16">
        {/* ユーザー向けメインセクション */}
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold mb-6">
            あなたのキャリアを、次のステージへ
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            AIキャリアアドバイザーが、あなたの経験と強みを深く理解し、
            最適なキャリアパスをご提案します
          </p>
          <Button size="lg" className="text-lg px-8 py-6" onClick={() => handleNavigation('/auth/signin')}>
            無料でキャリア相談を始める
          </Button>
        </div>

        {/* 使い方セクション */}
        <div className="mb-16">
          <h3 className="text-3xl font-semibold text-center mb-12">簡単3ステップで始められます</h3>
          <div className="grid gap-8 md:grid-cols-3 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="bg-primary/10 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                <Upload className="h-10 w-10 text-primary" />
              </div>
              <h4 className="font-semibold text-xl mb-2">1. 職務経歴書をアップロード</h4>
              <p className="text-muted-foreground">
                PDF、Word、JSONファイルに対応。安全に処理されます。
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary/10 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-10 w-10 text-primary" />
              </div>
              <h4 className="font-semibold text-xl mb-2">2. AIとの対話</h4>
              <p className="text-muted-foreground">
                あなたの経験に基づいた質問で、強みを引き出します。
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary/10 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-10 w-10 text-primary" />
              </div>
              <h4 className="font-semibold text-xl mb-2">3. キャリアアドバイス</h4>
              <p className="text-muted-foreground">
                対話の内容を分析し、最適なキャリアパスをご提案。
              </p>
            </div>
          </div>
        </div>

        {/* 機能紹介 */}
        <div className="mt-16 text-center">
          <h3 className="text-3xl font-semibold mb-8">充実の機能</h3>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto text-left">
            <FeatureCard
              title="CV自動要約"
              description="アップロードされたCVをAIが分析し、重要なポイントを自動で抽出・要約します"
            />
            <FeatureCard
              title="インテリジェント質問生成"
              description="候補者の経験とスキルに基づいて、最適な質問を自動生成します"
            />
            <FeatureCard
              title="リアルタイムチャット"
              description="ストリーミング技術により、自然な対話体験を実現します"
            />
            <FeatureCard
              title="フォローアップ機能"
              description="回答内容を分析し、必要に応じて追加質問を自動生成します"
            />
            <FeatureCard
              title="セキュアな環境"
              description="エンドツーエンド暗号化により、個人情報を安全に保護します"
            />
            <FeatureCard
              title="詳細な分析レポート"
              description="面談内容を可視化し、採用判断に役立つインサイトを提供します"
            />
          </div>
        </div>

        {/* 管理者向けセクション */}
        <div className="mt-24 pt-16 border-t">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-semibold mb-4">採用担当者・管理者の方へ</h3>
            <p className="text-muted-foreground">
              候補者の情報と面談の進捗を一元管理できます
            </p>
            <Button 
              className="mt-4" 
              variant="outline"
              onClick={() => handleNavigation('/admin')}
            >
              管理画面へ
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-6 rounded-lg border bg-card">
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
