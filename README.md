# OUTKAST Volume Dashboard

A Next.js dashboard for analyzing Hyperliquid OUTKAST Builder trading volume data.

## Features

- Real-time volume analytics from Hyperliquid
- Interactive stacked bar charts showing daily volume by wallet
- Top 5 wallet rankings with color-coded visualization
- Custom wallet tracking and comparison
- Automatic data synchronization every 4 hours via Vercel Cron
- LZ4 decompression for efficient data fetching

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **UI**: Tailwind CSS, Shadcn/ui
- **Charts**: Recharts
- **Database**: Vercel Postgres (Neon)
- **Data Processing**: lz4, csv-parse
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- Vercel account (for Postgres database)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd outkast_volume_analyzer_service
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory:
```bash
# Vercel Postgres Database URLs
POSTGRES_URL=postgresql://user:password@host:5432/database
POSTGRES_URL_NON_POOLING=postgresql://user:password@host:5432/database

# Hyperliquid API Configuration
HYPERLIQUID_BASE_URL=https://stats-data.hyperliquid.xyz/Mainnet/builder_fills
BUILDER_ADDRESS=0xc36f6e7dc0ab7146c11f500e146d0084254c8bf6

# Cron Secret (random string for securing cron endpoint)
CRON_SECRET=your-random-secret-here

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. Run database migration:
```bash
npm run migrate
```

5. Import historical data (optional):
```bash
npm run import-csv 2025-11-01 2025-11-30
```

6. Start development server:
```bash
npm run dev
```

Visit `http://localhost:3000` to see the dashboard.

## Database Schema

### `fills` table
Stores individual trading fills with the following key fields:
- `transaction_time`: Timestamp of the trade
- `user_address`: Wallet address
- `coin`: Trading pair
- `side`: Bid or Ask
- `px`: Price
- `sz`: Size
- `volume_usd`: Calculated volume (px * sz)
- `original_data_hash`: SHA-256 hash of original data (for deduplication)
- `sequence_number`: Sequence number for duplicate data (1, 2, 3...)
- `data_hash`: Legacy field (for backward compatibility)

**Unique constraint**: `UNIQUE(original_data_hash, sequence_number)`

This ensures that duplicate data from the API is stored completely without data loss.

### `sync_status` table
Tracks synchronization status for the cron job.

## API Endpoints

### GET /api/data
Returns aggregated volume data for charts.

**Query Parameters:**
- `from` (required): Start date (YYYY-MM-DD)
- `to` (required): End date (YYYY-MM-DD)
- `wallet` (optional): Custom wallet address

**Example:**
```bash
curl "http://localhost:3000/api/data?from=2025-11-01&to=2025-11-30&wallet=0x..."
```

### GET /api/stats
Returns statistics and rankings.

**Query Parameters:**
- `from` (required): Start date (YYYY-MM-DD)
- `to` (required): End date (YYYY-MM-DD)
- `wallet` (optional): Custom wallet address

### GET /api/cron/sync
Cron endpoint for automatic data synchronization (protected by CRON_SECRET).

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run migrate` - Run database migrations
- `npm run import-csv <start-date> <end-date>` - Import historical data

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Post-Deployment

1. Run migration in production:
```bash
vercel env pull .env.local
npm run migrate
```

2. Import historical data:
```bash
npm run import-csv 2025-11-01 2025-11-30
```

3. Verify cron job is running in Vercel dashboard

## Project Structure

```
outkast_volume_analyzer_service/
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── api/               # API routes
│   │   │   ├── data/          # Volume data endpoint
│   │   │   ├── stats/         # Statistics endpoint
│   │   │   └── cron/sync/     # Cron sync endpoint
│   │   ├── layout.tsx
│   │   ├── page.tsx           # Main dashboard
│   │   └── globals.css
│   │
│   ├── components/
│   │   ├── ui/                # Shadcn/ui components
│   │   └── dashboard/         # Dashboard components
│   │
│   ├── lib/
│   │   ├── db/                # Database client and queries
│   │   ├── hyperliquid/       # API client and LZ4 decompressor
│   │   ├── sync/              # Batch processing logic
│   │   ├── analytics/         # Data aggregation
│   │   └── constants/         # Configuration
│   │
│   └── types/                 # TypeScript definitions
│
├── scripts/
│   ├── migrate.ts             # Database migration
│   ├── import-csv.ts          # CSV import utility
│   ├── run-migration.ts       # Migration runner
│   └── migrations/            # SQL migration files
│       ├── 001_add_sequence_number.sql
│       └── 001_add_sequence_number_rollback.sql
│
└── vercel.json                # Vercel configuration (Cron)
```

## Key Implementation Details

### LZ4 Decompression
The Hyperliquid API returns LZ4-compressed CSV files. The decompressor is implemented in `src/lib/hyperliquid/decompressor.ts`.

### Sequence Number System (Added: 2026-01-31)
The parser assigns sequence numbers to handle duplicate data from the API:
- Same data appearing multiple times gets sequence numbers: 1, 2, 3...
- Ensures 100% data completeness (no data loss from duplicates)
- Typical duplicate rate: 1.8% - 6% of total records
- Implementation: `src/lib/hyperliquid/parser.ts`

**Example**: If the API returns identical trade data 3 times, they are stored as:
- `original_data_hash: abc123...`, `sequence_number: 1`
- `original_data_hash: abc123...`, `sequence_number: 2`
- `original_data_hash: abc123...`, `sequence_number: 3`

All three records contribute to volume calculations, ensuring accurate totals.

### Color-Coded Chart
Top 5 wallets are color-coded in the stacked bar chart:
- Rank 1: Red (#FF6B6B)
- Rank 2: Turquoise (#4ECDC4)
- Rank 3: Blue (#45B7D1)
- Rank 4: Green (#96CEB4)
- Rank 5: Yellow (#FFEAA7)
- Others: Gray (#B0B0B0)
- Custom: Purple (#9B59B6)

### Automatic Sync
The cron job runs every 4 hours, fetching new data from the last synced date to yesterday (UTC).

## License

MIT
