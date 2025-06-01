'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { CheckCircle, XCircle, AlertCircle, Play } from 'lucide-react'

export default function CodeQualityCheckPage() {
  const [checkType, setCheckType] = useState('all')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [workflowRuns, setWorkflowRuns] = useState<any[]>([])

  const runQualityCheck = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/v1/github/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          owner: 'tk70000',
          repo: 'interview-app',
          workflow_id: 'code-quality.yml',
          ref: 'main',
          inputs: {
            check_type: checkType
          }
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to trigger workflow')
      }

      setResult({
        success: true,
        message: 'Code quality check started successfully!'
      })

      // 3秒後にワークフローの状態を確認
      setTimeout(fetchWorkflowStatus, 3000)
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchWorkflowStatus = async () => {
    try {
      const response = await fetch('/api/v1/github/workflows?owner=tk70000&repo=interview-app')
      const data = await response.json()
      
      if (response.ok && data.workflow_runs) {
        const qualityRuns = data.workflow_runs
          .filter((run: any) => run.name === 'Code Quality Check')
          .slice(0, 5)
        setWorkflowRuns(qualityRuns)
      }
    } catch (error) {
      console.error('Error fetching workflow status:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Code Quality Check</h1>
        
        <div className="grid gap-6 md:grid-cols-2">
          {/* Control Panel */}
          <Card>
            <CardHeader>
              <CardTitle>Run Quality Check</CardTitle>
              <CardDescription>
                Check your code quality with ESLint, TypeScript, and build tests
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Check Type</label>
                <Select value={checkType} onValueChange={setCheckType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Checks</SelectItem>
                    <SelectItem value="lint">ESLint Only</SelectItem>
                    <SelectItem value="typecheck">TypeScript Only</SelectItem>
                    <SelectItem value="build">Build Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {result && (
                <Alert variant={result.success ? "default" : "destructive"}>
                  <AlertDescription>{result.message}</AlertDescription>
                </Alert>
              )}

              <Button 
                onClick={runQualityCheck} 
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Run Quality Check
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>What Gets Checked?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">ESLint</p>
                  <p className="text-sm text-muted-foreground">
                    Code style, best practices, potential bugs
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="font-medium">TypeScript</p>
                  <p className="text-sm text-muted-foreground">
                    Type safety, compilation errors
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-purple-500 mt-0.5" />
                <div>
                  <p className="font-medium">Build</p>
                  <p className="text-sm text-muted-foreground">
                    Production build success
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Runs */}
        {workflowRuns.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Recent Quality Checks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {workflowRuns.map((run) => (
                  <div key={run.id} className="flex items-center justify-between p-3 bg-muted rounded">
                    <div className="flex items-center gap-2">
                      {run.status === 'completed' && run.conclusion === 'success' && 
                        <CheckCircle className="h-4 w-4 text-green-500" />}
                      {run.status === 'completed' && run.conclusion === 'failure' && 
                        <XCircle className="h-4 w-4 text-red-500" />}
                      {run.status === 'in_progress' && 
                        <AlertCircle className="h-4 w-4 text-yellow-500 animate-pulse" />}
                      <div>
                        <p className="font-medium text-sm">{run.event}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(run.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <a 
                      href={run.html_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline"
                    >
                      View →
                    </a>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Quality check results will be available as artifacts in GitHub Actions
          </p>
        </div>
      </div>
    </div>
  )
}