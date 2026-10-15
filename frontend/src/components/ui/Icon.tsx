import { ICON_PATHS } from "@/lib/icons";

type Props = {
  name: string;
  size?: number;
  className?: string;
  /** Ketebalan garis SVG (default 2, seperti Lucide) */
  strokeWidth?: number;
};

/**
 * Ikon SVG inline (gaya Lucide) — diporting dari prototype.
 * Contoh: <Icon name="heart-pulse" size={20} />
 */
export default function Icon({ name, size = 20, className, strokeWidth = 2 }: Props) {
  const path = ICON_PATHS[name];
  if (!path) return null;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: path }}
    />
  );
}
