import { notFound } from "next/navigation";
import { ListWorkbook } from "@/components/legacy/lists/ListWorkbook";
import { getList, lists } from "@/lib/legacy/data/lists";

export function generateStaticParams() {
  return lists.map((l) => ({ id: l.id }));
}

export default async function ListPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const list = getList(id);
  if (!list) notFound();
  return <ListWorkbook list={list} />;
}
