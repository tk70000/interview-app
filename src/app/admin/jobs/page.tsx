'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Search, 
  Filter, 
  Upload, 
  Building2, 
  MapPin, 
  Briefcase, 
  Calendar,
  MoreVertical,
  Edit,
  Eye,
  EyeOff,
  Trash2,
  ArrowLeft,
  RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

interface Job {
  id: string
  company_name: string
  job_title: string
  department?: string
  location?: string
  employment_type?: string
  skills?: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

interface JobsResponse {
  jobs: Job[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export default function AdminJobsPage() {
  const router = useRouter()
  const [jobs, setJobs] = useState<Job[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalJobs, setTotalJobs] = useState(0)

  const fetchJobs = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
      })

      if (searchQuery) {
        params.append('search', searchQuery)
      }

      const response = await fetch(`/api/admin/jobs?${params}`, {
        headers: {
          'admin-password': process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'your-secure-admin-password'
        }
      })

      if (!response.ok) {
        throw new Error('求人情報の取得に失敗しました')
      }

      const data: JobsResponse = await response.json()
      
      // フィルタリング
      let filteredJobs = data.jobs
      if (filterStatus !== 'all') {
        filteredJobs = data.jobs.filter(job => 
          filterStatus === 'active' ? job.is_active : !job.is_active
        )
      }

      setJobs(filteredJobs)
      setTotalPages(data.pagination.totalPages)
      setTotalJobs(data.pagination.total)
    } catch (error) {
      console.error('求人取得エラー:', error)
      setError('求人情報の読み込みに失敗しました')
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, searchQuery, filterStatus])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  const toggleJobStatus = async (jobId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/jobs/${jobId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'admin-password': process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'your-secure-admin-password'
        },
        body: JSON.stringify({ is_active: !currentStatus })
      })

      if (!response.ok) {
        throw new Error('ステータスの更新に失敗しました')
      }

      // ローカル状態を更新
      setJobs(jobs.map(job => 
        job.id === jobId ? { ...job, is_active: !currentStatus } : job
      ))
    } catch (error) {
      console.error('ステータス更新エラー:', error)
      alert('ステータスの更新に失敗しました')
    }
  }

  const deleteJob = async (jobId: string) => {
    if (!confirm('この求人を削除してもよろしいですか？')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/jobs/${jobId}`, {
        method: 'DELETE',
        headers: {
          'admin-password': process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'your-secure-admin-password'
        }
      })

      if (!response.ok) {
        throw new Error('削除に失敗しました')
      }

      // ローカル状態から削除
      setJobs(jobs.filter(job => job.id !== jobId))
      setTotalJobs(totalJobs - 1)
    } catch (error) {
      console.error('削除エラー:', error)
      alert('削除に失敗しました')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/admin')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            管理画面へ
          </Button>
          <h1 className="text-2xl font-bold">求人管理</h1>
        </div>
        <Button onClick={() => router.push('/admin/jobs/import')}>
          <Upload className="mr-2 h-4 w-4" />
          求人をインポート
        </Button>
      </div>

      {/* 統計情報 */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総求人数</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalJobs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">アクティブ</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {jobs.filter(j => j.is_active).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">非アクティブ</CardTitle>
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {jobs.filter(j => !j.is_active).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">企業数</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(jobs.map(j => j.company_name)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* フィルター */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">フィルター</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search" className="sr-only">検索</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="企業名・職種名で検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="active">アクティブ</SelectItem>
                <SelectItem value="inactive">非アクティブ</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={fetchJobs}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 求人一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>求人一覧</CardTitle>
          <CardDescription>
            登録されている求人情報を管理できます
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Spinner className="mr-2" />
              <span>読み込み中...</span>
            </div>
          ) : error ? (
            <div className="text-center p-8 text-destructive">
              {error}
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              求人が見つかりませんでした
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>企業名</TableHead>
                    <TableHead>職種</TableHead>
                    <TableHead>勤務地</TableHead>
                    <TableHead>雇用形態</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>登録日</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{job.company_name}</div>
                          {job.department && (
                            <div className="text-xs text-muted-foreground">{job.department}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{job.job_title}</TableCell>
                      <TableCell>
                        {job.location ? (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span className="text-sm">{job.location}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{job.employment_type || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={job.is_active ? 'default' : 'secondary'}>
                          {job.is_active ? 'アクティブ' : '非アクティブ'}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(job.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">メニューを開く</span>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>操作</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => router.push(`/admin/jobs/${job.id}`)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              詳細を見る
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => router.push(`/admin/jobs/${job.id}/edit`)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              編集する
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => toggleJobStatus(job.id, job.is_active)}
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
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => deleteJob(job.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              削除する
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* ページネーション */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                {totalJobs}件中 {(currentPage - 1) * 20 + 1}-{Math.min(currentPage * 20, totalJobs)}件を表示
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  前へ
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  次へ
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}