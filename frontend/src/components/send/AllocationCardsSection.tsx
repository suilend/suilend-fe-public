import { useMemo } from "react";

import { useWalletContext } from "@suilend/frontend-sui";

import AllocationCard from "@/components/send/AllocationCard";
import { Allocation } from "@/pages/send";

interface AllocationCardsSectionProps {
  allocations: Allocation[];
}

export default function AllocationCardsSection({
  allocations,
}: AllocationCardsSectionProps) {
  const { address } = useWalletContext();

  const eligibleAllocations = useMemo(
    () =>
      allocations.filter(
        (allocation) =>
          allocation.allocationPercent !== undefined &&
          allocation.allocationPercent.gt(0),
      ),
    [allocations],
  );
  const ineligibleAllocations = useMemo(
    () =>
      allocations.filter(
        (allocation) =>
          allocation.allocationPercent !== undefined &&
          allocation.allocationPercent.eq(0),
      ),
    [allocations],
  );

  const pendingAllocations = useMemo(
    () =>
      allocations.filter(
        (allocation) =>
          !eligibleAllocations.find((a) => a.id === allocation.id) &&
          !ineligibleAllocations.find((a) => a.id === allocation.id),
      ),
    [allocations, eligibleAllocations, ineligibleAllocations],
  );

  const sortedAllocations = useMemo(
    () => [
      ...eligibleAllocations,
      ...pendingAllocations,
      ...ineligibleAllocations,
    ],
    [eligibleAllocations, pendingAllocations, ineligibleAllocations],
  );

  return (
    <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
      {(address ? sortedAllocations : allocations).map((allocation) => (
        <AllocationCard key={allocation.title} allocation={allocation} />
      ))}
    </div>
  );
}
