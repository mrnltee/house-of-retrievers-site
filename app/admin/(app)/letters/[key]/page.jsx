import { notFound } from "next/navigation";
import { adminBase, pageAdmin } from "../../../../lib/admin/guard";
import { loadLetter } from "../../../../lib/letterStore";
import { LETTER_STARTERS } from "../../../../lib/letters.mjs";
import { Flash, NotAllowed, PageHead } from "../../ui";
import LetterEditor from "./LetterEditor";

/** One letter's wording: name, email subject, covering email and the letter itself. */
export default async function LetterPage({ params, searchParams }) {
  const { key } = await params;
  const query = await searchParams;
  const { allowed } = await pageAdmin("letters:edit");
  if (!allowed) return <NotAllowed />;
  const letter = await loadLetter(key);
  if (!letter) notFound();
  const base = await adminBase();
  const original = LETTER_STARTERS.find((l) => l.key === key);
  return (
    <>
      <p className="small"><a href={`${base}/letters`}>← Letters</a></p>
      <PageHead title={letter.name} lead="Edit the wording. The preview fills [Company Name] with a sample company; other blanks stay highlighted until you send." />
      <Flash params={query} />
      <LetterEditor letter={letter} original={original} pdfAction={`${base}/letters/pdf`} />
    </>
  );
}
