export default function RemovedPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-100 p-8">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow">
        <h1 className="text-xl font-bold">This account has been removed</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Please contact support if you believe this is a mistake.
        </p>
      </div>
    </main>
  );
}
