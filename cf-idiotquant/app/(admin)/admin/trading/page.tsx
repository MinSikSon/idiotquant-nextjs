import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import TradingOperationsDashboard from './tradingOperationsDashboard';

export const runtime = 'edge';

export default async function TradingOperationsPage() {
    const session = await auth();
    if (!session?.user) redirect('/login');
    if ((session.user as { role?: string }).role !== 'admin') redirect('/');
    return <TradingOperationsDashboard />;
}
