export default function Loading() {
  return (
    <div className="flex h-[calc(100vh-56px)] flex-col" aria-busy="true">
      <div className="h-14 border-b border-line" />
      <div className="h-16" />
      <div className="mx-4 flex-1 animate-pulse rounded-lg border border-line bg-page" />
      <div className="h-12 border-t border-line" />
    </div>
  );
}
