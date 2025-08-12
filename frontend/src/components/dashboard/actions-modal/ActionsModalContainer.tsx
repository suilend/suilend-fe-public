import { PropsWithChildren } from "react";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { useActionsModalContext } from "@/components/dashboard/actions-modal/ActionsModalContext";
import Button from "@/components/shared/Button";
import Dialog from "@/components/shared/Dialog";

export default function ActionsModalContainer({ children }: PropsWithChildren) {
  const { isOpen, close, isMoreParametersOpen, setIsMoreParametersOpen } =
    useActionsModalContext();
  const MoreParametersIcon = isMoreParametersOpen ? ChevronLeft : ChevronRight;

  return (
    <Dialog
      rootProps={{
        open: isOpen,
        onOpenChange: (open) => {
          if (!open) close();
        },
      }}
      dialogContentProps={{ className: "md:inset-x-10" }}
      dialogContentInnerClassName="max-w-max"
      dialogContentInnerChildrenWrapperClassName="pt-4"
      contentInnerDecorator={
        // More parameters
        <div
          className="absolute -right-[calc(1px+40px)] top-1/2 -translate-y-1/2 rounded-r-md bg-popover max-md:hidden"
          style={{ writingMode: "vertical-rl" }}
        >
          <Button
            className="h-fit w-10 rounded-l-none rounded-r-md px-0 py-3"
            labelClassName="uppercase"
            endIcon={<MoreParametersIcon className="h-4 w-4" />}
            variant="secondary"
            onClick={() => setIsMoreParametersOpen((o) => !o)}
          >
            {isMoreParametersOpen ? "Less" : "More"} parameters
          </Button>
        </div>
      }
    >
      {children}
    </Dialog>
  );
}
