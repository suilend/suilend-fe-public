import { MouseEvent, ReactNode } from "react";

import { ClassValue } from "clsx";
import { Copy } from "lucide-react";
import { toast } from "sonner";

import { showErrorToast } from "@suilend/frontend-sui-next";

import Button from "@/components/shared/Button";
import { cn } from "@/lib/utils";

interface CopyToClipboardButtonProps {
  className?: ClassValue;
  iconClassName?: ClassValue;
  tooltip?: string | ReactNode;
  value: string;
}

export default function CopyToClipboardButton({
  className,
  iconClassName,
  tooltip,
  value,
}: CopyToClipboardButtonProps) {
  const copyToClipboard = async (e: MouseEvent) => {
    e.stopPropagation();

    try {
      await navigator.clipboard.writeText(value.toString());
      toast.info(`Copied ${value} to clipboard`, {
        icon: <Copy className="h-5 w-5" />,
      });
    } catch (err) {
      showErrorToast(`Failed to copy ${value} to clipboard`, err as Error);
      console.error(err);
    }
  };

  return (
    <Button
      className={cn("text-muted-foreground", className)}
      tooltip={tooltip ?? "Copy to clipboard"}
      icon={<Copy className={cn(iconClassName)} />}
      variant="ghost"
      size="icon"
      onClick={copyToClipboard}
    >
      Copy
    </Button>
  );
}
