import { ExternalLink } from "lucide-react";

import { ADMIN_ADDRESS } from "@suilend/sdk";
import { getMsafeAppStoreUrl, isInMsafeApp } from "@suilend/sui-fe";
import { useWalletContext } from "@suilend/sui-fe-next";

import Link from "@/components/shared/Link";
import { getSwapUrl } from "@/contexts/SwapContext";
import {
  ABOUT_URL,
  ADMIN_URL,
  BRIDGE_URL,
  POINTS_URL,
  ROOT_URL,
  SEND_URL,
  SPRINGSUI_URL,
  STEAMM_URL,
  SWAP_URL,
} from "@/lib/navigation";

export default function NavigationLinks() {
  const { address } = useWalletContext();

  return (
    <>
      {/* Internal */}
      <Link href={ROOT_URL}>Lend</Link>
      {!isInMsafeApp() && (
        <Link href={getSwapUrl()} startsWithHref={SWAP_URL}>
          Swap
        </Link>
      )}
      {!isInMsafeApp() && <Link href={BRIDGE_URL}>Bridge</Link>}

      <Link href={POINTS_URL}>Points</Link>
      <Link href={SEND_URL}>SEND</Link>
      <Link href={ABOUT_URL}>About</Link>
      {address === ADMIN_ADDRESS && !isInMsafeApp() && (
        <Link href={ADMIN_URL}>Admin</Link>
      )}

      {/* External */}
      <Link
        href={
          !isInMsafeApp() ? SPRINGSUI_URL : getMsafeAppStoreUrl("SpringSui")
        }
        isExternal
        endIcon={<ExternalLink className="h-3 w-3" />}
      >
        SpringSui
      </Link>
      <Link
        href={STEAMM_URL}
        isExternal
        endIcon={<ExternalLink className="h-3 w-3" />}
      >
        STEAMM
      </Link>
    </>
  );
}
