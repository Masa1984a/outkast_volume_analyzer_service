# CR.md - Change Request: 枝番（Sequence Number）の導入

**作成日**: 2026-01-31
**ステータス**: 設計レビュー中
**優先度**: 中（データ整合性に関わるが、タイムアウト問題とは独立）

---

## 1. 枝番にする背景

### 1.1 現在の問題

**Hyperliquid APIの仕様**として、完全に同じトレードデータが複数回返されることがあります。

**実例（2026-01-29のデータより）**:
```csv
# Line 14と15（完全一致）
2026-01-29T02:42:45Z,0x0291639ea7178930475da17b579e1ac2de8faed8,BTC,Ask,88173,0.05688,true,Na,,true,...

# Line 90と91（完全一致）
2026-01-29T16:27:08Z,0x377d9cd94a8ab11c0bb53ca1ddfa08e28735feb1,SOL,Ask,117.53,1.21,true,Na,FrontendMarket,false,...
```

### 1.2 現在の実装の挙動

```typescript
// parser.ts
function calculateDataHash(row: FillCSVRow): string {
  const dataString = JSON.stringify(row, Object.keys(row).sort());
  return createHash('sha256').update(dataString).digest('hex');
}
```

```sql
-- schema.sql
UNIQUE(data_hash)
```

```sql
-- queries.ts（upsert処理）
ON CONFLICT (data_hash) DO NOTHING
```

**結果**: 完全に同じ行の2番目以降は**自動的に無視される** → データ欠損

### 1.3 データ欠損の影響

- **取引ボリュームの過小評価**: 同じパラメータで複数回取引が発生した場合、1回分しかカウントされない
- **取引回数の不正確性**: 実際のトレード数よりも少なく記録される
- **Pythonスクリプトとの不一致**: 参照実装との整合性が取れない可能性

### 1.4 なぜ今まで問題にならなかったか

CLAUDE.mdによると：
> 従来の`UNIQUE(transaction_time, user_address, coin, side, px, sz)`では約33%のデータが重複として除外されていた

これは「同じタイムスタンプで**異なる**counterpartyへの取引」が除外されていた問題で、`data_hash`導入で解決されました。

しかし、**完全に同じデータが複数存在する**ケースは想定されていませんでした。

---

## 2. 改修の考え方

### 2.1 枝番（Sequence Number）とは

同じ**元データ**（枝番を除くすべてのフィールド）を持つレコードに対して付与される**連番**です。

**例**:
```
元data_hash: abc123... → sequence_number: 1
元data_hash: abc123... → sequence_number: 2（2回目の出現）
元data_hash: abc123... → sequence_number: 3（3回目の出現）
元data_hash: def456... → sequence_number: 1（別のデータ）
```

### 2.2 一意性の保証方法

**変更前**:
```
UNIQUE(data_hash)
```

**変更後**:
```
UNIQUE(original_data_hash, sequence_number)
```

または、新しいdata_hashに枝番を含める：
```
data_hash = SHA256(元データ + sequence_number)
UNIQUE(data_hash)  -- 制約は維持
```

### 2.3 枝番の採番タイミング

#### 🟢 推奨アプローチ: CSV解析時に採番

**メリット**:
- シンプルで実装が容易
- パフォーマンスへの影響が最小
- 同じCSVファイル内の重複を確実に処理

**デメリット**:
- 異なるCSVファイルから同じデータが来た場合は別レコードになる（ただし、これは正常な動作）

**実装方法**:
```typescript
// parser.ts内で
const rowCountMap = new Map<string, number>();

records.forEach(row => {
  const originalHash = calculateOriginalDataHash(row);
  const count = (rowCountMap.get(originalHash) || 0) + 1;
  rowCountMap.set(originalHash, count);

  fill.sequenceNumber = count;
  fill.dataHash = calculateDataHashWithSequence(row, count);
});
```

#### ⚪ 代替アプローチ: DB upsert時に採番

**メリット**:
- 異なるソースからの重複も正しく処理
- データベース全体での一意性保証

**デメリット**:
- upsert処理が複雑化
- パフォーマンス低下（各行でSELECT COUNT(*)が必要）
- トランザクション制御が必須

**実装方法**:
```sql
-- 各行ごとに
SELECT COALESCE(MAX(sequence_number), 0) + 1
FROM fills
WHERE original_data_hash = '...'
```

### 2.4 data_hash計算の変更方針

