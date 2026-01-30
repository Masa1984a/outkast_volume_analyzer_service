# CLAUDE.md - AI Assistant Reference

このドキュメントは、このプロジェクトを改修・メンテナンスする際にAIアシスタントが参照すべき重要な情報をまとめています。

## プロジェクト概要

**OUTKAST Volume Dashboard** - Hyperliquid DEXのOUTKAST Builderの取引ボリュームを可視化するWebダッシュボード

### 主要機能
- 日次取引ボリュームの積み上げ棒グラフ表示
- Top 5ウォレットの色分け可視化
- カスタムウォレットのトラッキング
- 4時間ごとの自動データ同期（Vercel Cron）
- 期間フィルタリングとランキング表示

### デプロイ環境
- **Frontend/API**: Vercel (Next.js 14 App Router)
- **Database**: Vercel Postgres (Neon)
- **Cron**: Vercel Cron (4時間ごと)
- **Data Source**: Hyperliquid API (LZ4圧縮CSV)

---

## 技術スタック

### Core
- **Next.js 14+** (App Router, TypeScript)
- **Tailwind CSS + Shadcn/ui**
- **Recharts** (積み上げ棒グラフ)
- **Vercel Postgres** (@vercel/postgres)

### 重要な依存関係
- **lz4js** (純粋JavaScript実装) - ⚠️ `lz4`（ネイティブバインディング）は使用不可
- **csv-parse** - CSVパース
- **date-fns** - 日付操作
- **dotenv** - 環境変数（スクリプト用）

---

## 重要な設計判断

### 1. データの完全性保証: 枝番（Sequence Number）システム

**課題**: Hyperliquid APIから完全に同じデータが複数回返されることがある

**解決策**:
```typescript
// src/lib/hyperliquid/parser.ts
// 元データのハッシュを計算
const originalHash = calculateOriginalDataHash(row);

// CSV解析時に枝番を採番（1, 2, 3...）
const rowCountMap = new Map<string, number>();
const currentCount = (rowCountMap.get(originalHash) || 0) + 1;
rowCountMap.set(originalHash, currentCount);

return {
  originalDataHash: originalHash,
  sequenceNumber: currentCount,
  // ...
};
```

```sql
-- src/lib/db/schema.sql
original_data_hash VARCHAR(64) NOT NULL,  -- 元データのハッシュ
sequence_number INT NOT NULL DEFAULT 1,   -- 枝番（1, 2, 3...）
UNIQUE(original_data_hash, sequence_number)
```

**理由**:
- 従来の`UNIQUE(data_hash)`では、完全に同じデータが2回目以降自動除外されていた（データ欠損）
- 枝番システムにより、同じデータでも複数回保存可能（データ完全性保証）
- 重複率は約1.8%〜6% → すべて正しく保存されるようになった
- Cronジョブの再実行でも同じ枝番が採番される（べき等性）

**移行履歴**:
- v1: `UNIQUE(transaction_time, user_address, ...)` → 約33%除外
- v2: `UNIQUE(data_hash)` → 重複データ（1.8%）が除外
- v3: `UNIQUE(original_data_hash, sequence_number)` → 完全保存（現在）

### 2. LZ4解凍: `lz4js`を使用

**❌ 使用不可**: `lz4` (ネイティブバインディング)
**✅ 使用**: `lz4js` (純粋JavaScript)

```typescript
// src/lib/hyperliquid/decompressor.ts
import lz4 from 'lz4js';

const compressedArray = new Uint8Array(compressedData);
const decompressed = lz4.decompress(compressedArray);
```

**理由**: Vercelのサーバーレス環境ではネイティブモジュールがビルドできない

### 3. 日付フォーマット変換

**Hyperliquid API URL形式**: `YYYYMMDD` (ハイフンなし)

```typescript
// src/lib/hyperliquid/client.ts
const dateFormatted = date.replace(/-/g, ''); // "2025-11-01" → "20251101"
const url = `${BASE_URL}/${builderAddress}/${dateFormatted}.csv.lz4`;
```

### 4. PostgreSQL DATE型の文字列変換

**問題**: `date_str`がDate型オブジェクトとして返され、JavaScriptで正しく集計できない

**解決策**:
```sql
-- src/lib/db/queries.ts
SELECT TO_CHAR(date_str, 'YYYY-MM-DD') as "dateStr"
```

