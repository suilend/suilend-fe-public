import SuilendLogo from "@/components/layout/SuilendLogo";
import Dialog from "@/components/shared/Dialog";
import { TBodySans } from "@/components/shared/Typography";
import { useDashboardContext } from "@/contexts/DashboardContext";
import { useLoadedUserContext } from "@/contexts/UserContext";

export default function AutoclaimNotificationDialog() {
  const { obligation, latestAutoclaimDigestMap, setLastSeenAutoclaimDigest } =
    useLoadedUserContext();

  const { isAutoclaimNotificationDialogOpen } = useDashboardContext();

  return (
    <Dialog
      rootProps={{
        open: isAutoclaimNotificationDialogOpen,
        onOpenChange: (isOpen) => {
          if (!obligation?.id) return; // Should not happen

          if (!isOpen) {
            setLastSeenAutoclaimDigest(
              obligation.id,
              latestAutoclaimDigestMap[obligation.id],
            );
          }
        },
      }}
      headerProps={{
        title: {
          className: "text-foreground",
          icon: <SuilendLogo size={16} />,
          children: "Rewards were autoclaimed",
        },
      }}
      dialogContentInnerClassName="max-w-md"
    >
      <TBodySans className="text-muted-foreground">
        {`Some of your unclaimed rewards were autoclaimed and deposited.`}
      </TBodySans>
      <TBodySans className="text-muted-foreground">
        {`View the transaction(s) in Account overview -> History.`}
      </TBodySans>
    </Dialog>
  );
}
