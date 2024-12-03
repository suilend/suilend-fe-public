import AllocationCard from "@/components/send/AllocationCard";
import { Allocation } from "@/pages/send";

interface AllocationCardsSectionProps {
  allocations: Allocation[];
  burnSendPointsSuilendCapsules: () => Promise<void>;
}

export default function AllocationCardsSection({
  allocations,
  burnSendPointsSuilendCapsules,
}: AllocationCardsSectionProps) {
  return (
    <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
      {allocations.map((allocation) => (
        <AllocationCard
          key={allocation.title}
          allocation={allocation}
          burnSendPointsSuilendCapsules={burnSendPointsSuilendCapsules}
        />
      ))}
    </div>
  );
}
