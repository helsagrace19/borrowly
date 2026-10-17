import { Icon } from "./Icon";
import { costForDays, costForRange, depositLabel, feeExamples, formatNaira, priceLabel } from "../lib/pricing";
import type { PriceableItem } from "../lib/pricing";

/** The headline term, as a badge: "Free to borrow" or "₦500/day". */
export function PricePill({ item }: { item: PriceableItem }) {
  const { isPaid } = costForDays(item, 1);
  return <span className={isPaid ? "price-pill paid" : "price-pill free"}>{priceLabel(item)}</span>;
}

/**
 * The money for one specific date range. Keeps the borrowing fee and the
 * refundable deposit visibly separate, because they are not the same thing.
 */
export function PriceBreakdown({
  item,
  startDate,
  returnDate,
  showPeriod = true,
}: {
  item: PriceableItem;
  startDate: string;
  returnDate: string;
  showPeriod?: boolean;
}) {
  const cost = costForRange(item, startDate, returnDate);
  const free = !cost.isPaid;

  return (
    <div className="price-breakdown">
      {showPeriod ? (
        <div className="summary-row">
          <span>Borrowing period</span>
          <strong>
            {cost.days} {cost.days === 1 ? "day" : "days"}
          </strong>
        </div>
      ) : null}

      <div className="summary-row">
        <span>Borrowing fee</span>
        <strong>{free ? "Free" : formatNaira(cost.borrowFee)}</strong>
      </div>
      {!free ? (
        <p className="price-hint">
          {formatNaira(cost.dailyFee)} a day × {cost.days} {cost.days === 1 ? "day" : "days"}
        </p>
      ) : null}

      <div className="summary-row">
        <span>Refundable deposit</span>
        <strong>{cost.depositRequired ? formatNaira(cost.deposit) : "None"}</strong>
      </div>
      {cost.depositRequired ? (
        <p className="price-hint">Returned when the item comes back as agreed.</p>
      ) : null}

      <div className="summary-row total">
        <span>Total before handoff</span>
        <strong>{formatNaira(cost.totalBeforeHandoff)}</strong>
      </div>
      <p className="price-hint">
        {free && !cost.depositRequired
          ? "Nothing to pay — just bring the item back on time."
          : cost.depositRequired
            ? "The fee covers the days you borrow. The deposit is separate and refundable."
            : "The fee covers the days you borrow."}
      </p>
    </div>
  );
}

/** Rate and worked examples, for pages where no dates are chosen yet. */
export function PriceTerms({ item }: { item: PriceableItem }) {
  const cost = costForDays(item, 1);
  const examples = feeExamples(item);

  if (!cost.isPaid && !cost.depositRequired) {
    return (
      <div className="price-terms">
        <div className="price-headline free">Free to borrow</div>
        <p>No fee and no deposit. Bring it back in the condition you collected it.</p>
      </div>
    );
  }

  return (
    <div className="price-terms">
      <div className={cost.isPaid ? "price-headline" : "price-headline free"}>
        {cost.isPaid ? `${formatNaira(cost.dailyFee)} per day` : "Free to borrow"}
      </div>

      {cost.isPaid ? (
        <>
          <p>
            Charged for each day you have it. A short borrow costs less — a week does not have to
            be paid up front.
          </p>
          <ul className="price-examples">
            {examples.map((example) => (
              <li key={example.days}>
                <span>{example.days === 1 ? "1 day" : `${example.days} days`}</span>
                <strong>{formatNaira(example.amount)}</strong>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p>No borrowing fee. Only the deposit below applies.</p>
      )}

      {cost.depositRequired ? (
        <div className="deposit-block">
          <Icon name="shield" size={16} />
          <span>
            <strong>Refundable deposit {formatNaira(cost.deposit)}</strong>
            <small>
              Separate from the fee. It is meant to come back to you once the item is returned in
              the agreed condition — nothing is held by Borrowly.
            </small>
          </span>
        </div>
      ) : null}
    </div>
  );
}

/** Compact money line used inside list rows and cards. */
export function PriceLine({ item }: { item: PriceableItem }) {
  const { isPaid, dailyFee, depositRequired, deposit } = costForDays(item, 1);
  return (
    <span className="price-line">
      {isPaid ? `${formatNaira(dailyFee)}/day` : "Free to borrow"}
      {depositRequired ? <em> · {formatNaira(deposit)} deposit</em> : null}
    </span>
  );
}

/** Short deposit badge for cards, e.g. "₦5,000 deposit". */
export function DepositPill({ item }: { item: PriceableItem }) {
  const label = depositLabel(item);
  return label ? <span className="deposit-pill">Refundable deposit {label}</span> : null;
}
