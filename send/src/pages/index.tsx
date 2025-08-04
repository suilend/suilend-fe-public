import { BarChart3, DollarSign, ExternalLink, Globe, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Logo Component
const Logo = () => (
  <div className="flex items-center gap-3">
    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
      <span className="text-primary-foreground font-bold text-sm">S</span>
    </div>
    <span className="text-xl font-bold text-foreground">SEND</span>
  </div>
);

// Social Icons
const SocialIcons = () => (
  <div className="flex items-center gap-3">
    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
      <span className="text-muted-foreground text-sm font-medium">M</span>
    </div>
    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
      <Globe className="w-4 h-4 text-muted-foreground" />
    </div>
    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
      <Zap className="w-4 h-4 text-muted-foreground" />
    </div>
    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
      <span className="text-muted-foreground text-sm font-medium">D</span>
    </div>
  </div>
);

// Metrics Cards
const MetricsSection = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">Revenue</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">$10,000,000</div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">
          Treasury
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">$7,792,452</div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
          Total buybacks
          <Zap className="w-4 h-4" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">4,203,000</div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">
          Marketcap
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">$65.2M</div>
      </CardContent>
    </Card>
  </div>
);

// Chart Section
const ChartSection = () => (
  <Card className="mb-8">
    <CardHeader>
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button variant="default" size="sm">
            REVENUE
          </Button>
          <Button variant="outline" size="sm">
            BUYBACKS
          </Button>
          <Button variant="outline" size="sm">
            PRICE
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            7D
          </Button>
          <Button variant="default" size="sm">
            1M
          </Button>
          <Button variant="outline" size="sm">
            ALL
          </Button>
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <div className="h-64 bg-muted/20 rounded-lg flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <BarChart3 className="w-12 h-12 mx-auto mb-2" />
          <p>Chart placeholder</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

// Transactions Table
const TransactionsSection = () => (
  <Card>
    <CardHeader>
      <CardTitle className="text-lg">TRANSACTIONS</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between p-3 bg-muted/20 rounded-lg"
          >
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <span className="font-medium">123.41</span>
              </div>
              <span className="text-muted-foreground">$9.99</span>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <DollarSign className="w-3 h-3 text-primary-foreground" />
                </div>
                <span>0.41</span>
              </div>
              <span className="text-muted-foreground">07/16/25 14:07</span>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <Logo />
          <SocialIcons />
        </div>

        {/* Metrics */}
        <MetricsSection />

        {/* Chart */}
        <ChartSection />

        {/* Transactions */}
        <TransactionsSection />
      </div>
    </div>
  );
}
