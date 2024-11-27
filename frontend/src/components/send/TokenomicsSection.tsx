import Image from "next/image";

import SectionHeading from "@/components/send/SectionHeading";
import { AspectRatio } from "@/components/ui/aspect-ratio";

export default function TokenomicsSection() {
  return (
    <div className="flex w-full flex-col items-center gap-8">
      <SectionHeading>Token distribution & unlocks schedule</SectionHeading>

      <div className="flex w-full flex-col items-center justify-center lg:flex-row">
        <div className="max-w-[450px] max-lg:w-full lg:flex-1">
          <AspectRatio ratio={1031 / 828}>
            <Image
              className="object-cover"
              src="/assets/send/tokenomics-pie.png"
              alt="SEND pie chart"
              fill
              quality={100}
            />
          </AspectRatio>
        </div>

        <div className="max-w-[600px] max-lg:w-full lg:flex-1">
          <AspectRatio ratio={960 / 838}>
            <Image
              className="object-cover"
              src="/assets/send/tokenomics-vesting.png"
              alt="SEND vesting chart"
              fill
              quality={100}
            />
          </AspectRatio>
        </div>
      </div>
    </div>
  );
}
