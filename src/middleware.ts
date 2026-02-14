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
    const { data: { user } } = await supabase.auth.getUser();

    const publicRoutes = ['/', '/login', '/register', '/test'];
    const isPublicRoute = publicRoutes.some(route => request.nextUrl.pathname === route)
        || ['/login', '/register', '/test'].some(route => request.nextUrl.pathname.startsWith(route));
    const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');
    const isDashboard = request.nextUrl.pathname === '/dashboard';

    // Cas 1: Pas de session et route protégée → redirection vers login
    if (!user && !isPublicRoute) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Cas 2: Session présente — on ne query le profil QUE quand c'est nécessaire
    if (user) {
        // On a besoin du rôle uniquement pour : login/register, /dashboard, /admin/*
        const needsRoleCheck = request.nextUrl.pathname === '/login'
            || request.nextUrl.pathname === '/register'
            || isDashboard
            || isAdminRoute;

        if (needsRoleCheck) {
            // Récupérer le rôle
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            // Si erreur de profil → on laisse passer (pas de boucle)
            if (profileError || !profile) {
                console.error('[MIDDLEWARE] ⚠️ Profil introuvable, on laisse passer:', profileError?.message);
                // Depuis login → aller au dashboard par défaut
                if (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register') {
                    return NextResponse.redirect(new URL('/dashboard', request.url));
                }
                // Pour toute autre page → on laisse passer sans redirection
                return response;
            }

            const userRole = profile.role?.toLowerCase();

            // Depuis login/register → rediriger vers le bon dashboard
            if (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register') {
                const url = userRole === 'admin' ? '/admin' : '/dashboard';
                return NextResponse.redirect(new URL(url, request.url));
            }

            // Admin sur /dashboard → rediriger vers /admin
            if (isDashboard && userRole === 'admin') {
                return NextResponse.redirect(new URL('/admin', request.url));
            }

            // Non-admin sur /admin/* → rediriger vers /dashboard
            if (isAdminRoute && userRole !== 'admin') {
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
