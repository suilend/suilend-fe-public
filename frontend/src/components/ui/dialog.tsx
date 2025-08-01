import { PropsWithChildren, ReactNode, forwardRef } from "react";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ClassValue } from "clsx";
import { X } from "lucide-react";

import Button from "@/components/shared/Button";
import TitleWithIcon, {
  TitleWithIconProps,
} from "@/components/shared/TitleWithIcon";
import { TLabelSans } from "@/components/shared/Typography";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

// Overlay
const DialogOverlay = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Close asChild>
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn(
        "fixed inset-0 z-50 bg-background/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className,
      )}
      {...props}
    />
  </DialogPrimitive.Close>
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

// Content
export type DialogContentProps = React.ComponentPropsWithoutRef<
  typeof DialogPrimitive.Content
>;

const DialogContent = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, ...props }, ref) => (
  <DialogPortal
    container={
      typeof document === "undefined"
        ? undefined
        : document.getElementById("__app_main")
    }
  >
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed inset-2 z-50 flex flex-col items-center justify-center data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 md:inset-8",
        className,
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

// Header
export interface DialogHeaderProps {
  className?: ClassValue;
  title: TitleWithIconProps;
  titleEndContent?: ReactNode;
  showCloseButton?: boolean;
  description?: ReactNode;
}

const DialogHeader = ({
  className,
  title,
  titleEndContent,
  showCloseButton = true,
  description,
}: DialogHeaderProps) => {
  const { className: titleClassName, ...restTitleProps } = title;

  return (
    <div className="flex w-full flex-col gap-1 p-4">
      {/* Title */}
      <div
        className={cn(
          "flex h-5 w-full flex-row items-center justify-between gap-4",
          className,
        )}
      >
        <TitleWithIcon className={cn(titleClassName)} {...restTitleProps} />

        {(titleEndContent || showCloseButton) && (
          <div className="absolute right-2 top-2.5 flex flex-row items-center">
            {titleEndContent}
            {showCloseButton && (
              <DialogPrimitive.Close asChild>
                <Button
                  className="text-muted-foreground"
                  icon={<X className="h-5 w-5" />}
                  variant="ghost"
                  size="icon"
                >
                  Close
                </Button>
              </DialogPrimitive.Close>
            )}
          </div>
        )}
      </div>

      {/* Description */}
      {description && <TLabelSans>{description}</TLabelSans>}
    </div>
  );
};

// Footer
export interface DialogFooterProps extends PropsWithChildren {
  className?: ClassValue;
}

const DialogFooter = ({ className, children, ...props }: DialogFooterProps) => (
  <div
    className={cn(
      "flex w-full flex-row items-center gap-2 p-4 pt-0",
      className,
    )}
    {...props}
  >
    {children}
  </div>
);

export {
  Dialog,
  DialogPortal,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
};
