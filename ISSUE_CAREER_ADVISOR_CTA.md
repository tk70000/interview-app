# イシュー: キャリアアドバイザーCTAの改善と面接日程調整機能の追加

## 概要
現在の「キャリアアドバイザー」ボタンを「キャリアアドバイザーに相談」に変更し、クリック後に面接可能日を選択してメーリングリストに送信する機能を実装する。

## 現状の問題点
1. CTAボタンの文言が不明確（「キャリアアドバイザー」だけでは何ができるか分からない）
2. ボタンクリック後の具体的なアクションがない
3. 求職者と企業側の面接日程調整プロセスが手動

## 改善内容

### 1. UI/UX改善
- **変更前**: 「キャリアアドバイザー」ボタン
- **変更後**: 「キャリアアドバイザーに相談」ボタン
- ボタンの場所: `/upload`ページのCV要約表示後

### 2. 新機能: 面接日程調整フロー

#### ユーザーフロー
1. ユーザーが「キャリアアドバイザーに相談」ボタンをクリック
2. モーダルウィンドウが開く
3. カレンダーUIで1〜2週間先の面接可能日を複数選択
4. 希望時間帯を選択（午前/午後/終日）
5. 連絡先情報の確認（メールアドレス、電話番号）
6. 「送信」ボタンで情報を送信

#### 技術仕様
```typescript
interface InterviewAvailability {
  candidateId: string;
  candidateEmail: string;
  candidateName: string;
  availableDates: AvailableDate[];
  phoneNumber?: string;
  additionalNotes?: string;
  submittedAt: Date;
}

interface AvailableDate {
  date: string; // YYYY-MM-DD
  timePreference: 'morning' | 'afternoon' | 'full-day';
}
```

### 3. バックエンド処理
1. **データ保存**: Supabaseの`interview_availability`テーブルに保存
2. **メール送信**: 指定のメーリングリストに自動送信
3. **確認メール**: 求職者に確認メールを送信

### 4. メール内容
```
件名: 【面接日程調整】{candidateName}様 - {submittedAt}

キャリアアドバイザー各位

以下の求職者から面接希望日程が届きました。

■ 求職者情報
氏名: {candidateName}
メール: {candidateEmail}
電話: {phoneNumber}

■ 面接可能日時
{availableDates.map(date => `
- ${date.date} ${timePreferenceText(date.timePreference)}
`).join('')}

■ 備考
{additionalNotes}

■ CV要約へのリンク
{linkToCVSummary}

よろしくお願いいたします。
```

## 実装ファイル

### 新規作成
- `/src/components/interview-scheduler-modal.tsx` - 日程選択モーダル
- `/src/app/api/v1/interview-availability/route.ts` - API エンドポイント
- `/src/lib/email-service.ts` - メール送信サービス

### 修正対象
- `/src/app/upload/page.tsx` - CTAボタンの文言変更とモーダル追加
- `/src/types/index.ts` - 型定義の追加

## データベース変更
```sql
CREATE TABLE interview_availability (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID REFERENCES candidates(id) NOT NULL,
  available_dates JSONB NOT NULL,
  phone_number VARCHAR(20),
  additional_notes TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 環境変数
```env
# メーリングリスト設定
CAREER_ADVISOR_EMAIL_LIST=advisor1@example.com,advisor2@example.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASS=xxxx
```

## テスト項目
1. CTAボタンの文言が正しく表示される
2. モーダルが正常に開閉する
3. カレンダーで1〜2週間先の日付のみ選択可能
4. 過去の日付は選択不可
5. メール送信が成功する
6. データベースに正しく保存される
7. エラーハンドリングが適切

## 成功指標
- CTAクリック率の向上
- 面接日程調整にかかる時間の短縮
- キャリアアドバイザーの作業効率向上

## 今後の拡張案
- カレンダー連携（Google Calendar、Outlook）
- リマインダー機能
- 面接日程の自動マッチング機能
- チャット機能の統合