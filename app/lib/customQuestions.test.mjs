import test from "node:test";
import assert from "node:assert/strict";
import { answerText, cleanCustomQuestions, readCustomAnswers } from "./customQuestions.mjs";

test("cleanCustomQuestions keeps up to 10 labelled yes/no questions with stable ids", () => {
  const out = cleanCustomQuestions([{ id: "novotel", label: "  Interested in checking in at   Novotel? ", showInTable: true }, { label: "" }, { id: "BAD id!", label: "Parking?" }]);
  assert.equal(out.length, 2);
  assert.deepEqual(out[0], { id: "novotel", label: "Interested in checking in at Novotel?", showInTable: true });
  assert.match(out[1].id, /^[a-z0-9]{1,16}$/);
  assert.equal(out[1].showInTable, false);
  assert.equal(cleanCustomQuestions(Array.from({ length: 12 }, (_, i) => ({ id: `q${i}`, label: `Q${i}` }))).length, 10);
  assert.deepEqual(cleanCustomQuestions("nope"), []);
  const dup = cleanCustomQuestions([{ id: "a", label: "One" }, { id: "a", label: "Two" }]);
  assert.notEqual(dup[0].id, dup[1].id);
});

test("readCustomAnswers requires a yes or no for every question", () => {
  const qs = [{ id: "novotel", label: "Novotel?" }, { id: "park", label: "Parking?" }];
  assert.deepEqual(readCustomAnswers(qs, { novotel: "yes", park: "no", extra: "yes" }), { value: { novotel: true, park: false } });
  assert.match(readCustomAnswers(qs, { novotel: "yes" }).error, /Parking\?/);
  assert.deepEqual(readCustomAnswers([], undefined), { value: null });
});

test("answerText", () => {
  assert.equal(answerText(true), "Yes");
  assert.equal(answerText(false), "No");
  assert.equal(answerText(undefined), "");
});
