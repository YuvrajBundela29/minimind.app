import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { EarlyAccessProvider } from "@/contexts/EarlyAccessContext";
import UpgradeModal from "@/components/UpgradeModal";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import UpdatePasswordPage from "./pages/UpdatePasswordPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <EarlyAccessProvider>
      <SubscriptionProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <UpgradeModal />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/update-password" element={<UpdatePasswordPage />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </SubscriptionProvider>
    </EarlyAccessProvider>
  </QueryClientProvider>
);

export default App;
