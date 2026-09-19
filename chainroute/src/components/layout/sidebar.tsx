import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { UserRole } from "@workspace/api-client-react/src/generated/api.schemas";
import { 
  LayoutDashboard, 
  CreditCard, 
  Users, 
  ArrowRightLeft, 
  Link as LinkIcon, 
  Scale, 
  ShieldAlert, 
  Settings,
  LogOut,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLogout } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";

type NavItem = {
  title: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[];
};

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard, roles: ["ADMIN", "OPERATOR", "AUDITOR", "VENDOR"] },
  { title: "Payments", href: "/payments", icon: CreditCard, roles: ["ADMIN", "OPERATOR", "AUDITOR", "VENDOR"] },
  { title: "Transfers", href: "/transfers", icon: ArrowRightLeft, roles: ["ADMIN", "OPERATOR", "AUDITOR", "VENDOR"] },
  { title: "Vendors", href: "/vendors", icon: Users, roles: ["ADMIN", "OPERATOR", "AUDITOR"] },
  { title: "Ledger", href: "/blockchain", icon: LinkIcon, roles: ["ADMIN", "OPERATOR", "AUDITOR", "VENDOR"] },
  { title: "Reconciliation", href: "/reconciliation", icon: Scale, roles: ["ADMIN", "OPERATOR", "AUDITOR"] },
  { title: "Audit Logs", href: "/audit-logs", icon: ShieldAlert, roles: ["ADMIN", "AUDITOR"] },
  { title: "Users", href: "/users", icon: Users, roles: ["ADMIN"] },
  { title: "Settings", href: "/settings", icon: Settings, roles: ["ADMIN", "OPERATOR", "AUDITOR", "VENDOR"] },
];

export function Sidebar() {
  const { user, hasRole } = useAuth();
  const [location, setLocation] = useLocation();
  const logout = useLogout();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        setLocation("/login");
      }
    });
  };

  if (!user) return null;

  return (
    <div className="w-64 border-r border-border bg-sidebar text-sidebar-foreground flex flex-col h-full shrink-0">
      <div className="h-16 flex items-center px-6 border-b border-sidebar-border shrink-0">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
          <div className="w-8 h-8 bg-sidebar-primary text-sidebar-primary-foreground rounded-md flex items-center justify-center font-mono">
            CR
          </div>
          ChainRoute
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-1">
        <div className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-2 px-2">
          Menu
        </div>
        
        {navItems.filter(item => hasRole(item.roles)).map(item => {
          const isActive = location === item.href || (location.startsWith(item.href) && item.href !== "/");
          return (
            <Link key={item.href} href={item.href}>
              <div 
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.title}
              </div>
            </Link>
          );
        })}

        {hasRole(["ADMIN", "OPERATOR"]) && (
          <div className="mt-6 px-2">
            <Link href="/payments/create">
              <Button className="w-full justify-start shadow-none" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                New Payment
              </Button>
            </Link>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-sidebar-border shrink-0">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-bold text-sidebar-accent-foreground">
            {user.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{user.name}</div>
            <div className="text-xs text-sidebar-foreground/60 truncate">{user.role}</div>
          </div>
        </div>
        <Button 
          variant="ghost" 
          className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50" 
          size="sm"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
