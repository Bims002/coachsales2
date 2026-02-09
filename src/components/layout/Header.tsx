"use client";

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Mic, LogOut, User, ChevronDown, LayoutDashboard, Play, History, Package, Users, Menu, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';

export default function Header() {
    const { user, profile, isAdmin, signOut, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);
    const dashboardPath = isAdmin ? '/admin' : '/dashboard';

    const handleSignOut = async () => {
        try {
            await signOut();
            // Utiliser window.location pour forcer un rechargement complet et purger les cookies
            window.location.href = '/login';
        } catch (error) {
            console.error('Erreur lors de la déconnexion:', error);
            window.location.href = '/login';
        }
    };

    const isActive = (path: string) => pathname === path;

    // Fermer le menu mobile quand on change de page
    useEffect(() => {
        setShowMobileMenu(false);
    }, [pathname]);

    const NavLink = ({ href, children, icon: Icon, mobile = false }: { href: string; children: React.ReactNode; icon?: any; mobile?: boolean }) => (
        <Link
            href={href}
            className={`fluent-nav-link ${isActive(href) ? 'active' : ''} ${mobile ? 'mobile' : ''}`}
            onClick={() => mobile && setShowMobileMenu(false)}
        >
            {Icon && <Icon className="w-4 h-4" />}
            {children}
        </Link>
    );

    return (
        <>
            <header className="fluent-header">
                {/* Logo & Brand */}
                <div className="flex items-center gap-8">
                    {/* Menu hamburger mobile */}
                    {user && (
                        <button
                            className="md:hidden p-2 rounded-lg hover:bg-[var(--color-gray-20)]"
                            onClick={() => setShowMobileMenu(!showMobileMenu)}
                        >
                            <Menu className="w-5 h-5" style={{ color: 'var(--color-text-primary)' }} />
                        </button>
                    )}

                    <Link href={dashboardPath} className="flex items-center gap-3 group">
                        <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105"
                            style={{ background: 'linear-gradient(135deg, #0078D4, #8661C5)' }}
                        >
                            <Mic className="text-white w-5 h-5" />
                        </div>
                        <span className="font-bold text-lg hidden sm:block" style={{ color: 'var(--color-text-primary)' }}>
                            CoachSales
                        </span>
                    </Link>

                    {/* Navigation Desktop */}
                    {user && (
                        <nav className="fluent-nav hidden md:flex">
                            <NavLink href={dashboardPath} icon={LayoutDashboard}>
                                Tableau de bord
                            </NavLink>

                            {/* Liens pour les agents uniquement */}
                            {!isAdmin && (
                                <>
                                    <NavLink href="/simulation" icon={Play}>
                                        Simulations
                                    </NavLink>
                                    <NavLink href="/history" icon={History}>
                                        Historique
                                    </NavLink>
                                </>
                            )}

                            {/* Liens pour les admins uniquement */}
                            {isAdmin && (
                                <>
                                    <NavLink href="/admin/products" icon={Package}>
                                        Produits
                                    </NavLink>
                                    <NavLink href="/admin/agents" icon={Users}>
                                        Agents
                                    </NavLink>
                                </>
                            )}
                        </nav>
                    )}
                </div>

                {/* User Section */}
                <div className="flex items-center gap-3">
                    {user ? (
                        <div className="relative">
                            <button
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-[var(--color-gray-20)]"
                            >
                                <div
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                                    style={{ background: isAdmin ? '#8661C5' : '#0078D4' }}
                                >
                                    {profile?.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <div className="text-left hidden sm:block">
                                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                                        {profile?.name || user.email?.split('@')[0]}
                                    </p>
                                    <p className="text-xs capitalize" style={{ color: 'var(--color-text-secondary)' }}>
                                        {profile?.role || 'Agent'}
                                    </p>
                                </div>
                                <ChevronDown className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
                            </button>

                            {/* Dropdown Menu */}
                            {showUserMenu && (
                                <>
                                    <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setShowUserMenu(false)}
                                    />
                                    <div
                                        className="absolute right-0 top-full mt-2 w-56 py-2 rounded-lg z-50"
                                        style={{
                                            background: 'var(--color-surface)',
                                            boxShadow: 'var(--shadow-16)',
                                            border: '1px solid var(--color-gray-30)'
                                        }}
                                    >
                                        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-gray-20)' }}>
                                            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                                                {profile?.name || user.email?.split('@')[0]}
                                            </p>
                                            <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                                                {user.email}
                                            </p>
                                        </div>
                                        <div className="py-1">
                                            <button
                                                onClick={handleSignOut}
                                                className="w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-[var(--color-gray-10)]"
                                                style={{ color: 'var(--color-error)' }}
                                            >
                                                <LogOut className="w-4 h-4" />
                                                Déconnexion
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        !loading && pathname !== '/login' && pathname !== '/register' && (
                            <Link href="/login" className="btn-primary">
                                Connexion
                            </Link>
                        )
                    )}
                </div>
            </header>

            {/* Menu Mobile Drawer */}
            {showMobileMenu && user && (
                <>
                    <div
                        className="fixed inset-0 bg-black/50 z-40 md:hidden"
                        onClick={() => setShowMobileMenu(false)}
                    />
                    <div
                        className="fixed top-0 left-0 h-full w-64 z-50 md:hidden"
                        style={{
                            background: 'var(--color-surface)',
                            boxShadow: 'var(--shadow-64)'
                        }}
                    >
                        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--color-gray-20)' }}>
                            <span className="font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>
                                Menu
                            </span>
                            <button
                                onClick={() => setShowMobileMenu(false)}
                                className="p-2 rounded-lg hover:bg-[var(--color-gray-20)]"
                            >
                                <X className="w-5 h-5" style={{ color: 'var(--color-text-primary)' }} />
                            </button>
                        </div>
                        <nav className="flex flex-col p-4 gap-2">
                            <NavLink href={dashboardPath} icon={LayoutDashboard} mobile>
                                Tableau de bord
                            </NavLink>

                            {!isAdmin && (
                                <>
                                    <NavLink href="/simulation" icon={Play} mobile>
                                        Simulations
                                    </NavLink>
                                    <NavLink href="/history" icon={History} mobile>
                                        Historique
                                    </NavLink>
                                </>
                            )}

                            {isAdmin && (
                                <>
                                    <NavLink href="/admin/products" icon={Package} mobile>
                                        Produits
                                    </NavLink>
                                    <NavLink href="/admin/agents" icon={Users} mobile>
                                        Agents
                                    </NavLink>
                                </>
                            )}
                        </nav>
                    </div>
                </>
            )}
        </>
    );
}
