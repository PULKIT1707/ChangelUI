"use client";

import { motion } from "motion/react";
import * as React from "react";
import { cn } from "../lib/cn";
import { springs } from "../lib/motion";
import { blockReset } from "../lib/styles";
import { usePrefersReducedMotion } from "../lib/use-reduced-motion";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";
export type AvatarStatus = "online" | "offline" | "busy" | "away";

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  src?: string;
  alt?: string;
  /** Initials source (max 2, uppercase) and accessible name fallback. */
  name?: string;
  /** Overrides the initials. */
  fallback?: React.ReactNode;
  /** 24 / 32 / 40 / 48 / 64 px. Default "md" (or the group's size). */
  size?: AvatarSize;
  /** Default "circle". */
  shape?: "circle" | "square";
  status?: AvatarStatus;
  /** Default: the capitalized status. */
  statusLabel?: string;
}

export interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Avatars beyond this count collapse into a "+N" avatar. */
  max?: number;
  /** Provided to every Avatar via context. Default "md". */
  size?: AvatarSize;
  /** Default "normal". */
  spacing?: "tight" | "normal";
  /**
   * Show each avatar's name through `renderTooltip`. Default true; without `renderTooltip` it has no
   * effect, so AvatarGroup does not bundle a tooltip.
   */
  tooltips?: boolean;
  /**
   * Wraps each lifted avatar with a tooltip, e.g.
   * `(avatar, name) => <Tooltip content={name}>{avatar}</Tooltip>`.
   */
  renderTooltip?: (avatar: React.ReactElement, name: string) => React.ReactNode;
  /** Accessible name of the overflow avatar. Default n => `${n} more`. */
  overflowLabel?: (count: number) => string;
}

interface AvatarGroupContextValue {
  size: AvatarSize;
}

const AvatarGroupContext = React.createContext<AvatarGroupContextValue | null>(null);

const sizes: Record<AvatarSize, string> = {
  xs: "size-6 text-[0.625rem]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-12 text-base",
  xl: "size-16 text-lg",
};
const shapes = { circle: "rounded-pui-full", square: "rounded-pui-md" } as const;
const statusColors: Record<AvatarStatus, string> = {
  online: "bg-pui-success",
  offline: "bg-pui-muted-foreground",
  busy: "bg-pui-danger",
  away: "bg-pui-warning",
};
const overlap = { tight: "-ms-3 first:ms-0", normal: "-ms-2 first:ms-0" } as const;

/** Soft two-stop tints for initials, picked by a hash of the name (tokens only). */
const tints = [
  "bg-linear-to-br from-pui-aurora-1/25 to-pui-gradient-2/25",
  "bg-linear-to-br from-pui-aurora-2/25 to-pui-aurora-1/25",
  "bg-linear-to-br from-pui-aurora-3/25 to-pui-gradient-3/25",
  "bg-linear-to-br from-pui-gradient-1/25 to-pui-aurora-2/25",
  "bg-linear-to-br from-pui-gradient-3/25 to-pui-aurora-3/25",
  "bg-linear-to-br from-pui-aurora-2/25 to-pui-gradient-2/25",
] as const;

function tintIndex(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(hash) % tints.length;
}

