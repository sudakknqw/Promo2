import './globals.css';

// <html> lives in app/[locale]/layout.tsx so its lang attribute follows the locale.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
