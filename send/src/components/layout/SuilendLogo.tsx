import Image from "next/image";

import { ASSETS_URL } from "@/lib/constants";

interface SuilendLogoProps {
  size: number;
}

export default function SuilendLogo({ size }: SuilendLogoProps) {
  return (
    <Image
      src={`${ASSETS_URL}/suilend/Suilend.svg`}
      alt="Suilend logo"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      quality={100}
    />
  );
}
