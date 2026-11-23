"use client";

import { useEffect } from "react";
import { wirePopMenus } from "../../lib/admin/popMenus.mjs";

/** Makes every <details class="pop-menu"> in the admin behave like a menu (see popMenus.mjs). Renders nothing. */
export default function PopMenus() {
  useEffect(() => wirePopMenus(document), []);
  return null;
}
