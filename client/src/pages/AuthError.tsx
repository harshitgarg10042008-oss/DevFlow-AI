import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSearchParams } from "wouter";

const errorMessages: Record<string, string> = {
  access_denied: "You denied access to your GitHub account. Please try again and authorize the application.",
  missing_code: "The authorization code was missing. Please try signing in again.",
  invalid_state: "The session state was invalid. This may be due to a timeout or security issue. Please try again.",
  token_exchange_failed: "Failed to exchange the authorization code for an access token. Please try again.",
  no_token: "GitHub did not return an access token. Please try again.",
  user_fetch_failed: "Failed to fetch your GitHub user information. Please try again.",
  user_creation_failed: "Failed to create your account. Please try again or contact support.",
  oauth_error: "An OAuth error occurred. Please try again.",
  internal_error: "An internal server error occurred. Please try again later.",
};

export default function AuthError() {
  const [params] = useSearchParams();
  const errorCode = params.get("code") || "unknown";
  const errorMessage = errorMessages[errorCode] || "An unknown error occurred during authentication.";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-red-600">Authentication Error</CardTitle>
          <CardDescription>
            {errorMessage}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-600">
            <p>Error code: <code>{errorCode}</code></p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => window.location.href = "/auth/github"} className="flex-1">
              Try Again
            </Button>
            <Button onClick={() => window.location.href = "/"} variant="outline" className="flex-1">
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