#### 案A: 枝番を含めた新しいハッシュ（推奨）

```typescript
function calculateDataHash(row: FillCSVRow, sequenceNumber: number): string {
  const dataString = JSON.stringify(row, Object.keys(row).sort());
  const dataWithSeq = `${dataString}::${sequenceNumber}`;
  return createHash('sha256').update(dataWithSeq).digest('hex');
}
```

**メリット**:
- 既存のUNIQUE制約をそのまま使える
- 移行が容易

**デメリット**:
- 元データのハッシュが失われる（デバッグ時に不便）

#### 案B: 元ハッシュと枝番を別カラムで管理

```sql
original_data_hash VARCHAR(64) NOT NULL,
sequence_number INT NOT NULL DEFAULT 1,
UNIQUE(original_data_hash, sequence_number)
```

**メリット**:
- 元データのハッシュが保持される
- クエリで「同じ元データ」を簡単に検索可能

**デメリット**:
- スキーマ変更が大きい
- インデックスサイズが増加

**推奨**: **案B（別カラム管理）** - 長期的な保守性とデバッグのしやすさを重視

---

## 3. 具体的に改修する箇所

### 3.1 データベーススキーマ（schema.sql）

```sql
-- 変更前
CREATE TABLE IF NOT EXISTS fills (
  ...
  data_hash VARCHAR(64) NOT NULL,
  ...
  UNIQUE(data_hash)
);

-- 変更後
CREATE TABLE IF NOT EXISTS fills (
  ...
  original_data_hash VARCHAR(64) NOT NULL,
  sequence_number INT NOT NULL DEFAULT 1,
  ...
  UNIQUE(original_data_hash, sequence_number)
);

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_fills_original_data_hash
  ON fills(original_data_hash);
```

**マイグレーション**:
```sql
-- 既存データの変換
ALTER TABLE fills ADD COLUMN original_data_hash VARCHAR(64);
ALTER TABLE fills ADD COLUMN sequence_number INT NOT NULL DEFAULT 1;

-- 既存のdata_hashをoriginal_data_hashにコピー
UPDATE fills SET original_data_hash = data_hash;

-- 既存のUNIQUE制約を削除
ALTER TABLE fills DROP CONSTRAINT fills_data_hash_key;

-- 新しいUNIQUE制約を追加
ALTER TABLE fills ADD CONSTRAINT fills_original_hash_seq_key
  UNIQUE(original_data_hash, sequence_number);

-- data_hashカラムは互換性のため残すか、削除するか検討
-- ALTER TABLE fills DROP COLUMN data_hash;
```

### 3.2 型定義（src/types/fill.ts）

```typescript
// 変更前
export interface Fill {
  ...
  dataHash: string;
  ...
}

// 変更後
export interface Fill {
  ...
  originalDataHash: string;
  sequenceNumber: number;
  dataHash?: string; // 互換性のため残す（後で削除可能）
  ...
}
```

### 3.3 CSVパーサー（src/lib/hyperliquid/parser.ts）

```typescript
// 新しい関数: 元データのハッシュ計算
function calculateOriginalDataHash(row: FillCSVRow): string {
  const dataString = JSON.stringify(row, Object.keys(row).sort());
  return createHash('sha256').update(dataString).digest('hex');
}

export function parseCSVToFills(csvContent: string, dateStr: string): Fill[] {
  try {
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as FillCSVRow[];

    // 同じ行の出現回数をカウント
    const rowCountMap = new Map<string, number>();

    const fills: Fill[] = records.map((row) => {
      // 元データのハッシュを計算
      const originalHash = calculateOriginalDataHash(row);

      // この行が何回目の出現か
      const currentCount = (rowCountMap.get(originalHash) || 0) + 1;
      rowCountMap.set(originalHash, currentCount);

      const transactionTime = new Date(row.time);
      const crossed = row.crossed === 'true' || row.crossed === 'True';
      const isTrigger = row.isTrigger === 'true' || row.isTrigger === 'True';

      const fill: Fill = {
        transactionTime,
        dateStr,
        userAddress: row.user.toLowerCase(),
        coin: row.coin,
        side: row.side as 'Bid' | 'Ask',
        px: parseFloat(row.px),
        sz: parseFloat(row.sz),
        crossed,
        isTrigger,
        specialTradeType: row.specialTradeType || undefined,
        tif: row.tif || undefined,
        counterparty: row.counterparty ? row.counterparty.toLowerCase() : undefined,
        closedPnl: row.closedPnl ? parseFloat(row.closedPnl) : undefined,
        twapId: row.twapId ? BigInt(row.twapId) : undefined,
        builderFee: row.builderFee ? parseFloat(row.builderFee) : undefined,
        rawDataJson: row,
        originalDataHash: originalHash,
        sequenceNumber: currentCount,
      };

      return fill;
    });

    // ログ出力: 重複があった場合に通知
    const duplicates = Array.from(rowCountMap.entries())
      .filter(([_, count]) => count > 1);

    if (duplicates.length > 0) {
      console.log(`[${dateStr}] Found ${duplicates.length} duplicate row(s):`);
      duplicates.forEach(([hash, count]) => {
        console.log(`  - Hash ${hash.substring(0, 8)}...: ${count} occurrences`);
      });
    }

    return fills;
  } catch (error) {
    console.error('CSV parsing error:', error);
    throw new Error(
      `Failed to parse CSV: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
