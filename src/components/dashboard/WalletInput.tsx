'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface WalletInputProps {
  wallet: string;
  onWalletChange: (wallet: string) => void;
  onClear: () => void;
}

export function WalletInput({ wallet, onWalletChange, onClear }: WalletInputProps) {
  return (
    <div className="flex gap-2 items-end">
      <div className="flex flex-col gap-2 flex-1">
        <label htmlFor="custom-wallet" className="text-sm font-medium">
          Custom Wallet (optional)
        </label>
        <Input
          id="custom-wallet"
          type="text"
          placeholder="0x..."
          value={wallet}
          onChange={(e) => onWalletChange(e.target.value)}
          className="font-mono text-sm"
        />
      </div>

      {wallet && (
        <Button variant="outline" onClick={onClear}>
          Clear
        </Button>
      )}
    </div>
  );
}
