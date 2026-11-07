import bookIcon from "~/assets/icons/projects-icons/book.svg?no-inline";
import bookmarkIcon from "~/assets/icons/projects-icons/bookmark.svg?no-inline";
import briefcaseIcon from "~/assets/icons/projects-icons/briefcase.svg?no-inline";
import cakeIcon from "~/assets/icons/projects-icons/cake.svg?no-inline";
import calendarIcon from "~/assets/icons/projects-icons/calendar.svg?no-inline";
import campfireIcon from "~/assets/icons/projects-icons/campfire.svg?no-inline";
import cashBanknoteIcon from "~/assets/icons/projects-icons/cash-banknote.svg?no-inline";
import creditCardIcon from "~/assets/icons/projects-icons/credit-card.svg?no-inline";
import deviceDesktopIcon from "~/assets/icons/projects-icons/device-desktop.svg?no-inline";
import fileIcon from "~/assets/icons/projects-icons/file.svg?no-inline";
import fileMusicIcon from "~/assets/icons/projects-icons/file-music.svg?no-inline";
import flameIcon from "~/assets/icons/projects-icons/flame.svg?no-inline";
import giftIcon from "~/assets/icons/projects-icons/gift.svg?no-inline";
import listIcon from "~/assets/icons/projects-icons/list.svg?no-inline";
import messageCircleIcon from "~/assets/icons/projects-icons/message-circle.svg?no-inline";
import moonIcon from "~/assets/icons/projects-icons/moon.svg?no-inline";
import noProjectIcon from "~/assets/icons/projects-icons/no-project.svg?no-inline";
import paletteIcon from "~/assets/icons/projects-icons/palette.svg?no-inline";
import pillIcon from "~/assets/icons/projects-icons/pill.svg?no-inline";
import planeIcon from "~/assets/icons/projects-icons/plane.svg?no-inline";
import schoolIcon from "~/assets/icons/projects-icons/school.svg?no-inline";
import sunIcon from "~/assets/icons/projects-icons/sun.svg?no-inline";

export const NO_PROJECT_ICON: string = noProjectIcon;

const PROJECT_ICONS: Readonly<Record<string, string>> = {
  book: bookIcon,
  bookmark: bookmarkIcon,
  briefcase: briefcaseIcon,
  cake: cakeIcon,
  calendar: calendarIcon,
  campfire: campfireIcon,
  "cash-banknote": cashBanknoteIcon,
  "credit-card": creditCardIcon,
  "device-desktop": deviceDesktopIcon,
  file: fileIcon,
  "file-music": fileMusicIcon,
  flame: flameIcon,
  gift: giftIcon,
  list: listIcon,
  "message-circle": messageCircleIcon,
  moon: moonIcon,
  palette: paletteIcon,
  pill: pillIcon,
  plane: planeIcon,
  school: schoolIcon,
  sun: sunIcon,
};

export function getProjectIcon(icon: string | null): string {
  if (icon !== null && Object.hasOwn(PROJECT_ICONS, icon)) {
    return PROJECT_ICONS[icon];
  }

  return PROJECT_ICONS.file;
}
