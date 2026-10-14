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

const SYNC_FEATURES = [
  {
    title: "Orders from every chat in one place",
    text: "Instagram, TikTok and WhatsApp conversations land in a single dashboard.",
  },
  {
    title: "Approve in one tap",
    text: "Review each order before payment, or switch on automatic approval.",
  },
  {
    title: "Stock that updates itself",
    text: "Every sale adjusts your inventory, so you never oversell.",
  },
  {
    title: "Payments inside the chat",
    text: "Customers pay with OPay without leaving the conversation.",
  },
  {
    title: "Records that build credit",
    text: "Each settled sale feeds a verified record lenders can trust.",
  },
  {
    title: "History on every order",
    text: "Full chat history attached, so disputes are easy to settle.",
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

function DualCta({ primaryHref = "/signup" }: { primaryHref?: string }) {
  return (
    <div>
      <a
        href={primaryHref}
        className="inline-flex rounded-full bg-[#006DFF] px-8 py-3.5 text-base font-medium text-white transition-colors hover:bg-[#005DD9]"
      >
        Start selling
      </a>
      <p className="mt-3 text-sm text-gray-500">
        No Inference link yet?{" "}
        <a href="/signup" className="font-medium text-[#006DFF] hover:underline">
          Get one free
        </a>
      </p>
    </div>
  );
}

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
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-14 text-center sm:pt-20">
        <p className="inline-block rounded-full border border-[#7c3aed]/40 bg-[#7c3aed]/10 px-4 py-1.5 text-sm font-semibold uppercase tracking-widest text-[#7c3aed]">
          AI that understands your business
        </p>
        <h1 className="mx-auto mt-4 max-w-3xl text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-6xl">
          Never miss another DM sale.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-500 sm:text-xl">
          One link opens an AI assistant that answers customers, takes orders and
          payments — and turns every sale into a record that can unlock financing.
        </p>
        <div className="mt-8">
          <DualCta />
        </div>
        <p className="mx-auto mt-6 max-w-xl text-sm text-gray-500">
          No app to download. Works from your Instagram, TikTok or WhatsApp bio. Customers chat
          in English or Pidgin.
        </p>
        {/* Visual */}
        <div className="mx-auto mt-12 max-w-[280px]">
          <Image
            src="/h2.png"
            alt="Customer chatting with an Inference AI assistant while the merchant dashboard tracks the sale"
            width={1500}
            height={600}
            className="h-auto w-full rounded-3xl"
            priority
          />
        </div>
      </section>

      {/* 2. Feature band */}
      <section
        className="bg-cover bg-center"
        style={{ backgroundImage: "url('/Page%20modal.jpeg')" }}
      >
        <div className="bg-[#7c3aed]/70 dark:bg-[#5b21b6]/70">
        <div className="relative mx-auto max-w-6xl px-6 py-20 text-center sm:py-24">
          <h2 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Replies, included.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/85">
            Every Inference link comes with an AI assistant that answers instantly,
            quotes your real prices, and never sleeps. No extra tools, no extra fees.
          </p>
          <a href="#how-it-works" className="mt-6 inline-block font-medium text-white underline underline-offset-4 hover:text-white/80">
            See how it works →
          </a>
        </div>
        </div>
      </section>

      {/* 3. Workflow rows */}
      <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-20 sm:py-24">
        <h2 className="mx-auto max-w-3xl text-center text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">
          Your full sales workflow, in one link
        </h2>
        <div className="mt-14 flex flex-col gap-16">
          {STEPS.map((s, i) => (
            <div
              key={s.n}
              className={`grid items-center gap-8 md:grid-cols-2 ${i % 2 === 1 ? "" : ""}`}
            >
              <div className={i % 2 === 1 ? "md:order-2" : ""}>
                <p className="text-sm font-semibold uppercase tracking-widest text-[#006DFF]">
                  Step {s.n}
                </p>
                <h3 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {s.title}
                </h3>
                <p className="mt-3 text-lg text-gray-500">{s.text}</p>
              </div>
              <div
                className={`rounded-3xl bg-[#f6f6f7] p-8 dark:bg-zinc-900 ${i % 2 === 1 ? "md:order-1" : ""}`}
              >
                <p className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#006DFF] text-xl font-bold text-white">
                  {s.n}
                </p>
                <p className="mt-4 text-xl font-medium text-zinc-900 dark:text-zinc-100">
                  {s.title}
                </p>
                <p className="mt-2 text-gray-500">{s.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Problem */}
      <section className="bg-[#f6f6f7] dark:bg-zinc-900/50">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <h2 className="mx-auto max-w-3xl text-center text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">
            You make sales every day. Banks can&apos;t see any of them.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-gray-500">
            Your customers find you on Instagram, TikTok and WhatsApp. Then the sale gets stuck:
            they ask for the price, wait for a reply, negotiate, and pay by bank transfer. When
            you&apos;re busy, they leave.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {PROBLEM_CARDS.map((c) => (
              <div key={c.title} className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
                <p className="font-medium text-zinc-900 dark:text-zinc-100">{c.title}</p>
                <p className="mt-1 text-sm text-gray-500">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Everything in sync */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-20 sm:py-24">
        <h2 className="mx-auto max-w-3xl text-center text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">
          Everything in sync
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-gray-500">
          One system for chats, orders, stock, payments and records.
        </p>
        <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {SYNC_FEATURES.map((f) => (
            <div key={f.title}>
              <p className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                {f.title}
              </p>
              <p className="mt-2 text-gray-500">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Financing */}
      <section id="financing" className="mx-auto max-w-6xl scroll-mt-20 px-6 pb-20">
        <div className="rounded-3xl bg-[#1a1a1a] px-6 py-16 text-center sm:px-12 dark:bg-zinc-900 dark:border dark:border-zinc-800">
          <h2 className="mx-auto max-w-2xl text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Growth, recorded
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/70">
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

      {/* 7. Social proof */}
      <section className="bg-[#f6f6f7] dark:bg-zinc-900/50">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center sm:py-24">
          <p className="text-5xl font-bold text-[#006DFF]">“</p>
          <p className="text-2xl font-medium tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
            We&apos;re onboarding our first 20 merchants in Lagos. Join them.
          </p>
          <p className="mt-4 text-sm font-medium uppercase tracking-widest text-gray-500">
            Early access · Lagos, Nigeria
          </p>
          <a
            href="/signup"
            className="mt-8 inline-flex rounded-full bg-[#006DFF] px-8 py-3.5 text-base font-medium text-white transition-colors hover:bg-[#005DD9]"
          >
            Get early access
          </a>
        </div>
      </section>

      {/* 8. Who it's for */}
      <section id="who" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-20 sm:py-24">
        <h2 className="mx-auto max-w-3xl text-center text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">
          Built for businesses that sell on social media
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {WHO.map((b) => (
            <div key={b.title} className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="font-medium text-zinc-900 dark:text-zinc-100">{b.title}</p>
              <p className="mt-1 text-sm text-gray-500">{b.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 9. Safety */}
      <section className="bg-[#f6f6f7] dark:bg-zinc-900/50">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <h2 className="mx-auto max-w-3xl text-center text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">
            An AI you can trust with your customers
          </h2>
          <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-2">
            {SAFETY.map((s) => (
              <div key={s.title} className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
                <p className="font-medium text-zinc-900 dark:text-zinc-100">{s.title}</p>
                <p className="mt-1 text-sm text-gray-500">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-20 sm:py-24">
        <h2 className="mx-auto max-w-3xl text-center text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">
          Simple pricing. Start free.
        </h2>
        <div className="mx-auto mt-10 grid max-w-3xl gap-4 md:grid-cols-2">
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

      {/* 11. FAQ */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-6 pb-20">
        <h2 className="text-center text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">
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

      {/* 12. Final CTA */}
      <section className="bg-[#f6f6f7] dark:bg-zinc-900/50">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center sm:py-24">
          <h2 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">
            Out-sell your competition.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-gray-500">
            Set up your Inference link in minutes. Start free.
          </p>
          <div className="mt-8">
            <DualCta />
          </div>
        </div>
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
