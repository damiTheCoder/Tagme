import Image from "next/image";

const STEPS = [
  {
    title: "Tell TagMe about your business",
    text: "Add your products, services, prices, FAQs, policies, and opening hours. Your AI business assistant learns what your business offers.",
    image: "/S1.jpeg",
    alt: "Tell TagMe about your business",
    cta: "Set up your business",
  },
  {
    title: "Share your TagMe",
    text: "Post your TagMe link on Instagram, TikTok, WhatsApp, your website, email, ads, or turn it into a QR code.",
    image: "/S2.jpeg",
    alt: "Share your TagMe",
    cta: "Share your TagMe",
  },
  {
    title: "Let customers talk to your business",
    text: "Customers ask questions, discover what you offer, place orders, book appointments, and take action — you stay in control from your dashboard.",
    image: "/S3.jpeg",
    alt: "Let customers talk to your business",
    cta: "Start talking",
  },
];

const FEATURES = [
  {
    title: "AI business assistant",
    text: "Answers questions, explains products and services, recommends what fits the customer, and helps them take action — 24/7.",
  },
  {
    title: "Conversations that convert",
    text: "Turn customer attention into meaningful interactions. Let people ask, discover, decide, and act without searching through your website.",
  },
  {
    title: "Orders & bookings",
    text: "Let customers place orders, request services, book appointments, and submit inquiries directly through the conversation.",
  },
  {
    title: "Business knowledge",
    text: "Give your AI everything it needs to know about your business — products, services, prices, policies, FAQs, opening hours, and more.",
  },
  {
    title: "Everywhere your customers are",
    text: "Share your TagMe on social media, WhatsApp, email, ads, QR codes, and anywhere else your business gets attention.",
  },
  {
    title: "You stay in control",
    text: "Manage your business information, see customer interactions, and step in whenever human assistance is needed.",
  },
];

