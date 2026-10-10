import Image from "next/image";
import Link from "next/link";

export function AuthCard({
  title,
  subtitle,
  footer,
  children,
}: {
  title: string;
  subtitle: string;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[url('/MobileHeroBG.jpeg')] bg-cover bg-center p-6 md:bg-[url('/HeroBG.jpeg')] md:bg-top">
      <div className="w-full max-w-sm rounded-3xl border border-black bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col items-center text-center">
          <Image
            src="/Tagly.jpeg"
            alt="Tagly logo"
            width={48}
            height={48}
            className="h-12 w-12 rounded-xl object-contain"
          />
          <p className="mt-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">Tagly</p>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{title}</h1>
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        </div>
        <div className="mt-6">{children}</div>
        <div className="mt-4 text-center text-sm text-gray-500">{footer}</div>
      </div>
    </main>
  );
}

export function AuthInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="h-11 w-full rounded-lg border-0 bg-gray-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0066ff] dark:bg-zinc-800 dark:text-zinc-100 dark:focus:bg-zinc-900"
    />
  );
}

export function AuthFooterLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="font-medium text-[#0066ff] hover:underline">
      {label}
    </Link>
  );
}
