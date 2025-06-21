
"use client";

import { ClipboardList, FileText, Printer, DownloadCloud, Filter, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FullReportTable } from "@/components/reports/FullReportTable";
import type { FullReportEntry, Sale } from "@/lib/types"; 
import { useAuth } from "@/contexts/AuthContext";
import { AccessDenied } from "@/components/AccessDenied";
import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable'; 
import { GlobalPreloaderScreen } from "@/components/GlobalPreloaderScreen";
import { Input } from "@/components/ui/input";
import { DateRangePicker } from "@/components/ui/date-range-picker"; 
import type { DateRange } from "react-day-picker";
import { addDays, format, parseISO } from "date-fns"; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSalesData } from "@/hooks/useSalesData"; 

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

function transformSalesToFullReportEntries(sales: Sale[]): FullReportEntry[] {
  const reportEntries: FullReportEntry[] = [];
  sales.forEach(sale => {
    sale.items.forEach(item => {
      reportEntries.push({
        saleId: sale.id,
        saleDate: format(sale.saleDate, "yyyy-MM-dd"),
        saleTime: format(sale.saleDate, "HH:mm:ss"),
        customerName: sale.customerName || "Walk-in",
        productSku: item.sku || "N/A",
        productName: item.name,
        productCategory: item.category,
        quantity: item.quantity,
        appliedPrice: item.appliedPrice,
        lineTotal: item.quantity * item.appliedPrice,
        saleType: item.saleType,
        paymentMethod: sale.paymentSummary, 
        staffId: sale.staffId,
      });
    });
  });
  return reportEntries.sort((a,b) => new Date(b.saleDate + 'T' + b.saleTime).getTime() - new Date(a.saleDate + 'T' + a.saleTime).getTime());
}


