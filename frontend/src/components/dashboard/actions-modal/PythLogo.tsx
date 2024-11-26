import Image from "next/image";

import { ClassValue } from "clsx";

import Tooltip from "@/components/shared/Tooltip";
import { cn } from "@/lib/utils";
import pythLogo from "@/public/assets/pyth.png";

interface PythLogoProps {
  className?: ClassValue;
}

export default function PythLogo({ className }: PythLogoProps) {
  return (
    <Tooltip title="Powered by Pyth">
      <Image
        className={cn("h-4 w-4", className)}
        src={pythLogo}
        alt="Pyth logo"
        width={16}
        height={16}
        quality={100}
      />
    </Tooltip>
  );
}
