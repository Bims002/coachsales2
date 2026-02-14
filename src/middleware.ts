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
        // Redirection depuis les pages de login/register (pas la racine /)
        if (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register') {
            try {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                const dashboardUrl = profile?.role?.toLowerCase() === 'admin' ? '/admin' : '/dashboard';
                return NextResponse.redirect(new URL(dashboardUrl, request.url));
            } catch (err) {
                console.error('[MIDDLEWARE] ❌ Erreur profil (login redirect):', err);
                return NextResponse.redirect(new URL('/dashboard', request.url));
            }
        }

        // Protection de la zone admin
        if (isAdminRoute) {
            try {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                if (!profile || profile.role?.toLowerCase() !== 'admin') {
                    return NextResponse.redirect(new URL('/dashboard', request.url));
                }
            } catch (err) {
                console.error('[MIDDLEWARE] ❌ Erreur profil (admin check):', err);
                return NextResponse.redirect(new URL('/dashboard', request.url));
            }
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
