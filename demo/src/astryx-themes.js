/**
 * Nimi themes — neutral fallback plus the built Nimi brand theme.
 */

import { neutralTheme as _astryxTheme0 } from "@astryxdesign/theme-neutral/built";
import { nimiTheme as _nimiTheme } from "./theme/nimi.js";
import "@astryxdesign/theme-neutral/theme.css";
import "@astryxdesign/theme-neutral/fonts.css";
import "./theme/nimi.css";

export const themes = {
  neutral: _astryxTheme0,
  nimi: _nimiTheme,
};

export const defaultThemeSlug = "nimi";
