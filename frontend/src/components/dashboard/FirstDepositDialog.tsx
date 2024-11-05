import { PartyPopper } from "lucide-react";

import { ApiDepositEvent } from "@suilend/sdk/types";

import Dialog from "@/components/dashboard/Dialog";
import { TBodySans } from "@/components/shared/Typography";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { useDashboardContext } from "@/contexts/DashboardContext";

export type EventsData = {
  deposit: ApiDepositEvent[];
};

export default function FirstDepositDialog() {
  const { isFirstDepositDialogOpen, setIsFirstDepositDialogOpen } =
    useDashboardContext();

  return (
    <Dialog
      rootProps={{
        open: isFirstDepositDialogOpen,
        onOpenChange: setIsFirstDepositDialogOpen,
      }}
      dialogContentProps={{ className: "max-w-md border-success/50" }}
      drawerContentProps={{ className: "border-success/50" }}
      headerProps={{
        className: "pb-0",
        titleClassName: "text-success",
        titleIcon: <PartyPopper />,
        title: "Congrats on your deposit!",
      }}
      isDialogAutoHeight
      isDrawerAutoHeight
    >
      <div className="flex flex-col gap-4 p-4">
        <TBodySans>
          {
            "Your account is represented as an NFT, which can be viewed from your wallet's NFT section. Remember, do not burn!"
          }
        </TBodySans>

        <AspectRatio
          className="overflow-hidden rounded-sm bg-muted/10"
          ratio={1240 / 720}
        >
          <video
            autoPlay
            controls={false}
            loop
            muted
            playsInline
            disablePictureInPicture
            disableRemotePlayback
            width="100%"
            height="auto"
          >
            <source
              src="/assets/dashboard/account-nft-explainer.mp4"
              type="video/mp4"
            />
          </video>
        </AspectRatio>
      </div>
    </Dialog>
  );
}
