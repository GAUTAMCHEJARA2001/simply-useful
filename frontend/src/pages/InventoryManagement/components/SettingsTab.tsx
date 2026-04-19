import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface SettingsTabProps {
  settings: any;
  setSettings: (s: any) => void;
  onSave: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ 
  settings, 
  setSettings, 
  onSave 
}) => {
  if (!settings) return null;

  return (
    <div className="space-y-4 max-w-lg">
      <h1 className="text-xl font-bold">App Settings</h1>
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Stock Valuation Method</label>
            <select 
              defaultValue={settings.stock_method} 
              onChange={e => setSettings({ ...settings, stock_method: e.target.value })}
              className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm"
            >
              <option value="FIFO">FIFO</option>
              <option value="LIFO">LIFO</option>
              <option value="WEIGHTED_AVG">Weighted Average</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <input 
              type="checkbox" 
              id="neg" 
              checked={settings.allow_negative_stock}
              onChange={e => setSettings({ ...settings, allow_negative_stock: e.target.checked })} 
              className="rounded" 
            />
            <label htmlFor="neg" className="text-sm font-medium">Allow Negative Stock</label>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Company Name</label>
            <input 
              value={settings.company_name} 
              onChange={e => setSettings({ ...settings, company_name: e.target.value })}
              className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" 
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Currency Symbol</label>
            <input 
              value={settings.currency_symbol} 
              onChange={e => setSettings({ ...settings, currency_symbol: e.target.value })}
              className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm" 
            />
          </div>
          <Button onClick={onSave}>Save Settings</Button>
        </CardContent>
      </Card>
    </div>
  );
};
