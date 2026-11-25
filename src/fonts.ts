import KovaDisplay from "../assets/fonts/KovaDisplay-3.ttf";
import "../assets/fonts/KovaDisplay-1.ttf";
import "../assets/fonts/KovaDisplay-2.ttf";

import WorkSans from "../assets/fonts/WorkSans-3.ttf";
import "../assets/fonts/WorkSans-1.ttf";
import "../assets/fonts/WorkSans-2.ttf";

import MaterialSymbols from "../assets/fonts/MaterialSymbols-1.woff2";

/**
 * Bundled fonts. Importing a font file registers it for the app's process
 * before the first frame; the imported value is the family name in the file.
 *
 * The display face is Fraunces (OFL), renamed to "Kova Display" so the family
 * name is unambiguous to the platform's text stack. The text face is Work Sans.
 */
export const FRAUNCES = KovaDisplay;
export const WORK_SANS = WorkSans;
export const ICON_FONT = MaterialSymbols;
