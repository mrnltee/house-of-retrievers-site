import { cleanCustomQuestions } from "../../../lib/customQuestions.mjs";

/** The event's own Yes / No questions on admin Add / Edit registration. Optional here: an admin may not know the answer. */
export default function CustomAnswerFields({ config, answers = {} }) {
  const questions = cleanCustomQuestions(config?.questions);
  if (!questions.length) return null;
  return (
    <>
      <input type="hidden" name="customAnswersSent" value="1" />
      {questions.map((q) => {
        const current = answers?.[q.id] === true ? "yes" : answers?.[q.id] === false ? "no" : "";
        return (
          <label key={q.id} className="field"><span>{q.label} <small>Optional for admins</small></span>
            <select name={`custom_${q.id}`} defaultValue={current}>
              <option value="">Not answered</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
        );
      })}
    </>
  );
}
