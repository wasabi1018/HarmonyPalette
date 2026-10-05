import { createRoot } from "react-dom/client";
import { InstagramSessionProvider } from "../../components/admin/instagram-session-provider";
import { HomepageSettingsForm } from "../../components/admin/homepage-settings-form";
import { HomepageGuideCards } from "../../components/homepage-guide-cards";
import type { HomepageGuideCard } from "../../lib/homepage-guide-cards";

const cards = JSON.parse(document.getElementById("settings")!.textContent!) as HomepageGuideCard[];
createRoot(document.getElementById("root")!).render(
  <InstagramSessionProvider>
    <main className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6">
      <p className="mb-4 text-sm text-ink/65">ローカル確認用・本番設定への保存なし</p>
      {location.pathname === "/admin/homepage" ? <>
        <h1 className="mb-5 text-2xl font-black text-ink">TOPページ設定</h1>
        <HomepageSettingsForm initialCards={cards} />
      </> : <>
        <h1 className="mb-5 text-2xl font-black text-ink">来園に役立つガイド</h1>
        <HomepageGuideCards cards={cards} />
      </>}
    </main>
  </InstagramSessionProvider>
);
