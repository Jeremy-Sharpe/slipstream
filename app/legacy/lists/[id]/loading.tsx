export default function Loading() {
  return (
    <div className="flex h-screen flex-col" aria-busy="true">
      <div className="h-16 border-b border-legacy-line" />
      <div className="h-[78px]" />
      <div className="mx-4 flex-1 animate-pulse border border-legacy-line bg-page" />
      <div className="h-[72px] border-t border-legacy-line" />
    </div>
  );
}
