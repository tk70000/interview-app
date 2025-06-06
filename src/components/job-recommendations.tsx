'use client'

import { useState, useEffect } from 'react'
import { Building2, MapPin, Briefcase, DollarSign, Star, ChevronRight, Loader2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface JobMatch {
  job_id: string
  company_name: string
  job_title: string
  department?: string
  job_description?: string
  requirements?: string
  skills?: string[]
  employment_type?: string
  location?: string
  salary_range?: {
    min?: number
    max?: number
    currency?: string
  }
  similarity: number
  match_reason?: string
  detailed_explanation?: string
  ranking: number
}

interface JobRecommendationsProps {
  sessionId: string
  className?: string
}

export function JobRecommendations({ sessionId, className }: JobRecommendationsProps) {
  const [matches, setMatches] = useState<JobMatch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [selectedJob, setSelectedJob] = useState<JobMatch | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    fetchJobMatches()
  }, [sessionId])

  const fetchJobMatches = async () => {
    try {
      const response = await fetch(`/api/v1/job-matching/${sessionId}`)
      if (!response.ok) {
        throw new Error('求人情報の取得に失敗しました')
      }
      const data = await response.json()
      setMatches(data.matches || [])
    } catch (error) {
      setError('求人情報の読み込みに失敗しました')
      console.error('求人取得エラー:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const openJobDetail = (job: JobMatch) => {
    setSelectedJob(job)
    setIsModalOpen(true)
  }

  const getMatchPercentage = (similarity: number) => {
    return Math.round(similarity * 100)
  }

  const getMatchBadgeColor = (similarity: number) => {
    if (similarity >= 0.8) return 'bg-green-500'
    if (similarity >= 0.7) return 'bg-blue-500'
    if (similarity >= 0.6) return 'bg-yellow-500'
    return 'bg-gray-500'
  }

  const formatSalary = (salaryRange?: JobMatch['salary_range']) => {
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
      <div className={cn("flex items-center justify-center p-8", className)}>
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">求人情報を読み込んでいます...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("text-center p-8", className)}>
        <p className="text-destructive">{error}</p>
      </div>
    )
  }

  if (matches.length === 0) {
    return (
      <div className={cn("text-center p-8", className)}>
        <p className="text-muted-foreground">マッチする求人が見つかりませんでした</p>
      </div>
    )
  }


  return (
    <div className={cn("space-y-6", className)}>
      <div>
        <h2 className="text-2xl font-bold mb-2">あなたにおすすめの求人</h2>
        <p className="text-muted-foreground">
          あなたの経験とご希望に基づいて、上位{matches.length}件の求人をご紹介します
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {matches.map((job) => (
          <Card key={job.job_id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => openJobDetail(job)}>
            <CardHeader>
              <div className="flex items-start justify-between mb-2">
                <Badge className={cn("text-white", getMatchBadgeColor(job.similarity))}>
                  <Star className="h-3 w-3 mr-1" />
                  {getMatchPercentage(job.similarity)}% マッチ
                </Badge>
                <span className="text-sm text-muted-foreground">#{job.ranking}</span>
              </div>
              <CardTitle className="text-lg line-clamp-1">{job.job_title}</CardTitle>
              <CardDescription className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                {job.company_name}
                {job.department && <span className="text-xs">/ {job.department}</span>}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {job.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{job.location}</span>
                </div>
              )}
              {job.employment_type && (
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span>{job.employment_type}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span>{formatSalary(job.salary_range)}</span>
              </div>
              {job.skills && job.skills.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {job.skills.slice(0, 3).map((skill, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                  {job.skills.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{job.skills.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button variant="ghost" className="w-full" onClick={(e) => {
                e.stopPropagation()
                openJobDetail(job)
              }}>
                詳細を見る
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* 求人詳細モーダル */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedJob && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">
                  {selectedJob.job_title}
                </DialogTitle>
                <DialogDescription className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span className="font-medium">{selectedJob.company_name}</span>
                    {selectedJob.department && <span>/ {selectedJob.department}</span>}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    {selectedJob.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>{selectedJob.location}</span>
                      </div>
                    )}
                    {selectedJob.employment_type && (
                      <div className="flex items-center gap-1">
                        <Briefcase className="h-3 w-3" />
                        <span>{selectedJob.employment_type}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      <span>{formatSalary(selectedJob.salary_range)}</span>
                    </div>
                  </div>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-6">
                {/* マッチング情報 */}
                <div className="bg-muted rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">マッチ度</h3>
                    <Badge className={cn("text-white", getMatchBadgeColor(selectedJob.similarity))}>
                      <Star className="h-3 w-3 mr-1" />
                      {getMatchPercentage(selectedJob.similarity)}%
                    </Badge>
                  </div>
                  {selectedJob.match_reason && (
                    <p className="text-sm text-muted-foreground mb-2">{selectedJob.match_reason}</p>
                  )}
                  {selectedJob.detailed_explanation && (
                    <div className="mt-3 pt-3 border-t">
                      <h4 className="text-sm font-medium mb-1">なぜこの求人がおすすめ？</h4>
                      <p className="text-sm">{selectedJob.detailed_explanation}</p>
                    </div>
                  )}
                </div>

                {/* 職務内容 */}
                {selectedJob.job_description && (
                  <div>
                    <h3 className="font-semibold mb-2">職務内容</h3>
                    <p className="text-sm whitespace-pre-wrap">{selectedJob.job_description}</p>
                  </div>
                )}

                {/* 応募要件 */}
                {selectedJob.requirements && (
                  <div>
                    <h3 className="font-semibold mb-2">応募要件</h3>
                    <p className="text-sm whitespace-pre-wrap">{selectedJob.requirements}</p>
                  </div>
                )}

                {/* スキル */}
                {selectedJob.skills && selectedJob.skills.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">求められるスキル</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedJob.skills.map((skill, index) => (
                        <Badge key={index} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="mt-6">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                  閉じる
                </Button>
                <Button>
                  応募を検討する
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}