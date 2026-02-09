import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import { AuthProvider } from "@/context/AuthContext";
import Script from "next/script";

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
      <head>
        {/* Hotjar Tracking Code for Mvp_Coachsales */}
        <Script id="hotjar" strategy="afterInteractive">
          {`
            (function(h,o,t,j,a,r){
                h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
                h._hjSettings={hjid:6641818,hjsv:6};
                a=o.getElementsByTagName('head')[0];
                r=o.createElement('script');r.async=1;
                r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
                a.appendChild(r);
            })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
          `}
        </Script>

        {/* Google Analytics (gtag.js) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-8T000FZ59H"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-8T000FZ59H');
          `}
        </Script>
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <Header />
          <main>
            {children}
          </main>
          <footer className="py-8 text-center text-sm border-t" style={{ color: 'var(--color-text-disabled)', borderColor: 'var(--color-gray-30)' }}>
            <div className="fluent-container" style={{ padding: 0 }}>
              © {new Date().getFullYear()} - CoachSales. Tous droits réservés.
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
