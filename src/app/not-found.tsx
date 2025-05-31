import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-6">
        <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
        <h2 className="text-2xl font-semibold">ページが見つかりません</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          お探しのページは存在しないか、移動した可能性があります。
        </p>
        <Link href="/">
          <Button>
            ホームへ戻る
          </Button>
        </Link>
      </div>
    </div>
  )
}
