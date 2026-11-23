import {
  BookOpenText, Camera, CalendarDays, ClipboardList, Dog, FileText, Handshake, HeartHandshake, Images, LayoutDashboard,
  LifeBuoy, Mail, MessagesSquare, Milestone, Newspaper, ScanLine, ScrollText, ShieldCheck, SquarePen, UserCog, Users, Wallet,
} from "lucide-react";

/**
 * One lucide icon per sidebar item (owner, 23 Nov 2026), keyed like the sidebar's GROUPS in layout.jsx:
 * a PAGES key, or the key given to an item that isn't a page yet. With the sidebar collapsed the icon is
 * all that shows, so each one must stay distinct; `navIcons.test.mjs` checks every sidebar item has one.
 */
export const NAV_ICONS = {
  dashboard: LayoutDashboard,
  events: CalendarDays,
  registrations: ClipboardList,
  checkin: ScanLine,
  people: Users,
  supporters: Handshake,
  beneficiaries: HeartHandshake,
  gallery: Images,
  forms: FileText,
  media: Newspaper,
  photographers: Camera,
  content: SquarePen,
  payments: Wallet,
  ledger: BookOpenText,
  emails: Mail,
  letters: ScrollText,
  journey: Milestone,
  breeds: Dog,
  privacy: ShieldCheck,
  admins: UserCog,
  chat: MessagesSquare,
  start: LifeBuoy,
};