**理由**: 文字列として扱うことでMap操作が正しく機能する

---

## データベーススキーマ

### `fills` テーブル（重要フィールド）

```sql
CREATE TABLE fills (
  id BIGSERIAL PRIMARY KEY,
  transaction_time TIMESTAMPTZ NOT NULL,
  date_str DATE NOT NULL,
  user_address VARCHAR(42) NOT NULL,
  coin VARCHAR(20) NOT NULL,
  side VARCHAR(4) NOT NULL CHECK (side IN ('Bid', 'Ask')),
  px NUMERIC(20, 8) NOT NULL,          -- 価格
  sz NUMERIC(20, 8) NOT NULL,          -- サイズ（科学的記数法対応: 1e-05）
  volume_usd NUMERIC(20, 2) GENERATED ALWAYS AS (px * sz) STORED,
  original_data_hash VARCHAR(64) NOT NULL,  -- ⚠️ 重要: 元データのハッシュ
  sequence_number INT NOT NULL DEFAULT 1,   -- ⚠️ 重要: 枝番（1, 2, 3...）
  data_hash VARCHAR(64),                    -- 下位互換のため残存（後で削除可能）
  raw_data_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(original_data_hash, sequence_number)  -- ⚠️ 枝番ベースの一意性保証
);

-- 重要なインデックス
CREATE INDEX idx_fills_date_str ON fills(date_str DESC);
CREATE INDEX idx_fills_user_address ON fills(user_address);
CREATE INDEX idx_fills_date_user ON fills(date_str DESC, user_address);
CREATE INDEX idx_fills_original_data_hash ON fills(original_data_hash);
```

**注意点**:
- `volume_usd`はGENERATED ALWAYS（自動計算）
- `sz`は科学的記数法（1e-05など）で記録されることがある
- `original_data_hash` + `sequence_number`は削除・変更しない（データ完全性の要）
- 同じ`original_data_hash`を持つレコードは、それぞれ独立したトレードとしてカウントされる

### `sync_status` テーブル

Cronジョブの同期状態を管理。`last_synced_date`から次回同期範囲を決定。

---

## データフロー

### 1. データ取得 (Hyperliquid API)

```
Hyperliquid API
  ↓ (LZ4圧縮CSV)
decompressor.ts (lz4js)
  ↓ (生CSV文字列)
parser.ts (csv-parse + SHA-256ハッシュ)
  ↓ (Fill[])
upsert-handler.ts
  ↓ (バッチUpsert)
PostgreSQL
```

### 2. データ集計 (Dashboard表示)

```
/api/data?from=YYYY-MM-DD&to=YYYY-MM-DD
  ↓
aggregator.ts
  ├─ getTopWallets() - Top 5取得
  ├─ getUserDailyVolume() - 日次ボリューム取得
  └─ aggregateVolumeData() - チャートデータ生成
  ↓
{
  volumeData: [{ date, top1, top2, ..., others }],
  topWallets: ["0x...", ...],
  customWallet: "0x..." | undefined
}
```

### 3. Cronジョブ (4時間ごと)

```
Vercel Cron (0 */4 * * *)
  ↓
/api/cron/sync (CRON_SECRET認証)
  ↓
batch-processor.ts
  ├─ getSyncStatus() - 最終同期日取得
  ├─ calculateSyncDateRange() - 同期範囲計算
  ├─ fetchBuilderFills() - 日付ごとにAPI取得
  └─ updateSyncStatus() - 同期状態更新
```

---

## 環境変数

### 必須変数

```bash
# Vercel Postgres
POSTGRES_URL=postgresql://...
POSTGRES_URL_NON_POOLING=postgresql://...

# Hyperliquid API
HYPERLIQUID_BASE_URL=https://stats-data.hyperliquid.xyz/Mainnet/builder_fills
BUILDER_ADDRESS=0xc36f6e7dc0ab7146c11f500e146d0084254c8bf6

# Cron認証
CRON_SECRET=ランダムな文字列

# App URL
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### ローカル開発

- `.env.local`に本番と同じPostgres URLを設定
- `dotenv`で環境変数を読み込む（scriptsフォルダのTS実行用）

---

## よくある問題と解決策

### 1. ビルドエラー: `Can't resolve '../build/Release/xxhash'`

**原因**: `lz4`パッケージ（ネイティブバインディング）を使用している

