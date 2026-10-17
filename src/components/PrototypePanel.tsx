import { getOwner } from "../data/catalogue";
import { phaseLabel, phaseOf } from "../lib/loan";
import { deadlineOf } from "../lib/loan";
import { formatShort } from "../lib/dates";
import { useBorrowly } from "../state/store";
import { useToast } from "../state/toast";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { Sheet } from "./Sheet";

/**
 * These controls stand in for the other side of the exchange.
 *
 * Borrowly is a front-end prototype with no backend and no owner account,
 * so nothing can genuinely approve a request or confirm a return. Rather
 * than faking a notification, the panel is explicit about being a
 * simulation and lets you walk the whole lifecycle by hand.
 */
export function PrototypePanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { requests, simulateApprove, simulateDecline, simulateExtensionDecision, simulateOwnerConfirm, simulateOverdue, seedDemoBorrowing, resetPrototype, itemById, myListings, simulateIncomingRequest } = useBorrowly();
  const { showToast } = useToast();

  const now = Date.now();
  const live = requests.filter((request) => {
    if (request.direction !== "outgoing") return false;
    const phase = phaseOf(request, now);
    return phase !== "returned" && phase !== "cancelled" && phase !== "declined";
  });

  const handle = (message: string, run: () => void) => {
    run();
    showToast(message, { detail: "Simulated locally — no message was sent to anyone." });
  };

  return (
    <Sheet onClose={onClose} open={open} title="Prototype controls">
      <div className="prototype-intro">
        <Icon name="info" size={17} />
        <p>
          There is no second account behind Borrowly, so the other person cannot really reply or
          approve anything. These controls stand in for them, in both directions. Nothing you tap
          here leaves this device.
        </p>
      </div>

      {myListings.length > 0 ? (
        <div className="prototype-block">
          <h3>Someone asks to borrow from you</h3>
          <p className="muted-copy">
            Adds a simulated request to one of your listings. You can approve or decline it from My
            Listings.
          </p>
          <div className="prototype-actions">
            {myListings.map((listing) => (
              <Button
                disabled={listing.paused}
                icon="bell"
                key={listing.id}
                onClick={() => {
                  const created = simulateIncomingRequest(listing.id);
                  showToast(
                    created
                      ? `Simulated a request for “${listing.name}”`
                      : "That listing could not be requested",
                    {
                      detail: created
                        ? "A pretend neighbour is now waiting on you in My Listings."
                        : "Try resuming the listing first.",
                    },
                  );
                  if (created) onClose();
                }}
                variant="secondary"
              >
                {listing.paused ? `${listing.name} — paused` : `Ask for “${listing.name}”`}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      {live.length === 0 ? (
        <div className="prototype-block">
          <h3>No live borrowing yet</h3>
          <p className="muted-copy">
            Send a request from any item page, or load a borrowing that is already under way to
            explore the later screens.
          </p>
          <Button
            icon="sparkle"
            onClick={() => {
              seedDemoBorrowing();
              showToast("Loaded a borrowing already under way", {
                detail: "Sample data stored on this device only.",
              });
              onClose();
            }}
            variant="secondary"
          >
            Load a demo borrowing
          </Button>
        </div>
      ) : null}

      {live.map((request) => {
        const item = itemById(request.itemId);
        const owner = getOwner(request.ownerId);
        const phase = phaseOf(request, now);
        const firstName = owner.name.split(" ")[0];

        return (
          <div className="prototype-block" key={request.id}>
            <h3>
              {item?.name ?? "Item"} <span className="muted-copy">· “{phaseLabel(phase)}”</span>
            </h3>
            <p className="muted-copy">
              With {owner.name} · due {formatShort(deadlineOf(request))}
            </p>

            {phase === "requested" ? (
              <div className="prototype-actions">
                <Button icon="check" onClick={() => handle(`${firstName} approved the request`, () => simulateApprove(request.id))}>
                  Simulate {firstName} approving
                </Button>
                <Button
                  icon="close"
                  onClick={() => handle(`${firstName} declined the request`, () => simulateDecline(request.id))}
                  variant="secondary"
                >
                  Simulate {firstName} declining
                </Button>
              </div>
            ) : null}

            {request.extension?.status === "pending" ? (
              <div className="prototype-actions">
                <Button
                  icon="check"
                  onClick={() =>
                    handle(`${firstName} accepted the new return date`, () =>
                      simulateExtensionDecision(request.id, "approved"),
                    )
                  }
                >
                  Simulate {firstName} accepting the extension
                </Button>
                <Button
                  icon="close"
                  onClick={() =>
                    handle(`${firstName} kept the original date`, () =>
                      simulateExtensionDecision(request.id, "declined"),
                    )
                  }
                  variant="secondary"
                >
                  Simulate {firstName} declining it
                </Button>
              </div>
            ) : null}

            {phase === "return-pending" ? (
              <div className="prototype-actions">
                <Button
                  icon="checkCircle"
                  onClick={() =>
                    handle(`${firstName} confirmed the return`, () => simulateOwnerConfirm(request.id))
                  }
                >
                  Simulate {firstName} confirming the return
                </Button>
              </div>
            ) : null}

            {phase === "collected" ? (
              <div className="prototype-actions">
                <Button
                  icon="clock"
                  onClick={() => handle("Return date moved into the past", () => simulateOverdue(request.id))}
                  variant="secondary"
                >
                  Simulate the deadline passing
                </Button>
              </div>
            ) : null}
          </div>
        );
      })}

      <div className="prototype-block danger-block">
        <h3>Start over</h3>
        <p className="muted-copy">
          Clears every request, message and draft on this device. Your listings are kept.
        </p>
        <Button
          icon="trash"
          onClick={() => {
            resetPrototype();
            showToast("Prototype data cleared", {
              detail: "Requests and messages were removed. Your listings are still here.",
            });
            onClose();
          }}
          variant="danger"
        >
          Reset prototype data
        </Button>
      </div>
    </Sheet>
  );
}
