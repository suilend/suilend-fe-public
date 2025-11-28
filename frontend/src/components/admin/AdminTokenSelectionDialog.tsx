import { Wallet } from "lucide-react";

import { SUI_COINTYPE, Token, formatToken, isSui } from "@suilend/sui-fe";
import { useSettingsContext } from "@suilend/sui-fe-next";

import CopyToClipboardButton from "@/components/shared/CopyToClipboardButton";
import OpenOnExplorerButton from "@/components/shared/OpenOnExplorerButton";
import TokenSelectionDialog from "@/components/shared/TokenSelectionDialog";
import { TBody, TLabelSans } from "@/components/shared/Typography";
import { useLoadedUserContext } from "@/contexts/UserContext";

interface AdminTokenSelectionDialogProps {
  noLabel?: boolean;
  token?: Token;
  tokens: Token[];
  placeholder?: string;
  onSelectToken: (token: Token) => void;
}

export default function AdminTokenSelectionDialog({
  noLabel,
  token,
  tokens,
  placeholder,
  onSelectToken,
}: AdminTokenSelectionDialogProps) {
  const { explorer } = useSettingsContext();
  const { getBalance } = useLoadedUserContext();

  return (
    <div className="flex flex-col gap-2">
      {!noLabel && (
        <div className="flex flex-row items-center gap-1">
          <TLabelSans>coin</TLabelSans>
          {token && (
            <div className="flex h-4 flex-row items-center">
              <CopyToClipboardButton
                className="h-6 w-6 hover:bg-transparent"
                iconClassName="w-3 h-3"
                value={isSui(token.coinType) ? SUI_COINTYPE : token.coinType}
              />
              <OpenOnExplorerButton
                className="h-6 w-6 hover:bg-transparent"
                iconClassName="w-3 h-3"
                url={explorer.buildCoinUrl(token.coinType)}
              />
            </div>
          )}
        </div>
      )}

      <div className="flex flex-row items-center gap-4">
        <TokenSelectionDialog
          triggerClassName="h-10 w-max"
          triggerLabelSelectedClassName="!text-sm"
          triggerLabelUnselectedClassName="!text-sm uppercase"
          token={token}
          tokens={tokens}
          placeholder={placeholder}
          onSelectToken={onSelectToken}
        />

        {token && (
          <div className="flex flex-row items-center gap-1.5">
            <Wallet className="h-3 w-3 text-foreground" />
            <TBody className="text-xs">
              {formatToken(getBalance(token.coinType), { dp: token.decimals })}
            </TBody>
          </div>
        )}
      </div>
    </div>
  );
}
