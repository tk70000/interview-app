# イシュー: 職務経歴書アップロード済みユーザーの継続チャット機能

## 概要
職務経歴書（CV）をアップロード済みのユーザーが、再ログイン時に前回のチャットセッションから会話を継続できる機能を実装する。

## 現状の問題点
1. ユーザーが再ログインするたびに新しいセッションが作成される
2. 過去の会話履歴にアクセスできない
3. CVを再アップロードする必要がある
4. 以前の相談内容との連続性が失われる

## 改善内容

### 1. ユーザーフロー

#### 初回利用時
1. ログイン → CVアップロード → チャット開始
2. セッションIDとユーザーIDを紐付けて保存

#### 2回目以降の利用時
1. ログイン
2. システムが既存のセッションを検出
3. 選択画面を表示：
   - 「前回の続きから始める」
   - 「新しい相談を始める」
4. 前回の続きを選択 → 過去の会話履歴を表示してチャット再開

### 2. UI/UX設計

#### ログイン後のダッシュボード
```typescript
// /src/app/dashboard/page.tsx
interface UserDashboard {
  hasExistingSession: boolean;
  sessions: SessionSummary[];
  lastCVUpload: CVInfo | null;
}

interface SessionSummary {
  id: string;
  createdAt: Date;
  lastMessageAt: Date;
  messageCount: number;
  summary: string; // AIが生成した会話の要約
  status: 'active' | 'archived';
}
```

#### セッション選択UI
```tsx
<Card>
  <CardHeader>
    <CardTitle>キャリア相談を続ける</CardTitle>
    <CardDescription>
      前回の相談から{daysSinceLastChat}日経過しています
    </CardDescription>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      <Button onClick={continueLastSession} className="w-full">
        <MessageSquare className="mr-2" />
        前回の続きから始める
      </Button>
      <Button onClick={startNewSession} variant="outline" className="w-full">
        <Plus className="mr-2" />
        新しい相談を始める
      </Button>
    </div>
    
    {/* 過去のセッション一覧 */}
    <div className="mt-6">
      <h3 className="text-sm font-medium mb-3">過去の相談履歴</h3>
      {sessions.map(session => (
        <SessionCard key={session.id} session={session} />
      ))}
    </div>
  </CardContent>
</Card>
```

### 3. データベース設計

#### 既存テーブルの修正
```sql
-- sessionsテーブルに追加
ALTER TABLE sessions 
ADD COLUMN user_id UUID REFERENCES auth.users(id),
ADD COLUMN is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN summary TEXT,
ADD INDEX idx_sessions_user_id (user_id);

-- candidatesテーブルに追加
ALTER TABLE candidates
ADD COLUMN user_id UUID REFERENCES auth.users(id),
ADD UNIQUE INDEX idx_candidates_user_id (user_id);
```

#### 新規テーブル
```sql
-- ユーザーの最新セッション情報
CREATE TABLE user_latest_sessions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  latest_session_id UUID REFERENCES sessions(id),
  latest_cv_id UUID REFERENCES candidates(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- セッションのメタデータ
CREATE TABLE session_metadata (
  session_id UUID PRIMARY KEY REFERENCES sessions(id),
  total_messages INTEGER DEFAULT 0,
  last_message_at TIMESTAMP WITH TIME ZONE,
  ai_summary TEXT,
  topics TEXT[], -- 会話で扱ったトピック
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. API設計

#### 既存セッション取得
```typescript
// GET /api/v1/sessions/user
interface UserSessionsResponse {
  currentSession: {
    id: string;
    candidateId: string;
    createdAt: Date;
    messageCount: number;
    lastMessage: {
      content: string;
      createdAt: Date;
    };
  } | null;
  pastSessions: SessionSummary[];
}
```

#### セッション継続
```typescript
// POST /api/v1/sessions/continue
interface ContinueSessionRequest {
  sessionId: string;
}

interface ContinueSessionResponse {
  sessionId: string;
  messages: Message[];
  cvSummary: string;
}
```

### 5. 実装の詳細

#### セッション管理ロジック
```typescript
// /src/lib/session-manager.ts
export class SessionManager {
  // ユーザーの最新セッションを取得
  static async getLatestSession(userId: string): Promise<Session | null> {
    const { data } = await supabase
      .from('user_latest_sessions')
      .select(`
        latest_session_id,
        sessions!inner(
          id,
          candidate_id,
          created_at,
          messages(count)
        )
      `)
      .eq('user_id', userId)
      .single();
    
    return data?.sessions || null;
  }

  // セッションを継続
  static async continueSession(sessionId: string, userId: string): Promise<void> {
    // セッションの所有者確認
    const session = await this.verifySessionOwnership(sessionId, userId);
    
    // セッションをアクティブに設定
    await supabase
      .from('sessions')
      .update({ is_active: true })
      .eq('id', sessionId);
    
    // 最終アクセス時刻を更新
    await this.updateLastAccess(sessionId);
  }

  // 新規セッション作成時の処理
  static async createNewSession(userId: string, candidateId: string): Promise<string> {
    // 既存のアクティブセッションをアーカイブ
    await this.archiveActiveSessions(userId);
    
    // 新規セッション作成
    const sessionId = await this.createSession(candidateId, userId);
    
    // ユーザーの最新セッション情報を更新
    await this.updateLatestSession(userId, sessionId, candidateId);
    
    return sessionId;
  }
}
```

#### 会話履歴の取得と表示
```typescript
// /src/hooks/useChatHistory.ts
export function useChatHistory(sessionId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      const history = await fetchChatHistory(sessionId);
      setMessages(history);
      setIsLoading(false);
    };
    
    loadHistory();
  }, [sessionId]);

  return { messages, isLoading };
}
```

### 6. セキュリティ考慮事項

1. **アクセス制御**: ユーザーは自分のセッションのみアクセス可能
2. **セッション検証**: APIレベルでユーザーIDとセッションIDの整合性を確認
3. **データ暗号化**: 個人情報を含む会話履歴は暗号化して保存

### 7. テスト項目

1. **認証フロー**
   - 既存ユーザーのログイン時にセッション検出が正しく動作
   - 新規ユーザーは通常のフローに誘導される

2. **セッション管理**
   - 前回のセッションから正しく継続できる
   - 新規セッション作成時に既存セッションがアーカイブされる
   - 他ユーザーのセッションにアクセスできない

3. **UI/UX**
   - セッション選択画面が正しく表示される
   - 会話履歴が時系列順に表示される
   - ローディング状態が適切に表示される

### 8. マイグレーション戦略

1. **既存データの移行**
   ```sql
   -- 既存のsessionsにuser_idを追加
   UPDATE sessions s
   SET user_id = c.user_id
   FROM candidates c
   WHERE s.candidate_id = c.id
   AND c.user_id IS NOT NULL;
   ```

2. **段階的リリース**
   - Phase 1: 新規ユーザーのみ機能を有効化
   - Phase 2: 既存ユーザーにも展開
   - Phase 3: 古いセッション管理ロジックを削除

### 9. 今後の拡張案

1. **セッション管理機能**
   - セッションのエクスポート機能
   - セッションの共有機能（アドバイザーとの共有）
   - セッションのタグ付けと検索

2. **AI機能の強化**
   - 過去の会話を考慮したより精度の高い回答
   - 会話の自動要約と重要ポイントの抽出
   - 進捗トラッキング（目標設定と達成度の可視化）