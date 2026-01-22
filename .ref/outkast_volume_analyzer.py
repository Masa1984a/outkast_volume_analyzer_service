#!/usr/bin/env python3
"""
OUTKAST Builder Fills Volume Analyzer
指定期間のウォレットごとの取引ボリュームを集計する
"""

import requests
import lz4.frame
import pandas as pd
from datetime import datetime, timedelta
from io import BytesIO
import sys

# OUTKAST Builder Address
BUILDER_ADDRESS = "0xc36f6e7dc0ab7146c11f500e146d0084254c8bf6"
BASE_URL = "https://stats-data.hyperliquid.xyz/Mainnet/builder_fills"

def download_and_decompress(url: str) -> bytes | None:
    """LZ4ファイルをダウンロードして解凍"""
    try:
        response = requests.get(url, timeout=30)
        if response.status_code == 200:
            # LZ4解凍
            decompressed = lz4.frame.decompress(response.content)
            return decompressed
        elif response.status_code == 404:
            return None  # データなし
        else:
            print(f"  Error: HTTP {response.status_code}")
            return None
    except Exception as e:
        print(f"  Error: {e}")
        return None

def fetch_period_data(start_date: str, end_date: str, builder_address: str = BUILDER_ADDRESS) -> pd.DataFrame:
    """
    指定期間のデータを取得して結合
    
    Args:
        start_date: 開始日 (YYYY-MM-DD)
        end_date: 終了日 (YYYY-MM-DD)
        builder_address: Builder Address
    """
    start = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d")
    
    all_data = []
    current = start
    
    print(f"Fetching data from {start_date} to {end_date}...")
    print(f"Builder: {builder_address}")
    print("-" * 50)
    
    while current <= end:
        date_str = current.strftime("%Y%m%d")
        url = f"{BASE_URL}/{builder_address}/{date_str}.csv.lz4"
        
        print(f"  {current.strftime('%Y-%m-%d')}...", end=" ")
        
        data = download_and_decompress(url)
        
        if data:
            # CSVとしてパース
            df = pd.read_csv(BytesIO(data))
            df['date'] = current.strftime('%Y-%m-%d')
            all_data.append(df)
            print(f"✓ {len(df)} rows")
        else:
            print("- no data")
        
        current += timedelta(days=1)
    
    if all_data:
        combined = pd.concat(all_data, ignore_index=True)
        print("-" * 50)
        print(f"Total rows: {len(combined)}")
        return combined
    else:
        print("No data found for the period")
        return pd.DataFrame()

def analyze_volume_by_wallet(df: pd.DataFrame) -> pd.DataFrame:
    """ウォレットごとの取引ボリュームを集計"""
    
    if df.empty:
        return pd.DataFrame()
    
    # カラム名を確認して適切に処理
    print(f"\nColumns: {df.columns.tolist()}")
    
    # 'user' または 'address' カラムを探す
    user_col = None
    for col in ['user', 'address', 'wallet', 'trader']:
        if col in df.columns:
            user_col = col
            break
    
    # 'sz' (size) または 'volume' カラムを探す
    size_col = None
    for col in ['sz', 'size', 'volume', 'notional', 'px']:
        if col in df.columns:
            size_col = col
            break
    
    # 'px' (price) カラムがあれば notional value を計算
    if 'sz' in df.columns and 'px' in df.columns:
        df['notional'] = df['sz'].abs() * df['px']
        volume_col = 'notional'
    elif size_col:
        volume_col = size_col
    else:
        print("Could not find volume column")
        return pd.DataFrame()
    
    if not user_col:
        print("Could not find user/address column")
        return pd.DataFrame()
    
    print(f"\nUsing: user_col='{user_col}', volume_col='{volume_col}'")
    
    # 集計
    summary = df.groupby(user_col).agg(
        total_volume=(volume_col, 'sum'),
        trade_count=(user_col, 'count'),
        first_trade=('date', 'min'),
        last_trade=('date', 'max')
    ).reset_index()
    
    # ソート
    summary = summary.sort_values('total_volume', ascending=False)
    
    # フォーマット
    summary['total_volume_usd'] = summary['total_volume'].apply(lambda x: f"${x:,.2f}")
    summary['share_pct'] = (summary['total_volume'] / summary['total_volume'].sum() * 100).round(2)
    
    return summary

def main():
    # Phase 1 期間: 2025年11月1日 〜 2025年12月31日
    START_DATE = "2025-11-01"
    END_DATE = "2025-12-31"
    
    # データ取得
    df = fetch_period_data(START_DATE, END_DATE)
    
    if df.empty:
        print("No data to analyze")
        return
    
    # 生データを保存（カレントディレクトリに出力）
    raw_output = "outkast_raw_fills.csv"
    df.to_csv(raw_output, index=False)
    print(f"\nRaw data saved to: {raw_output}")
    
    # ウォレット別集計
    print("\n" + "=" * 60)
    print("VOLUME BY WALLET (Phase 1: Nov-Dec 2025)")
    print("=" * 60)
    
    summary = analyze_volume_by_wallet(df)
    
    if not summary.empty:
        # 上位20を表示
        print("\nTop 20 Wallets by Volume:")
        print("-" * 80)
        
        user_col = summary.columns[0]
        for i, row in summary.head(20).iterrows():
            rank = summary.index.get_loc(i) + 1
            addr = row[user_col]
            if len(addr) > 20:
                addr_short = f"{addr[:6]}...{addr[-4:]}"
            else:
                addr_short = addr
            print(f"{rank:3}. {addr_short:15} | {row['total_volume_usd']:>15} | {row['share_pct']:5.2f}% | {row['trade_count']:,} trades")
        
        # サマリー統計
        print("\n" + "-" * 80)
        print(f"Total Volume: ${summary['total_volume'].sum():,.2f}")
        print(f"Total Wallets: {len(summary)}")
        print(f"Total Trades: {summary['trade_count'].sum():,}")
        
        # 集計結果を保存（カレントディレクトリに出力）
        summary_output = "outkast_volume_summary.csv"
        summary.to_csv(summary_output, index=False)
        print(f"\nSummary saved to: {summary_output}")
        
        # 特定アドレスの検索（Massanさんのアドレス）
        print("\n" + "=" * 60)
        print("Search for specific address:")
        print("=" * 60)
        massan_prefix = "0x78de"  # HyperTrackerで見えていたアドレスの先頭
        matches = summary[summary[user_col].str.lower().str.startswith(massan_prefix.lower())]
        if not matches.empty:
            for _, row in matches.iterrows():
                print(f"Found: {row[user_col]}")
                print(f"  Volume: {row['total_volume_usd']}")
                print(f"  Share: {row['share_pct']}%")
                print(f"  Trades: {row['trade_count']}")
                print(f"  Period: {row['first_trade']} ~ {row['last_trade']}")

if __name__ == "__main__":
    main()
