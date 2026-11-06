import brandGithubIcon from "~/assets/icons/projects-icons/brand-github.svg?no-inline";
import brandYoutubeIcon from "~/assets/icons/projects-icons/brand-youtube.svg?no-inline";
import briefcaseBusinessIcon from "~/assets/icons/projects-icons/briefcase-business.svg?no-inline";
import buildingSkyscraperIcon from "~/assets/icons/projects-icons/building-skyscraper.svg?no-inline";
import buildingStoreIcon from "~/assets/icons/projects-icons/building-store.svg?no-inline";
import bulbIcon from "~/assets/icons/projects-icons/bulb.svg?no-inline";
import deviceMobileIcon from "~/assets/icons/projects-icons/device-mobile.svg?no-inline";
import flameIcon from "~/assets/icons/projects-icons/flame.svg?no-inline";
import homeIcon from "~/assets/icons/projects-icons/home.svg?no-inline";
import leafIcon from "~/assets/icons/projects-icons/leaf.svg?no-inline";
import listDetailsIcon from "~/assets/icons/projects-icons/list-details.svg?no-inline";
import noProjectIcon from "~/assets/icons/projects-icons/no-project.svg?no-inline";
import paletteIcon from "~/assets/icons/projects-icons/palette.svg?no-inline";
import phoneIcon from "~/assets/icons/projects-icons/phone.svg?no-inline";
import photoIcon from "~/assets/icons/projects-icons/photo.svg?no-inline";
import rocketIcon from "~/assets/icons/projects-icons/rocket.svg?no-inline";
import snailIcon from "~/assets/icons/projects-icons/snail.svg?no-inline";
import targetArrowIcon from "~/assets/icons/projects-icons/target-arrow.svg?no-inline";

const PROJECT_ICONS: Readonly<Record<string, string>> = {
  "brand-github": brandGithubIcon,
  "brand-youtube": brandYoutubeIcon,
  "briefcase-business": briefcaseBusinessIcon,
  "building-skyscraper": buildingSkyscraperIcon,
  "building-store": buildingStoreIcon,
  bulb: bulbIcon,
  "device-mobile": deviceMobileIcon,
  flame: flameIcon,
  home: homeIcon,
  leaf: leafIcon,
  "list-details": listDetailsIcon,
  "no-project": noProjectIcon,
  palette: paletteIcon,
  phone: phoneIcon,
  photo: photoIcon,
  rocket: rocketIcon,
  snail: snailIcon,
  "target-arrow": targetArrowIcon,
};

export function getProjectIcon(icon: string | null): string {
  if (
    icon !== null &&
    Object.prototype.hasOwnProperty.call(PROJECT_ICONS, icon)
  ) {
    return PROJECT_ICONS[icon];
  }

  return PROJECT_ICONS["no-project"];
}
