import Image from "next/image";

import { ASSETS_URL } from "@/lib/constants";

interface SteammLogoProps {
  size: number;
}

export default function SteammLogo({ size }: SteammLogoProps) {
  return (
    <Image
      src={`${ASSETS_URL}/steamm/STEAMM.svg`}
      alt="STEAMM logo"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      quality={100}
    />
  );
}
