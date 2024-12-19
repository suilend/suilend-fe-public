import Image from "next/image";

import { TBodySans } from "@/components/shared/Typography";
import { ASSETS_URL } from "@/lib/constants";

export default function Logo() {
  return (
    <div className="flex flex-row items-center gap-2">
      <Image
        src={`${ASSETS_URL}/Suilend.svg`}
        alt="Suilend logo"
        width={24}
        height={24}
        quality={100}
      />
      <TBodySans className="text-lg">Suilend</TBodySans>
    </div>
  );
}
