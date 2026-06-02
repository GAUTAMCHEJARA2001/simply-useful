import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Construction } from 'lucide-react';

const ComingSoon: React.FC<{ title: string; description?: string }> = ({ title, description }) => (
  <div className="space-y-6">
    <h1 className="page-header">{title}</h1>
    {description && <p className="page-subheader">{description}</p>}
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
          <Construction className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-1">Coming Soon</h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          This module is under development and will be available in the next update.
        </p>
      </CardContent>
    </Card>
  </div>
);

export default ComingSoon;