```

### 3.4 データベースクエリ（src/lib/db/queries.ts）

```typescript
export async function upsertFills(fills: Fill[]): Promise<void> {
  if (fills.length === 0) return;

  const startTime = Date.now();
  console.log(`  [DB] Starting upsert of ${fills.length} fills...`);

  const buildStartTime = Date.now();
  const placeholders: any[] = [];
  let paramIndex = 1;

  const valuesClauses = fills.map(fill => {
    const transactionTime = fill.transactionTime.toISOString();
    const dateStr = fill.dateStr;
    const userAddress = fill.userAddress;
    const coin = fill.coin;
    const side = fill.side;
    const px = fill.px;
    const sz = fill.sz;
    const crossed = fill.crossed;
    const specialTradeType = fill.specialTradeType || null;
    const tif = fill.tif || null;
    const isTrigger = fill.isTrigger;
    const counterparty = fill.counterparty || null;
    const closedPnl = fill.closedPnl ?? null;
    const twapId = fill.twapId ?? null;
    const builderFee = fill.builderFee ?? null;
    const rawDataJson = fill.rawDataJson ? JSON.stringify(fill.rawDataJson) : null;
    const originalDataHash = fill.originalDataHash;
    const sequenceNumber = fill.sequenceNumber;

    placeholders.push(
      transactionTime, dateStr, userAddress, coin, side, px, sz,
      crossed, specialTradeType, tif, isTrigger, counterparty,
      closedPnl, twapId, builderFee, rawDataJson,
      originalDataHash, sequenceNumber  // 枝番を追加
    );

    // パラメータ数が17 → 18に増加
    const params = Array.from({ length: 18 }, (_, i) => `$${paramIndex + i}`).join(', ');
    paramIndex += 18;

    return `(${params})`;
  }).join(', ');

  const buildElapsed = Date.now() - buildStartTime;
  console.log(`  [DB] Query built in ${buildElapsed}ms (${placeholders.length} parameters)`);

  const query = `
    INSERT INTO fills (
      transaction_time, date_str, user_address, coin, side, px, sz,
      crossed, special_trade_type, tif, is_trigger, counterparty,
      closed_pnl, twap_id, builder_fee, raw_data_json,
      original_data_hash, sequence_number
    ) VALUES ${valuesClauses}
    ON CONFLICT (original_data_hash, sequence_number) DO NOTHING
  `;

  console.log(`  [DB] Executing query (query length: ${query.length} chars)...`);
  const queryStartTime = Date.now();

  await sql.query(query, placeholders);

  const queryElapsed = Date.now() - queryStartTime;
  const totalElapsed = Date.now() - startTime;
  console.log(`  [DB] Query executed in ${queryElapsed}ms (total: ${totalElapsed}ms)`);
}
```

### 3.5 その他のクエリの修正

すべてのSELECT文で`original_data_hash`と`sequence_number`を扱えるように修正：

```typescript
// src/lib/db/queries.ts - getFillsByDateRange など
export async function getFillsByDateRange(
  fromDate: string,
  toDate: string
): Promise<Fill[]> {
  const result = await sql`
    SELECT
      id,
      transaction_time as "transactionTime",
      date_str as "dateStr",
      user_address as "userAddress",
      coin,
      side,
      px,
      sz,
      volume_usd as "volumeUsd",
      crossed,
      special_trade_type as "specialTradeType",
      tif,
      is_trigger as "isTrigger",
      counterparty,
      closed_pnl as "closedPnl",
      twap_id as "twapId",
      builder_fee as "builderFee",
      raw_data_json as "rawDataJson",
      original_data_hash as "originalDataHash",
      sequence_number as "sequenceNumber",
      created_at as "createdAt"
    FROM fills
    WHERE date_str >= ${fromDate} AND date_str <= ${toDate}
    ORDER BY transaction_time DESC, sequence_number ASC
  `;

  return result.rows as Fill[];
}
```

---

## 4. 実装手順

### Phase 1: 準備（リスク：低）
1. ✅ CR.mdの作成とレビュー
2. ⬜ マイグレーションスクリプトの作成
3. ⬜ ロールバックスクリプトの作成
4. ⬜ テストデータの準備

### Phase 2: スキーマ変更（リスク：中）
1. ⬜ 本番DBのバックアップ
2. ⬜ マイグレーションの実行（`original_data_hash`, `sequence_number`カラム追加）
3. ⬜ 既存データの整合性確認
4. ⬜ インデックスの作成

### Phase 3: コード変更（リスク：低）
1. ⬜ `types/fill.ts`の更新
2. ⬜ `parser.ts`の更新
3. ⬜ `queries.ts`の更新
4. ⬜ ビルドとTypeScriptエラーの解消

### Phase 4: テストとデプロイ（リスク：中）
1. ⬜ ローカル環境でテスト
2. ⬜ 既知の重複データでテスト（2026-01-29.csv）
3. ⬜ Vercelへのデプロイ
4. ⬜ Cronジョブの動作確認

### Phase 5: 検証（リスク：低）
1. ⬜ データ件数の確認（枝番導入前後の差分）
2. ⬜ 重複データが正しく保存されているか確認
3. ⬜ ダッシュボードの表示確認

---

## 5. リスクと軽減策

### リスク1: 既存データの破損
**確率**: 低
**影響**: 大
**軽減策**:
- マイグレーション前に必ずバックアップ
- ロールバックスクリプトの準備
- ステージング環境での事前テスト

### リスク2: データ量の増加
**確率**: 中
**影響**: 中
**内容**: 重複データが保存されるようになり、データベースサイズが増加
**軽減策**:
- 現在の重複率を事前調査（2026-01-29は111行中2行 = 1.8%）
- ストレージ使用量の監視

### リスク3: パフォーマンス低下
**確率**: 低
**影響**: 小
**軽減策**:
- `original_data_hash`にインデックスを作成
- 複合UNIQUE制約はインデックスとして機能

### リスク4: 想定外の重複パターン
**確率**: 低
**影響**: 中
**内容**: CSV内で3回以上の重複が発生する可能性
**軽減策**:
- ログで重複を検出・通知
- 異常な重複（10回以上など）はアラートを出す

---

## 6. 未解決の質問

### Q1: 既存の`data_hash`カラムは削除すべきか？
**オプション**:
- A: 削除（スキーマをクリーンに保つ）
- B: 残す（互換性のため、後で削除）

**推奨**: B（段階的な移行）

### Q2: 異なる日のCSVファイル間での重複はどう扱うか？
**現状の実装（CSV内採番）**: 別レコードとして扱う
**理由**: 同じデータが異なる日に再度送信されることは稀であり、実装の複雑さを避ける

### Q3: マイグレーション時、既存データの枝番はすべて1で良いか？
**推奨**: はい
**理由**: 既存データは重複が除外されているため、すべて`sequence_number = 1`が適切

---

## 7. 参考資料

### 関連する既存ドキュメント
- `CLAUDE.md` - データの一意性保証に関する記述
- `Requirement.md` - プロジェクト要件
- `src/lib/db/schema.sql` - 現在のスキーマ定義

### 重複データの実例
- ファイル: `20260129.csv.lz4` / `hyperliquid_data.csv`
- Line 14-15: 完全一致
- Line 90-91: 完全一致

### データ検証用クエリ
```sql
-- 現在の重複除外によるデータ欠損を推定
-- （本番環境では実行不可、APIからの生データと比較が必要）
```

---

## 8. 承認

- [ ] プロジェクトオーナー
- [ ] バックエンド担当
- [ ] データベース管理者

---

## 9. 変更履歴

| 日付 | バージョン | 変更内容 | 著者 |
|------|-----------|---------|------|
| 2026-01-31 | 1.0 | 初版作成 | Claude Code |

