
"use client";

import { PlusSquare } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { ManageStockForm } from "@/components/inventory/ManageStockForm";
import { useAuth } from "@/contexts/AuthContext";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { GlobalPreloaderScreen } from "@/components/GlobalPreloaderScreen";

export default function ManageStockPage() {
  const { currentUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // General check for authenticated user
    if (!currentUser) {
      router.replace("/");
    }
    // Further role-specific checks can be done here if needed for sub-features
    // but basic access for cashier is now allowed by sidebar & removing previous blocks
  }, [currentUser, router]);

  if (!currentUser) {
     return (
      <>
        <GlobalPreloaderScreen message="Loading stock management..." />
      </>
     );
  }
  
  // If any more granular access control is needed based on role,
  // it can be implemented within ManageStockForm or for specific actions.
  // For now, both admin and cashier can access this page.

  return (
    <>
      <PageHeader 
        title="Manage Stock / Transactions" 
        description="Add, remove, or transfer product stock."
        icon={PlusSquare}
      />
      <ManageStockForm />
    </>
  );
}
