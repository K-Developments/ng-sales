
"use client";

import type { StockTransaction } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Warehouse, Info } from "lucide-react";
import { format } from "date-fns";
import { Button } from "../ui/button";

interface StockReportTableProps {
  data: (StockTransaction & { vehicleNumber?: string })[];
  isLoading?: boolean;
}

const getTransactionTypeBadge = (type: StockTransaction["type"]) => {
  switch (type) {
    case "ADD_STOCK_INVENTORY":
      return <Badge className="bg-green-600 hover:bg-green-700 text-white">Stock In</Badge>;
    case "LOAD_TO_VEHICLE":
      return <Badge className="bg-blue-600 hover:bg-blue-700 text-white">Load to Vehicle</Badge>;
    case "UNLOAD_FROM_VEHICLE":
      return <Badge className="bg-cyan-600 hover:bg-cyan-700 text-white">Unload from Vehicle</Badge>;
    case "REMOVE_STOCK_WASTAGE":
      return <Badge variant="destructive">Wastage</Badge>;
    case "STOCK_ADJUSTMENT_MANUAL":
      return <Badge variant="secondary">Manual Adjust</Badge>;
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
};

export function StockReportTable({ data, isLoading }: StockReportTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(10)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-muted-foreground text-center space-y-2">
          <Warehouse className="h-8 w-8 mx-auto" />
          <p>No stock transactions found</p>
          <p className="text-sm">Try adjusting your filters or check back later</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="relative">
        <ScrollArea className="h-[calc(100vh-22rem)] lg:h-[calc(100vh-17rem)] w-full">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-[150px]">Date</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead className="w-[150px]">Transaction Type</TableHead>
                <TableHead className="w-[100px] text-right">Quantity</TableHead>
                <TableHead className="w-[100px] text-right">Prev. Stock</TableHead>
                <TableHead className="w-[100px] text-right">New Stock</TableHead>
                <TableHead className="w-[150px]">User / Vehicle</TableHead>
                <TableHead className="w-[100px] text-center">Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((tx) => (
                <TableRow key={tx.id} className="hover:bg-muted/50">
                  <TableCell className="font-mono text-xs">{format(tx.transactionDate, "PP, p")}</TableCell>
                  <TableCell className="font-medium">{tx.productName} ({tx.productSku || 'N/A'})</TableCell>
                  <TableCell>{getTransactionTypeBadge(tx.type)}</TableCell>
                  <TableCell className={`text-right font-semibold ${["ADD_STOCK_INVENTORY", "UNLOAD_FROM_VEHICLE"].includes(tx.type) ? "text-green-600" : "text-destructive"}`}>
                    {`${["ADD_STOCK_INVENTORY", "UNLOAD_FROM_VEHICLE"].includes(tx.type) ? '+' : '-'}${tx.quantity}`}
                  </TableCell>
                  <TableCell className="text-right">{tx.previousStock}</TableCell>
                  <TableCell className="text-right">{tx.newStock}</TableCell>
                   <TableCell className="text-xs">
                    {tx.vehicleId ? `Veh: ${tx.vehicleNumber || tx.vehicleId}` : `User: ${tx.userId}`}
                  </TableCell>
                  <TableCell className="text-center">
                    {tx.notes ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Info className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">{tx.notes}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-muted-foreground text-xs">N/A</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
}
