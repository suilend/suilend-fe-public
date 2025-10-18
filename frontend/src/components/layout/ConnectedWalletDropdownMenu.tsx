import { useEffect, useMemo, useState } from "react";

import { toBase64 } from "@mysten/sui/utils";
import { ChevronDown, ChevronUp, VenetianMask } from "lucide-react";

import { ADMIN_ADDRESS } from "@suilend/sdk";
import {
  API_URL,
  formatAddress,
  formatInteger,
  formatUsd,
} from "@suilend/sui-fe";
import {
  showErrorToast,
  useSettingsContext,
  useWalletContext,
} from "@suilend/sui-fe-next";

import Button from "@/components/shared/Button";
import CopyToClipboardButton from "@/components/shared/CopyToClipboardButton";
import DropdownMenu, {
  DropdownMenuItem,
} from "@/components/shared/DropdownMenu";
import OpenOnExplorerButton from "@/components/shared/OpenOnExplorerButton";
import ParentLendingMarket from "@/components/shared/ParentLendingMarket";
import Tooltip from "@/components/shared/Tooltip";
import { TLabel, TLabelSans } from "@/components/shared/Typography";
import UtilizationBar from "@/components/shared/UtilizationBar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppContext } from "@/contexts/AppContext";
import { useUserContext } from "@/contexts/UserContext";
import { cn } from "@/lib/utils";

interface ConnectedWalletDropdownMenuProps {
  addressNameServiceNameMap: Record<string, string | undefined>;
}

