import Image from "next/image";
import { useState } from "react";

import { ChevronDown, ChevronUp, VenetianMask } from "lucide-react";

import { useSettingsContext, useWalletContext } from "@suilend/frontend-sui";
import { ParsedObligation } from "@suilend/sdk/parsers/obligation";

import UtilizationBar from "@/components/dashboard/UtilizationBar";
import Button from "@/components/shared/Button";
import CopyToClipboardButton from "@/components/shared/CopyToClipboardButton";
import DropdownMenu, {
  DropdownMenuItem,
} from "@/components/shared/DropdownMenu";
import OpenOnExplorerButton from "@/components/shared/OpenOnExplorerButton";
import Tooltip from "@/components/shared/Tooltip";
import { TLabel, TLabelSans } from "@/components/shared/Typography";
import { useAppContext } from "@/contexts/AppContext";
import { formatAddress, formatUsd } from "@/lib/format";
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
    ...restWalletContext
  } = useWalletContext();
  const address = restWalletContext.address as string;
  const { data, obligation, setObligationId } = useAppContext();

  // State
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const Icon = isOpen ? ChevronUp : ChevronDown;

  const hasDisconnect = !isImpersonating;
  const hasSubaccounts =
    data && data.obligations && data.obligations.length > 1 && obligation;
  const hasWallets = !isImpersonating && accounts.length > 1;

  const noItems = !hasDisconnect && !hasSubaccounts && !hasWallets;

  return (
    <DropdownMenu
      rootProps={{ open: isOpen, onOpenChange: setIsOpen }}
      trigger={
        <Button
          className="min-w-0"
          labelClassName="uppercase text-ellipsis overflow-hidden"
          startIcon={
            isImpersonating ? (
              <VenetianMask />
            ) : wallet?.iconUrl ? (
              <Image
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
          {hasDisconnect && (
            <DropdownMenuItem onClick={disconnectWallet}>
              Disconnect
            </DropdownMenuItem>
          )}
          {hasSubaccounts && (
            <>
              <TLabelSans className={cn(hasDisconnect && "mt-2")}>
                Subaccounts
              </TLabelSans>

              {(data.obligations as ParsedObligation[]).map(
                (o, index, array) => (
                  <DropdownMenuItem
                    key={o.id}
                    className="flex flex-col items-start gap-1"
                    isSelected={o.id === obligation.id}
                    onClick={() => setObligationId(o.id)}
                  >
                    <div className="flex w-full justify-between">
                      <TLabelSans className="text-foreground">
                        Subaccount {array.findIndex((_o) => _o.id === o.id) + 1}
                      </TLabelSans>
                      <TLabelSans>
                        {o.positionCount} position
                        {o.positionCount !== 1 ? "s" : ""}
                      </TLabelSans>
                    </div>

                    <div className="flex w-full justify-between">
                      <TLabelSans>
                        {formatUsd(o.depositedAmountUsd)} deposited
                      </TLabelSans>
                      <TLabelSans>
                        {formatUsd(o.borrowedAmountUsd)} borrowed
                      </TLabelSans>
                    </div>

                    <UtilizationBar
                      className="mt-2 h-1"
                      obligation={o}
                      noTooltip
                    />
                  </DropdownMenuItem>
                ),
              )}
            </>
          )}
          {hasWallets && (
            <>
              <TLabelSans
                className={cn((hasDisconnect || hasSubaccounts) && "mt-2")}
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
