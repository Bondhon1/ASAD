import { ThemeSwitcher } from "@/components/ThemeSwitcher";

export default function ThemesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <ThemeSwitcher />
      {children}
    </>
  );
}
