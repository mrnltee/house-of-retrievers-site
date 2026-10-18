import { sql } from "../../../lib/db";
import { pageAdmin } from "../../../lib/admin/guard";
import { BREEDS, breedIcon } from "../../../lib/breeds.mjs";
import { resetBreedIcon } from "../../breedActions";
import ConfirmButton from "../ConfirmButton";
import { Flash, NotAllowed, PageHead, formatWhen } from "../ui";
import BreedIconField from "./BreedIconField";

export const dynamic = "force-dynamic";

/** Every breed with its icon; HOR can upload its own in place of the built-in one. */
export default async function BreedIconsPage({ searchParams }) {
  const query = await searchParams;
  const { allowed } = await pageAdmin("events:edit");
  if (!allowed) return <NotAllowed />;
  const custom = new Map((await sql("SELECT key, updated_by, updated_at FROM breed_icons")).map((r) => [r.key, r]));
  return (
    <>
      <PageHead title="Breed icons" lead="The icons people see when they pick a breed on the RSVP and Join form, and next to furbabies in the admin." />
      <Flash params={query} />
      <section className="banner note small">
        <span>
          <strong>Your own icon:</strong> square, transparent background, head only and centred, with a little space around it (about 4 px at 64 px). <strong>SVG</strong> works best (any square viewBox, like 0 0 64 64), or a <strong>256 × 256 px PNG or WebP</strong>. Up to <strong>100 KB</strong>. Check it still reads at 24–32 px, the size in the dropdown. Plain drawings only: SVGs with scripts, links or embedded pictures are refused.
        </span>
      </section>
      <div className="table-wrap">
        <table className="breed-icons-table">
          <thead><tr><th>Icon</th><th>Breed</th><th>Source</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
          <tbody>
            {BREEDS.filter((b) => b.icon).map((breed) => {
              const mine = custom.get(breed.key);
              const v = mine ? new Date(mine.updated_at).getTime() : "default";
              return (
                <tr key={breed.key}>
                  <td><img src={`${breedIcon(breed.key)}?v=${v}`} alt="" width={40} height={40} /></td>
                  <td className="strong">{breed.label}</td>
                  <td className="small">{mine ? <>Uploaded by {mine.updated_by} · {formatWhen(mine.updated_at)}</> : <span className="muted">Built-in</span>}</td>
                  <td>
                    <div className="actions">
                      <BreedIconField breedKey={breed.key} label={breed.label} />
                      {mine && (
                        <form action={resetBreedIcon}>
                          <input type="hidden" name="key" value={breed.key} />
                          <ConfirmButton className="linkish" title={`Go back to the built-in ${breed.label} icon?`} items={["Your uploaded icon is removed", "The built-in icon shows everywhere again"]} yes="Yes, go back" tone="ghost">Use built-in</ConfirmButton>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
