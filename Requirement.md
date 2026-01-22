# OUTKAST Volume Dashboard システム要件定義書

## 1. プロジェクト概要

Hyperliquidにおける特定Builder（OUTKAST）の取引データを収集・蓄積し、ウォレットごとの取引ボリュームや時系列推移を可視化するWebダッシュボードを構築する。
Vercel Pro環境を活用し、データの自動定期更新とユーザーフレンドリーな分析インターフェースを提供する。

## 2. システム構成図 (アーキテクチャ)

Vercelの機能を最大限活用するため、以下の構成とする。

```mermaid
graph TD
    User[ユーザー] -->|アクセス| FE[Frontend Project (Next.js)]
    FE -->|クエリ| DB[(Vercel Postgres / Supabase)]
    
    subgraph Vercel Environment
        FE
        Batch[Batch Project / Cron Jobs]
    end
    
    Batch -->|定期実行 (4時間に1回)| ExtAPI[Hyperliquid Data API]
    ExtAPI -->|LZ4データ取得| Batch
    Batch -->|データ保存/更新| DB
    
    Migration[移行/初期投入スクリプト] -->|CSV or ヒストリカル取得| DB

```

## 3. 機能要件

### 3.1. 画面表示 (Dashboard UI)

ユーザーがブラウザで操作する画面機能。

* **期間指定フィルター**
* `From` と `To` を日付単位（カレンダー形式）で選択可能にする。
* デフォルトは直近1ヶ月（例: 先月1日〜昨日）とする。


* **カスタムウォレット指定**
* 任意のウォレットアドレスを入力できるテキストボックスを設置する。
* 入力されたアドレスがランキング外であっても、グラフ上で強調表示（特定色）を行う。


* **チャート表示 (Recharts等を使用)**
* **積み上げ棒グラフ**: 日次または期間合計のボリュームを表示。
* **カラーリング要件**:
* 期間内の取引量 上位1位〜5位: 指定された固定色（赤、ターコイズ、青、緑、黄など `outkast_charts.py` 準拠）。
* その他: グレー。
* カスタム指定ウォレット: 視認性の高い別色（例: 紫や濃いオレンジ）でオーバーレイまたは強調。




* **ランキングリスト**
* 期間内の合計ボリューム順にウォレットリストを表示。
* 表示項目: 順位、アドレス（短縮表示）、ボリューム($)、シェア率(%)、取引回数。


* **統計サマリー**
* 選択期間中の Total Volume, Unique Wallets, Total Trades を表示。



### 3.2. バッチ処理 (Data Sync)

データの定期取得とDB反映を行うバックエンド機能。

* **実行スケジュール**
* Vercel Cron Jobsを使用し、4時間に1回実行。


* **データ取得ロジック**
* 既存の `outkast_volume_analyzer.py` のロジック（LZ4解凍・パース）をTypeScript/Node.jsに移植、またはPython Runtimeで実行。
* **対象範囲の決定**:
* DB内の「最新データ日付」を取得。
* 「最新データ日付の翌日」から「現在時刻の2日前（ラグ考慮）」までの期間を対象にループ処理を行う。
* Hyperliquidのデータ仕様（UTC 0:00締め、1-2日のラグ）を考慮し、404エラー（データ未生成）の場合はスキップし、次回のバッチで再試行する。




* **データ保存**
* 取得したデータをパースし、データベースへUpsert（重複排除して挿入）する。



### 3.3. データ移行・初期投入 (Migration)

サービス稼働開始時に過去データを投入する仕組み。

* **CSVインポート機能**
* 既存の `outkast_raw_fills.csv` を読み込み、DBへ一括登録するスクリプトを用意する。


* **ヒストリカルデータ取得**
* CSV以前または以後のデータを、指定期間分まとめてAPIから取得・投入できる管理者用スクリプト（またはAPIエンドポイント）を用意する。



## 4. データ要件 (データベース設計案)

リレーショナルデータベース（PostgreSQL）を推奨。

### テーブル定義: `fills` (取引明細)

`outkast_raw_fills.csv` の内容を正規化して保存する。

