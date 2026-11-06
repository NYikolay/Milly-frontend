import logoIcon from "~/assets/icons/Logo.svg";

export interface HomeHeaderProps {
  greeting: string;
}

export function HomeHeader({ greeting }: HomeHeaderProps) {
  return (
    <header className="flex flex-col items-center gap-[5px] pb-[15px] pt-[15px]">
      <img alt="" className="size-[50px]" src={logoIcon} />
      <h1 className="text-center text-[24px] font-bold leading-[29px] tracking-[-0.8px] text-app-text">
        {greeting}
      </h1>
    </header>
  );
}