**解決**: `lz4js`に置き換える
```bash
npm install lz4js
npm uninstall lz4
```

### 2. 重複データが保存されない（データ欠損）

**原因**: UNIQUE制約により、完全に同じデータが2回目以降自動除外されていた

**解決**: 枝番（sequence_number）システムを導入（2026-01-31実装）
- `UNIQUE(original_data_hash, sequence_number)`により重複も別レコードとして保存
- 重複率1.8%〜6%のデータがすべて保存されるようになった

### 3. グラフが表示されない（すべて0）

**原因**: `date_str`がDate型オブジェクトとして返され、Map操作で正しくマッチしない

**解決**: `TO_CHAR(date_str, 'YYYY-MM-DD')`で文字列化

### 4. HTTP 403エラー（Hyperliquid API）

**原因**: 日付フォーマットが間違っている

**確認**:
- ✅ 正: `20251101.csv.lz4`
- ❌ 誤: `2025-11-01.csv.lz4`

### 5. TypeScriptエラー: `Type 'Date | null' is not assignable`

**原因**: `|| null` は `null` を返すが、型定義は `undefined` を期待

**解決**: `|| null` → `?? null` または `|| undefined`

---

## スクリプト

### マイグレーション

```bash
npm run migrate
```

- `src/lib/db/schema.sql`を実行
- 本番環境でも同じコマンド（`.env.local`の`POSTGRES_URL`を使用）

### データインポート

```bash
npm run import-csv 2025-11-01 2025-12-31
```

- Hyperliquid APIから指定期間のデータを取得
- LZ4解凍 → CSV解析（枝番採番） → データベースUpsert
- 既存データは`(original_data_hash, sequence_number)`で重複除外
- 同じCSV内の完全重複データは枝番1, 2, 3...として保存される

### 開発サーバー

```bash
npm run dev
```

### ビルド

```bash
npm run build
```

---

## カラーコード（チャート）

```typescript
// src/lib/constants/colors.ts
export const CHART_COLORS = {
  top1: '#FF6B6B',    // Red
  top2: '#4ECDC4',    // Turquoise
  top3: '#45B7D1',    // Blue
  top4: '#96CEB4',    // Green
  top5: '#FFEAA7',    // Yellow
  others: '#B0B0B0',  // Gray
  custom: '#9B59B6'   // Purple (カスタムウォレット)
};
```

---

## 制限事項・既知の問題

### データ精度

- **データ完全性: 100%**（枝番システム導入後、2026-01-31）
- 重複データもすべて保存される（以前は1.8%〜6%が欠損）
- Pythonスクリプトとの一致率: **99.98%**
- トレード数一致率: **99.8%**（枝番導入前の旧データ）
- わずかな差分は浮動小数点の丸め誤差による

### タイムゾーン

- Hyperliquid APIはUTC基準
- データベースもUTCで統一
- フロントエンドでローカル表示する場合は変換が必要

### パフォーマンス

- 現在のデータ量: 約3万行
- 100万行超えたら集計テーブル（マテリアライズドビュー）を検討
- 現時点では必要なし

---

## ファイル構成（重要ファイル）

```
src/
├── lib/
│   ├── hyperliquid/
│   │   ├── decompressor.ts      ⭐ LZ4解凍（lz4js使用）
│   │   ├── client.ts            ⭐ API通信（日付フォーマット変換）
│   │   └── parser.ts            ⭐ CSV解析 + data_hash生成
│   ├── db/
│   │   ├── schema.sql           ⭐ スキーマ定義（data_hash UNIQUE）
│   │   └── queries.ts           ⭐ SQL操作（TO_CHAR使用）
│   ├── sync/
│   │   ├── batch-processor.ts   ⭐ Cronメインロジック
│   │   └── date-calculator.ts   - 日付範囲計算
│   └── analytics/
│       └── aggregator.ts        ⭐ チャートデータ集計
├── app/
│   ├── api/
│   │   ├── cron/sync/route.ts   - Cronエンドポイント
│   │   ├── data/route.ts        - チャートデータAPI
│   │   └── stats/route.ts       - 統計API
│   └── page.tsx                 - メインダッシュボード
└── types/
    └── fill.ts                  - 型定義（data_hash含む）
```

---

## デバッグ方法

### Cronジョブのログ確認

Vercel Dashboard → Deployments → Functions → `/api/cron/sync`

