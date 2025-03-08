import { PartyPopper } from "lucide-react";

import { ApiDepositEvent } from "@suilend/sdk/lib/types";

import Dialog from "@/components/shared/Dialog";
import { TBodySans } from "@/components/shared/Typography";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { useDashboardContext } from "@/contexts/DashboardContext";
import { ASSETS_URL } from "@/lib/constants";

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
      headerProps={{
        title: {
          className: "text-success",
          icon: <PartyPopper />,
          children: "Congrats on your deposit!",
        },
      }}
      drawerContentProps={{ className: "border-success/50" }}
      dialogContentInnerClassName="max-w-md border-success/50"
    >
      <TBodySans>
        {
          "Your account is represented as an NFT, which can be viewed in your wallet's NFT section. Remember, DO NOT BURN!"
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
            src={`${ASSETS_URL}/dashboard/account-nft-explainer.mp4`}
            type="video/mp4"
          />
        </video>
      </AspectRatio>
    </Dialog>
  );
}
