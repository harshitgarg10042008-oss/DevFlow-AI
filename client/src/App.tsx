import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import Home from "@/pages/Home";
import AdvancedControls from "@/pages/AdvancedControls";
import PullRequestReview from "@/pages/PullRequestReview";
import Dashboard from "@/pages/Dashboard";
import AuthError from "@/pages/AuthError";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/controls"} component={AdvancedControls} />
      <Route path="/pull-requests/:id" component={PullRequestReview} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/auth/error" component={AuthError} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
