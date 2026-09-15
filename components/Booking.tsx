import { SHOP } from '@/lib/data';

import BookingForm from './BookingForm';
import { LineIcon, PhoneIcon } from './icons';
import SectionHeading from './SectionHeading';

const STEPS = [
  { title: 'Send your request', text: 'Choose a service, barber and time. It takes under a minute.' },
  { title: 'We confirm', text: 'Our team checks the schedule and confirms by phone or LINE.' },
  { title: 'Take a seat', text: 'Arrive five minutes early. Pay at the shop, cash or card.' },
];

export default function Booking() {
  return (
    <section aria-labelledby="booking-title" id="booking" className="py-20 sm:py-28">
      <div className="container-page grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <div>
          <SectionHeading
            id="booking-title"
            eyebrow="Online booking"
            title="Book your appointment"
            intro="No account, no deposit. Walk-ins are welcome too, but booked clients always come first."
          />

          <ol className="mt-10 space-y-6">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ochre-400/50 font-display text-lg text-ochre-400">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold text-beige-50">{step.title}</p>
                  <p className="mt-1 text-sm text-beige-300">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-10 rounded-2xl border border-graphite-700 p-5">
            <p className="text-sm text-beige-300">Prefer to talk to a human?</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <a href={SHOP.phoneHref} className="btn-ghost">
                <PhoneIcon className="h-4 w-4" />
                {SHOP.phoneDisplay}
              </a>
              <a href={SHOP.lineUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost">
                <LineIcon className="h-4 w-4 text-brand-line" />
                Chat on LINE
              </a>
            </div>
          </div>
        </div>

        <BookingForm />
      </div>
    </section>
  );
}
