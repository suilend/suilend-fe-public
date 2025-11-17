import { useMediaQuery } from "react-responsive";
import resolveConfig from "tailwindcss/resolveConfig";

import tailwindConfig from "../../tailwind.config";

export default function useBreakpoint() {
  const fullConfig = resolveConfig(tailwindConfig);

  return {
    sm: useMediaQuery({
      query: `(min-width: ${fullConfig.theme.screens.sm})`,
    }),
    md: useMediaQuery({
      query: `(min-width: ${fullConfig.theme.screens.md})`,
    }),
    lg: useMediaQuery({
      query: `(min-width: ${fullConfig.theme.screens.lg})`,
    }),
    xl: useMediaQuery({
      query: `(min-width: ${fullConfig.theme.screens.xl})`,
    }),
    "2xl": useMediaQuery({
      query: `(min-width: ${fullConfig.theme.screens["2xl"]})`,
    }),
  };
}
