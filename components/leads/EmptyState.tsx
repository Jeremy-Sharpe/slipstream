export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="flex flex-col items-center pt-[120px] text-center">
      <p className="text-base text-muted-foreground">{title}</p>
      {body && <p className="mt-1 text-sm text-muted-foreground">{body}</p>}
    </div>
  );
}
