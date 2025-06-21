
"use client";

import type { FullReportEntry } from "@/lib/types";
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
import { FileText } from "lucide-react"; 

interface FullReportTableProps {
  data: FullReportEntry[];
  isLoading?: boolean;
}

export function FullReportTable({ data, isLoading }: FullReportTableProps) {
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
          <FileText className="h-8 w-8 mx-auto" />
          <p>No report data available</p>
          <p className="text-sm">Try adjusting your filters or check back later</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
    <div className="relative">
      <ScrollArea className="h-[calc(100vh-20rem)] lg:h-[calc(100vh-15rem)] w-full">
        <div className="min-w-[1200px] md:min-w-0">
          <Table className="table-fixed md:table-auto">
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-[100px]">Sale ID</TableHead>
                <TableHead className="w-[90px]">Date</TableHead>
                <TableHead className="w-[80px]">Time</TableHead>
                <TableHead className="min-w-[120px]">Customer</TableHead>
                <TableHead className="w-[80px]">SKU</TableHead>
                <TableHead className="min-w-[150px]">Product</TableHead>
                <TableHead className="w-[120px]">Category</TableHead>
                <TableHead className="w-[60px] text-right">Qty</TableHead>
                <TableHead className="w-[90px] text-right">Unit Price</TableHead>
                <TableHead className="w-[100px] text-right">Total</TableHead>
                <TableHead className="w-[100px]">Type</TableHead>
                <TableHead className="w-[150px]">Payment Summary</TableHead> 
                <TableHead className="w-[80px]">Staff</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((entry, index) => (
                <TableRow key={`${entry.saleId}-${entry.productSku}-${index}`} className="hover:bg-muted/50">
                  <TableCell className="font-mono text-xs truncate">
                    <Tooltip>
                      <TooltipTrigger>{entry.saleId}</TooltipTrigger>
                      <TooltipContent>{entry.saleId}</TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{entry.saleDate}</TableCell>
                  <TableCell>{entry.saleTime}</TableCell>
                  <TableCell className="truncate max-w-[120px]">
                    <Tooltip>
                      <TooltipTrigger className="truncate block">
                        {entry.customerName || "Walk-in"}
                      </TooltipTrigger>
                      <TooltipContent>{entry.customerName || "Walk-in"}</TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="font-mono text-xs truncate">
                    {entry.productSku}
                  </TableCell>
                  <TableCell className="font-medium truncate max-w-[150px]">
                    <Tooltip>
                      <TooltipTrigger className="truncate block">
                        {entry.productName}
                      </TooltipTrigger>
                      <TooltipContent>{entry.productName}</TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="truncate max-w-[100px]">
                      {entry.productCategory}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{entry.quantity}</TableCell>
                  <TableCell className="text-right">Rs. {entry.appliedPrice.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-medium">
                    Rs. {entry.lineTotal.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={entry.saleType === 'wholesale' ? 'default' : 'outline'} 
                      className={
                        entry.saleType === 'wholesale' 
                          ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                          : 'bg-gray-100 hover:bg-gray-200'
                      }
                    >
                      {entry.saleType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                     <Tooltip>
                        <TooltipTrigger className="truncate block max-w-[140px] cursor-default">{entry.paymentMethod}</TooltipTrigger>
                        <TooltipContent>{entry.paymentMethod}</TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {entry.staffId}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ScrollArea>
    </div>
    </TooltipProvider>
  );
}
