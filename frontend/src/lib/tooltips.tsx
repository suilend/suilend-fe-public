import Latex from "react-latex-next";

import TextLink from "@/components/shared/TextLink";
import "katex/dist/katex.min.css";
import { Separator } from "@/components/ui/separator";

export const ISOLATED_ASSETS_TOOLTIP =
  "An isolated asset must be the only asset borrowed in an account.";
export const DEPRECATED_ASSETS_TOOLTIP =
  "Deprecated assets are in withdraw-only mode, which means you can only withdraw your deposits or repay your borrows, but you can't deposit or borrow more of these assets.";

export const OPEN_LTV_TOOLTIP =
  "Open LTV is a ratio that determines the borrowing power provided by a deposited asset when opening a new borrow position.";

export const CLOSE_LTV_TOOLTIP =
  "Close LTV is a ratio that determines the maximum borrowing power provided by a deposited asset before a position becomes eligible for liquidation.";

export const BORROW_WEIGHT_TOOLTIP =
  "Borrow weight (BW) is a multiplier on the value of a borrowed asset applied when calculating a position's eligibility to be liquidated.";

export const OPEN_LTV_BORROW_WEIGHT_TOOLTIP = (
  <>
    {OPEN_LTV_TOOLTIP}
    <br />
    <br />
    {BORROW_WEIGHT_TOOLTIP}
  </>
);

export const DEPOSITS_TOOLTIP =
  "The value of all your deposited assets. Depositing more assets increases your borrow limit and liquidation threshold.";

export const BORROWS_TOOLTIP = "The value of all your borrowed assets.";

export const NET_APR_TOOLTIP = (
  <>
    If your account is worth $X today, assuming no prices or rates change, in 1
    year it will be worth $X × (1 + Net APR).
    <Separator className="my-2" />
    <span className="text-muted-foreground">
      <Latex>
        {
          "$$D = \\sum_{i=0}^{N(\\textnormal{Deposits})} USD(d_i) \\times APR(d_i)$$"
        }
      </Latex>
      <Latex>
        {
          "$$B = \\sum_{i=0}^{N(\\textnormal{Borrows})} USD(b_i) \\times APR(b_i)$$"
        }
      </Latex>
      <Latex>
        {"$$\\textnormal{Net APR} = \\frac{D-B}{USD(d) - USD(b)}$$"}
      </Latex>
    </span>
  </>
);

export const WEIGHTED_BORROWS_TOOLTIP = (
  <>
    The value of all your borrowed assets, adjusted by their borrow weight (BW).
    <Separator className="my-2" />
    <span className="text-muted-foreground">
      Weighted Borrows = Position × Price × BW
    </span>
  </>
);

export const BORROW_LIMIT_TOOLTIP = (
  <>
    The borrow limit is the maximum amount you can borrow. Depositing more
    assets increases your borrow limit.
    <Separator className="my-2" />
    <span className="text-muted-foreground">
      Borrow Limit = Position × Price × Open LTV
    </span>
  </>
);

export const LIQUIDATION_THRESHOLD_TOOLTIP = (
  <>
    If your weighted borrows exceed your liquidation threshold, your account
    will be at risk of liquidation. Depositing more assets increases your
    liquidation threshold.
    <Separator className="my-2" />
    <span className="text-muted-foreground">
      Liq. Threshold = Position × Price × Close LTV
    </span>
  </>
);

export const WEIGHTED_BORROWS_PRICE_TOOLTIP = (
  <>
    {
      "In weighted borrows calculations, the price is defined as the maximum of the price and the "
    }
    <TextLink
      href="https://docs.pyth.network/price-feeds/how-pyth-works/ema-price-aggregation"
      noIcon
    >
      exponentially-weighted moving average (EMA) price
    </TextLink>
    {"."}
  </>
);

export const BORROW_LIMIT_PRICE_TOOLTIP = (
  <>
    {
      "In borrow limit calculations, the price is defined as the minimum of the price and the "
    }
    <TextLink
      href="https://docs.pyth.network/price-feeds/how-pyth-works/ema-price-aggregation"
      noIcon
    >
      exponentially-weighted moving average (EMA) price
    </TextLink>
    {"."}
  </>
);
