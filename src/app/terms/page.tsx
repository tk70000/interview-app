'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function TermsPage() {
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
            <CardTitle className="text-2xl">利用規約</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none">
            <div className="space-y-6">
              <section>
                <h2 className="text-xl font-semibold mb-3">第1条（目的）</h2>
                <p>
                  本利用規約（以下「本規約」といいます。）は、当社が提供するキャリア相談サービス（以下「本サービス」といいます。）の利用条件を定めるものです。
                  ユーザーの皆さまには、本規約に従って、本サービスをご利用いただきます。
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">第2条（利用登録）</h2>
                <p>
                  本サービスにおいては、登録希望者が本規約に同意の上、当社の定める方法によって利用登録を申請し、当社がこれを承認することによって、利用登録が完了するものとします。
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">第3条（ユーザーIDおよびパスワードの管理）</h2>
                <p>
                  ユーザーは、自己の責任において、本サービスのユーザーIDおよびパスワードを適切に管理するものとします。
                  ユーザーは、いかなる場合にも、ユーザーIDおよびパスワードを第三者に譲渡または貸与し、もしくは第三者と共用することはできません。
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">第4条（禁止事項）</h2>
                <p>ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>法令または公序良俗に違反する行為</li>
                  <li>犯罪行為に関連する行為</li>
                  <li>本サービスの内容等、本サービスに含まれる著作権、商標権ほか知的財産権を侵害する行為</li>
                  <li>当社、ほかのユーザー、またはその他第三者のサーバーまたはネットワークの機能を破壊したり、妨害したりする行為</li>
                  <li>本サービスによって得られた情報を商業的に利用する行為</li>
                  <li>当社のサービスの運営を妨害するおそれのある行為</li>
                  <li>不正アクセスをし、またはこれを試みる行為</li>
                  <li>その他、当社が不適切と判断する行為</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">第5条（本サービスの提供の停止等）</h2>
                <p>
                  当社は、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく本サービスの全部または一部の提供を停止または中断することができるものとします。
                </p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>本サービスにかかるコンピュータシステムの保守点検または更新を行う場合</li>
                  <li>地震、落雷、火災、停電または天災などの不可抗力により、本サービスの提供が困難となった場合</li>
                  <li>コンピュータまたは通信回線等が事故により停止した場合</li>
                  <li>その他、当社が本サービスの提供が困難と判断した場合</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">第6条（利用制限および登録抹消）</h2>
                <p>
                  当社は、ユーザーが以下のいずれかに該当する場合には、事前の通知なく、ユーザーに対して、本サービスの全部もしくは一部の利用を制限し、またはユーザーとしての登録を抹消することができるものとします。
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">第7条（保証の否認および免責事項）</h2>
                <p>
                  当社は、本サービスに事実上または法律上の瑕疵（安全性、信頼性、正確性、完全性、有効性、特定の目的への適合性、セキュリティなどに関する欠陥、エラーやバグ、権利侵害などを含みます。）がないことを明示的にも黙示的にも保証しておりません。
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">第8条（サービス内容の変更等）</h2>
                <p>
                  当社は、ユーザーに通知することなく、本サービスの内容を変更しまたは本サービスの提供を中止することができるものとし、これによってユーザーに生じた損害について一切の責任を負いません。
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">第9条（利用規約の変更）</h2>
                <p>
                  当社は、ユーザーに通知することなく、いつでも本規約を変更することができるものとします。なお、本規約の変更後、本サービスの利用を開始した場合には、当該ユーザーは変更後の規約に同意したものとみなします。
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-3">第10条（準拠法・裁判管轄）</h2>
                <p>
                  本規約の解釈にあたっては、日本法を準拠法とします。本サービスに関して紛争が生じた場合には、当社の本店所在地を管轄する裁判所を専属的合意管轄とします。
                </p>
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