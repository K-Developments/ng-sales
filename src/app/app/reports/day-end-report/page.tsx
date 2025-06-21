
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { CalendarClock, FileText, DownloadCloud, ReceiptText, Banknote, Building, Newspaper, CreditCard } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useAuth } from "@/contexts/AuthContext";
import { AccessDenied } from "@/components/AccessDenied";
import { useRouter } from "next/navigation";
import { GlobalPreloaderScreen } from "@/components/GlobalPreloaderScreen";
import type { Sale, DayEndReportSummary } from "@/lib/types"; // Updated DayEndReportSummary type might be needed
import { format, startOfDay, endOfDay } from "date-fns";
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { cn } from "@/lib/utils";
import { useSalesData } from "@/hooks/useSalesData"; 
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";


const formatCurrency = (amount: number | undefined): string => {
  if (amount === undefined || isNaN(amount)) return "Rs. 0.00";
  return new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(amount).replace("LKR", "Rs.");
};

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}


export default function DayEndReportPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [reportSummary, setReportSummary] = useState<DayEndReportSummary | null>(null);

  const { sales: allSales, isLoading: isLoadingSales, error: salesError } = useSalesData(true); 

  useEffect(() => {
    if (!currentUser) {
      router.replace("/");
      return;
    }
    if (currentUser.role !== "admin") {
      router.replace(currentUser.role === "cashier" ? "/app/sales" : "/app/dashboard");
    }
  }, [currentUser, router]);

  useEffect(() => {
    if (selectedDate && !isLoadingSales && allSales) {
      const dateStart = startOfDay(selectedDate);
      const dateEnd = endOfDay(selectedDate);

      const salesForDay = allSales.filter(sale => {
        const saleDateObj = sale.saleDate instanceof Date ? sale.saleDate : new Date(sale.saleDate);
        return saleDateObj >= dateStart && saleDateObj <= dateEnd;
      });

      let totalCollectedByCash = 0;
      let totalCollectedByCheque = 0;
      let totalCollectedByBankTransfer = 0;
      let totalChangeGiven = 0;
      let totalOutstanding = 0;
      const chequeNumbersList: string[] = [];
      const bankTransferRefs: string[] = [];

      salesForDay.forEach(s => {
        if (s.paidAmountCash) totalCollectedByCash += s.paidAmountCash;
        if (s.paidAmountCheque) {
            totalCollectedByCheque += s.paidAmountCheque;
            if (s.chequeDetails?.number) chequeNumbersList.push(s.chequeDetails.number);
        }
        if (s.paidAmountBankTransfer) {
            totalCollectedByBankTransfer += s.paidAmountBankTransfer;
            if(s.bankTransferDetails?.referenceNumber) bankTransferRefs.push(s.bankTransferDetails.referenceNumber);
        }
        if (s.changeGiven) totalChangeGiven += s.changeGiven;
        if (s.outstandingBalance) totalOutstanding += s.outstandingBalance;
      });
      
      const totalSalesValue = salesForDay.reduce((sum, s) => sum + s.totalAmount, 0);
      const totalCollectedOverall = totalCollectedByCash + totalCollectedByCheque + totalCollectedByBankTransfer;


      setReportSummary({
        reportDate: selectedDate,
        totalTransactions: salesForDay.length,
        totalSalesAmount: totalSalesValue,
        totalAmountCollectedByCash: totalCollectedByCash,
        totalAmountCollectedByCheque: totalCollectedByCheque,
        totalAmountCollectedByBankTransfer: totalCollectedByBankTransfer,
        totalChangeGiven: totalChangeGiven,
        totalOutstandingAmount: totalOutstanding,
        
        // These are for compatibility with old PDF structure if needed, can be removed/refactored
        cashSales: { count: 0, amount: 0, cashReceived: totalCollectedByCash, balanceReturned: totalChangeGiven }, // Simplified
        chequeSales: { count: salesForDay.filter(s => s.paidAmountCheque && s.paidAmountCheque > 0).length, amount: totalCollectedByCheque, chequeNumbers: chequeNumbersList },
        // For 'creditSales', it's better to directly use totalOutstandingAmount
        creditSales: { count: salesForDay.filter(s => s.outstandingBalance && s.outstandingBalance > 0).length, amount: totalOutstanding, amountPaidOnCredit: 0, remainingCreditBalance: totalOutstanding },
        
        overallTotalSales: totalSalesValue,
        overallTotalCashReceived: totalCollectedOverall,
        overallTotalBalanceReturned: totalChangeGiven,
        overallTotalCreditOutstanding: totalOutstanding,
      });
    } else {
      setReportSummary(null);
    }
  }, [selectedDate, allSales, isLoadingSales]);

  if (!currentUser) {
    return <GlobalPreloaderScreen message="Loading report..." />;
  }
  if (currentUser.role !== "admin") {
    return <AccessDenied message="Day End reports are not available for your role. Redirecting..." />;
  }

  const handleExportPDF = () => {
    if (!reportSummary || !selectedDate) return;
    const doc = new jsPDF() as jsPDFWithAutoTable;
    const reportDateFormatted = format(selectedDate, "PPP");

    doc.setFontSize(18);
    doc.text("Day End Report", 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text(`Date: ${reportDateFormatted}`, 105, 30, { align: "center" });

    let yPos = 45;
    const lineSpacing = 7;
    const sectionSpacing = 10;

    doc.setFontSize(14);
    doc.text("Payment Summary", 14, yPos);
    yPos += lineSpacing * 1.5;
    doc.setFontSize(10);

    doc.text(`Total Amount Collected by Cash: ${formatCurrency(reportSummary.totalAmountCollectedByCash)}`, 18, yPos);
    yPos += lineSpacing;
    doc.text(`Total Amount Collected by Cheque: ${formatCurrency(reportSummary.totalAmountCollectedByCheque)}`, 18, yPos);
    if(reportSummary.chequeSales.chequeNumbers.length > 0) {
        yPos += lineSpacing;
        doc.text(` (Cheque Nos: ${reportSummary.chequeSales.chequeNumbers.join(', ')})`, 22, yPos);
    }
    yPos += lineSpacing;
    doc.text(`Total Amount Collected by Bank Transfer: ${formatCurrency(reportSummary.totalAmountCollectedByBankTransfer)}`, 18, yPos);
    // Add bank transfer refs if needed
    yPos += sectionSpacing;


    doc.setFontSize(14);
    doc.text("Financial Overview", 14, yPos);
    yPos += lineSpacing * 1.5;
    doc.setFontSize(10);
    doc.text(`Total Transactions: ${reportSummary.totalTransactions}`, 18, yPos);
    yPos += lineSpacing;
    doc.text(`Total Sales Value (Amount Due): ${formatCurrency(reportSummary.totalSalesAmount)}`, 18, yPos);
    yPos += lineSpacing;
    doc.text(`Total Amount Collected (All Methods): ${formatCurrency(reportSummary.overallTotalCashReceived)}`, 18, yPos);
    yPos += lineSpacing;
    doc.text(`Total Change Given (from Cash): ${formatCurrency(reportSummary.totalChangeGiven)}`, 18, yPos);
    yPos += lineSpacing;
    doc.text(`Total Outstanding Credit: ${formatCurrency(reportSummary.totalOutstandingAmount)}`, 18, yPos);
    
    doc.save(`Day_End_Report_${format(selectedDate, "yyyy-MM-dd")}.pdf`);
  };

  const reportActions = (
    <div className="flex flex-col sm:flex-row gap-2 items-center">
        <Popover>
            <PopoverTrigger asChild>
            <Button
                variant={"outline"}
                className={cn(
                "w-[220px] justify-start text-left font-normal h-10",
                !selectedDate && "text-muted-foreground"
                )}
            >
                <CalendarClock className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
            </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
            <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                initialFocus
                disabled={(date) => date > new Date() || date < new Date("2000-01-01")}
            />
            </PopoverContent>
        </Popover>
      <Button onClick={handleExportPDF} variant="outline" size="sm" disabled={!reportSummary || isLoadingSales}>
        <DownloadCloud className="mr-2 h-4 w-4" /> Export PDF
      </Button>
    </div>
  );

  if (isLoadingSales && !reportSummary) {
    return <GlobalPreloaderScreen message="Fetching sales data for report..." />
  }

  return (
    <>
      <PageHeader 
        title="Day End Report" 
        description="Summary of daily sales transactions and financial totals."
        icon={FileText}
        action={reportActions}
      />

      {salesError && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Sales Data</AlertTitle>
          <AlertDescription>{salesError}</AlertDescription>
        </Alert>
      )}

      {reportSummary ? (
        <div className="space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline">Report for: {selectedDate ? format(selectedDate, "PPP") : "N/A"}</CardTitle>
              <CardDescription>Total Transactions: {reportSummary.totalTransactions}</CardDescription>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Banknote className="h-5 w-5"/>Cash Payments</CardTitle>
                <CardDescription>Total collected via cash</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>Total Cash In: <span className="font-semibold">{formatCurrency(reportSummary.totalAmountCollectedByCash)}</span></p>
                <p>Change Given: <span className="font-semibold">{formatCurrency(reportSummary.totalChangeGiven)}</span></p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Newspaper className="h-5 w-5"/>Cheque Payments</CardTitle>
                 <CardDescription>Total collected via cheques</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>Total Cheque Amount: <span className="font-semibold">{formatCurrency(reportSummary.totalAmountCollectedByCheque)}</span></p>
                {reportSummary.chequeSales.chequeNumbers.length > 0 && (
                  <p className="text-xs text-muted-foreground">Cheque Nos: {reportSummary.chequeSales.chequeNumbers.join(', ')}</p>
                )}
              </CardContent>
            </Card>
             <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Building className="h-5 w-5"/>Bank Transfers</CardTitle>
                 <CardDescription>Total collected via bank transfers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>Total Transfer Amount: <span className="font-semibold">{formatCurrency(reportSummary.totalAmountCollectedByBankTransfer)}</span></p>
                {/* Add display for bank transfer references if needed */}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><CreditCard className="h-5 w-5"/>Credit / Outstanding</CardTitle>
                <CardDescription>Total amount currently due</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>Total Outstanding: <span className="font-semibold">{formatCurrency(reportSummary.totalOutstandingAmount)}</span></p>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline">Overall Financial Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-md">
              <p>Total Sales Value (Amount Due): <strong className="text-primary">{formatCurrency(reportSummary.totalSalesAmount)}</strong></p>
              <hr className="my-2"/>
              <p>Total Amount Collected (All Methods): <strong className="text-green-600">{formatCurrency(reportSummary.overallTotalCashReceived)}</strong></p>
              <p>Total Change Given (from Cash): <strong>{formatCurrency(reportSummary.totalChangeGiven)}</strong></p>
              <p>Total Outstanding Credit: <strong className="text-orange-600">{formatCurrency(reportSummary.totalOutstandingAmount)}</strong></p>
            </CardContent>
          </Card>

        </div>
      ) : (
         <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline">No Data</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground flex items-center">
                <ReceiptText className="mr-2 h-5 w-5" />
                {selectedDate ? `No sales transactions found for ${format(selectedDate, "PPP")}.` : "Please select a date to view the report."}
              </p>
            </CardContent>
          </Card>
      )}
    </>
  );
}
