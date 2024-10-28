import { ClassValue } from "clsx";

import StandardSelect from "@/components/shared/StandardSelect";
import { EXPLORERS } from "@/lib/constants";

interface ExplorerSelectProps {
  className?: ClassValue;
  value: string;
  onChange: (id: string) => void;
}

export default function ExplorerSelect({
  className,
  value,
  onChange,
}: ExplorerSelectProps) {
  return (
    <StandardSelect
      className={className}
      items={EXPLORERS}
      value={value}
      onChange={onChange}
    />
  );
}
