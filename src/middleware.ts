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

    // IMPORTANT: Utiliser getUser() au lieu de getSession() pour Vercel/Edge
    // Cela rafraîchit la session si nécessaire et évite les loops
    const { data: { user } } = await supabase.auth.getUser();

    const publicRoutes = ['/', '/login', '/register', '/test'];
    const isPublicRoute = publicRoutes.some(route => request.nextUrl.pathname === route)
        || ['/login', '/register', '/test'].some(route => request.nextUrl.pathname.startsWith(route));
    const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');

    // Cas 1: Pas de session et route protégée
    if (!user && !isPublicRoute) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Cas 2: Session présente
    if (user) {
        // Récupérer le profil une seule fois pour toutes les vérifications
        let userRole: string | null = null;
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();
            userRole = profile?.role?.toLowerCase() || null;
        } catch (err) {
            console.error('[MIDDLEWARE] ❌ Erreur profil:', err);
        }

        // Redirection depuis les pages de login/register
        if (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register') {
            const dashboardUrl = userRole === 'admin' ? '/admin' : '/dashboard';
            return NextResponse.redirect(new URL(dashboardUrl, request.url));
        }

        // Si un admin atterrit sur /dashboard, le rediriger vers /admin
        if (request.nextUrl.pathname === '/dashboard' && userRole === 'admin') {
            return NextResponse.redirect(new URL('/admin', request.url));
        }

        // Protection de la zone admin : seuls les admins y accèdent
        if (isAdminRoute && userRole !== 'admin') {
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - api routes (API endpoints)
         * - public files (images, fonts, etc.)
         */
        '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)).*)',
    ],
};