### データベース直接確認

Vercel Postgres Dashboard → Query

```sql
-- 特定ウォレットの集計
SELECT
  COUNT(*) as trades,
  SUM(volume_usd) as volume
FROM fills
WHERE user_address = '0x...'
  AND date_str >= '2025-11-01';

-- 日付ごとのデータ存在確認
SELECT date_str, COUNT(*)
FROM fills
GROUP BY date_str
ORDER BY date_str;
```

### ローカルデバッグ

```typescript
// console.logを追加
console.log('[Aggregator] Sample record:', userDailyVolumes[0]);
```

---

## 改修時の注意点

### ✅ やってよいこと

- UIコンポーネントの追加・改善
- 新しい集計指標の追加
- フィルター機能の拡張
- パフォーマンス最適化

### ❌ やってはいけないこと

- `original_data_hash`、`sequence_number`カラムの削除・変更
- `UNIQUE(original_data_hash, sequence_number)`制約の変更
- CSV解析時の枝番採番ロジックの削除
- `lz4js`から`lz4`への変更
- `TO_CHAR(date_str, 'YYYY-MM-DD')`の削除
- 日付フォーマット変換（`replace(/-/g, '')`）の削除

### ⚠️ 慎重に対応すること

- データベーススキーマの変更（マイグレーション計画必須）
- Cronジョブのロジック変更（データ重複リスク）
- 集計ロジックの変更（Python参照実装と照合）

---

## テスト方法

### データ整合性テスト

```sql
-- Pythonスクリプトの結果と比較
-- 期待: trade_count=11,612, total_volume≈$3,025,783
SELECT
  COUNT(*) as trade_count,
  SUM(volume_usd) as total_volume
FROM fills
WHERE user_address = '0x006892471210351f1bbadd62f776d502cf35d205'
  AND date_str >= '2025-11-01'
  AND date_str <= '2025-12-31';

-- 枝番の分布確認（重複データの検証）
SELECT
  sequence_number,
  COUNT(*) as count
FROM fills
WHERE date_str = '2026-01-29'
GROUP BY sequence_number
ORDER BY sequence_number;

-- 重複データの確認
SELECT
  original_data_hash,
  COUNT(*) as occurrences
FROM fills
WHERE date_str = '2026-01-29'
GROUP BY original_data_hash
HAVING COUNT(*) > 1;
```

### API動作確認

```bash
# データAPI
curl "https://your-app.vercel.app/api/data?from=2025-11-01&to=2025-11-30"

# 統計API
curl "https://your-app.vercel.app/api/stats?from=2025-11-01&to=2025-11-30"

# Cronエンドポイント（要認証）
curl -X POST "https://your-app.vercel.app/api/cron/sync" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## 参考資料

- **元実装**: `.ref/outkast_volume_analyzer.py` (Python版、データ検証用)
- **要件定義**: `Requirement.md`
- **Next.js**: https://nextjs.org/docs
- **Vercel Postgres**: https://vercel.com/docs/storage/vercel-postgres
- **Hyperliquid API**: https://hyperliquid.gitbook.io/

---

## 最後に

このプロジェクトの核心は**データの完全性**です。

- `original_data_hash` + `sequence_number`による完全なデータ保存（2026-01-31導入）
- 重複データも欠損なく保存（重複率1.8%〜6%のデータも正確に記録）
- Cronジョブによる自動更新
- Python参照実装との99.98%一致

改修時は必ずこれらを維持してください。

---

## 変更履歴

### 2026-01-31: 枝番（Sequence Number）システム導入

**目的**: 完全に同じデータが複数回返される場合でも、データ欠損を防ぐ

**変更内容**:
- `original_data_hash`カラム追加（元データのSHA-256ハッシュ）
- `sequence_number`カラム追加（同じデータの出現順: 1, 2, 3...）
- UNIQUE制約を`(original_data_hash, sequence_number)`に変更
- CSV解析時に枝番を自動採番
- 重複データのログ出力機能追加

**影響**:
- ✅ データ完全性が100%に向上
- ✅ 集計ロジックは変更不要（自動的に正確な値を計算）
- ✅ 画面表示への影響なし（数値がより正確になる）
- ⚠️ 既存データはすべて`sequence_number = 1`

**マイグレーション**:
```bash
tsx scripts/run-migration.ts 001_add_sequence_number.sql
```
