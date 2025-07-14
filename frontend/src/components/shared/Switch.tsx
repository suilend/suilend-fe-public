import { ClassValue } from "clsx";

import { TLabelSans } from "@/components/shared/Typography";
import { cn } from "@/lib/utils";

export const getSwitchId = (id: string) => `switch.${id}`;

interface SwitchProps {
  className?: ClassValue;
  id: string;
  label?: string;
  horizontal?: boolean;
  isChecked: boolean;
  onToggle: (isChecked: boolean) => void;
  isDisabled?: boolean;
}

export default function Switch({
  className,
  id,
  label,
  horizontal,
  isChecked,
  onToggle,
  isDisabled,
}: SwitchProps) {
  const switchId = getSwitchId(id);

  return (
    <div
      className={cn(
        "flex gap-2",
        horizontal ? "flex-row items-center" : "flex-col",
        !isDisabled ? "cursor-pointer" : "pointer-events-none opacity-50",
        className,
      )}
      onClick={!isDisabled ? () => onToggle(!isChecked) : undefined}
    >
      {label && (
        <label htmlFor={switchId} className="w-fit">
          <TLabelSans className={cn(!isDisabled && "cursor-pointer")}>
            {label}
          </TLabelSans>
        </label>
      )}

      <div
        id={switchId}
        className={cn(
          "group h-[20px] w-[36px] rounded-[10px] p-px transition-colors",
          isChecked ? "bg-primary" : "bg-muted/20",
        )}
      >
        <div
          className={cn(
            "h-[18px] w-[18px] rounded-full bg-foreground transition-all",
            isChecked && "ml-[16px]",
          )}
        />
      </div>
    </div>
  );
}
