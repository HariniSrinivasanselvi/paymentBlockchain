import { useListVendors } from "@workspace/api-client-react";
import { formatMoney, formatDate } from "@/lib/utils";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

export default function VendorsList() {
  const { data: vendors, isLoading } = useListVendors();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge variant="success">Active</Badge>;
      case "PENDING":
        return <Badge variant="secondary">Pending</Badge>;
      case "INACTIVE":
        return <Badge variant="destructive">Inactive</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Vendors</h1>
        <p className="text-muted-foreground">Manage marketplace vendors and linked accounts</p>
      </div>

      <div className="bg-card border rounded-lg shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading vendors...</div>
        ) : !vendors?.length ? (
          <div className="p-12 text-center text-muted-foreground">
            No vendors found.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor Code</TableHead>
                <TableHead>Business Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Total Received</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendors.map((vendor) => (
                <TableRow key={vendor.id}>
                  <TableCell className="font-mono text-xs">{vendor.vendorCode}</TableCell>
                  <TableCell className="font-medium">{vendor.businessName}</TableCell>
                  <TableCell className="text-sm">
                    {vendor.email}<br/>
                    <span className="text-muted-foreground text-xs">{vendor.phone}</span>
                  </TableCell>
                  <TableCell>{formatMoney(vendor.totalReceived)}</TableCell>
                  <TableCell>{getStatusBadge(vendor.status)}</TableCell>
                  <TableCell className="text-right">
                    <Link href={`/vendors/${vendor.id}`}>
                      <Button variant="ghost" size="sm" className="h-8">
                        View <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
