import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, Calendar, Check, ChevronDown, ChevronLeft, ChevronRight,
  ChevronUp, Download, Heart, MapPin, Menu, PawPrint, PenLine, Play, RefreshCw, Share2, Sparkle, SquareParking, Star,
  TriangleAlert, X,
} from "lucide-react";

/**
 * The site's one icon set: lucide (owner, 16 Nov 2026), by name, so every surface (public site, events,
 * media hub, admin) draws the same strokes. Use this instead of text arrows and symbols (↗ ← ‹ ✕ ✓ ✎ …).
 * Arrows that are prose ("File → Download", "Inquiry → Talking") stay text: there the arrow means "then".
 *
 * Decorative by default (aria-hidden), since the text beside it carries the meaning. Pass `label` when the
 * icon is the only signal (an "edited" or "no email" marker): it becomes role="img" with that name.
 * `size` defaults to 1em so an inline icon follows the text it sits in.
 */
const ICONS = {
  arrow: ArrowRight,
  arrowLeft: ArrowLeft,
  arrowUp: ArrowUp,
  arrowDown: ArrowDown,
  external: ArrowUpRight,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  chevronUp: ChevronUp,
  chevronDown: ChevronDown,
  calendar: Calendar,
  check: Check,
  close: X,
  download: Download,
  edit: PenLine,
  flip: RefreshCw,
  heart: Heart,
  menu: Menu,
  parking: SquareParking,
  paw: PawPrint,
  pin: MapPin,
  play: Play,
  share: Share2,
  sparkle: Sparkle,
  star: Star,
  warning: TriangleAlert,
};

export const ICON_NAMES = Object.keys(ICONS);

export const Icon = ({ name, size = "1em", label, className }) => {
  const Glyph = ICONS[name];
  if (!Glyph) return null;
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": "true", focusable: "false" };
  return <Glyph size={size} strokeWidth={1.9} className={["icon", className].filter(Boolean).join(" ")} {...a11y} />;
};

export default Icon;
