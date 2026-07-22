import Image from "next/image";
import type { Character } from "@/data/types";

export function CharacterAvatar({ character, size = "md", showImage = false }: { character: Character; size?: "sm" | "md" | "lg"; showImage?: boolean }) {
  const sizes = { sm: "h-10 w-10 text-sm", md: "h-14 w-14 text-lg", lg: "h-20 w-20 text-2xl" };
  return <div className={`${sizes[size]} relative shrink-0 overflow-hidden rounded-[28%] border-4 border-white shadow-soft`} style={{ backgroundColor: character.themeColor }} aria-label={`${character.name}のプレースホルダー`}>
    {showImage ? <Image src={character.image} alt={`${character.name}のプレースホルダー画像`} fill className="object-cover" sizes="80px" /> : <span className="absolute inset-0 grid place-items-center font-display font-bold text-white drop-shadow-sm">{character.name.slice(0, 1)}</span>}
  </div>;
}
