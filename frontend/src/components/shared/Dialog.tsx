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
import { cn } from "@/lib/utils";

interface DialogProps extends PropsWithChildren {
  rootProps?: DialogRootProps;
  trigger?: ReactNode;
  headerProps?: { children?: ReactNode } | DialogHeaderProps;
  dialogContentProps?: DialogContentProps;
  dialogContentInnerClassName?: ClassValue;
  dialogContentInnerChildrenWrapperClassName?: ClassValue;
  footerProps?: DialogFooterProps;
  contentInnerDecorator?: ReactNode;
}

export default function Dialog({
  rootProps,
  trigger,
  headerProps,
  dialogContentProps,
  dialogContentInnerClassName,
  dialogContentInnerChildrenWrapperClassName,
  footerProps,
  contentInnerDecorator,
  children,
}: DialogProps) {
  const { className: dialogContentClassName, ...restDialogContentProps } =
    dialogContentProps || {};

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
            "pointer-events-auto relative flex h-auto max-h-full w-full max-w-4xl flex-col rounded-lg border bg-popover",
            dialogContentInnerClassName,
          )}
        >
          {headerProps &&
            ("children" in headerProps ? (
              headerProps.children
            ) : (
              <DialogHeader {...(headerProps as DialogHeaderProps)} />
            ))}

          {contentInnerDecorator}
          <div
            className={cn(
              "relative flex flex-col gap-4 overflow-y-auto p-4 pt-0",
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
}