function initials(name: string | undefined): string {
  if (!name) return "";
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

type ImageStatus = "loading" | "loaded" | "error";

/** Image avatar with initials fallback and an optional status dot (design 7.1 #8). */
export const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(function Avatar(
  { src, alt, name, fallback, size: sizeProp, shape = "circle", status, statusLabel, className, ...props },
  ref,
) {
  const group = React.useContext(AvatarGroupContext);
  const size = sizeProp ?? group?.size ?? "md";
  const [imageStatus, setImageStatus] = React.useState<ImageStatus>("loading");
  const [prevSrc, setPrevSrc] = React.useState(src);
  if (src !== prevSrc) {
    setPrevSrc(src);
    setImageStatus("loading");
  }

  // An image cached before hydration may have loaded before onLoad was attached.
  const imgRef = React.useCallback((img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth > 0) setImageStatus("loaded");
  }, []);

  const accessibleName = alt ?? name;
  const statusText = status ? (statusLabel ?? status.charAt(0).toUpperCase() + status.slice(1)) : undefined;
  const label = accessibleName && statusText ? `${accessibleName} (${statusText})` : accessibleName;
  const showImage = src !== undefined && imageStatus !== "error";
  // Name-derived initials get a tint; a custom fallback keeps the plain muted look.
  const tint = fallback === undefined && name ? tintIndex(name) : undefined;

  return (
    <span
      ref={ref}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-size={size}
      data-shape={shape}
      data-status={imageStatus}
      {...props}
      className={cn(
        blockReset,
        "relative inline-flex shrink-0 select-none items-center justify-center bg-pui-muted align-middle font-medium text-pui-muted-foreground",
        sizes[size],
        shapes[shape],
        group && "ring-2 ring-pui-background",
        className,
      )}
    >
      {showImage ? (
        <img
          ref={imgRef}
          src={src}
          alt=""
          onLoad={() => setImageStatus("loaded")}
          onError={() => setImageStatus("error")}
          className={cn(
            blockReset,
            "block shrink-0 size-full object-cover transition-opacity duration-(--pui-duration-slow) ease-pui-out",
            shapes[shape],
            imageStatus === "loaded" ? "opacity-100" : "opacity-0",
          )}
        />
      ) : null}
      {imageStatus !== "loaded" || !showImage ? (
        <span
          aria-hidden="true"
          data-pui-avatar-fallback=""
          data-tint={tint}
          className={cn(
            blockReset,
            "absolute inset-0 flex items-center justify-center overflow-hidden",
            tint !== undefined && [tints[tint], "text-pui-foreground"],
            shapes[shape],
          )}
        >
          {fallback ?? initials(name)}
        </span>
      ) : null}
      {status ? (
        <span
          aria-hidden="true"
          data-pui-avatar-status={status}
          className={cn(
            blockReset,
            "absolute bottom-0 right-0 block size-[28%] min-h-1.5 min-w-1.5 rounded-pui-full ring-2 ring-pui-background",
            statusColors[status],
          )}
        />
      ) : null}
    </span>
  );
});

/**
 * Overlapping avatars with a shared size, a "+N" overflow avatar and a hover lift (snappy spring).
 * Pass `renderTooltip` to show names on hover with your tooltip of choice.
 */
export const AvatarGroup = React.forwardRef<HTMLDivElement, AvatarGroupProps>(function AvatarGroup(
  {
    max,
    size = "md",
    spacing = "normal",
    tooltips = true,
    renderTooltip,
    overflowLabel = (count) => `${count} more`,
    className,
    children,
    ...props
  },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const context = React.useMemo(() => ({ size }), [size]);
  const items = React.Children.toArray(children).filter(React.isValidElement) as React.ReactElement<AvatarProps>[];
  const limit = max !== undefined && max >= 0 && items.length > max ? max : items.length;
  const overflow = items.length - limit;

  return (
    <AvatarGroupContext.Provider value={context}>
      <div
        ref={ref}
        role="group"
        data-size={size}
        {...props}
        className={cn(blockReset, "inline-flex items-center", className)}
      >
        {items.slice(0, limit).map((item, index) => {
          const name = tooltips && renderTooltip ? (item.props.name ?? item.props.alt) : undefined;
          const lifted = (
            <motion.span
              key={item.key ?? index}
              whileHover={reduced ? undefined : { y: -4 }}
              transition={springs.snappy}
              className={cn(blockReset, "relative inline-flex rounded-pui-full hover:z-10", overlap[spacing])}
            >
              {item}
            </motion.span>
          );
          return name && renderTooltip ? (
            <React.Fragment key={item.key ?? index}>{renderTooltip(lifted, name)}</React.Fragment>
          ) : (
            lifted
          );
        })}
        {overflow > 0 ? (
          <span className={cn(blockReset, "relative inline-flex", overlap[spacing])}>
            <Avatar aria-label={overflowLabel(overflow)} role="img" aria-hidden={undefined} fallback={`+${overflow}`} />
          </span>
        ) : null}
      </div>
    </AvatarGroupContext.Provider>
  );
});
