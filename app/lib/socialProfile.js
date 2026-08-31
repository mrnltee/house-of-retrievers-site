/**
 * Turn whatever somebody types in the social field into a handle and a
 * profile link.
 *
 * People paste all of these, and each one has to end up as the same handle:
 *   @houseofretrieversph
 *   houseofretrieversph
 *   instagram.com/houseofretrieversph
 *   https://www.instagram.com/houseofretrieversph/?igsh=abc123
 */

const PLATFORMS = {
  Instagram: {
    hosts: ["instagram.com", "instagr.am"],
    url: (handle) => `https://www.instagram.com/${handle}/`,
  },
  Facebook: {
    hosts: ["facebook.com", "fb.com", "fb.me", "m.facebook.com"],
    url: (handle) => `https://www.facebook.com/${handle}`,
  },
};

/** @type {("Instagram"|"Facebook")[]} */
export const socialPlatforms = Object.keys(PLATFORMS);

/** Handles Instagram and Facebook actually allow. */
const HANDLE = /^[A-Za-z0-9._-]{1,60}$/;

/** Facebook profiles with no vanity URL: facebook.com/profile.php?id=1234567890 */
const FACEBOOK_NUMERIC = /profile\.php\?id=(\d{5,25})/i;

/** Strips protocol and www so a pasted link can be matched against a host. */
function splitUrl(value) {
  const withoutProtocol = value.replace(/^[a-z]+:\/\//i, "").replace(/^www\./i, "");
  const slash = withoutProtocol.indexOf("/");
  return slash === -1
    ? { host: withoutProtocol.toLowerCase(), path: "" }
    : { host: withoutProtocol.slice(0, slash).toLowerCase(), path: withoutProtocol.slice(slash + 1) };
}

function platformForHost(host) {
  return socialPlatforms.find((name) => PLATFORMS[name].hosts.some((h) => host === h || host.endsWith(`.${h}`)));
}

/**
 * @typedef {Object} SocialProfile
 * @property {string} handle    Bare handle, no leading "@".
 * @property {string} display   What to show and store, e.g. "@houseofretrieversph".
 * @property {string} url       Full profile URL.
 * @property {"Instagram"|"Facebook"} platform
 */

/**
 * @param {string} raw        Whatever was typed in the field.
 * @param {string} [platform] The radio choice. Ignored when the input is a link
 *                            we recognise, since a pasted URL says which site it
 *                            belongs to and guessing against it only ever
 *                            produces a broken link.
 * @returns {{ profile: SocialProfile | null, error: string | null }}
 */
export function parseSocialProfile(raw, platform) {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return { profile: null, error: null };

  const looksLikeUrl = value.includes("/") || value.includes(".");
  let chosen = socialPlatforms.includes(platform) ? platform : null;
  let handle = value;

  if (looksLikeUrl) {
    const { host, path } = splitUrl(value);
    const hostPlatform = platformForHost(host);

    if (hostPlatform) {
      const numeric = value.match(FACEBOOK_NUMERIC);
      if (hostPlatform === "Facebook" && numeric) {
        return {
          profile: {
            handle: numeric[1],
            display: `facebook.com/${numeric[1]}`,
            url: `https://www.facebook.com/profile.php?id=${numeric[1]}`,
            platform: "Facebook",
          },
          error: null,
        };
      }
      chosen = hostPlatform;
      handle = path.split(/[/?#]/)[0];
    }
  }

  handle = handle.replace(/^@+/, "").replace(/\/+$/, "").split(/[?#]/)[0];

  if (!handle) return { profile: null, error: "That profile link looks incomplete." };
  if (!HANDLE.test(handle)) {
    return { profile: null, error: "Use a handle like @yourname, or paste your profile link." };
  }
  if (!chosen) {
    return { profile: null, error: "Pick Instagram or Facebook so we know where that handle lives." };
  }

  return {
    profile: { handle, display: `@${handle}`, url: PLATFORMS[chosen].url(handle), platform: chosen },
    error: null,
  };
}
