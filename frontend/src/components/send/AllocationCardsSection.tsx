import AllocationCard from "@/components/send/AllocationCard";

export default function AllocationCardsSection() {
  return (
    <div className="grid w-full max-w-[960px] grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
      <AllocationCard />
      <AllocationCard />
      <AllocationCard />
      <AllocationCard />
    </div>
  );
}
