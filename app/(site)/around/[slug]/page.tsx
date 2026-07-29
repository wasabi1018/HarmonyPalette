import { permanentRedirect } from "next/navigation";

export default function AroundDetailPage() {
  permanentRedirect("/articles");
}
