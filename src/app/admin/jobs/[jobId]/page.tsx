'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Edit, Building2, MapPin, Briefcase, DollarSign, Calendar, Eye, EyeOff } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

interface Job {
  id: string
  company_name: string
  job_title: string
  department?: string
  job_description: string
  requirements?: string
  skills?: string[]
  employment_type?: string
  location?: string
  salary_range?: {
    min?: number
    max?: number
    currency?: string
  }
  file_path?: string
  file_name?: string
  raw_content?: string
  parsed_data?: any
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function JobDetailPage() {
  const router = useRouter()
  const params = useParams()
  const jobId = params.jobId as string
  
  const [job, setJob] = useState<Job | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchJob = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/admin/jobs/${jobId}`, {
        headers: {
          'admin-password': process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'your-secure-admin-password'
        }
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('求人が見つかりません')
        }
        throw new Error('求人情報の取得に失敗しました')
      }

      const data = await response.json()
      setJob(data.job)
    } catch (error) {
      console.error('求人取得エラー:', error)
      setError(error instanceof Error ? error.message : '求人情報の読み込みに失敗しました')
    } finally {
      setIsLoading(false)
    }
  }, [jobId])

  useEffect(() => {
    if (jobId) {
      fetchJob()
    }
  }, [jobId, fetchJob])

  const toggleJobStatus = async () => {
    if (!job) return

    try {
      const response = await fetch(`/api/admin/jobs/${jobId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'admin-password': process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'your-secure-admin-password'
        },
        body: JSON.stringify({ is_active: !job.is_active })
      })

      if (!response.ok) {
        throw new Error('ステータスの更新に失敗しました')
      }

      const data = await response.json()
      setJob(data.job)
    } catch (error) {
      console.error('ステータス更新エラー:', error)
      alert('ステータスの更新に失敗しました')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatSalary = (salaryRange?: Job['salary_range']) => {
    if (!salaryRange || (!salaryRange.min && !salaryRange.max)) {
      return '要相談'
    }
    const min = salaryRange.min ? `${salaryRange.min}万円` : ''
    const max = salaryRange.max ? `${salaryRange.max}万円` : ''
    if (min && max) {
      return `${min}〜${max}`
    }
    return min || max || '要相談'
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center p-8">
          <Spinner className="mr-2" />
          <span>読み込み中...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center p-8">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={() => router.push('/admin/jobs')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            求人一覧に戻る
          </Button>
        </div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center p-8">
          <p className="text-muted-foreground">求人が見つかりません</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/admin/jobs')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            求人一覧へ
          </Button>
          <h1 className="text-2xl font-bold">求人詳細</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={toggleJobStatus}
          >
            {job.is_active ? (
              <>
                <EyeOff className="mr-2 h-4 w-4" />
                非アクティブにする
              </>
            ) : (
              <>
                <Eye className="mr-2 h-4 w-4" />
                アクティブにする
              </>
            )}
          </Button>
          <Button onClick={() => router.push(`/admin/jobs/${jobId}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            編集
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 基本情報 */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">{job.job_title}</CardTitle>
                  <CardDescription className="mt-2 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {job.company_name}
                    {job.department && <span>/ {job.department}</span>}
                  </CardDescription>
                </div>
                <Badge variant={job.is_active ? 'default' : 'secondary'}>
                  {job.is_active ? 'アクティブ' : '非アクティブ'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {job.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{job.location}</span>
                  </div>
                )}
                {job.employment_type && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span>{job.employment_type}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>{formatSalary(job.salary_range)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>登録: {formatDate(job.created_at)}</span>
                </div>
              </div>
              
              {job.skills && job.skills.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">求められるスキル</h3>
                  <div className="flex flex-wrap gap-2">
                    {job.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 職務内容 */}
          <Card>
            <CardHeader>
              <CardTitle>職務内容</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap text-sm">
                {job.job_description}
              </div>
            </CardContent>
          </Card>

          {/* 応募要件 */}
          {job.requirements && (
            <Card>
              <CardHeader>
                <CardTitle>応募要件</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap text-sm">
                  {job.requirements}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* サイドバー */}
        <div className="space-y-6">
          {/* ファイル情報 */}
          {job.file_name && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">ファイル情報</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <span className="text-sm font-medium">ファイル名:</span>
                  <p className="text-sm text-muted-foreground break-all">{job.file_name}</p>
                </div>
                {job.file_path && (
                  <div>
                    <span className="text-sm font-medium">パス:</span>
                    <p className="text-sm text-muted-foreground break-all">{job.file_path}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 更新履歴 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">更新履歴</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="text-sm font-medium">作成日時:</span>
                <p className="text-sm text-muted-foreground">{formatDate(job.created_at)}</p>
              </div>
              <div>
                <span className="text-sm font-medium">更新日時:</span>
                <p className="text-sm text-muted-foreground">{formatDate(job.updated_at)}</p>
              </div>
            </CardContent>
          </Card>

          {/* 構造化データ */}
          {job.parsed_data && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">解析データ</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-60">
                  {JSON.stringify(job.parsed_data, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* 元テキスト */}
      {job.raw_content && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>抽出されたテキスト</CardTitle>
            <CardDescription>
              ファイルから抽出された元のテキストデータ
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded max-h-96 overflow-y-auto">
              <pre className="text-sm whitespace-pre-wrap">{job.raw_content}</pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}