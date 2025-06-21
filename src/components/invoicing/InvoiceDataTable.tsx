
"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, FilterX, Search, ReceiptText, Printer, Eye, ChevronDown, ChevronUp, Loader2, AlertTriangle, Info } from "lucide-react";
import { format, isValid, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import type { Sale } from "@/lib/types";
import { cn } from "@/lib/utils";
import { BillDialog } from "@/components/sales/BillDialog";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


interface InvoiceDataTableProps {
  sales: Sale[];
  isLoading: boolean;
  error?: string | null;
}

export function InvoiceDataTable({ sales: initialSales, isLoading, error }: InvoiceDataTableProps) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);
  const [selectedInvoiceForReprint, setSelectedInvoiceForReprint] = useState<Sale | null>(null);
  const [isBillDialogOpen, setIsBillDialogOpen] = useState(false);
  const [localSales, setLocalSales] = useState<Sale[]>(initialSales);

  useEffect(() => {
    setLocalSales(initialSales);
  }, [initialSales]);

  const sortedSales = useMemo(() => {
    return [...localSales].sort((a, b) => {
      const dateA = a.saleDate instanceof Date ? a.saleDate : new Date(a.saleDate || 0);
      const dateB = b.saleDate instanceof Date ? b.saleDate : new Date(b.saleDate || 0);
      return dateB.getTime() - dateA.getTime();
    });
  }, [localSales]);

  const filteredSales = useMemo(() => {
    return sortedSales.filter(sale => {
      const saleDateObj = typeof sale.saleDate === 'string' ? parseISO(sale.saleDate) : sale.saleDate;
      
      const lowerSearchTerm = searchTerm.toLowerCase();
      const matchesSearchTerm = 
        (sale.id && sale.id.toLowerCase().includes(lowerSearchTerm)) ||
        (sale.customerName && sale.customerName.toLowerCase().includes(lowerSearchTerm)) ||
        (sale.paymentSummary && sale.paymentSummary.toLowerCase().includes(lowerSearchTerm)) ||
        (sale.chequeDetails?.number && sale.chequeDetails.number.toLowerCase().includes(lowerSearchTerm)) ||
        (sale.bankTransferDetails?.referenceNumber && sale.bankTransferDetails.referenceNumber.toLowerCase().includes(lowerSearchTerm));


      let matchesDateRange = true;
      if (isValid(saleDateObj)) {
          if (startDate && endDate) {
            matchesDateRange = isWithinInterval(saleDateObj, { start: startOfDay(startDate), end: endOfDay(endDate) });
          } else if (startDate) {
            matchesDateRange = saleDateObj >= startOfDay(startDate);
          } else if (endDate) {
            matchesDateRange = saleDateObj <= endOfDay(endDate);
          }
      } else {
        if (startDate || endDate) matchesDateRange = false;
      }
      
      return matchesSearchTerm && matchesDateRange;
    });
  }, [sortedSales, searchTerm, startDate, endDate]);

  const clearFilters = () => {
    setSearchTerm("");
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const handleReprintInvoice = (sale: Sale) => {
    setSelectedInvoiceForReprint(sale);
    setIsBillDialogOpen(true);
  };

  const toggleExpandInvoice = (invoiceId: string) => {
    setExpandedInvoice(expandedInvoice === invoiceId ? null : invoiceId);
  };

  const formatCurrency = (amount: number | undefined) => {
    if (typeof amount !== 'number' || isNaN(amount)) return 'Rs. 0.00';
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR', 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount).replace('LKR', 'Rs.');
  };

  useEffect(() => {
    setExpandedInvoice(null);
  }, [localSales]);

  const getPaymentStatusBadge = (sale: Sale) => {
    const isComplete = sale.outstandingBalance !== undefined ? sale.outstandingBalance <= 0 : sale.totalAmountPaid >= sale.totalAmount;

    if (isComplete) {
      return <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white text-xs">Complete</Badge>;
    } else {
      return <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600 text-black text-xs">Pending</Badge>;
    }
  };


  return (
    <TooltipProvider>
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl">Invoice History</CardTitle>
          <CardDescription>Browse through all recorded sales transactions</CardDescription>
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search ID, Customer, Payment Summary, Cheque#, Ref#"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10 w-full"
              />
            </div>
            {!isMobile && (
              <div className="flex gap-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("h-10 justify-start text-left font-normal w-full sm:w-[180px]", !startDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : <span>Start Date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("h-10 justify-start text-left font-normal w-full sm:w-[180px]", !endDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : <span>End Date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus disabled={(date) => startDate ? date < startDate : false}/>
                  </PopoverContent>
                </Popover>
                <Button variant="ghost" onClick={clearFilters} size="icon" className="h-10 w-10" title="Clear Filters">
                  <FilterX className="h-5 w-5"/>
                </Button>
              </div>
            )}
          </div>
          {isMobile && (
            <div className="mt-3 flex gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal flex-1", !startDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PP") : "Start"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal flex-1", !endDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PP") : "End"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus disabled={(date) => startDate ? date < startDate : false}/>
                </PopoverContent>
              </Popover>
              <Button variant="ghost" onClick={clearFilters} size="sm" className="h-9 px-3" title="Clear Filters">
                <FilterX className="h-4 w-4 mr-1"/>
                Clear
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="flex flex-col items-center justify-center h-64">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-lg text-muted-foreground">Loading invoices...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 text-destructive">
                <AlertTriangle className="h-12 w-12 mb-4" />
                <p className="text-lg font-medium">Error loading invoices</p>
                <p className="text-sm">{error}</p>
            </div>
          ) : (
            <ScrollArea className={isMobile ? "h-[calc(100vh-24rem)]" : "h-[calc(100vh-24rem)]"}>
              {filteredSales.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <ReceiptText className="w-16 h-16 mb-4 opacity-50" />
                    <p className="text-lg font-medium">No invoices found</p>
                    {(searchTerm || startDate || endDate) && <p className="text-sm">Try adjusting your search or date filters</p>}
                </div>
              ) : isMobile ? (
                <div className="space-y-2">
                  {filteredSales.map((sale) => (
                    <Card key={sale.id} className="p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-sm">{sale.id}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(typeof sale.saleDate === 'string' ? parseISO(sale.saleDate) : sale.saleDate, "PP")}
                          </p>
                          <p className="text-xs mt-1">{sale.customerName || "Walk-in"}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-sm">{formatCurrency(sale.totalAmount)}</p>
                          {getPaymentStatusBadge(sale)}
                        </div>
                      </div>
                       <p className="text-xs text-muted-foreground mt-1">Summary: {sale.paymentSummary}</p>
                      
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full mt-1.5 justify-between text-primary hover:text-primary text-xs h-8"
                        onClick={() => toggleExpandInvoice(sale.id)}
                      >
                        {expandedInvoice === sale.id ? "Hide details" : "Show details"}
                        {expandedInvoice === sale.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </Button>
                      
                      {expandedInvoice === sale.id && (
                        <div className="mt-2 space-y-0.5 text-xs border-t pt-1.5">
                          <div className="flex justify-between"><span className="text-muted-foreground">Total Paid:</span><span>{formatCurrency(sale.totalAmountPaid)}</span></div>
                          {sale.paidAmountCash && <div className="flex justify-between pl-2"><span className="text-muted-foreground">Cash:</span><span>{formatCurrency(sale.paidAmountCash)}</span></div>}
                          {sale.paidAmountCheque && <div className="flex justify-between pl-2"><span className="text-muted-foreground">Cheque ({sale.chequeDetails?.number || 'N/A'}):</span><span>{formatCurrency(sale.paidAmountCheque)}</span></div>}
                          {sale.paidAmountBankTransfer && <div className="flex justify-between pl-2"><span className="text-muted-foreground">Bank Transfer ({sale.bankTransferDetails?.referenceNumber || 'N/A'}):</span><span>{formatCurrency(sale.paidAmountBankTransfer)}</span></div>}
                          {sale.changeGiven && <div className="flex justify-between pl-2"><span className="text-muted-foreground">Change:</span><span>{formatCurrency(sale.changeGiven)}</span></div>}
                          {sale.outstandingBalance > 0 && <div className="flex justify-between text-destructive"><span className="text-muted-foreground">Outstanding:</span><span>{formatCurrency(sale.outstandingBalance)}</span></div>}
                           <p className="text-muted-foreground mt-1 pt-1 border-t text-xs">Items: {sale.items.length}</p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full mt-2 h-8 text-xs"
                            onClick={() => handleReprintInvoice(sale)}
                          >
                            <Printer className="h-3.5 w-3.5 mr-1.5" />
                            Print Invoice
                          </Button>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead className="w-[100px]">ID</TableHead>
                      <TableHead className="w-[130px]">Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Total Due</TableHead>
                      <TableHead className="text-right">Total Paid</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                      <TableHead className="w-[150px]">Payment Method</TableHead>
                       <TableHead className="text-center w-[100px]">Status</TableHead>
                      <TableHead className="text-center w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-mono text-xs">{sale.id}</TableCell>
                        <TableCell className="text-xs">{format(typeof sale.saleDate === 'string' ? parseISO(sale.saleDate) : sale.saleDate, "PP, p")}</TableCell>
                        <TableCell className="text-sm">{sale.customerName || "Walk-in"}</TableCell>
                        <TableCell className="text-right font-medium text-sm">{formatCurrency(sale.totalAmount)}</TableCell>
                        <TableCell className="text-right text-sm">{formatCurrency(sale.totalAmountPaid)}</TableCell>
                        <TableCell className={cn("text-right text-sm", (sale.outstandingBalance ?? 0) > 0 && "text-destructive font-semibold")}>{formatCurrency(sale.outstandingBalance)}</TableCell>
                        <TableCell className="text-xs">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="truncate block max-w-[140px] cursor-default">{sale.paymentSummary}</span>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs max-w-xs">
                                    <p>{sale.paymentSummary}</p>
                                    {sale.paidAmountCash ? <p>Cash: {formatCurrency(sale.paidAmountCash)}</p> : null}
                                    {sale.paidAmountCheque ? <p>Cheque: {formatCurrency(sale.paidAmountCheque)} (No: {sale.chequeDetails?.number || 'N/A'}, Bank: {sale.chequeDetails?.bank || 'N/A'})</p> : null}
                                    {sale.paidAmountBankTransfer ? <p>Bank Transfer: {formatCurrency(sale.paidAmountBankTransfer)} (Ref: {sale.bankTransferDetails?.referenceNumber || 'N/A'}, Bank: {sale.bankTransferDetails?.bankName || 'N/A'})</p> : null}
                                    {sale.changeGiven ? <p>Change: {formatCurrency(sale.changeGiven)}</p> : null}
                                </TooltipContent>
                            </Tooltip>
                        </TableCell>
                        <TableCell className="text-center">{getPaymentStatusBadge(sale)}</TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="icon" onClick={() => handleReprintInvoice(sale)} title="View / Print Invoice" className="h-8 w-8">
                            <Printer className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          )}
          {filteredSales.length > 0 && !isLoading && (
            <div className="mt-2 text-sm text-muted-foreground text-center">
              Showing {filteredSales.length} invoice{filteredSales.length !== 1 ? 's' : ''}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedInvoiceForReprint && isBillDialogOpen && (
        <BillDialog
          isOpen={isBillDialogOpen}
          onOpenChange={(open) => {
            if (!open) setSelectedInvoiceForReprint(null);
            setIsBillDialogOpen(open);
          }}
          existingSaleData={selectedInvoiceForReprint}
          onConfirmSale={() => { /* No confirm action needed for reprint */ }}
        />
      )}
    </>
    </TooltipProvider>
  );
}