export default function ConnectedWalletDropdownMenu({
  addressNameServiceNameMap,
}: ConnectedWalletDropdownMenuProps) {
  const { explorer } = useSettingsContext();
  const {
    isImpersonating,
    wallet,
    disconnectWallet,
    accounts,
    account,
    switchAccount,
    signPersonalMessage,
    ...restWalletContext
  } = useWalletContext();
  const address = restWalletContext.address as string;
  const { allAppData } = useAppContext();
  const { allUserData, obligationMap, setObligationId } = useUserContext();

  // State
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const Icon = isOpen ? ChevronUp : ChevronDown;

  // VIP - eligibility
  const [isEligibleForVipProgramMap, setIsEligibleForVipProgramMap] = useState<
    Record<string, boolean>
  >({});
  const isEligibleForVipProgram = isEligibleForVipProgramMap[address];

  useEffect(() => {
    (async () => {
      if (isEligibleForVipProgramMap[address] !== undefined) return;

      try {
        const url = `${API_URL}/vip/eligibility/?${new URLSearchParams({
          wallet: address,
        })}`;
        const res = await fetch(url);
        const json = await res.json();

        setIsEligibleForVipProgramMap((prev) => ({
          ...prev,
          [address]: json.eligible,
        }));
      } catch (err) {
        console.error(err);
      }
    })();
  }, [isEligibleForVipProgramMap, address]);

  // VIP - join
  const joinVipGroup = async () => {
    if (!account?.publicKey) return;
    const timestampS = Math.floor(Date.now() / 1000);

    try {
      const message = Buffer.from(`suilend-vip-verification-${timestampS}`);
      const { signature } = await signPersonalMessage(message);

      const url = `${API_URL}/vip/info/?${new URLSearchParams({
        publicKey: toBase64(account.publicKey as Uint8Array),
        signature,
        timestampS: `${timestampS}`,
      })}`;
      const res = await fetch(url);
      const json = await res.json();

      window.open(json.telegramLink, "_blank");
    } catch (err) {
      showErrorToast("Failed to join VIP Group on Telegram", err as Error);
    }
  };

  // Items
  const hasVipItem = isEligibleForVipProgram;
  const hasDisconnectItem = !isImpersonating;

  const filteredAppData = useMemo(
    () =>
      Object.values(allAppData?.allLendingMarketData ?? {}).filter(
        (appData) => {
          const userData = allUserData?.[appData.lendingMarket.id];
          if (!userData) return false;

          if (userData.obligations.length === 0) return false;
          if (appData.lendingMarket.isHidden && address !== ADMIN_ADDRESS)
            return false;

          return true;
        },
      ),
    [allAppData, allUserData, address],
  );
  const hasAccounts = filteredAppData.length > 0;
  const hasWallets = !isImpersonating && accounts.length > 1;

  const noItems =
    !hasVipItem && !hasDisconnectItem && !hasAccounts && !hasWallets;

  console.log(
    addressNameServiceNameMap,
    accounts,
    accounts.map((a) => a.address),
  );

  return (
    <DropdownMenu
      rootProps={{ open: isOpen, onOpenChange: setIsOpen }}
      trigger={
        <Button
          className="min-w-20"
          labelClassName="uppercase text-ellipsis overflow-hidden"
          startIcon={
            isImpersonating ? (
              <VenetianMask />
            ) : isEligibleForVipProgram ? (
              <div className="flex h-3 w-4 flex-col justify-center rounded-[2px] pt-[1px] outline outline-1 outline-secondary">
                <TLabelSans className="text-[8px] font-medium text-inherit">
                  VIP
                </TLabelSans>
              </div>
            ) : wallet?.iconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="h-4 w-4 min-w-4 shrink-0"
                src={wallet.iconUrl}
                alt={`${wallet.name} logo`}
                width={16}
                height={16}
              />
            ) : undefined
          }
          endIcon={<Icon />}
        >
          {(!isImpersonating ? account?.label : undefined) ??
            addressNameServiceNameMap[address] ??
            formatAddress(address)}
        </Button>
      }
      title={
        (!isImpersonating ? account?.label : "Impersonating") ?? "Connected"
      }
      description={
        <div className="flex flex-row items-center gap-1">
          <Tooltip title={address}>
            <TLabel className="uppercase">
              {addressNameServiceNameMap[address] ?? formatAddress(address)}
            </TLabel>
          </Tooltip>

          <div className="flex h-4 flex-row items-center">
            <CopyToClipboardButton
              value={addressNameServiceNameMap[address] ?? address}
            />
            <OpenOnExplorerButton url={explorer.buildAddressUrl(address)} />
          </div>
        </div>
      }
      noItems={noItems}
      items={
        <>
          {hasVipItem && (
            <DropdownMenuItem
              className="border-secondary bg-secondary/5 font-medium text-secondary focus:border-foreground"
              onClick={joinVipGroup}
            >
              Join VIP Group on Telegram
            </DropdownMenuItem>
          )}
          {hasDisconnectItem && (
            <DropdownMenuItem onClick={disconnectWallet}>
              Disconnect
            </DropdownMenuItem>
          )}

          {hasAccounts && (
            <>
              <TLabelSans
                className={cn((hasVipItem || hasDisconnectItem) && "mt-2")}
              >
                Accounts
              </TLabelSans>

              {!allAppData || !allUserData || !obligationMap ? (
                <Skeleton className="h-[70px] w-full rounded-sm" />
              ) : (
                <div className="-mx-4 flex flex-col gap-px">
                  {filteredAppData.map(
                    (appData, appDataIndex, appDataArray) => {
                      const userData = allUserData[appData.lendingMarket.id];
                      const obligation =
                        obligationMap[appData.lendingMarket.id];

                      return (
                        <div key={appData.lendingMarket.id} className="w-full">
                          <ParentLendingMarket
                            id={`wallet-${appData.lendingMarket.id}`}
                            lendingMarketId={appData.lendingMarket.id}
                            count={formatInteger(userData.obligations.length)}
                            noHeader={filteredAppData.length === 1}
                          >
                            <div
                              className={cn(
                                "flex w-full flex-col gap-2 p-4",
                                filteredAppData.length === 1 && "pt-0",
                                appDataIndex === appDataArray.length - 1 &&
                                  "pb-0",
                              )}
                            >
                              {userData.obligations.map((o, oIndex) => (
                                <DropdownMenuItem
                                  key={o.id}
                                  className="flex flex-col items-start gap-1"
                                  isSelected={o.id === obligation?.id}
                                  onClick={() =>
                                    setObligationId(
                                      appData.lendingMarket.id,
                                      o.id,
                                    )
                                  }
                                >
                                  <div className="flex w-full flex-row justify-between">
                                    <div className="flex flex-row items-center gap-1">
                                      <TLabelSans className="text-foreground">
                                        Account {oIndex + 1}
                                      </TLabelSans>

                                      <OpenOnExplorerButton
                                        className="h-4 w-4 hover:bg-transparent"
                                        iconClassName="w-3 h-3"
                                        url={explorer.buildObjectUrl(o.id)}
                                      />
                                    </div>

                                    <TLabelSans>
                                      {o.positionCount} position
                                      {o.positionCount !== 1 ? "s" : ""}
                                    </TLabelSans>
                                  </div>

                                  <div className="flex w-full flex-row justify-between">
                                    <TLabelSans>
                                      {formatUsd(o.depositedAmountUsd)}{" "}
                                      deposited
                                    </TLabelSans>
                                    <TLabelSans>
                                      {formatUsd(o.borrowedAmountUsd)} borrowed
                                    </TLabelSans>
                                  </div>

                                  <div className="mt-2 w-full">
                                    <UtilizationBar obligation={o} noTooltip />
                                  </div>
                                </DropdownMenuItem>
                              ))}
                            </div>
                          </ParentLendingMarket>
                        </div>
                      );
                    },
                  )}
                </div>
              )}
            </>
          )}

          {hasWallets && (
            <>
              <TLabelSans
                className={cn(
                  (hasVipItem || hasDisconnectItem || hasAccounts) && "mt-2",
                )}
              >
                Wallets
              </TLabelSans>

              {accounts.map((a) => (
                <DropdownMenuItem
                  key={a.address}
                  className="flex flex-col items-start gap-1"
                  isSelected={a.address === address}
                  onClick={() =>
                    switchAccount(a, addressNameServiceNameMap[a.address])
                  }
                >
                  <div className="flex w-full flex-row items-center justify-between gap-2">
                    <TLabel
                      className={cn(
                        "uppercase text-foreground",
                        addressNameServiceNameMap[a.address]
                          ? "overflow-hidden text-ellipsis text-nowrap"
                          : "shrink-0",
                      )}
                    >
                      {addressNameServiceNameMap[a.address] ??
                        formatAddress(a.address)}
                    </TLabel>

                    {a.label && (
                      <TLabelSans className="overflow-hidden text-ellipsis text-nowrap">
                        {a.label}
                      </TLabelSans>
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
            </>
          )}
        </>
      }
    />
  );
}
