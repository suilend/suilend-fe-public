import Image from "next/image";

import SectionHeading from "@/components/send/SectionHeading";
import { AspectRatio } from "@/components/ui/aspect-ratio";

export default function TokenomicsSection() {
  return (
    <div className="flex w-full flex-col items-center gap-16">
      <SectionHeading>Token distribution & unlocks schedule</SectionHeading>

      <div className="flex w-full flex-col items-center justify-center gap-16 md:flex-row">
        <div className="max-w-96 max-md:w-full md:flex-1">
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

        <div className="max-w-96 max-md:w-full md:flex-1">
          <AspectRatio ratio={1029 / 830}>
            <Image
              className="object-cover"
              src="/assets/send/tokenomics-unlocks.png"
              alt="SEND unlocks chart"
              fill
              quality={100}
            />
          </AspectRatio>
        </div>
      </div>
    </div>
  );
}
