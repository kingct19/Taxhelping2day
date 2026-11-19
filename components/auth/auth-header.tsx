import Image from "next/image";
import Link from "next/link";
import { firm } from "@/lib/firm";

export function AuthHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col gap-6">
      <Link href="/" className="flex w-fit items-center gap-3">
        <Image src="/brand/logo.jpg" alt="" width={40} height={40} className="size-10 rounded-full object-cover" />
        <span className="font-serif text-lg">{firm.name}</span>
      </Link>
      <div className="flex flex-col gap-2">
        <h1 className="font-serif text-2xl font-semibold">{title}</h1>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}
