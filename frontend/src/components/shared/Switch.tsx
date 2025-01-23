import { TLabelSans } from "@/components/shared/Typography";
import { cn } from "@/lib/utils";

export const getSwitchId = (id: string) => `switch.${id}`;

interface SwitchProps {
  id: string;
  label?: string;
  horizontal?: boolean;
  isChecked: boolean;
  onToggle: (isChecked: boolean) => void;
}

export default function Switch({
  id,
  label,
  horizontal,
  isChecked,
  onToggle,
}: SwitchProps) {
  const switchId = getSwitchId(id);

  return (
    <div
      className={cn(
        "flex cursor-pointer gap-2",
        horizontal ? "flex-row items-center" : "flex-col",
      )}
      onClick={() => onToggle(!isChecked)}
    >
      {label && (
        <label htmlFor={switchId} className="w-fit">
          <TLabelSans className="cursor-pointer">{label}</TLabelSans>
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