const BUSINESS_TYPES = [
  { title: "Retail", text: "Help customers discover products, compare options, and order." },
  { title: "Restaurants", text: "Answer menu questions, take orders, and help customers book." },
  { title: "Services", text: "Explain your services, answer questions, collect inquiries, and book appointments." },
  { title: "Professional businesses", text: "Give clients instant answers about your company, services, pricing, and processes." },
  { title: "Institutions", text: "Make information about your organization easier to access and interact with." },
  { title: "Creators & personal brands", text: "Turn your audience into conversations, customers, bookings, and opportunities." },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Desktop: header + hero share the bg image */}
      <div className="md:bg-[url('/HeroBG.jpeg')] md:bg-top md:bg-no-repeat md:bg-[length:100%_auto]">
      {/* Top header */}
      <header className="sticky top-0 z-40 bg-transparent">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-6">
          <a href="/" className="flex items-center gap-2">
            <Image
              src="/TagMe.jpeg"
              alt="TagMe logo"
              width={32}
              height={32}
              className="h-8 w-8 shrink-0 rounded-lg object-contain"
            />
            <span className="text-lg font-semibold text-zinc-900">TagMe</span>
          </a>
          <nav className="hidden items-center gap-6 text-sm text-gray-600 md:flex">
            <a href="#how-it-works" className="hover:text-gray-900">
              How it works
            </a>
            <a href="#features" className="hover:text-gray-900">
              Features
            </a>
            <a href="#pricing" className="hover:text-gray-900">
              Pricing
            </a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <a href="/login" className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">
              Log in
            </a>
            <a
              href="/signup"
              className="rounded-lg bg-[#a8fe65] px-4 py-2 text-sm font-medium text-[#1a1a1a] transition-colors hover:bg-[#92f04a]"
            >
              Get your TagMe
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-[url('/MobileHeroBG.jpeg')] bg-top bg-no-repeat bg-[length:100%_auto] md:bg-none">
        <div className="mx-auto max-w-6xl px-6 py-24 text-center sm:py-32 md:pb-56">
        <h1 className="mx-auto max-w-3xl text-5xl font-semibold tracking-tight text-zinc-900 sm:text-7xl">
          Your business, now conversational.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-gray-500 sm:text-xl">
          Your AI business assistant answers questions, recommends what you offer, helps customers take action, and connects them to your business — all from one link.
        </p>
        <div className="mt-8 flex items-center justify-center">
          <a
            href="/signup"
            className="rounded-full border border-black bg-[#a8fe65] px-6 py-3 text-base font-medium text-[#1a1a1a] transition-colors hover:bg-[#92f04a]"
          >
            Get started
          </a>
        </div>
        <p className="mx-auto mt-6 max-w-xl text-sm text-gray-500">
          One link. One conversation. Everything your customer needs.
        </p>
        </div>
      </section>
      </div>

      {/* One link section */}
      <section className="mb-12 mt-12 px-6 sm:mb-20 sm:mt-20">
        <div className="mx-auto max-w-6xl rounded-3xl bg-black px-6 py-16 sm:px-12 sm:py-24">
        <div className="grid items-center gap-8 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              One link. Zero friction.
            </h2>
            <p className="mt-4 text-base text-white/70 sm:text-lg">
              Share your TagMe anywhere — Instagram, TikTok, WhatsApp, your bio, email, ads, or even a QR code. Customers tap, ask questions, discover what you offer, place orders, book services, or make inquiries without having to navigate your website.
            </p>
            <a
              href="/signup"
              className="mt-6 inline-flex rounded-full bg-[#a8fe65] px-6 py-3 text-base font-medium text-[#1a1a1a] transition-colors hover:bg-[#92f04a]"
            >
              Get started
            </a>
          </div>
          <div>
            <Image
              src="/A1.jpeg"
              alt="Customer interacting with a business through TagMe"
              width={800}
              height={600}
              className="w-full rounded-2xl object-cover"
            />
          </div>
        </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-20 px-6 pb-16">
        <h2 className="mb-8 text-3xl font-semibold tracking-tight text-zinc-900 sm:mb-10 sm:text-4xl">How it works in <span className="whitespace-nowrap rounded-full border-2 border-black bg-[#a8fe65] px-4 py-1 text-[#1a1a1a]">3 Easy</span> steps</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {/* Step 1 — tall card */}
          <div className="flex flex-col rounded-3xl bg-gradient-to-br from-gray-100 to-gray-200 p-6 md:row-span-2">
            <p className="text-center text-sm font-semibold text-[#3d7a0a]">Step 1</p>
            <p className="mt-2 text-center text-2xl font-medium tracking-tight text-zinc-900 sm:text-3xl">
              {STEPS[0].title}
            </p>
            <p className="mx-auto mt-2 max-w-sm text-center text-sm text-gray-500">
              {STEPS[0].text}
            </p>
            <div className="mt-4 text-center">
              <a href="/signup" className="inline-flex rounded-full bg-[#a8fe65] px-5 py-2 text-sm font-medium text-[#1a1a1a] transition-colors hover:bg-[#92f04a]">
                {STEPS[0].cta}
              </a>
            </div>
            <div className="mt-4 h-48 overflow-hidden rounded-2xl sm:h-56 md:h-auto md:min-h-64 md:flex-1">
              <Image
                src={STEPS[0].image}
                alt={STEPS[0].alt}
                width={800}
                height={800}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
          {/* Steps 2 & 3 — stacked */}
          <div className="flex flex-col gap-4">
            {STEPS.slice(1).map((s, i) => (
              <div key={s.title} className="flex-1 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-200 p-6">
                <p className="text-center text-sm font-semibold text-[#3d7a0a]">Step {i + 2}</p>
                <p className="mt-2 text-center text-xl font-medium tracking-tight text-zinc-900 sm:text-2xl">
                  {s.title}
                </p>
                <p className="mx-auto mt-2 max-w-sm text-center text-sm text-gray-500">
                  {s.text}
                </p>
                <div className="mt-4 text-center">
                  <a href="/signup" className="inline-flex rounded-full bg-[#a8fe65] px-5 py-2 text-sm font-medium text-[#1a1a1a] transition-colors hover:bg-[#92f04a]">
                    {s.cta}
                  </a>
                </div>
                <div className="mx-auto mt-4 h-44 max-w-xs overflow-hidden rounded-2xl sm:h-52">
                  <Image
                    src={s.image}
                    alt={s.alt}
                    width={600}
                    height={600}
                    className="w-full object-cover"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-6 pb-16">
        <h2 className="text-lg font-medium text-zinc-900">Features</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-black bg-[#a8fe65] p-6">
              <p className="font-medium text-[#1a1a1a]">{f.title}</p>
              <p className="mt-1 text-sm text-[#1a1a1a]/70">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Business types */}
      <section className="mx-auto max-w-6xl scroll-mt-20 px-6 pb-16">
        <h2 className="text-lg font-medium text-zinc-900">For every kind of business</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {BUSINESS_TYPES.map((b) => (
            <div key={b.title} className="rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 p-6">
              <p className="font-medium text-zinc-900">{b.title}</p>
              <p className="mt-1 text-sm text-gray-500">{b.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl scroll-mt-20 px-6 pb-20">
        <div className="mx-auto max-w-sm rounded-3xl border border-white/50 bg-gradient-to-br from-[#a8fe65]/80 via-[#d4ff9e]/50 to-[#92f04a]/70 px-8 py-16 text-center backdrop-blur-xl sm:py-24">
          <div className="flex flex-col items-center gap-6">
            <div>
              <p className="inline-flex rounded-full border border-[#1a1a1a]/20 px-3 py-1 text-xs font-semibold text-[#1a1a1a]">
                MONTHLY PLAN
              </p>
              <h2 className="mt-3 text-lg font-medium text-[#1a1a1a]">Simple pricing</h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-[#1a1a1a]/70">
                Start free. Upgrade when you need more.
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-center gap-4">
              <p className="text-4xl font-semibold text-[#1a1a1a]">
                ₦2,500<span className="text-base font-normal text-[#1a1a1a]/70">/month</span>
              </p>
          <a
            href="/signup"
            className="inline-flex rounded-full border border-black bg-[#a8fe65] px-6 py-3 text-base font-medium text-[#1a1a1a] transition-colors hover:bg-[#92f04a]"
          >
            Start for free
          </a>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-20 text-center">
        <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
          Your business doesn&apos;t need another website.
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-lg text-gray-500">
          It needs a better way to interact.
        </p>
        <p className="mt-6 font-medium text-zinc-900">
          TagMe — The AI front door for your business.
        </p>
        <a
          href="/signup"
          className="mt-4 inline-flex rounded-full border border-black bg-[#a8fe65] px-6 py-3 text-base font-medium text-[#1a1a1a] transition-colors hover:bg-[#92f04a]"
        >
          Get your TagMe →
        </a>
      </section>

      <footer className="mx-auto max-w-6xl px-6 pb-8 text-sm text-gray-500">
        TagMe — The AI front door for your business.
      </footer>
    </main>
  );
}
