import { Suspense } from 'react';
import { SettingsClient } from './settings-client';

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-400">Loading settings...</div>}>
      <SettingsClient />
    </Suspense>
  );
}
