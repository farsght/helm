import { redirect } from 'next/navigation';

// Canonical URL moved to /connections
export default function LegacyConnectionsPage() {
  redirect('/connections');
}
