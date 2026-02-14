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

    // Cas 1: Pas connecté + route protégée → login
    if (!user && !isPublicRoute) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Cas 2: Connecté
    if (user) {
        // Redirection depuis login/register → dashboard (par défaut)
        // La page dashboard gère la redirection admin côté client
        if (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register') {
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }

        // Protection de la zone admin : vérifier le rôle
        if (isAdminRoute) {
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            // Si erreur ou pas admin → dashboard
            if (profileError || !profile || profile.role?.toLowerCase() !== 'admin') {
                return NextResponse.redirect(new URL('/dashboard', request.url));
            }
        }
    }

    return response;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)).*)',
    ],
};
