'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'

export default function GitHubOAuthDebugPage() {
  const [testResult, setTestResult] = useState<any>(null)
  
  const checkEnvironment = () => {
    const result = {
      appUrl: process.env.NEXT_PUBLIC_APP_URL || 'NOT SET',
      hasClientId: !!process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID,
      nodeEnv: process.env.NODE_ENV,
      testMode: process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true'
    };
    setTestResult(result);
  };
  
  const testCallbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/github/callback`;
  const githubOAuthUrl = `https://github.com/settings/applications/${process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || 'YOUR_CLIENT_ID'}`;
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">GitHub OAuth Debug</h1>
        
        <div className="space-y-6">
          {/* Environment Check */}
          <Card>
            <CardHeader>
              <CardTitle>Environment Configuration</CardTitle>
              <CardDescription>Check your environment variables</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={checkEnvironment}>Check Environment</Button>
              
              {testResult && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {testResult.appUrl.includes('localhost') ? 
                      <CheckCircle className="h-4 w-4 text-green-500" /> : 
                      <XCircle className="h-4 w-4 text-red-500" />
                    }
                    <span>App URL: <code className="bg-muted px-2 py-1 rounded">{testResult.appUrl}</code></span>
                  </div>
                  <div className="flex items-center gap-2">
                    {testResult.hasClientId ? 
                      <CheckCircle className="h-4 w-4 text-green-500" /> : 
                      <XCircle className="h-4 w-4 text-red-500" />
                    }
                    <span>GitHub Client ID: {testResult.hasClientId ? 'Set' : 'Not Set'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-500" />
                    <span>Environment: {testResult.nodeEnv}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-500" />
                    <span>Test Mode: {testResult.testMode ? 'Enabled' : 'Disabled'}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* GitHub App Settings */}
          <Card>
            <CardHeader>
              <CardTitle>GitHub OAuth App Settings</CardTitle>
              <CardDescription>Verify these settings in your GitHub OAuth App</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Make sure your GitHub OAuth App has these exact URLs:
                </AlertDescription>
              </Alert>
              
              <div className="space-y-3">
                <div>
                  <p className="font-medium">Homepage URL:</p>
                  <code className="block bg-muted p-2 rounded mt-1">http://localhost:3000</code>
                </div>
                
                <div>
                  <p className="font-medium">Authorization callback URL:</p>
                  <code className="block bg-muted p-2 rounded mt-1">{testCallbackUrl}</code>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => navigator.clipboard.writeText(testCallbackUrl)}
                  >
                    Copy Callback URL
                  </Button>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">
                  Open your GitHub OAuth App settings:
                </p>
                <a 
                  href={githubOAuthUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline text-sm"
                >
                  {githubOAuthUrl}
                </a>
              </div>
            </CardContent>
          </Card>
          
          {/* Test OAuth Flow */}
          <Card>
            <CardHeader>
              <CardTitle>Test OAuth Flow</CardTitle>
              <CardDescription>Test different parts of the OAuth flow</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Button 
                  variant="outline"
                  onClick={() => window.open('/api/auth/github', '_blank')}
                >
                  Test OAuth Start (New Tab)
                </Button>
                <p className="text-sm text-muted-foreground">
                  Opens the OAuth flow in a new tab to see any errors
                </p>
              </div>
              
              <div className="space-y-2">
                <Button 
                  variant="outline"
                  onClick={() => window.location.href = '/api/auth/github'}
                >
                  Test OAuth Start (Same Tab)
                </Button>
                <p className="text-sm text-muted-foreground">
                  Starts the OAuth flow in the current tab
                </p>
              </div>
              
              <div className="space-y-2">
                <Button 
                  variant="outline"
                  onClick={() => fetch('/api/auth/github').then(r => console.log('Response:', r))}
                >
                  Test OAuth API (Console)
                </Button>
                <p className="text-sm text-muted-foreground">
                  Tests the API endpoint (check browser console)
                </p>
              </div>
            </CardContent>
          </Card>
          
          {/* Manual Test */}
          <Card>
            <CardHeader>
              <CardTitle>Manual OAuth URL</CardTitle>
              <CardDescription>Construct the OAuth URL manually</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm">If the automatic flow isn't working, try this manual URL:</p>
                <code className="block bg-muted p-2 rounded text-xs break-all">
                  https://github.com/login/oauth/authorize?client_id=Ov23liGLOiqW8HdupTih&redirect_uri=http://localhost:3000/api/auth/github/callback&scope=repo read:user workflow
                </code>
                <Button 
                  variant="outline"
                  onClick={() => {
                    const url = `https://github.com/login/oauth/authorize?client_id=Ov23liGLOiqW8HdupTih&redirect_uri=${encodeURIComponent('http://localhost:3000/api/auth/github/callback')}&scope=repo read:user workflow`;
                    window.open(url, '_blank');
                  }}
                >
                  Open Manual OAuth URL
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}