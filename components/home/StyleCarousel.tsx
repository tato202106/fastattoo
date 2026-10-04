import Link from "next/link";
import { Picture } from "@/components/ui/Picture";
import { artAsset } from "@/lib/store/demo";
import { STYLES } from "@/lib/styles";

/** Cartes de styles scrollables horizontalement (SPEC §5). */
export function StyleCarousel() {
  return (
    <ul className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0">
      {STYLES.map((s, i) => (
        <li key={s.slug} className="w-[38%] shrink-0 snap-start sm:w-[28%] lg:w-auto">
          <Link href={`/explorer?styles=${s.slug}`} className="tap group relative block aspect-[3/4] overflow-hidden rounded-2xl">
            <Picture image={artAsset(s.slug, 9000 + i * 7, `Style ${s.label}`)} usage="list" fill sizes="(min-width: 1024px) 220px, 40vw" />
            <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <span className="absolute inset-x-3 bottom-3 text-white">
              <span className="block text-[15px] leading-tight font-semibold">{s.label}</span>
              <span className="mt-0.5 block text-[11px] leading-tight opacity-80">{s.description}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
