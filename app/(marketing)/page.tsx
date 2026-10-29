import Image from "next/image";
import { AscendHeadline } from "@/components/marketing/ascend-headline";
import { CapabilityBackdrop } from "@/components/marketing/capability-backdrop";
import { CapabilityProvider } from "@/components/marketing/capability-cycle";
import {
  InstagramIcon,
  TikTokIcon,
  WhatsAppIcon,
} from "@/components/marketing/social-icons";

const platformClass =
  "whitespace-nowrap font-medium text-gray-500";
const iconClass =
  "mr-1 inline-block h-[0.95em] w-[0.95em] shrink-0 align-[-0.125em]";

export default function LandingPage() {
  return (
    <CapabilityProvider>
      <main className="landing-gradient relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-10">
        {/* Photo that swaps with the headline (plain gradient when there is none) */}
        <CapabilityBackdrop />

        {/* Logo */}
        <Image
          src="/tagly.png"
          alt="Logo"
          width={520}
          height={241}
          priority
          className="h-auto w-[100px] sm:w-[130px]"
        />

        {/* Headline with word-by-word ascend animation */}
        <h1 className="mt-6 max-w-3xl text-center text-4xl font-semibold leading-[1.12] tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl">
          AI that
          <br />
          <AscendHeadline />
        </h1>

        <p className="mt-6 text-center text-sm text-gray-500 sm:text-base">
          Log in or create an account
        </p>

        {/* Signup CTA */}
        <a
          href="/signup"
          className="group mt-4 flex w-full max-w-[460px] items-center justify-center rounded-2xl bg-gradient-to-r from-[#0866FF] via-[#4C8DFF] to-[#00C6FF] px-5 py-4 text-base font-semibold text-white transition-opacity hover:opacity-90"
        >
          Signup
        </a>

        <a
          href="/login"
          className="mt-5 text-sm font-medium text-[#0866FF] hover:underline sm:text-base"
        >
          Already have an account? Log in
        </a>

        {/* Last sentence with platform icons */}
        <p className="mt-8 max-w-[34rem] text-balance text-center text-xs leading-relaxed text-gray-400 sm:text-sm">
          No app to download. Works from your{" "}
          <span className={platformClass}>
            <InstagramIcon className={iconClass} />
            Instagram,
          </span>{" "}
          <span className={platformClass}>
            <TikTokIcon className={iconClass} />
            TikTok
          </span>{" "}
          or{" "}
          <span className={platformClass}>
            <WhatsAppIcon className={iconClass} />
            WhatsApp
          </span>{" "}
          bio. Customers chat in English or Pidgin.
        </p>
      </main>
    </CapabilityProvider>
  );
}
