import Image from "next/image";

const PROBLEM_CARDS = [
  {
    title: "Slow replies cost sales.",
    text: "Customers ask for the price, wait for a reply, negotiate — and leave when you're busy.",
  },
  {
    title: "Manual checkout is stressful.",
    text: "Prices, stock, delivery details and payment confirmations all happen in scattered chats.",
  },
  {
    title: "No records, no financing.",
    text: "Informal sales can't be verified, so lenders can't say yes.",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Share your Inference link",
    text: "Put inference.link/yourbusiness in your bio, stories or WhatsApp auto-reply.",
  },
  {
    n: "2",
    title: "The AI handles your customers",
    text: "It greets them, shows your products or services, answers questions, takes the order or booking, and collects payment. It uses only the prices, stock and details you've uploaded.",
  },
  {
    n: "3",
    title: "Every sale is recorded",
    text: "Orders and payments are saved automatically, so you have a clear history of your business.",
  },
];

const FEATURES = [
  {
    title: "Instant chat, no download.",
    text: "Customers tap your link and start chatting straight away.",
  },
  {
    title: "Speaks your customers' language.",
    text: "English and Pidgin.",
  },
  {
    title: "Products, services or enquiries.",
    text: "Sell cakes, book salon appointments, or answer questions for your school or clinic.",
  },
  {
    title: "Pay inside the chat.",
    text: "Customers check out with OPay without leaving the conversation.",
  },
  {
    title: "Your prices, your rules.",
    text: "Set minimum prices the AI can never go below.",
  },
  {
    title: "You stay in control.",
    text: "Approve every order before payment, or let Inference approve automatically.",
  },
  {
    title: "Full chat history.",
    text: "Every conversation is saved with its order, so disputes are easy to settle.",
  },
];

const FINANCING_SOON = [
  {
    title: "Your business profile",
    text: "See your order volume, repeat customers and growth in one place.",
  },
  {
    title: "Your Inference score",
    text: "A score based on your real sales activity, with the reasons behind it.",
  },
  {
    title: "Financing offers",
    text: "If you're eligible, see working-capital options from our lending partners and apply in one tap.",
  },
];

const WHO = [
  {
    title: "Food and bakeries",
    text: "Take orders and payments without answering every DM.",
  },
  {
    title: "Fashion and retail",
    text: "Show your catalogue and check stock automatically.",
  },
  {
    title: "Salons and beauty",
    text: "Let customers book and pay a deposit.",
  },
  {
    title: "Freelancers and creators",
    text: "Share your services, quote, and get paid.",
  },
  {
    title: "Schools, clinics and organisations",
    text: "Answer common questions and capture enquiries.",
  },
];

const SAFETY = [
  {
    title: "Grounded in your data.",
    text: "Prices, stock and availability come from your dashboard, never from guesses.",
  },
  {
    title: "Customers confirm before paying.",
    text: "A clear order summary is shown before any payment.",
  },
  {
    title: "Hard limits.",
    text: "The AI can't sell below the minimum price you set.",
  },
  {
    title: "Hands off to you.",
    text: "If a question isn't covered, the AI says “let me check with the vendor” and passes it to you.",
  },
  {
    title: "Your data, your choice.",
    text: "We follow Nigeria's data protection law, and you control how your data is used.",
  },
];

