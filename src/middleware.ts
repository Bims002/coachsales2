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

    // Routes publiques (pas besoin d'être connecté)
    const publicRoutes = ['/login', '/register', '/test'];
    const isPublicRoute = publicRoutes.some(route => request.nextUrl.pathname.startsWith(route));
    const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');

    // Récupérer la session UNE SEULE FOIS
    const { data: { session } } = await supabase.auth.getSession();

    // Si non connecté et route protégée → redirection vers login
    if (!session && !isPublicRoute) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Si connecté, on a besoin du rôle seulement pour les routes publiques (redirection) ou admin (protection)
    if (session && (isPublicRoute || isAdminRoute)) {
        // Récupérer le rôle UNE SEULE FOIS si nécessaire
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

        const userRole = profile?.role?.toLowerCase();

        // Si sur page publique (login/register) → rediriger vers dashboard
        if (isPublicRoute) {
            const dashboardUrl = userRole === 'admin' ? '/admin' : '/dashboard';
            return NextResponse.redirect(new URL(dashboardUrl, request.url));
        }

        // Si route admin mais pas admin → rediriger vers dashboard agent
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
