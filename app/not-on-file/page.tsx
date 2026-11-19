import { SignOutButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export default function NotOnFilePage() {
  return (
    <main className="flex min-h-full items-center justify-center bg-background px-6 py-16">
      <div className="flex max-w-md flex-col gap-4">
        <h1 className="font-serif text-3xl">This email is not on file</h1>
        <p className="text-muted-foreground">
          TaxHelping2Day sends the portal invitation. Sign in with the email the firm has for you, or ask the practice to invite you.
        </p>
        <SignOutButton>
          <Button type="button" variant="outline" className="w-fit">
            Use a different email
          </Button>
        </SignOutButton>
      </div>
    </main>
  );
}
