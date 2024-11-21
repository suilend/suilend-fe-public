import AllocationCard from "@/components/send/AllocationCard";
import {
  NORMALIZED_OCTO_COINTYPE,
  NORMALIZED_TISM_COINTYPE,
} from "@/lib/coinType";
import { formatInteger } from "@/lib/format";

export const SEND_TOTAL_SUPPLY = 100_000_000;

export type Allocation = {
  title: string;
  description: string;
  totalAllocationPercent: number;
  eligibleWallets: string;
  cta?: {
    title: string;
    href: string;
  };
};

export default function AllocationCardsSection() {
  const allocations: Allocation[] = [
    {
      title: "Early users",
      description: "TEMP",
      totalAllocationPercent: 1,
      eligibleWallets: formatInteger(6778),
    },
    {
      title: "SEND Points",
      description: "TEMP",
      totalAllocationPercent: 19,
      eligibleWallets: formatInteger(1000),
    },
    {
      title: "Suilend Capsules",
      description: "TEMP",
      totalAllocationPercent: 0.3,
      eligibleWallets: formatInteger(1000),
    },
    {
      title: "Save",
      description: "TEMP",
      totalAllocationPercent: 15,
      eligibleWallets: formatInteger(1000),
      cta: {
        title: "Get",
        href: "https://save.finance/send",
      },
    },
    {
      title: "Rootlets",
      description: "TEMP",
      totalAllocationPercent: 3.333,
      eligibleWallets: formatInteger(3333),
    },
    {
      title: "$FUD",
      description: "TEMP",
      totalAllocationPercent: 0.1,
      eligibleWallets: "Top 10,000",
      cta: {
        title: "Buy",
        href: "/swap/SUI-FUD",
      },
    },
    {
      title: "$OCTO",
      description: "TEMP",
      totalAllocationPercent: 0.017,
      eligibleWallets: "Top 300",
      cta: {
        title: "Buy",
        href: `/swap/SUI-${NORMALIZED_OCTO_COINTYPE}`,
      },
    },
    {
      title: "$AAA",
      description: "TEMP",
      totalAllocationPercent: 0.1,
      eligibleWallets: "Top 1,000",
      cta: {
        title: "Buy",
        href: "/swap/SUI-AAA",
      },
    },
    {
      title: "$TISM",
      description: "TEMP",
      totalAllocationPercent: 0.01,
      eligibleWallets: "Top 300",
      cta: {
        title: "Buy",
        href: `/swap/SUI-${NORMALIZED_TISM_COINTYPE}`,
      },
    },
  ];

  return (
    <div className="grid w-full max-w-[960px] grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
      {allocations.map((allocation) => (
        <AllocationCard key={allocation.title} allocation={allocation} />
      ))}
    </div>
  );
}
