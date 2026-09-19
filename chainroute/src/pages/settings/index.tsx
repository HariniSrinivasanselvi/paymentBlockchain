import { useGetSettings } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Key, ShieldCheck } from "lucide-react";

export default function SettingsView() {
  const { data: settings, isLoading } = useGetSettings();
  const { user } = useAuth();

  if (isLoading || !user) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground">Platform configuration and profile</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Gateway Configuration
            </CardTitle>
            <CardDescription>Razorpay integration status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-muted rounded-md border">
              <span className="font-medium text-sm">Mode</span>
              {settings?.razorpayConfigured ? (
                <Badge variant="success">LIVE MODE</Badge>
              ) : (
                <Badge variant="secondary">SIMULATED MODE</Badge>
              )}
            </div>
            
            {settings?.razorpayConfigured && settings.razorpayKeyId && (
              <div className="flex items-center gap-3 p-3 text-sm border rounded-md">
                <Key className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Key ID:</span>
                <span className="font-mono">{settings.razorpayKeyId}</span>
              </div>
            )}
            
            {!settings?.razorpayConfigured && (
              <p className="text-sm text-muted-foreground bg-accent/50 p-3 rounded border border-border">
                Platform is running in simulated mode. Payments and transfers will complete immediately without calling external APIs.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Your Profile
            </CardTitle>
            <CardDescription>Current session information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Name</div>
              <div className="font-medium text-lg">{user.name}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Email</div>
              <div>{user.email}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground">Assigned Role</div>
              <div className="mt-1">
                <Badge variant="outline" className="font-bold">{user.role}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
