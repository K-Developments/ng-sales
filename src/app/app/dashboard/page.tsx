
"use client";

import { Banknote, Users, TrendingUp, Activity, AlertTriangle, Loader2, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { AlertQuantityTable } from "@/components/dashboard/AlertQuantityTable";
import type { Sale } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { AccessDenied } from "@/components/AccessDenied";
import React, { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { GlobalPreloaderScreen } from "@/components/GlobalPreloaderScreen";
import { useCustomers } from "@/hooks/useCustomers";
import { useSalesData } from "@/hooks/useSalesData";
import { useProducts } from "@/hooks/useProducts";

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  
  const { customers, isLoading: isLoadingCustomers, error: customersError } = useCustomers();
  const { 
    sales, 
    isLoading: isLoadingSales, 
    error: salesError, 
    totalRevenue: hookTotalRevenue 
  } = useSalesData(true); // Enable real-time updates
  const { 
    products: allProducts, 
    isLoading: isLoadingProducts, 
    error: productsError 
  } = useProducts();


  const revenueToday = useMemo(() => {
    if (isLoadingSales || !sales || sales.length === 0) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return sales
      .filter(sale => {
        const saleDate = sale.saleDate instanceof Date ? sale.saleDate : new Date(sale.saleDate);
        return saleDate >= today;
      })
      .reduce((sum, sale) => sum + (Number(sale.totalAmount) || 0), 0);
  }, [sales, isLoadingSales]);

  const liveLowStockItemsCount = useMemo(() => {
    if (isLoadingProducts || !allProducts || allProducts.length === 0) return 0;
    return allProducts.filter(p => p.stock <= (p.reorderLevel || 10)).length;
  }, [allProducts, isLoadingProducts]);

  const topSellingProducts = useMemo(() => {
    if (isLoadingSales || isLoadingProducts || !sales || !allProducts) {
      return [];
    }

    const productSales: { [productId: string]: { name: string; price: number; quantity: number } } = {};

    sales.forEach(sale => {
      sale.items.forEach(item => {
        if (!item.isOfferItem) { // Only count paid items
          if (!productSales[item.id]) {
            const productDetails = allProducts.find(p => p.id === item.id);
            if (productDetails) {
              productSales[item.id] = {
                name: productDetails.name,
                price: productDetails.price,
                quantity: 0
              };
            }
          }
          if (productSales[item.id]) {
            productSales[item.id].quantity += item.quantity;
          }
        }
      });
    });

    return Object.entries(productSales)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

  }, [sales, allProducts, isLoadingSales, isLoadingProducts]);

  const monthlySalesData = useMemo(() => {
    if (!sales || sales.length === 0) {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return monthNames.map(name => ({ name, sales: 0 }));
    }

    const monthlyTotals: { [key: number]: number } = {};
    const currentYear = new Date().getFullYear();

    sales.forEach(sale => {
      const saleDate = sale.saleDate instanceof Date ? sale.saleDate : new Date(sale.saleDate);
      if (saleDate.getFullYear() === currentYear) {
        const month = saleDate.getMonth(); // 0 for Jan, 1 for Feb, etc.
        if (!monthlyTotals[month]) {
          monthlyTotals[month] = 0;
        }
        monthlyTotals[month] += sale.totalAmount || 0;
      }
    });

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    return monthNames.map((name, index) => ({
      name,
      sales: monthlyTotals[index] || 0
    }));
  }, [sales]);


  useEffect(() => {
    if (!currentUser) {
      router.replace("/");
      return;
    }
    if (currentUser.role === "cashier") {
      router.replace("/app/sales");
    }
  }, [currentUser, router]);

  if (!currentUser) {
    return <GlobalPreloaderScreen message="Loading dashboard..." />;
  }

  if (currentUser.role === "cashier") {
    return <AccessDenied message="Dashboard is not available for your role. Redirecting..." />;
  }

  const formatCurrency = (value: number): string => {
    if (typeof value !== 'number' || isNaN(value)) {
      return 'Rs. 0.00'; 
    }
    return new Intl.NumberFormat('en-LK', { 
      style: 'currency',
      currency: 'LKR', 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value).replace('LKR', 'Rs.'); 
  };

  const renderStatsCard = (
    title: string,
    valueKey: 'liveTotalCustomers' | 'liveTotalRevenue' | 'liveRevenueToday' | 'liveLowStockItems',
    icon: LucideIcon,
    iconColor: string,
    description?: string
  ) => {
    let isLoadingValue = false;
    let hasError: string | null = null;
    let displayValue: string | number = 'N/A';

    switch (valueKey) {
      case 'liveTotalCustomers':
        isLoadingValue = isLoadingCustomers;
        hasError = customersError;
        if (!isLoadingValue && !hasError && customers) {
          displayValue = customers.length.toLocaleString();
        }
        break;
      case 'liveTotalRevenue':
        isLoadingValue = isLoadingSales;
        hasError = salesError;
        if (!isLoadingValue && !hasError && hookTotalRevenue !== undefined) { 
          displayValue = formatCurrency(hookTotalRevenue);
        }
        break;
      case 'liveRevenueToday':
        isLoadingValue = isLoadingSales; 
        hasError = salesError;
        if (!isLoadingValue && !hasError && sales) {
          displayValue = formatCurrency(revenueToday);
        }
        break;
      case 'liveLowStockItems':
        isLoadingValue = isLoadingProducts;
        hasError = productsError;
        if (!isLoadingValue && !hasError && allProducts) {
          displayValue = liveLowStockItemsCount.toString();
        }
        break;
      default:
        displayValue = 'N/A';
    }

    if (isLoadingValue) {
      return (
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            <Loader2 className={`${iconColor} h-5 w-5 animate-spin`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline text-foreground">Loading...</div>
            {description && <p className="text-xs text-muted-foreground pt-1">{description}</p>}
          </CardContent>
        </Card>
      );
    }

    if (hasError) {
      return (
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            <AlertTriangle className={`${iconColor} h-5 w-5`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline text-destructive">Error</div>
            {description && <p className="text-xs text-muted-foreground pt-1">{description}</p>}
          </CardContent>
        </Card>
      );
    }

    return (
      <StatsCard
        title={title}
        value={displayValue}
        icon={icon}
        iconColor={iconColor}
        description={description}
      />
    );
  };

  return (
    <>
      <PageHeader
        title="Dashboard Overview"
        description="Welcome back! Here's what's happening with NGroup Products."
        icon={Activity}
      />
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {renderStatsCard(
          "Total Revenue",
          "liveTotalRevenue",
          Banknote,
          "text-green-600"
        )}
        {renderStatsCard(
          "Total Customers",
          "liveTotalCustomers",
          Users,
          "text-blue-600"
        )}
        {renderStatsCard(
          "Low Stock Items",
          "liveLowStockItems", 
          AlertTriangle,
          "text-destructive",
          "Needs reordering soon"
        )}
        {renderStatsCard(
          "Revenue Today",
          "liveRevenueToday",
          TrendingUp,
          "text-emerald-600"
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
        <SalesChart
            data={monthlySalesData} 
            title="Monthly Sales Performance"
            description={isLoadingSales && (!sales || sales.length === 0) ? "Calculating monthly sales..." : "Sales figures for the current year."}
          />
        </div>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">Top Selling Products</CardTitle>
            <CardDescription>
              {isLoadingSales || isLoadingProducts ? 'Calculating...' : 'Most popular items based on sales.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(isLoadingSales || isLoadingProducts) && !salesError && !productsError ? (
              <div className="flex justify-center items-center h-48">
                  <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : salesError || productsError ? (
              <div className="text-center text-destructive py-10">
                <p>Could not load top selling products.</p>
              </div>
            ) : topSellingProducts.length === 0 ? (
                 <div className="text-center text-muted-foreground py-10">
                    No sales data available yet.
                 </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Quantity Sold</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topSellingProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(product.price)}</TableCell>
                      <TableCell className="text-right">{product.quantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      
      <AlertQuantityTable />
    </>
  );
}
