/**
 * The media hub's "Stories worth sharing" (/media#stories): each card opens the
 * full story in a window (app/media/StoryCards.jsx).
 *
 * Every detail comes from what HoR has already published (the journey timeline,
 * its photo descriptions, the boilerplates and the beneficiary blurbs). Nothing
 * here adds names, numbers, amounts or quotes. `confirm` lists what HoR could add
 * once it has checked it. While STORIES_APPROVED is false the window shows the
 * "Draft for approval" tag, like the boilerplates.
 *
 * Cards follow the Stories lines saved in Admin → Media hub: a line that names a
 * story (`match`) becomes that story's card; stories no line names are added after.
 */

export const STORIES_APPROVED = false;

/**
 * @typedef {Object} MediaStory
 * @property {string} key
 * @property {RegExp} match     Finds the Admin → Media hub Stories line about it.
 * @property {string} title
 * @property {string} meta      Date · place, as the card's small line.
 * @property {string} summary   The card's line when no saved line names it.
 * @property {string} [beneficiary]
 * @property {{src: string, alt: string}[]} photos
 * @property {string[]} paragraphs
 * @property {string[]} confirm What HoR should confirm before adding more detail.
 */

/** @type {MediaStory[]} */
export const MEDIA_STORIES = [
  {
    key: "pawres-de-mayo",
    match: /pawres/i,
    title: "Pawres de Mayo",
    meta: "17 May 2026 · Parklinks Pet Park, Pasig",
    summary: "Our first gathering, for MBY Pet Rescue and Sanctuary.",
    beneficiary: "MBY Pet Rescue and Sanctuary",
    photos: [
      { src: "/journey/pawres-de-mayo/3.jpg", alt: "Members and their golden retrievers gathered on the lawn for a group photo" },
      { src: "/journey/pawres-de-mayo/2.jpg", alt: "Two golden retrievers in party dresses grinning at the camera" },
      { src: "/journey/pawres-de-mayo/5.jpg", alt: "The pack lined up under the tents with their dogs in costume" },
    ],
    paragraphs: [
      "It started with a group chat. A few retriever families wanted to plan a doggie run, a simple reason to let their dogs play together. Somewhere between the messages, the plan found a purpose.",
      "On 17 May 2026 the run became Pawres de Mayo at Parklinks Pet Park in Pasig. Dogs came in party dresses and costumes, families lined up under the tents, and everyone squeezed onto the lawn for the group photo. The day was held for MBY Pet Rescue and Sanctuary, a rescue and sanctuary for animals in need.",
      "It was our first Purpose to Celebrate, and the day we learned that a happy afternoon with our own dogs could also look after the dogs still waiting for someone. Afterwards we published a breakdown of what was turned over to MBY. That became a habit we keep: every activity names its beneficiary before it starts.",
      "Pawres de Mayo is where the House of Retrievers began. By September, the families from that group chat were a registered nonprofit.",
    ],
    confirm: [
      "How much was turned over to MBY, and whether to name the amount here",
      "How many families and dogs came",
      "What MBY used the support for, and a line from MBY if they are happy to give one",
    ],
  },
  {
    key: "milagros",
    match: /milagros/i,
    title: "Care and companionship at Milagros",
    meta: "August 2026 · Milagros Elderly Home Care and Services",
    summary: "Our retrievers spent time with the residents of Milagros.",
    beneficiary: "Milagros Elderly Home Care and Services",
    photos: [
      { src: "/journey/milagros-elderly-shelter/4.jpg", alt: "A resident in a wheelchair reaching down to pet a golden retriever" },
      { src: "/journey/milagros-elderly-shelter/5.jpg", alt: "A caregiver kneeling beside a resident as a golden retriever rests its head on his lap" },
      { src: "/journey/milagros-elderly-shelter/2.jpg", alt: "Staff, members and golden retrievers together for a group photo at Milagros" },
    ],
    paragraphs: [
      "Some of our days are loud and joyful. This one was quiet, and that was the point.",
      "In August 2026, a week after our embroidery class, five of our golden retrievers visited Milagros Elderly Home Care and Services: Dog-tor (Dr.) Dallas, Macchiato, Faye, Molly and Maverick. Maverick was still a small puppy, so he stayed in his stroller and greeted everyone from there.",
      "Around five to eight elders live at Milagros, some of them bedridden. The dogs, most of them in red bandanas, went from chair to chair. Residents reached down from their wheelchairs to run a hand through soft fur. One retriever rested its head on a resident’s lap while a caregiver knelt beside them.",
      "We planned the visit around care and companionship, not therapy. We didn’t come to fix anything. We came to sit with people for a while and share the quiet comfort a dog’s company brings.",
      "Before we left, the Milagros team gave us a certificate of appreciation. We went home with something bigger: the reminder that Purpose to Care can be as simple as showing up.",
    ],
    confirm: [
      "The exact date of the visit",
    ],
  },
  {
    key: "beagle-buddies",
    match: /beagle/i,
    title: "Two communities, one walk",
    meta: "23 August 2026 · Ayala Triangle, Makati",
    summary: "A pack walk with Beagle Buddies PH, our first collaboration with another dog community.",
    photos: [
      { src: "/journey/beagle-buddies-pack-walk/1.jpg", alt: "Walkers and their dogs filling the road at Ayala Avenue" },
      { src: "/journey/beagle-buddies-pack-walk/5.jpg", alt: "Walkers carrying the Beagle Buddies PH flag with beagles on leash" },
      { src: "/journey/beagle-buddies-pack-walk/4.jpg", alt: "A golden retriever in a pink cap walking ahead of the House of Retrievers banner" },
    ],
    paragraphs: [
      "Retrievers and beagles don’t usually walk in the same pack. On 23 August 2026, they did.",
      "We joined Beagle Buddies PH for a community pack walk at Ayala Triangle in Makati. Beagles trotted beside owners in matching shirts behind the Beagle Buddies PH flag. A golden retriever in a pink cap walked ahead of the House of Retrievers banner. Around 20 to 40 dogs came, and for a stretch they and their walkers filled the road along Ayala Avenue.",
      "It was our first collaboration with another dog community, and it showed us something we want to keep doing: dog groups working together instead of competing. Different breeds, different clubs, the same love for the dog at the end of the leash.",
      "After the walk, beagles and their people stayed on the sidewalk to meet everyone, the way new friends do.",
    ],
    confirm: [
      "How many people walked, if HoR would like to add it",
    ],
  },
  {
    key: "free-hugs",
    match: /hugs/i,
    title: "Free hugs, every month",
    meta: "Last Sunday of every month · Near Specific Gravity, BGC",
    summary: "Free hugs from our golden retrievers.",
    photos: [
      { src: "/journey/international-free-hugs-day/1.jpg", alt: "Members and their golden retrievers sitting in a circle on the lawn at BGC with Free Hugs signs" },
      { src: "/journey/freehugs-bgc/1.jpg", alt: "Two visitors crouching on the grass to hug a golden retriever" },
      { src: "/journey/freehugs-bgc/5.jpg", alt: "A child reaching out to a happy golden retriever" },
    ],
    paragraphs: [
      "Free hugs: just a dog who is happy to see you, and a person who needed that today.",
      "It began with International Free Hugs Day in July 2026. Our members sat in a circle on the lawn at BGC with their golden retrievers and their Free Hugs signs, and waited to see who would come. People did. Passers-by stopped to take photos, then crouched down to say hello. That late afternoon is where our Purpose to Care began.",
      "In September we went back, and we kept going back. FreeHugs now happens on the last Sunday of every month in BGC, near Specific Gravity. Children reach out to a retriever for the first time. A boy sits on a bench beside a dog wearing a Free Hugs sign. Strangers kneel on the grass and, for a minute, forget about their week.",
      "If you are in BGC on the last Sunday of the month, look for us near Specific Gravity and come say hello. You are welcome to bring your own dog, too: it’s a gentle way for them to meet new people and new dogs. And bring someone who could use a hug.",
    ],
    confirm: [
      "The usual time",
      "That it has run every month since September, and whether any month is skipped (29 November is the day before the launch)",
    ],
  },
];

/**
 * The cards to show, in the order of the saved Stories lines.
 * @param {string[]} lines The Stories lines from Admin → Media hub (or the built-in ones).
 * Stories are passed without `match` and `confirm`, so they can go to the client.
 * @returns {{story: Omit<MediaStory, "match" | "confirm"> | null, title: string, text: string}[]}
 */
export function storyCards(lines) {
  const used = new Set();
  const cards = (lines || []).map((line) => {
    const story = MEDIA_STORIES.find((s) => !used.has(s.key) && s.match.test(line)) || null;
    if (story) used.add(story.key);
    return { story: story && forClient(story), title: story?.title || "", text: String(line || "") };
  });
  for (const story of MEDIA_STORIES) {
    if (!used.has(story.key)) cards.push({ story: forClient(story), title: story.title, text: `${story.meta} · ${story.summary}` });
  }
  return cards;
}

function forClient({ match, confirm, ...story }) {
  return story;
}
