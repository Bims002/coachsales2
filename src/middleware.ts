import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({ name, value, ...options });
                    response = NextResponse.next({
                        request: { headers: request.headers },
                    });
                    response.cookies.set({ name, value, ...options });
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({ name, value: '', ...options });
                    response = NextResponse.next({
                        request: { headers: request.headers },
                    });
                    response.cookies.set({ name, value: '', ...options });
                },
            },
        }
    );

    const { data: { session } } = await supabase.auth.getSession();

    // Routes publiques (pas besoin d'être connecté)
    const publicRoutes = ['/login', '/register'];
    const isPublicRoute = publicRoutes.some(route => request.nextUrl.pathname.startsWith(route));

    // Si non connecté et route protégée → redirection vers login
    if (!session && !isPublicRoute) {
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
    }

    // Si connecté et sur page login/register → redirection vers dashboard approprié
    if (session && isPublicRoute) {
        // Récupérer le rôle pour rediriger vers le bon dashboard
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

        const dashboardUrl = profile?.role?.toLowerCase() === 'admin'
            ? new URL('/admin', request.url)
            : new URL('/dashboard', request.url);
        return NextResponse.redirect(dashboardUrl);
    }

    // Protection des routes admin
    if (request.nextUrl.pathname.startsWith('/admin')) {
        // Si pas de session, rediriger vers login
        if (!session) {
            const loginUrl = new URL('/login', request.url);
            return NextResponse.redirect(loginUrl);
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

        console.log('[MIDDLEWARE] User role:', profile?.role, 'for user:', session.user.id);

        if (!profile || profile.role?.toLowerCase() !== 'admin') {
            const dashboardUrl = new URL('/dashboard', request.url);
            return NextResponse.redirect(dashboardUrl);
        }
    }

    return response;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|api).*)',
    ],
};
