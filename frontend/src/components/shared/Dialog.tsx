import { PropsWithChildren, ReactNode } from "react";

import { DialogProps as DialogRootProps } from "@radix-ui/react-dialog";
import { ClassValue } from "clsx";

import {
  DialogContent,
  DialogContentProps,
  DialogFooter,
  DialogFooterProps,
  DialogHeader,
  DialogHeaderProps,
  Dialog as DialogRoot,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DrawerContent,
  DrawerContentProps,
  Drawer as DrawerRoot,
  DrawerTrigger,
} from "@/components/ui/drawer";
import useBreakpoint from "@/hooks/useBreakpoint";
import { cn } from "@/lib/utils";

interface DialogProps extends PropsWithChildren {
  rootProps?: DialogRootProps;
  trigger?: ReactNode;
  headerProps?: DialogHeaderProps;
  dialogContentProps?: DialogContentProps;
  drawerContentProps?: DrawerContentProps;
  dialogContentInnerClassName?: ClassValue;
  dialogContentInnerChildrenWrapperClassName?: ClassValue;
  footerProps?: DialogFooterProps;
}

export default function Dialog({
  rootProps,
  trigger,
  headerProps,
  dialogContentProps,
  drawerContentProps,
  dialogContentInnerClassName,
  dialogContentInnerChildrenWrapperClassName,
  footerProps,
  children,
}: DialogProps) {
  const { className: dialogContentClassName, ...restDialogContentProps } =
    dialogContentProps || {};
  const { className: drawerContentClassName, ...restDrawerContentProps } =
    drawerContentProps || {};

  const { md } = useBreakpoint();

  if (md)
    return (
      <DialogRoot {...rootProps}>
        {trigger && (
          <DialogTrigger asChild className="appearance-none">
            {trigger}
          </DialogTrigger>
        )}

        <DialogContent
          className={cn("!pointer-events-none", dialogContentClassName)}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          {...restDialogContentProps}
        >
          <div
            className={cn(
              "pointer-events-auto flex h-auto max-h-full w-full max-w-4xl flex-col rounded-lg border bg-popover shadow-lg",
              dialogContentInnerClassName,
            )}
          >
            {headerProps && <DialogHeader {...headerProps} />}
            <div
              className={cn(
                "relative flex flex-col gap-4 overflow-y-auto p-4",
                dialogContentInnerChildrenWrapperClassName,
              )}
            >
              {children}
            </div>
            {footerProps && <DialogFooter {...footerProps} />}
          </div>
        </DialogContent>
      </DialogRoot>
    );
  return (
    <DrawerRoot {...rootProps}>
      {trigger && (
        <DrawerTrigger asChild className="appearance-none">
          {trigger}
        </DrawerTrigger>
      )}

      <DrawerContent
        className={cn("h-auto max-h-dvh", drawerContentClassName)}
        thumbClassName="hidden"
        {...restDrawerContentProps}
      >
        {headerProps && (
          <DialogHeader {...headerProps} showCloseButton={false} />
        )}
        <div
          className={cn(
            "relative flex flex-col gap-4 overflow-y-auto p-4",
            dialogContentInnerChildrenWrapperClassName,
          )}
        >
          {children}
        </div>
        {footerProps && <DialogFooter {...footerProps} />}
      </DrawerContent>
    </DrawerRoot>
  );
}
