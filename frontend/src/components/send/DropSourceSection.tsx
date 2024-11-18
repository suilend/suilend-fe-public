import DropSourceCard from "@/components/send/DropSourceCard";

export default function DropSourceSection() {
  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-6">
      <DropSourceCard />
      <DropSourceCard />
      <DropSourceCard />
      <DropSourceCard />
    </div>
  );
}
