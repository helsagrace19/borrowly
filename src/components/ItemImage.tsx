import { useEffect, useState } from "react";

import { Icon } from "./Icon";

type ItemImageProps = {
  src: string;
  alt: string;
  className?: string;
  /** Short label used by the fallback panel if the photo cannot load. */
  fallbackLabel?: string;
  /** Cover position for tall crops, e.g. "center 60%". */
  focal?: string;
};

/**
 * Every item photo is local, but a picture can still fail to decode.
 * Rather than showing a broken image, fall back to a labelled panel so the
 * layout never looks damaged.
 */
export function ItemImage({ src, alt, className, fallbackLabel, focal }: ItemImageProps) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    setStatus("loading");
  }, [src]);

  if (status === "error") {
    return (
      <span className={["item-image", "failed", className ?? ""].filter(Boolean).join(" ")}>
        <Icon name="box" size={26} />
        {fallbackLabel ? <em>{fallbackLabel}</em> : null}
      </span>
    );
  }

  return (
    <span className={["item-image", status, className ?? ""].filter(Boolean).join(" ")}>
      <img
        alt={alt}
        onError={() => setStatus("error")}
        onLoad={() => setStatus("ready")}
        src={src}
        style={focal ? { objectPosition: focal } : undefined}
      />
    </span>
  );
}
