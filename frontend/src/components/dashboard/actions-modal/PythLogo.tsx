import Image from "next/image";

import { ClassValue } from "clsx";

import Tooltip from "@/components/shared/Tooltip";
import { ASSETS_URL } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface PythLogoProps {
  className?: ClassValue;
}

export default function PythLogo({ className }: PythLogoProps) {
  return (
    <Tooltip title="Powered by Pyth">
      <Image
        className={cn("h-4 w-4", className)}
        src={`${ASSETS_URL}/partners/Pyth.png`}
        alt="Pyth logo"
        width={16}
        height={16}
        quality={100}
      />
    </Tooltip>
  );
}