| カラム名 | データ型 | 説明 | 備考 |
| --- | --- | --- | --- |
| `id` | SERIAL | 主キー |  |
| `transaction_time` | TIMESTAMP | 取引日時 | `time` (ISO8601) |
| `date_str` | DATE | 日付検索用 | `date` (YYYY-MM-DD) インデックス推奨 |
| `user_address` | VARCHAR(42) | ウォレットアドレス | `user` インデックス推奨 |
| `coin` | VARCHAR(20) | 通貨ペア | `coin` |
| `side` | VARCHAR(4) | 売買 | `side` (Bid/Ask) |
| `px` | DECIMAL | 価格 | `px` |
| `sz` | DECIMAL | 数量 | `sz` |
| `volume_usd` | DECIMAL | 取引額(USD) | 計算値 (`px` * `sz`) |
| `raw_data_json` | JSONB | その他生データ | 将来の拡張用 (fee, crossed等) |

※ パフォーマンス向上のため、日次・ウォレットごとの集計テーブル（`daily_wallet_stats`）を別途作成し、バッチ時に計算しておく設計も検討する（レコード数が数百万件を超える場合）。

## 5. 技術スタック推奨案

| カテゴリ | 技術要素 | 選定理由 |
| --- | --- | --- |
| **Frontend** | **Next.js (App Router)** | Vercelとの親和性が最高。SSR/ISRによる高速表示。 |
| **UI Library** | **Tailwind CSS + Shadcn/ui** | モダンで構築が早い。 |
| **Charts** | **Recharts** | React製のチャートライブラリ。カスタマイズ性が高い。 |
| **Backend** | **Next.js API Routes / Server Actions** | フロントエンドと統合管理可能。 |
| **Job Scheduler** | **Vercel Cron** | プロジェクト設定だけで定期実行が可能。 |
| **Database** | **Vercel Postgres** (Neon) | Vercelダッシュボードから管理可能。サーバーレス。 |
| **Data Logic** | **TypeScript (Node.js)** | Pythonスクリプト(`lz4`, `requests`)のロジックをJSライブラリ(`lz4-js`等)で再実装し、型安全に管理する。 |

## 6. 非機能要件

* **パフォーマンス**
* 大量のデータポイントがある場合でも、チャート描画が3秒以内に完了すること。
* 必要に応じてDB側で集計（Aggregation）を行い、フロントエンドの計算負荷を下げる。


* **可用性**
* Hyperliquidのデータソースが403や404を返した場合でも、システム全体がクラッシュせず、エラーログを残して正常終了すること。


* **拡張性**
* 将来的にOUTKAST以外のBuilderアドレスも監視できるように、設定ファイルまたは環境変数でアドレスを管理する。



## 7. 開発フェーズとマイルストーン

1. **Phase 1: データベース構築と移行**
* Vercel Postgresセットアップ。
* Pythonロジックの解析とCSVインポーター作成。
* 初期データ投入。


2. **Phase 2: バッチ処理の実装**
* APIからのLZ4ダウンロード・解凍・DB保存ロジックの実装。
* Cronジョブの設定と動作確認。


3. **Phase 3: ダッシュボード実装**
* API作成（期間指定での集計データ返却）。
* UI構築（チャート、フィルター、ランキング）。
* 色分けロジックの実装。


4. **Phase 4: デプロイと運用**
* Vercelへのデプロイ。
* 定期更新のモニタリング。



---

### Pythonスクリプトからの特記事項・反映点

* **色定義の継承**: `outkast_charts.py` 内の `COLORS` 定数（'#FF6B6B'など）をCSS変数またはTailwindの設定としてフロントエンドに移植する。
* **LZ4処理**: `outkast_volume_analyzer.py` で行っている `lz4.frame.decompress` は、Node.js環境では `lz4` npmパッケージ等で代替実装が必要。
* **データソースURL**: `https://stats-data.hyperliquid.xyz/Mainnet/builder_fills` を環境変数として管理する。
* 参考ファイルはフォルダ「.ref」に格納している
