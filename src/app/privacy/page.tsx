'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function PrivacyPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            戻る
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">プライバシーポリシー</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none">
            <div className="space-y-6">
              <section>
                <h2 className="text-xl font-semibold mb-3">1. 個人情報の取り扱いについて</h2>
                <p>
                  当社は、本ウェブサイト上で提供するサービス（以下、「本サービス」といいます。）における、ユーザーの個人情報の取扱いについて、以下のとおりプライバシーポリシー（以下、「本ポリシー」といいます。）を定めます。
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">2. 収集する情報</h2>
                <p>本サービスでは、以下の情報を収集いたします。</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>メールアドレス</li>
                  <li>氏名</li>
                  <li>履歴書・職務経歴書の内容</li>
                  <li>キャリア相談におけるチャット履歴</li>
                  <li>面接日程調整に関する情報</li>
                  <li>IPアドレス、クッキー、アクセスログ等の技術情報</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">3. 利用目的</h2>
                <p>収集した個人情報は、以下の目的で利用いたします。</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>キャリア相談サービスの提供</li>
                  <li>ユーザーアカウントの管理</li>
                  <li>面接日程の調整・管理</li>
                  <li>サービスの改善・向上</li>
                  <li>お問い合わせへの対応</li>
                  <li>利用規約に違反したユーザーの特定</li>
                  <li>利用状況の分析・統計</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">4. 安全管理</h2>
                <p>
                  当社は、個人情報の漏洩、滅失または毀損の防止その他の個人情報の安全管理のために必要かつ適切な措置を講じます。
                  個人情報は、適切なアクセス制御、暗号化等のセキュリティ対策を実施して保護いたします。
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">5. 第三者提供</h2>
                <p>
                  当社は、以下の場合を除いて、あらかじめユーザーの同意を得ることなく、第三者に個人情報を提供することはありません。
                </p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>法令に基づく場合</li>
                  <li>人の生命、身体または財産の保護のために必要がある場合であって、本人の同意を得ることが困難であるとき</li>
                  <li>公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合であって、本人の同意を得ることが困難であるとき</li>
                  <li>国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合であって、本人の同意を得ることによって当該事務の遂行に支障を及ぼすおそれがあるとき</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">6. 委託</h2>
                <p>
                  当社は、利用目的の達成に必要な範囲において、個人情報の取扱いの全部または一部を第三者に委託することがあります。
                  この場合、委託先に対して適切な監督を行います。
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">7. 開示・訂正等</h2>
                <p>
                  当社は、本人から個人情報の開示を求められたときは、本人に対し、遅滞なくこれを開示します。
                  ただし、開示することにより以下のいずれかに該当する場合は、その全部または一部を開示しないこともあり、開示しない決定をした場合には、その旨を遅滞なく通知します。
                </p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>本人または第三者の生命、身体、財産その他の権利利益を害するおそれがある場合</li>
                  <li>当社の業務の適正な実施に著しい支障を及ぼすおそれがある場合</li>
                  <li>その他法令に違反することとなる場合</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">8. Cookieについて</h2>
                <p>
                  本サービスは、Cookie及びこれに類する技術を利用することがあります。
                  これらの技術は、当社による本サービスの提供の改善等に役立ちます。
                  Cookieを無効にされたい場合は、ウェブブラウザの設定を変更することにより、Cookieを無効にすることができます。
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">9. プライバシーポリシーの変更</h2>
                <p>
                  本ポリシーの内容は、法令その他本ポリシーに別段の定めのある事項を除いて、ユーザーに通知することなく、変更することができるものとします。
                  当社が別途定める場合を除いて、変更後のプライバシーポリシーは、本ウェブサイトに掲載したときから効力を生じるものとします。
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">10. お問い合わせ窓口</h2>
                <p>
                  本ポリシーに関するお問い合わせは、下記の窓口までお願いいたします。
                </p>
                <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                  <p>お問い合わせ先：privacy@example.com</p>
                </div>
              </section>

              <div className="text-right text-sm text-muted-foreground mt-8">
                2024年6月制定
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}