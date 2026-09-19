import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreatePayment, useListVendors } from "@workspace/api-client-react";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";

const allocationSchema = z.object({
  vendorId: z.string().optional(),
  label: z.string().min(1, "Label is required"),
  amount: z.coerce.number().min(1, "Amount must be at least 1"),
});

const createPaymentSchema = z.object({
  customerReference: z.string().min(1, "Customer reference is required"),
  amount: z.coerce.number().min(1, "Amount must be at least 1"),
  currency: z.string().min(3).max(3),
  description: z.string().optional(),
  allocations: z.array(allocationSchema).min(1, "At least one allocation is required"),
});

export default function CreatePayment() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { data: vendors } = useListVendors();
  const createMutation = useCreatePayment();

  const form = useForm<z.infer<typeof createPaymentSchema>>({
    resolver: zodResolver(createPaymentSchema),
    defaultValues: {
      currency: "INR",
      amount: 0,
      customerReference: "",
      description: "",
      allocations: [
        { label: "Platform Fee", amount: 0 }
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "allocations",
  });

  // Watch values to compute remaining balance
  const allocations = form.watch("allocations");
  const totalAmount = form.watch("amount") || 0;
  
  const allocatedAmount = allocations.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  const isBalanced = totalAmount > 0 && totalAmount === allocatedAmount;

  const onSubmit = (data: z.infer<typeof createPaymentSchema>) => {
    if (!isBalanced) {
      toast({
        title: "Allocation mismatch",
        description: "The sum of allocations must equal the total amount.",
        variant: "destructive"
      });
      return;
    }

    // Convert string IDs to numbers, convert INR amounts to paise
    const payload = {
      ...data,
      amount: data.amount * 100, // INR to paise
      allocations: data.allocations.map(a => ({
        label: a.label,
        amount: a.amount * 100,
        vendorId: a.vendorId && a.vendorId !== "platform" ? parseInt(a.vendorId, 10) : null
      }))
    };

    createMutation.mutate({ data: payload }, {
      onSuccess: (payment) => {
        toast({ title: "Payment created successfully" });
        setLocation(`/payments/${payment.id}`);
      },
      onError: () => {
        toast({
          title: "Failed to create payment",
          variant: "destructive"
        });
      }
    });
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <Link href="/payments">
        <Button variant="ghost" size="sm" className="-ml-4 text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Payments
        </Button>
      </Link>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Payment</h1>
        <p className="text-muted-foreground mt-1">Configure a split payment</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
              <CardDescription>Primary transaction information</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="customerReference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Reference</FormLabel>
                    <FormControl>
                      <Input placeholder="ORD-9921" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Amount (INR)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Service fee for..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Allocations</CardTitle>
                  <CardDescription>Split funds between platform and vendors</CardDescription>
                </div>
                <div className={`text-sm font-medium ${isBalanced ? 'text-success' : 'text-destructive'}`}>
                  Allocated: ₹{allocatedAmount.toFixed(2)} / ₹{totalAmount.toFixed(2)}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-4 items-end bg-muted/30 p-4 rounded-lg border">
                  <FormField
                    control={form.control}
                    name={`allocations.${index}.vendorId`}
                    render={({ field: selectField }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Beneficiary</FormLabel>
                        <Select 
                          onValueChange={selectField.onChange} 
                          defaultValue={selectField.value || "platform"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select beneficiary" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="platform">Platform (Self)</SelectItem>
                            {vendors?.map(v => (
                              <SelectItem key={v.id} value={v.id.toString()}>
                                Vendor: {v.businessName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`allocations.${index}.label`}
                    render={({ field: inputField }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Label</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Service Fee" {...inputField} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`allocations.${index}.amount`}
                    render={({ field: inputField }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Amount (INR)</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" step="0.01" {...inputField} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive shrink-0 mb-0.5 hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => append({ label: "", amount: 0 })}
                className="w-full mt-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Allocation
              </Button>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={createMutation.isPending || !isBalanced} size="lg">
              {createMutation.isPending ? "Creating..." : "Create Payment"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
