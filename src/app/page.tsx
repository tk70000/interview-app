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
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            キャリア相談チャットアプリ
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            AIが職務経歴書を分析し、候補者の強みを引き出す
            プロフェッショナルなキャリア相談プラットフォーム
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Upload className="h-12 w-12 text-primary mb-4" />
              <CardTitle>CVアップロード</CardTitle>
              <CardDescription>
                履歴書・職務経歴書をアップロードして、キャリア相談を開始
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => handleNavigation('/upload')}>
                開始する
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <MessageSquare className="h-12 w-12 text-primary mb-4" />
              <CardTitle>チャット面談</CardTitle>
              <CardDescription>
                AIキャリアアドバイザーが、あなたの経験と強みを深く理解
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline" onClick={() => handleNavigation('/chat')}>
                チャットを見る
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <BarChart3 className="h-12 w-12 text-primary mb-4" />
              <CardTitle>管理ダッシュボード</CardTitle>
              <CardDescription>
                候補者の情報と面談の進捗を一元管理（採用担当者向け）
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="secondary" onClick={() => handleNavigation('/dashboard')}>
                ダッシュボードへ
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-semibold mb-8">主な機能</h2>
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
