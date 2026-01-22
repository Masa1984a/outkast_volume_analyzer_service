'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface WalletInputProps {
  onWalletChange: (wallet: string) => void;
}

export function WalletInput({ onWalletChange }: WalletInputProps) {
  const [wallet, setWallet] = useState('');

  const handleApply = () => {
    onWalletChange(wallet);
  };

  const handleClear = () => {
    setWallet('');
    onWalletChange('');
  };

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
          onChange={(e) => setWallet(e.target.value)}
          className="font-mono text-sm"
        />
      </div>

      <Button onClick={handleApply}>Apply</Button>
      {wallet && (
        <Button variant="outline" onClick={handleClear}>
          Clear
        </Button>
      )}
    </div>
  );
}
