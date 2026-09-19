import { type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';
import { queryClient } from '@/lib/query-client';

import { AuthProvider, ProtectedRoute } from '@/hooks/use-auth';
import { AppLayout } from '@/components/layout/app-layout';

import Login from '@/pages/login';
import Dashboard from '@/pages/dashboard';
import PaymentsList from '@/pages/payments/index';
import PaymentView from '@/pages/payments/view';
import CreatePayment from '@/pages/payments/create';
import VendorsList from '@/pages/vendors/index';
import VendorView from '@/pages/vendors/view';
import TransfersList from '@/pages/transfers/index';
import BlockchainList from '@/pages/blockchain/index';
import BlockchainView from '@/pages/blockchain/view';
import ReconciliationList from '@/pages/reconciliation/index';
import AuditLogsList from '@/pages/audit-logs/index';
import UsersList from '@/pages/users/index';
import SettingsView from '@/pages/settings/index';

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/login" component={Login} />
        
        {/* Protected Routes */}
        <Route path="/">
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        </Route>
        
        <Route path="/payments">
          <ProtectedRoute><PaymentsList /></ProtectedRoute>
        </Route>
        
        <Route path="/payments/create">
          <ProtectedRoute allowedRoles={["ADMIN", "OPERATOR"]}><CreatePayment /></ProtectedRoute>
        </Route>
        
        <Route path="/payments/:id">
          <ProtectedRoute><PaymentView /></ProtectedRoute>
        </Route>
        
        <Route path="/vendors">
          <ProtectedRoute allowedRoles={["ADMIN", "OPERATOR", "AUDITOR"]}><VendorsList /></ProtectedRoute>
        </Route>
        
        <Route path="/vendors/:id">
          <ProtectedRoute allowedRoles={["ADMIN", "OPERATOR", "AUDITOR"]}><VendorView /></ProtectedRoute>
        </Route>
        
        <Route path="/transfers">
          <ProtectedRoute><TransfersList /></ProtectedRoute>
        </Route>
        
        <Route path="/blockchain">
          <ProtectedRoute><BlockchainList /></ProtectedRoute>
        </Route>
        
        <Route path="/blockchain/:transactionId">
          <ProtectedRoute><BlockchainView /></ProtectedRoute>
        </Route>
        
        <Route path="/reconciliation">
          <ProtectedRoute allowedRoles={["ADMIN", "OPERATOR", "AUDITOR"]}><ReconciliationList /></ProtectedRoute>
        </Route>
        
        <Route path="/audit-logs">
          <ProtectedRoute allowedRoles={["ADMIN", "AUDITOR"]}><AuditLogsList /></ProtectedRoute>
        </Route>
        
        <Route path="/users">
          <ProtectedRoute allowedRoles={["ADMIN"]}><UsersList /></ProtectedRoute>
        </Route>
        
        <Route path="/settings">
          <ProtectedRoute><SettingsView /></ProtectedRoute>
        </Route>

        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <AuthProvider>
            <RoutedErrorBoundary>
              <Router />
            </RoutedErrorBoundary>
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