export default function FullReportPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  
  const { sales: liveSales, isLoading: isLoadingSales, error: salesError } = useSalesData(false); 

  const [reportData, setReportData] = useState<FullReportEntry[]>([]);
  const [filteredData, setFilteredData] = useState<FullReportEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30), 
    to: new Date(),
  });
  const [saleTypeFilter, setSaleTypeFilter] = useState<string>("all");
  const [paymentSummaryFilter, setPaymentSummaryFilter] = useState<string>("all"); 

  useEffect(() => {
    if (!isLoadingSales && liveSales) {
      setReportData(transformSalesToFullReportEntries(liveSales));
    }
  }, [liveSales, isLoadingSales]);


  // Apply filters
  useEffect(() => {
    let result = [...reportData];
    
    // Date filter
    if (dateRange?.from && dateRange.to) {
      result = result.filter(entry => {
        const entryDate = parseISO(entry.saleDate); 
        return entryDate >= dateRange.from! && entryDate <= dateRange.to!;
      });
    }
    
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(entry => 
        (entry.saleId && entry.saleId.toLowerCase().includes(term)) ||
        (entry.customerName && entry.customerName.toLowerCase().includes(term)) ||
        (entry.productName && entry.productName.toLowerCase().includes(term)) ||
        (entry.productSku && entry.productSku.toLowerCase().includes(term)) ||
        (entry.staffId && entry.staffId.toLowerCase().includes(term)) ||
        (entry.paymentMethod && entry.paymentMethod.toLowerCase().includes(term)) 
      );
    }
    
    // Sale type filter
    if (saleTypeFilter !== "all") {
      result = result.filter(entry => entry.saleType === saleTypeFilter);
    }
    
    // Payment summary filter
    if (paymentSummaryFilter !== "all") {
      result = result.filter(entry => entry.paymentMethod.toLowerCase().includes(paymentSummaryFilter.toLowerCase()));
    }
    
    setFilteredData(result);
  }, [reportData, searchTerm, dateRange, saleTypeFilter, paymentSummaryFilter]);

  useEffect(() => {
    if (!currentUser) {
      router.replace("/");
      return;
    }
    if (currentUser.role !== "admin") {
       router.replace(currentUser.role === "cashier" ? "/app/sales" : "/app/dashboard");
    }
  }, [currentUser, router]);

  if (!currentUser) {
     return <GlobalPreloaderScreen message="Loading report..." />;
  }

  if (currentUser.role !== "admin") {
    return (
      <AccessDenied message="Full reports are not available for your role. Redirecting..." />
    );
  }

  const handleExportExcel = () => {
    setIsLoading(true); 
    try {
      const worksheet = XLSX.utils.json_to_sheet(filteredData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Full Report");
      XLSX.writeFile(workbook, `Full_Report_${format(new Date(), 'yyyyMMdd')}.xlsx`);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      // setIsLoading(false); // This was causing an error, removing for now.
    }
  };

  const handleExportPDF = () => {
    // setIsLoading(true); 
    try {
      const doc = new jsPDF('landscape') as jsPDFWithAutoTable; 
      doc.text(`Full Sales Report - ${format(new Date(), 'PP')}`, 14, 16);
      
      doc.autoTable({
        startY: 20,
        head: [['ID', 'Date', 'Time', 'Customer', 'SKU', 'Product', 'Category', 'Qty', 'Unit Price', 'Total', 'Type', 'Payment Summary', 'Staff']],
        body: filteredData.map(entry => [
          entry.saleId,
          entry.saleDate,
          entry.saleTime,
          entry.customerName || "Walk-in",
          entry.productSku,
          entry.productName,
          entry.productCategory,
          entry.quantity,
          entry.appliedPrice.toFixed(2),
          entry.lineTotal.toFixed(2),
          entry.saleType,
          entry.paymentMethod, 
          entry.staffId,
        ]),
        styles: { 
          fontSize: 8,
          cellPadding: 2,
          overflow: 'linebreak'
        },
        headStyles: { 
          fillColor: [30, 18, 57], 
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [240, 240, 240]
        },
        margin: { top: 20 },
        pageBreak: 'auto',
        tableWidth: 'wrap'
      });
      
      doc.save(`Full_Report_${format(new Date(), 'yyyyMMdd')}.pdf`);
    } catch (error) {
      console.error("PDF generation failed:", error);
    } finally {
      // setIsLoading(false); 
    }
  };

  const handlePrint = () => {
    window.print();
  };
  
  const paymentSummaryOptions = useMemo(() => {
    if (isLoadingSales || !reportData) return [{ value: "all", label: "All Payment Summaries" }];
    const summaries = new Set(reportData.map(entry => entry.paymentMethod));
    return [{ value: "all", label: "All Payment Summaries" }, ...Array.from(summaries).map(s => ({ value: s, label: s }))];
  }, [reportData, isLoadingSales]);


  const reportActions = (
    <div className="flex flex-col sm:flex-row gap-2">
      <Button 
        onClick={handleExportExcel} 
        variant="outline" 
        size="sm"
        disabled={isLoadingSales || filteredData.length === 0}
      >
        {isLoadingSales ? ( 
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <DownloadCloud className="mr-2 h-4 w-4" />
        )}
        Export Excel
      </Button>
      <Button 
        onClick={handleExportPDF} 
        variant="outline" 
        size="sm"
        disabled={isLoadingSales || filteredData.length === 0}
      >
        {isLoadingSales ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FileText className="mr-2 h-4 w-4" />
        )}
        Export PDF
      </Button>
      <Button 
        onClick={handlePrint} 
        variant="outline" 
        size="sm"
        disabled={filteredData.length === 0}
      >
        <Printer className="mr-2 h-4 w-4" /> 
        Print
      </Button>
    </div>
  );
  
  if (isLoadingSales && reportData.length === 0) { 
    return <GlobalPreloaderScreen message="Loading full report data..." />;
  }

  return (
    <div className="space-y-6 print:space-y-0">
      <PageHeader 
        title="Full Sales Report" 
        description="Comprehensive overview of all sales transactions and item details."
        icon={ClipboardList}
        action={reportActions}
      />
      
      <Card className="shadow-lg printable-report-container">
        <CardHeader className="print:hidden space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="font-headline">Detailed Transaction Log</CardTitle>
              <CardDescription>
                {filteredData.length} transactions found
                {salesError && <span className="text-destructive ml-2"> (Error: {salesError})</span>}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filters</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
            
            <DateRangePicker 
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              className="w-full"
            />
            
            <Select value={saleTypeFilter} onValueChange={setSaleTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Sale Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sale Types</SelectItem>
                <SelectItem value="retail">Retail</SelectItem>
                <SelectItem value="wholesale">Wholesale</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={paymentSummaryFilter} onValueChange={setPaymentSummaryFilter}>
                <SelectTrigger>
                    <SelectValue placeholder="Payment Summary" />
                </SelectTrigger>
                <SelectContent>
                    {paymentSummaryOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
        </CardHeader>
        
        <CardContent className="print:p-0">
          <FullReportTable data={filteredData} isLoading={isLoadingSales && reportData.length === 0} />
        </CardContent>
      </Card>
      
      <style jsx global>{`
        @media print {
          body {
            background: white;
          }
          .printable-report-container {
            box-shadow: none;
            border: none;
          }
          .table th, .table td {
            padding: 4px 8px;
            font-size: 10px;
          }
          .badge {
            padding: 2px 6px;
            font-size: 10px;
          }
        }
      `}</style>
    </div>
  );
}
