'use client'

import { Button } from '@/components/ui/button'
import { Github } from 'lucide-react'

export function GitHubConnectButton() {
  const handleConnect = () => {
    window.location.href = '/api/auth/github'
  }

  return (
    <Button 
      onClick={handleConnect}
      className="flex items-center gap-2"
    >
      <Github className="h-4 w-4" />
      Connect GitHub
    </Button>
  )
}