import Image from "next/image";
import Link from "next/link";

import { ASSETS_URL } from "@/lib/constants";

const SocialIcons = () => (
  <div className="flex items-center gap-3">
    <Link href="https://coinmarketcap.com/currencies/suilend/" target="_blank">
      <Image
        src={`${ASSETS_URL}/icons/cmc.svg`}
        alt="CMC"
        width={18}
        height={18}
        quality={100}
        className="rounded-full"
      />
    </Link>
    <Link href="https://www.coingecko.com/en/coins/suilend" target="_blank">
      <Image
        src={`${ASSETS_URL}/icons/cg.svg`}
        alt="CoinGecko"
        width={18}
        height={18}
        quality={100}
        className="rounded-full"
      />
    </Link>
    <Link
      href="https://noodles.fi/coins/0xb45fcfcc2cc07ce0702cc2d229621e046c906ef14d9b25e8e4d25f6e8763fef7::send::SEND"
      target="_blank"
    >
      <Image
        src={`${ASSETS_URL}/icons/noodles.svg`}
        alt="Noodle"
        width={18}
        height={18}
        quality={100}
      />
    </Link>
    <Link
      href="https://suiscan.xyz/mainnet/coin/0xb45fcfcc2cc07ce0702cc2d229621e046c906ef14d9b25e8e4d25f6e8763fef7::send::SEND"
      target="_blank"
    >
      <Image
        src={`${ASSETS_URL}/icons/suiscan.svg`}
        alt="Suiscan"
        width={18}
        height={18}
        quality={100}
      />
    </Link>
  </div>
);

export default SocialIcons;
