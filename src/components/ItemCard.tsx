import type { Item, Owner } from "../types";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";
import { ItemImage } from "./ItemImage";
import { Pill } from "./Pill";
import { PricePill } from "./Price";
import { costForDays, formatNaira } from "../lib/pricing";

/**
 * Grid and rail tile. Built for scanning hundreds of listings: photo, price,
 * name, location — nothing else competing for attention.
 */
export function ItemTile({
  item,
  owner,
  locationText,
  onOpen,
  ours = false,
  note,
}: {
  item: Item;
  owner: Owner;
  locationText: string;
  onOpen: () => void;
  ours?: boolean;
  note?: string;
}) {
  const { isPaid, dailyFee, depositRequired, deposit } = costForDays(item, 1);

  return (
    <article className="item-tile">
      <div className="tile-media">
        <ItemImage
          alt={`${item.name} from ${owner.name}`}
          fallbackLabel={item.name}
          src={item.photo}
        />
        {ours ? <span className="tile-flag">Yours</span> : null}
      </div>

      <div className="tile-body">
        <span className={isPaid ? "tile-price paid" : "tile-price free"}>
          {isPaid ? `${formatNaira(dailyFee)}/day` : "Free to borrow"}
        </span>
        <h3>{item.name}</h3>
        <p className="tile-loc">{locationText}</p>
        {depositRequired ? (
          <p className="tile-deposit">+ {formatNaira(deposit)} refundable</p>
        ) : null}
        {note ? <p className="tile-note">{note}</p> : null}
      </div>

      <button className="card-tap" onClick={onOpen} type="button">
        <span className="visually-hidden">
          {ours ? `Manage your listing ${item.name}` : `View ${item.name} from ${owner.name}`}
        </span>
      </button>
    </article>
  );
}

type ItemCardProps = {
  item: Item;
  owner: Owner;
  onOpen: () => void;
  /** Compact cards drop the owner row — used inside lists and summaries. */
  compact?: boolean;
  /** Replaces the meta line, e.g. "Back in about 3 days". */
  note?: string;
  /** True when the borrower owns this listing. */
  ours?: boolean;
  /** How the location reads in the list, e.g. "2 floors away" or "Yaba". */
  locationText: string;
};

/**
 * Price, name, photo and location, in that order. Availability only shows
 * when it is not the default, so the card stays quiet.
 */
export function ItemCard({
  item,
  owner,
  onOpen,
  compact = false,
  note,
  ours = false,
  locationText,
}: ItemCardProps) {
  const { depositRequired, deposit } = costForDays(item, 1);
  const unavailable = item.availability === "unavailable";

  return (
    <article className={compact ? "item-card compact" : "item-card"}>
      <ItemImage
        alt={`${item.name}, borrowed from ${owner.name}`}
        className="item-card-photo"
        fallbackLabel={item.name}
        src={item.photo}
      />
      <div className="item-card-body">
        <div className="item-card-top">
          <PricePill item={item} />
          {unavailable ? <Pill tone="unavailable">Unavailable</Pill> : null}
          {ours ? <Pill icon="user" tone="neutral">Yours</Pill> : null}
        </div>
        <h3>{item.name}</h3>
        <p className="item-card-summary">{item.summary}</p>
        <p className="item-card-meta">
          {item.category} · {locationText}
        </p>
        {depositRequired ? (
          <p className="item-card-deposit">Refundable deposit {formatNaira(deposit)}</p>
        ) : null}
        {note ? <p className="item-card-note">{note}</p> : null}
        {!compact ? (
          <div className="owner-line">
            {ours ? (
              <>
                <span className="owner-you">Your listing</span>
                <span>· manage it in My Listings</span>
              </>
            ) : (
              <>
                <Avatar owner={owner} size={26} />
                <span>
                  {owner.name} · {owner.lends} returns
                </span>
              </>
            )}
          </div>
        ) : null}
      </div>
      <button className="card-tap" onClick={onOpen} type="button">
        <span className="visually-hidden">
          {ours ? `Manage your listing ${item.name}` : `View ${item.name} from ${owner.name}`}
        </span>
        <span aria-hidden="true" className="item-card-arrow">
          <Icon name="arrowRight" size={17} />
        </span>
      </button>
    </article>
  );
}
