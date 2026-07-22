import { Footer } from "./footer";
import { Header } from "./header";
import { MobileNav } from "./mobile-nav";

export function SiteShell({ children }: { children: React.ReactNode }) {
  return <><Header /><main className="pb-24 lg:pb-0">{children}</main><Footer /><MobileNav /></>;
}
