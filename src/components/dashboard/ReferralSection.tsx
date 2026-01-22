'use client';

import { Card, CardContent } from '@/components/ui/card';
import QRCode from 'react-qr-code';

interface ReferralLinkProps {
  title: string;
  url: string;
  description?: string;
}

function ReferralLink({ title, url, description }: ReferralLinkProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
      {/* QR Code */}
      <div className="flex-shrink-0 p-2 bg-white rounded">
        <QRCode value={url} size={80} />
      </div>

      {/* Text Content */}
      <div className="flex-1 text-center sm:text-left">
        <p className="text-sm text-muted-foreground mb-1">
          New to {title}? Start here:
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-mono text-primary hover:underline break-all"
        >
          {url}
        </a>
        {description && (
          <p className="text-sm font-semibold text-foreground mt-2">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

export function ReferralSection() {
  return (
    <Card className="mt-8">
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ReferralLink
            title="OUTKAST"
            url="https://go.outkast.xyz/yvtp/SAPPORO"
            description="Data shows competition is still low. Best time to join is NOW."
          />
          <ReferralLink
            title="KAST Card"
            url="https://go.kast.xyz/VqVO/SAPPORO"
          />
        </div>
      </CardContent>
    </Card>
  );
}
