import { permanentRedirect } from "next/navigation";

export default function AroundPage() {
  permanentRedirect("/articles");
}
