import Link from "next/link";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/subscriptions", label: "Subscriptions" }
];

export function Nav() {
  return (
    <header className="border-b border-white/10">
      <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-4">
        <span className="font-semibold tracking-tight">Subly</span>
        <div className="flex gap-5 text-sm">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-neutral-400 hover:text-white">
              {l.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
