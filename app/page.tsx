import { DropZone } from "@/components/DropZone";

export default function HomePage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
      <section className="w-full max-w-[720px] pb-16 text-center">
        <DropZone />
      </section>
    </div>
  );
}
