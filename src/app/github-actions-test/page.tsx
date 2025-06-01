'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Play, RefreshCw, Github, CheckCircle, Clock, XCircle } from 'lucide-react'

export default function GitHubActionsTestPage() {
  const [owner, setOwner] = useState('')
  const [repo, setRepo] = useState('')
  const [message, setMessage] = useState('Hello from Claude Code!')
  const [loading, setLoading] = useState(false)
  const [workflows, setWorkflows] = useState<any[]>([])
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  // GitHubユーザー名を取得
  useEffect(() => {
    fetchGitHubConnection()
  }, [])

  const fetchGitHubConnection = async () => {
    try {
      const response = await fetch('/api/test-github-connection')
      const data = await response.json()
      if (data.connected && data.connection?.githubUsername) {
        setOwner(data.connection.githubUsername)
      }
    } catch (error) {
      console.error('Error fetching GitHub connection:', error)
    }
  }

  const triggerWorkflow = async () => {
    if (!owner || !repo) {
      setError('Please enter both owner and repository name')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/v1/github/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          owner,
          repo,
          workflow_id: 'test-action.yml',
          ref: 'main',
          inputs: {
            message,
            environment: 'development'
          }
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to trigger workflow')
      }

      setResult({
        success: true,
        message: 'Workflow triggered successfully!',
        data
      })

      // ワークフロー実行状態を確認
      setTimeout(() => fetchWorkflowRuns(), 3000)
    } catch (error: any) {
      setError(error.message)
      setResult({
        success: false,
        message: error.message
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchWorkflowRuns = async () => {
    if (!owner || !repo) return

    try {
      const response = await fetch(`/api/v1/github/workflows?owner=${owner}&repo=${repo}`)
      const data = await response.json()
      
      if (response.ok && data.workflow_runs) {
        setWorkflows(data.workflow_runs.slice(0, 5)) // 最新5件
      }
    } catch (error) {
      console.error('Error fetching workflows:', error)
    }
  }

  const getStatusIcon = (status: string, conclusion: string | null) => {
    if (status === 'completed') {
      if (conclusion === 'success') return <CheckCircle className="h-4 w-4 text-green-500" />
      if (conclusion === 'failure') return <XCircle className="h-4 w-4 text-red-500" />
    }
    if (status === 'in_progress') return <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />
    return <Clock className="h-4 w-4 text-gray-500" />
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
          <Github className="h-8 w-8" />
          GitHub Actions Test
        </h1>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Trigger Workflow Card */}
          <Card>
            <CardHeader>
              <CardTitle>Trigger Test Workflow</CardTitle>
              <CardDescription>
                Run the test-action.yml workflow with custom inputs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="owner">Owner</Label>
                  <Input
                    id="owner"
                    placeholder="username"
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="repo">Repository</Label>
                  <Input
                    id="repo"
                    placeholder="interview_app"
                    value={repo}
                    onChange={(e) => setRepo(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="message">Test Message</Label>
                <Input
                  id="message"
                  placeholder="Enter a test message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {result && (
                <Alert variant={result.success ? "default" : "destructive"}>
                  <AlertDescription>{result.message}</AlertDescription>
                </Alert>
              )}

              <Button 
                onClick={triggerWorkflow} 
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Triggering...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Trigger Workflow
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Instructions Card */}
          <Card>
            <CardHeader>
              <CardTitle>Setup Instructions</CardTitle>
              <CardDescription>
                How to prepare your repository for testing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">1. First, push this code to GitHub:</h4>
                <pre className="bg-muted p-2 rounded text-sm overflow-x-auto">
{`git add .
git commit -m "Add GitHub Actions test"
git push origin main`}
                </pre>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">2. Workflow file location:</h4>
                <code className="bg-muted px-2 py-1 rounded text-sm">
                  .github/workflows/test-action.yml
                </code>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">3. Required permissions:</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                  <li>Repository must be public or you must have write access</li>
                  <li>GitHub token needs 'workflow' scope</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Workflow Runs */}
        {workflows.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Recent Workflow Runs
                <Button variant="outline" size="sm" onClick={fetchWorkflowRuns}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {workflows.map((run) => (
                  <div key={run.id} className="flex items-center justify-between p-3 bg-muted rounded">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(run.status, run.conclusion)}
                      <div>
                        <p className="font-medium text-sm">{run.name}</p>
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
                      View on GitHub →
                    </a>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-4 text-sm text-muted-foreground">
          <p>Access this page at: <code className="bg-muted px-2 py-1 rounded">http://localhost:3000/github-actions-test</code></p>
        </div>
      </div>
    </div>
  )
}