import { ClassValue } from "clsx";

import StandardSelect from "@/components/shared/StandardSelect";
import { RPCS } from "@/lib/constants";

interface RpcSelectProps {
  className?: ClassValue;
  value: string;
  onChange: (id: string) => void;
}

export default function RpcSelect({
  className,
  value,
  onChange,
}: RpcSelectProps) {
  return (
    <StandardSelect
      className={className}
      items={RPCS}
      value={value}
      onChange={onChange}
    />
  );
}