const FAQS = [
  {
    q: "Do my customers need to download anything?",
    a: "No. Your link opens the chat instantly in their browser.",
  },
  {
    q: "How do customers pay?",
    a: "Through OPay checkout inside the chat. Inference never holds your customers' money.",
  },
  {
    q: "Does the AI make up prices?",
    a: "No. It reads prices and stock from the catalogue you set up, and it can't go below your minimum prices.",
  },
  {
    q: "Can I approve orders myself?",
    a: "Yes. Choose between approving every order before payment or automatic approval.",
  },
  {
    q: "Is Inference a lender?",
    a: "No. Inference provides your sales data and score. Financing is offered and decided by licensed lending partners.",
  },
  {
    q: "Is my data safe?",
    a: "You decide whether your data is used for scoring, and we follow Nigeria's data protection rules.",
  },
  {
    q: "Does Inference work for services, not just products?",
    a: "Yes. You can sell products, take bookings or handle enquiries.",
  },
  {
    q: "When will financing be available?",
    a: "It's coming soon. Join the early-access list and we'll tell you first.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur dark:bg-zinc-950/90">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-6">
          <a href="/" className="flex items-center gap-2">
            <Image
              src="/Inference.jpeg"
              alt="Inference logo"
              width={32}
              height={32}
              className="h-8 w-8 shrink-0 rounded-lg object-contain"
            />
            <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Inference</span>
          </a>
          <nav className="hidden items-center gap-6 text-sm text-gray-600 dark:text-zinc-400 lg:flex">
            <a href="#how-it-works" className="hover:text-gray-900 dark:hover:text-zinc-100">
              How it works
            </a>
            <a href="#who" className="hover:text-gray-900 dark:hover:text-zinc-100">
              For businesses
            </a>
            <a href="#financing" className="hover:text-gray-900 dark:hover:text-zinc-100">
              Financing
            </a>
            <a href="#pricing" className="hover:text-gray-900 dark:hover:text-zinc-100">
              Pricing
            </a>
            <a href="#faq" className="hover:text-gray-900 dark:hover:text-zinc-100">
              FAQ
            </a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <a href="/login" className="hidden rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100 sm:block">
              Log in
            </a>
            <a
              href="/signup"
              className="rounded-lg bg-[#006DFF] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#005DD9]"
            >
              Get early access
            </a>
          </div>
        </div>
      </header>

      {/* 1. Hero */}
      <section className="mx-auto max-w-6xl px-6 py-20 text-center sm:py-28">
        <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-6xl">
          Sell in your DMs. Build a credit record while you do it.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-500 sm:text-xl">
          Inference gives your business one link that opens an AI sales assistant. It answers
          customers, takes orders and payments, and turns every sale into a record that can help
          you access financing.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="/signup"
            className="rounded-full bg-[#006DFF] px-6 py-3 text-base font-medium text-white transition-colors hover:bg-[#005DD9]"
          >
            Get early access
          </a>
          <a
            href="#how-it-works"
            className="rounded-full border border-gray-300 px-6 py-3 text-base font-medium text-zinc-900 transition-colors hover:bg-gray-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900"
          >
            See how it works
          </a>
        </div>
        <p className="mx-auto mt-6 max-w-xl text-sm text-gray-500">
          No app to download. Works from your Instagram, TikTok or WhatsApp bio. Customers chat
          in English or Pidgin.
        </p>
        {/* Visual: chat + dashboard mock */}
        <div className="mx-auto mt-12 grid max-w-4xl gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-gray-200 bg-white p-5 text-left shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Customer chat</p>
            <div className="mt-3 flex flex-col gap-2 text-sm">
              <p className="max-w-[85%] self-start rounded-2xl bg-gray-100 px-3 py-2 dark:bg-zinc-800 dark:text-zinc-100">
                Hello! How much is the chocolate cake? 🍰
              </p>
              <p className="max-w-[85%] self-end rounded-2xl bg-[#006DFF] px-3 py-2 text-white">
                ₦15,000 — and it&apos;s in stock today!
              </p>
              <p className="max-w-[85%] self-start rounded-2xl bg-gray-100 px-3 py-2 dark:bg-zinc-800 dark:text-zinc-100">
                Your order is confirmed. Pay with OPay below 👇
              </p>
            </div>
          </div>
          <div className="rounded-3xl border border-gray-200 bg-white p-5 text-left shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Merchant dashboard</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-2xl bg-gray-100 p-3 dark:bg-zinc-800">
                <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">128</p>
                <p className="text-xs text-gray-500">Orders</p>
              </div>
              <div className="rounded-2xl bg-gray-100 p-3 dark:bg-zinc-800">
                <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">₦1.9M</p>
                <p className="text-xs text-gray-500">Sales</p>
              </div>
            </div>
            <p className="mt-3 rounded-2xl bg-green-100 px-3 py-2 text-center text-sm font-medium text-green-700">
              New order approved ✓
            </p>
          </div>
        </div>
      </section>

      {/* 2. Problem */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <h2 className="mx-auto max-w-3xl text-center text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
          You make sales every day. Banks can&apos;t see any of them.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-base text-gray-500 sm:text-lg">
          Your customers find you on Instagram, TikTok and WhatsApp. Then the sale gets stuck:
          they ask for the price, wait for a reply, negotiate, and pay by bank transfer. When
          you&apos;re busy, they leave.
        </p>
        <p className="mx-auto mt-2 max-w-2xl text-center text-base text-gray-500 sm:text-lg">
          Even when the sale goes through, it leaves no record. No record means no credit
          history, and no credit history makes it hard to get a loan for the stock or equipment
          that would help you grow.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {PROBLEM_CARDS.map((c) => (
            <div key={c.title} className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="font-medium text-zinc-900 dark:text-zinc-100">{c.title}</p>
              <p className="mt-1 text-sm text-gray-500">{c.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Solution */}
      <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-20 px-6 pb-16">
        <h2 className="mx-auto max-w-3xl text-center text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
          One link. An AI that sells for you. A record that works for you.
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#006DFF] text-base font-semibold text-white">
                {s.n}
              </p>
              <p className="mt-3 text-xl font-medium tracking-tight text-zinc-900 dark:text-zinc-100">
                {s.title}
              </p>
              <p className="mt-2 text-sm text-gray-500">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Features */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-6 pb-16">
        <h2 className="text-center text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
          Everything a small business needs to sell with confidence
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="font-medium text-zinc-900 dark:text-zinc-100">{f.title}</p>
              <p className="mt-1 text-sm text-gray-500">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Financing */}
      <section id="financing" className="mx-auto max-w-6xl scroll-mt-20 px-6 pb-16">
        <div className="rounded-3xl bg-[#1a1a1a] px-6 py-16 text-center sm:px-12 dark:bg-zinc-900 dark:border dark:border-zinc-800">
          <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Your sales history can open doors to financing
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-white/70 sm:text-lg">
            Most small businesses are turned down because they can&apos;t prove their income.
            With Inference, every order and payment builds a verified record of how your business
            really performs.
          </p>
          <div className="mx-auto mt-8 grid max-w-3xl gap-4 text-left md:grid-cols-3">
            {FINANCING_SOON.map((f) => (
              <div key={f.title} className="rounded-2xl bg-white/10 p-5">
                <p className="font-medium text-white">{f.title}</p>
                <p className="mt-1 text-sm text-white/70">{f.text}</p>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-8 max-w-2xl text-sm text-white/70">
            Inference provides the data and the score. Loans are offered and decided by licensed
            lenders. You choose whether to share your data, and you can change that choice anytime.
          </p>
          <a
            href="/signup"
            className="mt-6 inline-flex rounded-full bg-white px-6 py-3 text-base font-medium text-[#1a1a1a] transition-colors hover:bg-gray-100"
          >
            Join the early-access list for financing
          </a>
        </div>
      </section>

      {/* 6. Who it's for */}
      <section id="who" className="mx-auto max-w-6xl scroll-mt-20 px-6 pb-16">
        <h2 className="text-center text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
          Built for businesses that sell on social media
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {WHO.map((b) => (
            <div key={b.title} className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="font-medium text-zinc-900 dark:text-zinc-100">{b.title}</p>
              <p className="mt-1 text-sm text-gray-500">{b.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 7. Safety */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <h2 className="text-center text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
          An AI you can trust with your customers
        </h2>
        <div className="mx-auto mt-8 grid max-w-4xl gap-4 sm:grid-cols-2">
          {SAFETY.map((s) => (
            <div key={s.title} className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="font-medium text-zinc-900 dark:text-zinc-100">{s.title}</p>
              <p className="mt-1 text-sm text-gray-500">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 8. Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl scroll-mt-20 px-6 pb-16">
        <h2 className="text-center text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
          Simple pricing. Start free.
        </h2>
        <div className="mx-auto mt-8 grid max-w-3xl gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-gray-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Free</p>
            <p className="mt-1 text-sm text-gray-500">For trying things out</p>
            <ul className="mt-4 space-y-2 text-sm text-gray-500">
              <li>Your Inference link and AI assistant</li>
              <li>Order dashboard</li>
            </ul>
            <a
              href="/signup"
              className="mt-6 inline-flex w-full justify-center rounded-full border border-gray-300 px-6 py-3 text-base font-medium text-zinc-900 transition-colors hover:bg-gray-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Start for free
            </a>
          </div>
          <div className="rounded-3xl bg-[#1a1a1a] p-8 dark:border dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-lg font-medium text-white">Pro</p>
            <p className="mt-2 text-4xl font-semibold text-white">
              ₦3,000<span className="text-base font-normal text-white/70">/month</span>
            </p>
            <ul className="mt-4 space-y-2 text-sm text-white/70">
              <li>Payments through OPay checkout</li>
              <li>Order approval controls</li>
              <li>Sales records and business profile</li>
              <li>Priority access to financing features</li>
            </ul>
            <a
              href="/signup"
              className="mt-6 inline-flex w-full justify-center rounded-full bg-[#006DFF] px-6 py-3 text-base font-medium text-white transition-colors hover:bg-[#005DD9]"
            >
              Get Pro
            </a>
          </div>
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-sm text-gray-500">
          A 3% payment and platform fee is included in your listed price at checkout, so customers
          see one clear total.
        </p>
      </section>

      {/* 9. Social proof (fallback until pilots land) */}
      <section className="mx-auto max-w-6xl px-6 pb-16 text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
          What early merchants say
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-gray-500">
          We&apos;re onboarding our first 20 merchants in Lagos. Join them.
        </p>
        <a
          href="/signup"
          className="mt-6 inline-flex rounded-full bg-[#006DFF] px-6 py-3 text-base font-medium text-white transition-colors hover:bg-[#005DD9]"
        >
          Get early access
        </a>
      </section>

      {/* 10. FAQ */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-6 pb-16">
        <h2 className="text-center text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
          Questions, answered
        </h2>
        <div className="mt-8 flex flex-col gap-3">
          {FAQS.map((f) => (
            <details
              key={f.q}
              className="group rounded-2xl border border-gray-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <summary className="cursor-pointer font-medium text-zinc-900 dark:text-zinc-100">
                {f.q}
              </summary>
              <p className="mt-2 text-sm text-gray-500">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* 11. Final CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-20 text-center">
        <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
          Turn every sale into a step toward growth.
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-lg text-gray-500">
          Set up your Inference link in minutes. Start free.
        </p>
        <a
          href="/signup"
          className="mt-6 inline-flex rounded-full bg-[#006DFF] px-6 py-3 text-base font-medium text-white transition-colors hover:bg-[#005DD9]"
        >
          Get early access
        </a>
      </section>

      <footer className="border-t border-gray-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-8 text-sm text-gray-500 sm:flex-row sm:items-center">
          <p className="font-medium text-zinc-900 dark:text-zinc-100">Inference</p>
          <p>inference.link</p>
          <p>Instagram</p>
          <p>TikTok</p>
          <p>LinkedIn</p>
          <p className="sm:ml-auto">Privacy Policy · Terms</p>
        </div>
        <p className="mx-auto max-w-6xl px-6 pb-8 text-xs text-gray-400">
          © 2026 Inference. Inference is a software provider and not a lender.
        </p>
      </footer>
    </main>
  );
}
