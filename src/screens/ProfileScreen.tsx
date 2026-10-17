import { BottomNav, Screen, ScreenBody, TopBar } from "../components/AppShell";
import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { InfoRow, Notice, SectionHeading } from "../components/Layout";
import { Pill } from "../components/Pill";
import { COMMUNITY, borrower, owners } from "../data/catalogue";
import { phaseOf } from "../lib/loan";
import { useNow } from "../lib/useNow";
import { useNavigation } from "../state/navigation";
import { useBorrowly } from "../state/store";

export function ProfileScreen({ onOpenControls }: { onOpenControls: () => void }) {
  const { push } = useNavigation();
  const { requests, myListings, incomingRequestsFor } = useBorrowly();
  const now = useNow();

  const phases = requests.map((request) => phaseOf(request, now));
  const stats = [
    { label: "Borrowing now", value: phases.filter((phase) => ["collected", "overdue"].includes(phase)).length },
    { label: "Waiting", value: phases.filter((phase) => phase === "requested").length },
    { label: "Completed", value: phases.filter((phase) => phase === "returned").length },
  ];

  const pendingAsks = myListings.reduce(
    (total, listing) =>
      total +
      incomingRequestsFor(listing.id).filter((request) => request.status === "pending").length,
    0,
  );

  const lendingSummary = [
    pendingAsks > 0 ? `${pendingAsks} request${pendingAsks === 1 ? "" : "s"} waiting on you` : null,
    "Manage availability and requests in My Listings",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Screen>
      <TopBar title="Profile" />

      <ScreenBody>
        <div className="profile-card">
          <Avatar initials={borrower.initials} name={borrower.name} size={62} />
          <div className="profile-copy">
            <h1>{borrower.name}</h1>
            <p>
              {borrower.location.neighbourhood}, {borrower.location.city} · {COMMUNITY}
            </p>
            <Pill icon="home">Neighbour since {borrower.memberSince}</Pill>
          </div>
        </div>

        <div className="stat-row">
          {stats.map((stat) => (
            <div className="stat" key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>

        <div className="stacked-actions">
          <Button icon="plus" onClick={() => push({ name: "lend" })}>
            Lend an item
          </Button>
          <Button icon="box" onClick={() => push({ name: "my-listings" })} variant="secondary">
            My Listings{myListings.length > 0 ? ` (${myListings.length})` : ""}
          </Button>
        </div>

        {myListings.length > 0 ? (
          <Notice
            icon="info"
            title={`You're lending ${myListings.length} ${myListings.length === 1 ? "item" : "items"}`}
          >
            {lendingSummary}
          </Notice>
        ) : (
          <Notice icon="info" title="Nothing listed yet">
            Anything you lend appears in Discover for your neighbours to borrow — and you decide who
            borrows it.
          </Notice>
        )}

        <section className="detail-section">
          <SectionHeading title="How Borrowly works" />
          <InfoRow detail="Everyday things listed by the people in your building." icon="search" title="Discover nearby" />
          <InfoRow detail="Say when you need it and why. Free, or a daily fee set by the owner." icon="send" title="Ask to borrow" />
          <InfoRow detail="Collect it, then confirm so the return clock starts." icon="box" title="Collect and use" />
          <InfoRow detail="Confirm what you're handing back and pick a time." icon="checkCircle" title="Return it" />
          <InfoRow detail="List something you own and choose who borrows it." icon="plus" title="Lend your own" />
        </section>

        <section className="detail-section">
          <SectionHeading title="People you can borrow from" />
          <ul className="owner-list">
            {owners.map((owner) => (
              <li key={owner.id}>
                <Avatar owner={owner} size={38} />
                <span className="owner-list-copy">
                  <strong>{owner.name}</strong>
                  <small>
                    {owner.floor} · {owner.lends} returns · {owner.rating.toFixed(1)} rating
                  </small>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <Notice icon="info" title="About this prototype">
          <ul className="truth-list">
            <li>Your listings, requests and messages are saved in this browser only.</li>
            <li>Approvals, replies and return confirmations are simulated, in both directions.</li>
            <li>No accounts, payments, notifications or identity checks are implemented.</li>
          </ul>
        </Notice>

        <div className="stacked-actions">
          <Button icon="filter" onClick={onOpenControls} variant="secondary">
            Open prototype controls
          </Button>
        </div>

        <p className="footer-note">
          <Icon name="shield" size={14} />
          Borrowly · a neighbourhood noticeboard for {COMMUNITY}
        </p>
      </ScreenBody>

      <BottomNav active="profile" />
    </Screen>
  );
}
