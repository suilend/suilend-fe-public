import {
  ChevronsUpDown,
  DollarSign,
  Droplets,
  ExternalLink,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TransactionsSection = () => {
  const transactions = [
    {
      date: "07/16/25 14:07",
      type: "DCA",
      amount: "123.41",
      size: "$9.99",
      price: "0.41",
    },
    {
      date: "07/16/25 14:07",
      type: "SWAP",
      amount: "123.41",
      size: "$9.99",
      price: "0.41",
    },
    {
      date: "07/16/25 14:07",
      type: "SWAP",
      amount: "123.41",
      size: "$9.99",
      price: "0.41",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>TRANSACTIONS</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-xs text-left py-3 px-4 font-sans font-normal text-muted-foreground">
                  <div className="flex items-center gap-1">
                    Date
                    <ChevronsUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="text-xs text-left py-3 px-4 font-sans font-normal text-muted-foreground">
                  Type
                </th>
                <th className="text-xs text-left py-3 px-4 font-sans font-normal text-muted-foreground">
                  Amount
                </th>
                <th className="text-xs text-left py-3 px-4 font-sans font-normal text-muted-foreground">
                  Size
                </th>
                <th className="text-xs text-left py-3 px-4 font-sans font-normal text-muted-foreground">
                  Price
                </th>
                <th className="text-xs text-left py-3 px-4 font-sans font-normal text-muted-foreground">
                  Txn
                </th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx, index) => (
                <tr key={index} className="border-b border-border/50">
                  <td className="py-3 px-4 text-sm">{tx.date}</td>
                  <td className="py-3 px-4 text-sm">{tx.type}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-secondary rounded-full flex items-center justify-center">
                        <Droplets className="w-2.5 h-2.5 text-secondary-foreground" />
                      </div>
                      <span className="text-sm">{tx.amount}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm">{tx.size}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-secondary rounded-full flex items-center justify-center">
                        <DollarSign className="w-2.5 h-2.5 text-secondary-foreground" />
                      </div>
                      <span className="text-sm">{tx.price}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default TransactionsSection;
