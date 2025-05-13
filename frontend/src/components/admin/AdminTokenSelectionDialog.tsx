import { Token, getToken } from "@suilend/frontend-sui";

import { TLabelSans } from "@/components/shared/Typography";
import TokenSelectionDialog from "@/components/TokenSelectionDialog";
import { useLoadedUserContext } from "@/contexts/UserContext";

interface AdminTokenSelectionDialogProps {
  token?: Token;
  onSelectToken: (token: Token) => void;
}

export default function AdminTokenSelectionDialog({
  token,
  onSelectToken,
}: AdminTokenSelectionDialogProps) {
  const { rawBalancesMap, balancesCoinMetadataMap } = useLoadedUserContext();

  return (
    <div className="flex flex-col gap-2">
      <TLabelSans>coin</TLabelSans>
      <TokenSelectionDialog
        triggerClassName="h-10 border hover:border-transparent hover:bg-muted/10 rounded-md"
        triggerLabelSelectedClassName="!text-sm"
        triggerLabelUnselectedClassName="!text-sm uppercase"
        token={token}
        tokens={Object.entries(rawBalancesMap ?? {})
          .filter(([coinType]) => !!balancesCoinMetadataMap?.[coinType])
          .map(([coinType]) =>
            getToken(coinType, balancesCoinMetadataMap![coinType]),
          )}
        onSelectToken={onSelectToken}
      />
    </div>
  );
}
