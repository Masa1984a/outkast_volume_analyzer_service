#!/usr/bin/env python3
"""
OUTKAST Volume Charts
時系列とウォレット別の取引ボリュームを可視化

使い方:
    pip install pandas matplotlib
    python outkast_charts.py
"""

import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
from pathlib import Path

# フォント設定
plt.rcParams['font.family'] = ['DejaVu Sans', 'sans-serif']
plt.rcParams['figure.facecolor'] = 'white'

# ===== 設定 =====
RAW_FILE = "outkast_raw_fills.csv"
SUMMARY_FILE = "outkast_volume_summary.csv"
OUTPUT_FILE = "outkast_volume_charts.png"

# カラーパレット（上位5人 + その他）
COLORS = {
    'top1': '#FF6B6B',   # 赤
    'top2': '#4ECDC4',   # ターコイズ
    'top3': '#45B7D1',   # 青
    'top4': '#96CEB4',   # 緑
    'top5': '#FFEAA7',   # 黄
    'others': '#B0B0B0'  # グレー
}


def main():
    # ファイル存在確認
    if not Path(RAW_FILE).exists():
        print(f"Error: {RAW_FILE} not found")
        print("Please run outkast_volume_analyzer.py first")
        return
    
    if not Path(SUMMARY_FILE).exists():
        print(f"Error: {SUMMARY_FILE} not found")
        print("Please run outkast_volume_analyzer.py first")
        return

    # データ読み込み
    print("Loading data...")
    raw_df = pd.read_csv(RAW_FILE)
    summary_df = pd.read_csv(SUMMARY_FILE)

    # notional value計算（price × size）
    raw_df['notional'] = raw_df['px'] * raw_df['sz']

    # 上位5ウォレットを取得
    top5_wallets = summary_df.head(5)['user'].tolist()
    
    # ウォレットごとの短縮アドレスとラベルを作成
    wallet_labels = {}
    for i, wallet in enumerate(top5_wallets):
        short_addr = f"{wallet[:6]}...{wallet[-4:]}"
        wallet_labels[wallet] = f"#{i+1} {short_addr}"

    # 図の作成
    fig, axes = plt.subplots(2, 1, figsize=(14, 12))

    # ===== グラフ1: 時系列 x 取引ボリューム（積み上げ） =====
    print("Creating stacked daily volume chart...")
    
    # 日付×ウォレットごとの集計
    daily_by_user = raw_df.groupby(['date', 'user'])['notional'].sum().reset_index()
    daily_by_user['date'] = pd.to_datetime(daily_by_user['date'])
    
    # 上位5人とその他に分類
    daily_by_user['category'] = daily_by_user['user'].apply(
        lambda x: x if x in top5_wallets else 'others'
    )
    
    # カテゴリごとに日別集計
    daily_stacked = daily_by_user.groupby(['date', 'category'])['notional'].sum().unstack(fill_value=0)
    daily_stacked = daily_stacked.sort_index()
    
    # カラム順序を設定（others + 上位5人を逆順）→ 積み上げ時に#1が上に来る
    column_order = ['others'] + top5_wallets[::-1]
    column_order = [c for c in column_order if c in daily_stacked.columns]
    daily_stacked = daily_stacked[column_order]
    
    ax1 = axes[0]
    
    # 積み上げ棒グラフ
    bottom = pd.Series([0.0] * len(daily_stacked), index=daily_stacked.index)
    
    color_map = {
        top5_wallets[0]: COLORS['top1'],
        top5_wallets[1]: COLORS['top2'],
        top5_wallets[2]: COLORS['top3'],
        top5_wallets[3]: COLORS['top4'],
        top5_wallets[4]: COLORS['top5'],
        'others': COLORS['others']
    }
    
    bars_legend = []
    labels_legend = []
    
    for col in column_order:
        color = color_map.get(col, COLORS['others'])
        bars = ax1.bar(daily_stacked.index, daily_stacked[col] / 1_000_000, 
                       bottom=bottom / 1_000_000,
                       color=color, edgecolor='white', linewidth=0.3, alpha=0.9)
        bottom += daily_stacked[col]
        
        # 凡例用
        bars_legend.append(bars[0])
        if col == 'others':
            labels_legend.append('Others')
        else:
            labels_legend.append(wallet_labels[col])

    ax1.set_xlabel('Date', fontsize=12)
    ax1.set_ylabel('Volume (Million USD)', fontsize=12)
    ax1.set_title('OUTKAST Daily Trading Volume by Top 5 Wallets (Nov-Dec 2025)', 
                  fontsize=14, fontweight='bold')

    # Y軸フォーマット
    ax1.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, p: f'${x:.1f}M'))

    # X軸の日付を見やすく
    ax1.tick_params(axis='x', rotation=45)
    ax1.set_xlim(daily_stacked.index.min() - pd.Timedelta(days=1), 
                 daily_stacked.index.max() + pd.Timedelta(days=1))

    # グリッド
    ax1.grid(axis='y', alpha=0.3, linestyle='--')
    ax1.set_axisbelow(True)

    # 凡例（#1が上、Othersが下）
    ax1.legend(bars_legend[::-1], labels_legend[::-1], 
               loc='upper right', fontsize=9)

    # 合計ボリュームを注釈
    total_volume = daily_stacked.sum().sum()
    ax1.text(0.02, 0.95, f'Total: ${total_volume/1_000_000:.2f}M', 
             transform=ax1.transAxes, ha='left', va='top',
             fontsize=12, fontweight='bold', 
             bbox=dict(boxstyle='round', facecolor='white', alpha=0.8))

    # ===== グラフ2: ウォレット別取引ボリューム（上位20） =====
    print("Creating wallet volume chart...")
    top_wallets = summary_df.head(20).copy()

    # アドレスを短縮表示
    top_wallets['short_addr'] = top_wallets['user'].apply(
        lambda x: f"{x[:6]}...{x[-4:]}" if len(x) > 12 else x
    )

    ax2 = axes[1]

    # 上位5人は同じ色、それ以外はグレー
    colors = []
    for i, addr in enumerate(top_wallets['user']):
        if i == 0:
            colors.append(COLORS['top1'])
        elif i == 1:
            colors.append(COLORS['top2'])
        elif i == 2:
            colors.append(COLORS['top3'])
        elif i == 3:
            colors.append(COLORS['top4'])
        elif i == 4:
            colors.append(COLORS['top5'])
        else:
            colors.append(COLORS['others'])

    ax2.barh(range(len(top_wallets)), top_wallets['total_volume'] / 1_000_000,
             color=colors, edgecolor='#333', linewidth=0.5, alpha=0.85)

    ax2.set_yticks(range(len(top_wallets)))
    ax2.set_yticklabels(top_wallets['short_addr'], fontsize=9, fontfamily='monospace')
    ax2.invert_yaxis()  # 1位を上に

    ax2.set_xlabel('Volume (Million USD)', fontsize=12)
    ax2.set_ylabel('Wallet Address', fontsize=12)
    ax2.set_title('OUTKAST Top 20 Wallets by Volume (Phase 1: Nov-Dec 2025)', 
                  fontsize=14, fontweight='bold')

    # X軸フォーマット
    ax2.xaxis.set_major_formatter(mticker.FuncFormatter(lambda x, p: f'${x:.1f}M'))

    # グリッド
    ax2.grid(axis='x', alpha=0.3, linestyle='--')
    ax2.set_axisbelow(True)

    # シェア率をバーの右に表示
    for i, (idx, row) in enumerate(top_wallets.iterrows()):
        ax2.text(row['total_volume'] / 1_000_000 + 0.15, i, 
                 f"{row['share_pct']:.1f}%", 
                 va='center', fontsize=9, color='#333')

    # レイアウト調整
    plt.tight_layout()

    # 保存
    plt.savefig(OUTPUT_FILE, dpi=150, bbox_inches='tight', facecolor='white')
    print(f"\nChart saved to: {OUTPUT_FILE}")

    # ===== 統計サマリー出力 =====
    print("\n" + "=" * 60)
    print("OUTKAST Phase 1 Statistics (Nov-Dec 2025)")
    print("=" * 60)
    print(f"Total Volume: ${total_volume/1_000_000:.2f}M")
    print(f"Total Wallets: {len(summary_df)}")
    print(f"Total Trades: {len(raw_df)}")
    
    print(f"\nTop 5 Wallets:")
    for i, row in summary_df.head(5).iterrows():
        addr_short = f"{row['user'][:6]}...{row['user'][-4:]}"
        print(f"  {i+1}. {addr_short}: ${row['total_volume']/1_000_000:.2f}M ({row['share_pct']}%)")


if __name__ == "__main__":
    main()
