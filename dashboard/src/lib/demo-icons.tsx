// Small stroke icons for dashboard demos (24px grid, currentColor). Decorative: aria-hidden.
import type * as React from "react";

type GlyphProps = React.SVGProps<SVGSVGElement> & { filled?: boolean };

function glyph(paths: string[], { fillable = false }: { fillable?: boolean } = {}) {
  return function Glyph({ filled = false, className = "size-4", ...props }: GlyphProps) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill={fillable && filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        className={className}
        {...props}
      >
        {paths.map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    );
  };
}

export const AlignLeftIcon = glyph(["M4 6h16", "M4 12h10", "M4 18h13"]);
export const AlignCenterIcon = glyph(["M4 6h16", "M7 12h10", "M5.5 18h13"]);
export const AlignRightIcon = glyph(["M4 6h16", "M10 12h10", "M7 18h13"]);
export const AlignJustifyIcon = glyph(["M4 6h16", "M4 12h16", "M4 18h16"]);
export const BoldIcon = glyph(["M7 5h6a3.5 3.5 0 0 1 0 7H7z", "M7 12h7a3.5 3.5 0 0 1 0 7H7z"]);
export const ItalicIcon = glyph(["M14 5h-4", "M14 19h-4", "M14 5l-4 14"]);
export const UnderlineIcon = glyph(["M7 4v7a5 5 0 0 0 10 0V4", "M5 20h14"]);
export const StrikeIcon = glyph(["M5 12h14", "M16 6.5A4 3 0 0 0 12 5c-2.5 0-4 1.3-4 3 0 1.2.8 2.2 2.4 2.8", "M8 17.5A4 3 0 0 0 12 19c2.5 0 4-1.3 4-3 0-.6-.2-1.2-.6-1.7"]);
export const GridIcon = glyph(["M4 4h7v7H4z", "M13 4h7v7h-7z", "M4 13h7v7H4z", "M13 13h7v7h-7z"]);
export const ListIcon = glyph(["M9 6h11", "M9 12h11", "M9 18h11", "M4.5 6h.01", "M4.5 12h.01", "M4.5 18h.01"]);
export const BoardIcon = glyph(["M4 4h4.5v16H4z", "M10 4h4.5v10H10z", "M16 4h4v6.5h-4z"]);
export const BookmarkIcon = glyph(["M6 4h12v16l-6-4-6 4z"], { fillable: true });
export const StarGlyph = glyph(["M12 3.5l2.6 5.3 5.9.9-4.25 4.1 1 5.85L12 16.9l-5.25 2.75 1-5.85L3.5 9.7l5.9-.9z"], { fillable: true });
export const BellIcon = glyph(["M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z", "M10 20.5a2 2 0 0 0 4 0"]);
export const BellOffIcon = glyph(["M6 16V11a6 6 0 0 1 9.4-4.9", "M18 11v5l1.5 2H8", "M10 20.5a2 2 0 0 0 4 0", "M4 4l16 16"]);
export const GlobeIcon = glyph(["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z", "M3 12h18", "M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"]);
export const ClockIcon = glyph(["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z", "M12 7.5V12l3 2"]);
export const ZapIcon = glyph(["M13 3L5 13.5h6L10.5 21 19 10.5h-6z"]);
export const SparkIcon = glyph(["M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z", "M19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z"]);
export const BrainIcon = glyph(["M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 0V5.5A1.5 1.5 0 0 0 10.5 4z", "M15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 0"]);
export const SearchIcon = glyph(["M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z", "M20 20l-3.5-3.5"]);
export const PinIcon = glyph(["M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z", "M12 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"]);
export const UserIcon = glyph(["M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z", "M4.5 20a7.5 7.5 0 0 1 15 0"]);
export const CodeIcon = glyph(["M8 7l-5 5 5 5", "M16 7l5 5-5 5"]);
export const EyeIcon = glyph(["M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z", "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"]);
export const HomeIcon = glyph(["M3 11 12 4l9 7", "M5 10v10h14V10", "M10 20v-6h4v6"]);
export const FolderIcon = glyph(["M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"], { fillable: true });
export const FileIcon = glyph(["M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z", "M14 3v5h5"]);
export const SlidersIcon = glyph(["M4 7h9", "M17 7h3", "M15 5v4", "M4 17h3", "M11 17h9", "M9 15v4"]);
export const InboxIcon = glyph(["M3 13h5l1.5 3h5L16 13h5", "M5.5 5h13L21 13v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5z"]);
export const UsersIcon = glyph([
  "M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20",
  "M10 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7",
  "M20 20v-1.5a3.5 3.5 0 0 0-2.5-3.35",
  "M15.5 4.65a3.5 3.5 0 0 1 0 6.7",
]);
export const ChartIcon = glyph(["M3 21h18", "M6 17v-6", "M11 17V5", "M16 17v-9", "M21 17v-3"]);
export const TrashIcon = glyph(["M4 7h16", "M10 11v6", "M14 11v6", "M6 7l1 13h10l1-13", "M9 7V4h6v3"]);
export const CopyGlyph = glyph(["M9 9h11v11H9z", "M5 15H4V4h11v1"]);
export const ScissorsIcon = glyph([
  "M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6",
  "M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6",
  "M8.1 7.9 20 18",
  "M8.1 16.1 20 6",
]);
export const PencilIcon = glyph(["M4 20h4L19 9l-4-4L4 16z", "M13.5 6.5l4 4"]);
export const LinkIcon = glyph([
  "M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1",
  "M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1",
]);
export const ImageIcon = glyph(["M4 5h16v14H4z", "M4 16l4.5-4.5 3.5 3.5 2.5-2.5L20 18", "M16 10a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0"]);
export const LayersIcon = glyph(["M12 3 2 8l10 5 10-5z", "M2 13l10 5 10-5"]);
export const SendIcon = glyph(["M21 3 10 14", "M21 3l-7 18-4-7-7-4z"]);
export const ArchiveIcon = glyph(["M3 4h18v4H3z", "M5 8v12h14V8", "M10 12h4"]);
export const HelpIcon = glyph([
  "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18",
  "M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6",
  "M12 17.5v.01",
]);
export const PlusGlyph = glyph(["M12 5v14", "M5 12h14"]);
export const DownloadIcon = glyph(["M12 4v11", "M7 10l5 5 5-5", "M5 20h14"]);
export const CreditCardIcon = glyph(["M3 6h18v12H3z", "M3 10h18", "M7 15h3"]);
export const LogOutIcon = glyph(["M15 4h4v16h-4", "M10 8l-4 4 4 4", "M6 12h11"]);
export const RefreshIcon = glyph([
  "M20 11a8 8 0 0 0-14.6-4.5L4 8",
  "M4 4v4h4",
  "M4 13a8 8 0 0 0 14.6 4.5L20 16",
  "M20 20v-4h-4",
]);
export const HeartIcon = glyph(["M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20z"], { fillable: true });
export const ArrowRightIcon = glyph(["M5 12h14", "M13 6l6 6-6 6"]);
export const FlipIcon = glyph(["M4 12a8 8 0 0 1 13.7-5.6L20 9", "M20 4v5h-5", "M20 12a8 8 0 0 1-13.7 5.6L4 15", "M4 20v-5h5"]);
export const ShieldIcon = glyph(["M12 3l7.5 3v5.5c0 4.6-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.9-7.5-9.5V6z", "M9 12l2 2 4-4"]);
export const LockIcon = glyph(["M6 11h12v9H6z", "M8.5 11V8a3.5 3.5 0 0 1 7 0v3"]);
export const CheckGlyph = glyph(["M5 12.5l4.5 4.5L19 7.5"]);
export const MailIcon = glyph(["M4 6h16v12H4z", "M4 7l8 6 8-6"]);
export const GiftIcon = glyph(["M4 10h16v10H4z", "M3 7h18v3H3z", "M12 7v13", "M12 7c-1.5-3-5-3.2-5-1s3 1 5 1c2 0 5 1.2 5-1s-3.5-2-5 1"]);
