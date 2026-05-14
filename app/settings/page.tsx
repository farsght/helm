import { Suspense } from 'react';
import { SettingsClient } from './settings-client';

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-muted-foreground">Loading settings...</div>}>
      <SettingsClient />
    </Suspense>
  );
}
