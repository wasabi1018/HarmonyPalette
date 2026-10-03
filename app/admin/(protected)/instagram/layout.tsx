import { InstagramWorkspace } from "@/components/admin/instagram-workspace";

export default function InstagramLayout({ children }: { children: React.ReactNode }) {
  return <InstagramWorkspace>{children}</InstagramWorkspace>;
}
