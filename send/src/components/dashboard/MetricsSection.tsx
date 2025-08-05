import { ArrowLeftRight, ArrowRightLeft } from "lucide-react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import SuilendLogo from "../layout/SuilendLogo";

const MetricsSection = () => {
  const [showUsdValue, setShowUsdValue] = useState(false);

  return(
  <Card>
    <CardContent className="p-6">
      <div className="flex justify-between">
        <div>
          <div className="text-xs font-sans text-muted-foreground mb-2">Current price</div>
          <div className="text-[15px]">$0.53</div>
        </div>
        <div>
          <div className="text-xs font-sans text-muted-foreground mb-2">Marketcap</div>
          <div className="text-[15px]">$65.2M</div>
        </div>
        <div>
          <div className="text-xs font-sans text-muted-foreground mb-2">Revenue</div>
          <div className="text-[15px]">$10,000,000</div>
        </div>

        <div>
          <div className="text-xs font-sans text-muted-foreground mb-2">Treasury</div>
          <div className="text-[15px]">$7,792,452</div>
        </div>

        <div>
          <div className="text-xs font-sans text-muted-foreground flex items-center gap-2 mb-2">
            Total buybacks
            {showUsdValue ? <ArrowRightLeft className="w-4 cursor-pointer h-4" onClick={() => setShowUsdValue(!showUsdValue)}/> : <ArrowLeftRight className="w-4 cursor-pointer h-4" onClick={() => setShowUsdValue(!showUsdValue)}/>}
          </div>
          <div className="text-[15px] flex items-center gap-1"><SuilendLogo size={12}/>4,203,000</div>
        </div>

      </div>
    </CardContent>
  </Card>
)};

export default MetricsSection; 