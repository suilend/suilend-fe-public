import Image from "next/image";

import { TBodySans } from "@/components/shared/Typography";
import suilendLogo from "@/public/assets/suilend.svg";

export default function Logo() {
  return (
    <div className="flex flex-row items-center gap-1.5">
      <Image src={suilendLogo} alt="Suilend logo" width={24} height={24} />
      <TBodySans className="text-lg">Suilend</TBodySans>
    </div>
  );
}
