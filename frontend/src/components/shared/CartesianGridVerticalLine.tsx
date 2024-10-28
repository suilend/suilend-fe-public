import { SVGLineElementAttributes } from "react";

import { GridLineTypeFunctionProps } from "recharts/types/cartesian/CartesianGrid";

export default function CartesianGridVerticalLine({
  ...props
}: GridLineTypeFunctionProps) {
  if (props.x1 === props.offset.left) return null;
  if (props.x1 === (props.offset.left ?? 0) + (props.offset.width ?? 0))
    return null;

  const {
    ref,
    key,
    offset,
    xAxis,
    yAxis,
    horizontal,
    vertical,
    horizontalPoints,
    verticalPoints,
    horizontalFill,
    verticalFill,
    ...lineProps
  } = props;
  return <line {...(lineProps as SVGLineElementAttributes<SVGLineElement>)} />;
}
