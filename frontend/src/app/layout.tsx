import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Outfit, Fira_Code } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../contexts/AuthContext";
import { FavoritesProvider } from "../contexts/FavoritesContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

// Fuentes de diseño — cargadas por next/font (sin @import bloqueante)
const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "600", "800"],
  display: "swap",
});

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "POKEDEX PRO MAX | El Hub Pokémon definitivo",
  description: "Explora la Pokedex, descubre objetos, bayas, habilidades y pon a prueba tus conocimientos con nuestro minijuego interactivo.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        {/* Preconnect a raw.githubusercontent.com — dominio de las imágenes Pokémon */}
        <link rel="preconnect" href="https://raw.githubusercontent.com" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${outfit.variable} ${firaCode.variable}`}>
        <AuthProvider>
          <FavoritesProvider>
            {children}
          </FavoritesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
