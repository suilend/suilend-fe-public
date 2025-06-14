import Image from "next/image";

import { ChevronDown, ChevronUp } from "lucide-react";

import { isInMsafeApp } from "@suilend/sui-fe";
import { Wallet, WalletType, useWalletContext } from "@suilend/sui-fe-next";
import useIsAndroid from "@suilend/sui-fe-next/hooks/useIsAndroid";
import useIsiOS from "@suilend/sui-fe-next/hooks/useIsiOS";

import Button from "@/components/shared/Button";
import DropdownMenu, {
  DropdownMenuItem,
} from "@/components/shared/DropdownMenu";
import { TLabelSans } from "@/components/shared/Typography";

interface WalletDropdownItemProps {
  wallet: Wallet;
}

function WalletDropdownItem({ wallet }: WalletDropdownItemProps) {
  const { connectWallet } = useWalletContext();

  const isiOS = useIsiOS();
  const isAndroid = useIsAndroid();

  const downloadUrl = isiOS
    ? wallet.downloadUrls?.iOS
    : isAndroid
      ? wallet.downloadUrls?.android
      : wallet.downloadUrls?.extension;

  const onClick = () => {
    if (wallet.type === WalletType.WEB || wallet.isInstalled) {
      connectWallet(wallet);
      return;
    }

    if (downloadUrl) window.open(downloadUrl, "_blank");
  };

  if (!(wallet.type === WalletType.WEB || wallet.isInstalled) && !downloadUrl)
    return null;
  return (
    <DropdownMenuItem onClick={onClick}>
      <div className="flex w-full flex-row items-center justify-between gap-2">
        <div className="flex flex-row items-center gap-2">
          {wallet.iconUrl ? (
            <Image
              className="h-6 w-6"
              src={wallet.iconUrl}
              alt={`${wallet.name} logo`}
              width={24}
              height={24}
              quality={100}
            />
          ) : (
            <div className="h-6 w-6" />
          )}

          <TLabelSans className="text-foreground">{wallet.name}</TLabelSans>
        </div>

        {wallet.isInstalled && <TLabelSans>Installed</TLabelSans>}
      </div>
    </DropdownMenuItem>
  );
}

export default function ConnectWalletDropdownMenu() {
  const {
    isConnectWalletDropdownOpen,
    setIsConnectWalletDropdownOpen,
    wallets,
  } = useWalletContext();

  // State
  const Icon = isConnectWalletDropdownOpen ? ChevronUp : ChevronDown;

  return (
    <DropdownMenu
      rootProps={{
        open: isConnectWalletDropdownOpen,
        onOpenChange: setIsConnectWalletDropdownOpen,
      }}
      trigger={
        <Button labelClassName="uppercase" endIcon={<Icon />}>
          Connect<span className="hidden sm:inline"> wallet</span>
        </Button>
      }
      title="Select wallet"
      items={
        <>
          {wallets.map((w) => (
            <WalletDropdownItem key={w.name} wallet={w} />
          ))}

          {!isInMsafeApp() && (
            <TLabelSans className="mt-2">
              {
                "Don't have a Sui wallet? Get started by trying one of the wallets above."
              }
            </TLabelSans>
          )}
        </>
      }
    />
  );
}
