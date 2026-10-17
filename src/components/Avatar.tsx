import type { Owner } from "../types";

const tones = ["sage", "coral", "earth", "ink"] as const;

function toneFor(seed: string): (typeof tones)[number] {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 997;
  }
  return tones[hash % tones.length];
}

type AvatarProps = {
  owner?: Owner;
  /** Used when there is no owner object, e.g. the signed-in borrower. */
  initials?: string;
  name?: string;
  size?: number;
};

/**
 * Owners with a photo they chose show it; everyone else shows a monogram.
 * Mixing the two is how real community apps look, and it avoids putting
 * stock photos of strangers behind other people's names.
 */
export function Avatar({ owner, initials, name, size = 40 }: AvatarProps) {
  const label = initials ?? owner?.initials ?? "?";
  const fullName = name ?? owner?.name ?? "Borrowly member";
  const style = { width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.36)) };

  if (owner?.photo) {
    return (
      <span className="avatar" style={style} aria-hidden="true">
        <img alt="" src={owner.photo} />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`avatar monogram ${toneFor(fullName)}`}
      style={style}
      title={fullName}
    >
      {label}
    </span>
  );
}
