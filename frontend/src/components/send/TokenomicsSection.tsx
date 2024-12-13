import Image from "next/image";
import Link from "next/link";

import { ArrowUpRight } from "lucide-react";

import SectionHeading from "@/components/send/SectionHeading";
import Button from "@/components/shared/Button";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { ASSETS_URL } from "@/lib/constants";

export default function TokenomicsSection() {
  return (
    <div className="flex w-full flex-col items-center gap-12 py-16 md:gap-16 md:py-20">
      <SectionHeading>Token distribution & unlock schedule</SectionHeading>

      <div className="flex w-full flex-col items-center justify-center gap-16 md:flex-row">
        <div className="max-w-96 max-md:w-full md:flex-1">
          <AspectRatio ratio={1029 / 828}>
            <Image
              className="object-cover"
              src={`${ASSETS_URL}/send/tokenomics-pie.png`}
              alt="SEND pie chart"
              fill
              quality={100}
            />
          </AspectRatio>
        </div>

        <div className="max-w-96 max-md:w-full md:flex-1">
          <AspectRatio ratio={1029 / 830}>
            <Image
              className="object-cover"
              src={`${ASSETS_URL}/send/tokenomics-unlocks.png`}
              alt="SEND unlocks chart"
              fill
              quality={100}
            />
          </AspectRatio>
        </div>
      </div>

      <Link
        target="_blank"
        href="https://blog.suilend.fi/suilend-send-tokenomics-b5272c3074fe"
      >
        <Button
          className="h-10 w-full border-secondary text-primary-foreground"
          labelClassName="uppercase text-[16px]"
          endIcon={<ArrowUpRight className="h-4 w-4" />}
          variant="secondaryOutline"
        >
          Read blog post
        </Button>
      </Link>
    </div>
  );
}
