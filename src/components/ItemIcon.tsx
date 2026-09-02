import { useState } from "react";
import { itemIconUrl } from "../lib/midgard";

/**
 * The item's sprite, or nothing at all.
 *
 * The space is reserved whether or not the image arrives, so a list of fifty
 * rows does not reflow as icons trickle in - and a missing icon leaves a gap
 * the same size as a present one, which keeps the names in a column.
 *
 * Failure is silent by design. Not every item has an icon upstream, and an
 * index whose rows shout about a missing decoration is worse than one that
 * quietly shows a name.
 */
export function ItemIcon({
  itemId,
  size = 24,
  className = "",
}: {
  itemId: number;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <span
      className={"inline-flex shrink-0 items-center justify-center " + className}
      style={{ width: size, height: size }}
      aria-hidden={failed}
    >
      {!failed && (
        <img
          src={itemIconUrl(itemId)}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          style={{ maxWidth: size, maxHeight: size }}
          className="object-contain"
        />
      )}
    </span>
  );
}
