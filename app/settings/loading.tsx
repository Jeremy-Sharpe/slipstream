/* Mirrors SettingsView: title, subtitle, then the four cards. */
export default function Loading() {
  return (
    <div aria-busy className="max-w-[760px]">
      <div className="h-9 w-32 rounded-md bg-surface" />
      <div className="mt-2 h-5 w-96 rounded bg-surface-2" />
      <div className="mt-8 flex flex-col gap-4">
        <div className="h-[204px] rounded-2xl bg-surface-2" />
        <div className="h-[148px] rounded-2xl bg-surface-2" />
        <div className="h-[148px] rounded-2xl bg-surface-2" />
        <div className="h-[132px] rounded-2xl bg-surface-2" />
      </div>
    </div>
  );
}
