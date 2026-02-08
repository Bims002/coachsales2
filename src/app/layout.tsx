import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import { AuthProvider } from "@/context/AuthContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CoachSales - Formation Simulation Vocale",
  description: "Plateforme de formation par simulation vocale pour agents de centre d'appel.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <AuthProvider>
          <Header />
          <main>
            {children}
          </main>
          <footer className="py-8 text-center text-sm border-t" style={{ color: 'var(--color-text-disabled)', borderColor: 'var(--color-gray-30)' }}>
            <div className="fluent-container" style={{ padding: 0 }}>
              © {new Date().getFullYear()} - CoachSales AI. Tous droits réservés.
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
