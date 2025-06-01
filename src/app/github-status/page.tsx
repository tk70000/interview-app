'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { CheckCircle, XCircle, Github, RefreshCw } from 'lucide-react'

export default function GitHubStatusPage() {
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const checkStatus = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/test-github-connection')
      const data = await response.json()
      setStatus(data)
    } catch (error) {
      setStatus({ connected: false, error: 'Failed to check status' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkStatus()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
          <Github className="h-8 w-8" />
          GitHub Integration Status
        </h1>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {status?.connected ? (
                <>
                  <CheckCircle className="h-6 w-6 text-green-500" />
                  Connected
                </>
              ) : (
                <>
                  <XCircle className="h-6 w-6 text-red-500" />
                  Not Connected
                </>
              )}
            </CardTitle>
            <CardDescription>
              {status?.message || 'GitHub connection status'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {status?.connected && status?.connection && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">GitHub Username</p>
                    <p className="font-medium">{status.connection.githubUsername || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">User ID</p>
                    <p className="font-mono text-sm">{status.connection.userId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Scopes</p>
                    <p className="font-mono text-sm">{status.connection.scopes?.join(', ') || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Connected At</p>
                    <p className="text-sm">{new Date(status.connection.createdAt).toLocaleString()}</p>
                  </div>
                </div>

                {status.repositories && (
                  <div className="border-t pt-4">
                    <h3 className="font-medium mb-2">Repositories</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Total: {status.repositories.count} repositories
                    </p>
                    {status.repositories.sample.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Sample repositories:</p>
                        <ul className="list-disc list-inside text-sm">
                          {status.repositories.sample.map((repo: string) => (
                            <li key={repo}>{repo}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {!status?.connected && (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">
                  GitHub is not connected. Connect your account to enable repository integration.
                </p>
                <Button onClick={() => window.location.href = '/api/auth/github'}>
                  <Github className="mr-2 h-4 w-4" />
                  Connect GitHub
                </Button>
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t">
              <Button variant="outline" onClick={checkStatus}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Status
              </Button>
              
              {status?.connected && (
                <div className="space-x-2">
                  <Button 
                    variant="outline"
                    onClick={() => window.location.href = '/api/v1/github/repositories'}
                  >
                    View Repositories API
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="mt-4 text-sm text-muted-foreground">
          <p>Access this page at: <code className="bg-muted px-2 py-1 rounded">http://localhost:3000/github-status</code></p>
        </div>
      </div>
    </div>
  )
}