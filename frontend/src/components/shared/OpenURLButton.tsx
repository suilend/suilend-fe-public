import { PropsWithChildren, ReactElement } from "react";

import { ClassValue } from "clsx";
import { ExternalLink } from "lucide-react";

import Button from "@/components/shared/Button";
import { cn } from "@/lib/utils";

interface OpenURLButtonProps extends PropsWithChildren {
  className?: ClassValue;
  iconClassName?: ClassValue;
  url: string;
  icon?: ReactElement;
}

export default function OpenURLButton({
  className,
  iconClassName,
  url,
  icon,
  children,
}: OpenURLButtonProps) {
  const openUrl = () => {
    window.open(url, "_blank");
  };

  const tooltip = (children as string) ?? "Open URL";

  return (
    <Button
      className={cn("text-muted-foreground", className)}
      tooltip={tooltip}
      icon={icon || <ExternalLink className={cn(iconClassName)} />}
      variant="ghost"
      size="icon"
      onClick={openUrl}
    >
      {tooltip}
    </Button>
  );
}
