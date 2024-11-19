import { MouseEvent, PropsWithChildren, useRef } from "react";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { useActionsModalContext } from "@/components/dashboard/actions-modal/ActionsModalContext";
import Button from "@/components/shared/Button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DrawerContent, Drawer as DrawerRoot } from "@/components/ui/drawer";
import useBreakpoint from "@/hooks/useBreakpoint";

export default function ActionsModalContainer({ children }: PropsWithChildren) {
  const { isOpen, close, isMoreParametersOpen, setIsMoreParametersOpen } =
    useActionsModalContext();
  const MoreParametersIcon = isMoreParametersOpen ? ChevronLeft : ChevronRight;

  const { md } = useBreakpoint();

  // Dialog events
  const didDialogContentMouseDownRef = useRef<boolean>(false);
  const onDialogContentMouseDown = () => {
    didDialogContentMouseDownRef.current = true;
  };
  const onDialogContentMouseUp = () => {
    if (didDialogContentMouseDownRef.current) {
      close();
      didDialogContentMouseDownRef.current = false;
    }
  };

  const onDialogInnerContentMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    didDialogContentMouseDownRef.current = false;
  };
  const onDialogInnerContentMouseUp = (e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    didDialogContentMouseDownRef.current = false;
  };

  if (md)
    return (
      <Dialog open={isOpen}>
        <DialogContent
          className="grid h-dvh max-w-none place-items-center overflow-auto border-none bg-transparent p-0 px-10 py-8"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onEscapeKeyDown={() => close()}
          overlay={{
            className: "bg-background/80",
            onClick: () => close(),
          }}
          showCloseButton={false}
          onMouseDown={onDialogContentMouseDown}
          onMouseUp={onDialogContentMouseUp}
        >
          <div
            className="relative h-fit rounded-lg border bg-popover p-4"
            onMouseDown={onDialogInnerContentMouseDown}
            onMouseUp={onDialogInnerContentMouseUp}
          >
            {/* More parameters */}
            <div
              className="absolute -right-[41px] top-1/2 -translate-y-2/4 rounded-r-md bg-popover"
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

            {children}
          </div>
        </DialogContent>
      </Dialog>
    );
  return (
    <DrawerRoot open={isOpen} onRelease={(e, open) => !open && close()}>
      <DrawerContent
        className="actions-modal-drawer-content !bottom-auto !top-0 mt-16 !h-[calc(100dvh-64px)] !max-h-[calc(100dvh-64px)] rounded-t-lg bg-popover p-4"
        thumbClassName="hidden"
        onEscapeKeyDown={() => close()}
        overlay={{
          className: "bg-background/80",
          onClick: () => close(),
        }}
      >
        {children}
      </DrawerContent>
    </DrawerRoot>
  );
}
