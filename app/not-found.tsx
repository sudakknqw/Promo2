import en from '@/dictionaries/en.json';

// 404 for paths outside any locale (e.g. /de). The root layout renders no <html>, so it's here.
export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body>
        <main className="container-page flex min-h-screen flex-col items-start justify-center py-20">
          <p className="eyebrow">404</p>
          <h1 className="mt-3 text-4xl font-semibold text-beige-50">{en.notFound.title}</h1>
          <p className="mt-4 text-beige-300">{en.notFound.text}</p>
          <a href="/en" className="btn-primary mt-8">
            {en.notFound.home}
          </a>
        </main>
      </body>
    </html>
  );
}
