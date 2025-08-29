import { X } from "lucide-react";

import Button from "@/components/shared/Button";
import TitleWithIcon from "@/components/shared/TitleWithIcon";
import { TLabelSans } from "@/components/shared/Typography";
import { Alert } from "@/components/ui/alert";
import { useDashboardContext } from "@/contexts/DashboardContext";

export default function AutoclaimNotification() {
  const { isShowingAutoclaimNotification, dismissAutoclaimNotification } =
    useDashboardContext();

  return (
    isShowingAutoclaimNotification && (
      <Alert className="rounded-sm">
        <div className="flex flex-col gap-3">
          <div className="flex h-5 flex-row items-center justify-between gap-2">
            <TitleWithIcon className="text-foreground">
              Rewards were autoclaimed
            </TitleWithIcon>

            <Button
              className="text-muted-foreground"
              icon={<X />}
              variant="ghost"
              size="icon"
              onClick={dismissAutoclaimNotification}
            />
          </div>

          <div className="flex flex-col gap-2">
            <TLabelSans className="text-muted-foreground">
              Some of your unclaimed rewards were autoclaimed and redeposited.
            </TLabelSans>
            <TLabelSans className="text-muted-foreground">
              View the transaction(s) in {`Overview > History.`}
            </TLabelSans>
          </div>
        </div>
      </Alert>
    )
  );
}
