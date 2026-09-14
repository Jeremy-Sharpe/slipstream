export default function Loading() {
  return (
    <div aria-busy className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
      <div className="w-full max-w-[720px] pb-16">
        <div className="mx-auto h-7 w-64 rounded-md bg-surface" />
        <div className="mx-auto mt-2 h-4 w-96 rounded bg-surface-2" />
        <div className="mt-8 h-56 rounded-2xl bg-surface-2" />
      </div>
    </div>
  );
}
