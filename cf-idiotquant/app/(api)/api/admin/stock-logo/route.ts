import { auth } from '@/auth';
import { handleLogoRequest } from '@/lib/server/stockLogo';

export const runtime = 'edge';

async function handle(req: Request) {
    const session = await auth();
    return handleLogoRequest(req, session?.user as { role?: string } | undefined, process.env.KR_LOGO_ADMIN_PASSWORD);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
