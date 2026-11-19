import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AuthShowcase() {
  return (
    <div className="h-dvh bg-primary/15 p-5 max-lg:hidden">
      <Card className="relative h-full justify-between overflow-hidden border-none bg-primary py-8">
        <CardHeader className="relative z-10 gap-6 px-8">
          <CardTitle className="font-serif text-4xl font-bold text-primary-foreground xl:text-5xl">Welcome back</CardTitle>
          <p className="text-xl text-primary-foreground">
            Sign in to pick up this season. Clients see their file. The practice sees the desk.
          </p>
        </CardHeader>
        <CardContent className="relative z-10 mx-8 h-62 overflow-hidden rounded-2xl px-0">
          <svg
            width="1094"
            height="249"
            viewBox="0 0 1094 249"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="pointer-events-none absolute right-0 -z-1 select-none"
          >
            <path
              d="M0.263672 16.8809C0.263672 8.0443 7.42712 0.880859 16.2637 0.880859H786.394H999.115C1012.37 0.880859 1023.12 11.626 1023.12 24.8808L1023.12 47.3809C1023.12 60.6357 1033.86 71.3809 1047.12 71.3809H1069.6C1082.85 71.3809 1093.6 82.126 1093.6 95.3809L1093.6 232.881C1093.6 241.717 1086.43 248.881 1077.6 248.881H16.2637C7.42716 248.881 0.263672 241.717 0.263672 232.881V16.8809Z"
              className="fill-background/80"
            />
          </svg>
          <div className="absolute top-0 right-0 flex size-15 items-center justify-center rounded-2xl bg-background p-1">
            <Image src="/brand/logo.jpg" alt="" width={52} height={52} className="size-full rounded-xl object-cover" />
          </div>
          <div className="flex flex-col gap-5 p-6 text-foreground">
            <p className="line-clamp-2 pr-12 font-serif text-3xl font-bold">Your file is ready</p>
            <p className="line-clamp-2 text-lg">Profile, documents, the engagement letter, and Form 2848 stay with the practice.</p>
            <div className="flex items-center gap-3 self-end">
              <Image
                src="/brand/laura-wallace.jpg"
                alt="Laura Wallace"
                width={48}
                height={48}
                className="size-12 rounded-full object-cover ring-2 ring-background"
              />
              <div className="text-sm">
                <p className="font-medium">Laura Wallace, EA</p>
                <p className="text-muted-foreground">Enrolled Agent</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
