import Barbers from '@/components/Barbers';
import Booking from '@/components/Booking';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Location from '@/components/Location';
import Reviews from '@/components/Reviews';
import Services from '@/components/Services';

export default function HomePage() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-ochre-400 focus:px-4 focus:py-2 focus:text-graphite-950"
      >
        Skip to content
      </a>
      <Header />
      <main id="main">
        <Hero />
        <Services />
        <Barbers />
        <Booking />
        <Reviews />
        <Location />
      </main>
      <Footer />
    </>
  );
}
