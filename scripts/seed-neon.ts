import process from "node:process";
import { neon } from "@neondatabase/serverless";
import { getSeedArtists } from "../lib/data/seed";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("❌ DATABASE_URL est introuvable dans le fichier .env");
    process.exit(1);
  }
  const sql = neon(url);
  const artists = getSeedArtists();

  const artistRows = artists.map((a) => ({
    id: a.id,
    slug: a.slug,
    name: a.name,
    title: a.title,
    city: a.city,
    city_slug: a.citySlug,
    studio: a.studio,
    address: a.address,
    lat: a.lat,
    lng: a.lng,
    rating: a.rating,
    review_count: a.reviewCount,
    verified: a.verified,
    styles: a.styles,
    price_from: a.priceFrom,
    hourly_rate: a.hourlyRate,
    bio: a.bio,
    avatar: a.avatar,
    cover: a.cover,
    instagram: a.instagram ?? null,
    promoted: a.promoted ?? false,
  }));
  const portfolioRows = artists.flatMap((a) =>
    a.portfolio.map((p, i) => ({
      id: p.id,
      artist_id: a.id,
      position: i,
      base: p.base,
      width: p.width,
      height: p.height,
      color: p.color,
      alt: p.alt,
      style: p.style,
      zone: p.zone,
    })),
  );
  const reviewRows = artists.flatMap((a) =>
    a.reviews.map((r) => ({
      id: r.id,
      artist_id: a.id,
      author: r.author,
      rating: r.rating,
      date: r.date,
      text: r.text,
      style: r.style ?? null,
    })),
  );
  const slotRows = artists.flatMap((a) =>
    a.nextSlots.map((s) => ({ artist_id: a.id, date: s.date, time: s.time })),
  );

  console.log("Suppression des anciennes données…");
  await sql`DELETE FROM artists`;

  console.log("Envoi des données vers Neon…");
  await sql`INSERT INTO artists
    SELECT * FROM json_populate_recordset(null::artists, ${JSON.stringify(artistRows)}::json)`;
  await sql`INSERT INTO portfolio_items
    SELECT * FROM json_populate_recordset(null::portfolio_items, ${JSON.stringify(portfolioRows)}::json)`;
  await sql`INSERT INTO reviews
    SELECT * FROM json_populate_recordset(null::reviews, ${JSON.stringify(reviewRows)}::json)`;
  await sql`INSERT INTO slots
    SELECT * FROM json_populate_recordset(null::slots, ${JSON.stringify(slotRows)}::json)
    ON CONFLICT DO NOTHING`;

  console.log(
    `✅ Terminé : ${artistRows.length} tatoueurs, ${portfolioRows.length} photos, ` +
      `${reviewRows.length} avis, ${slotRows.length} créneaux.`,
  );
}

main().catch((err) => {
  console.error("❌ Erreur :", err);
  process.exit(1);
});