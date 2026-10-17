import { BottomNav, Screen, ScreenBody, TopBar } from "../components/AppShell";
import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Icon } from "../components/Icon";
import { getOwner } from "../data/catalogue";
import { formatTimestamp } from "../lib/dates";
import { useNavigation } from "../state/navigation";
import { useBorrowly } from "../state/store";

export function InboxScreen() {
  const { push, back, goToTab, canGoBack } = useNavigation();
  const { conversations, itemById } = useBorrowly();

  const threads = [...conversations]
    .filter((conversation) => conversation.messages.length > 0)
    .sort((a, b) => {
      const aLast = a.messages[a.messages.length - 1]?.at ?? 0;
      const bLast = b.messages[b.messages.length - 1]?.at ?? 0;
      return bLast - aLast;
    });

  return (
    <Screen>
      <TopBar onBack={canGoBack ? back : undefined} title="Inbox" />

      <ScreenBody>
        {threads.length === 0 ? (
          <EmptyState
            action={
              <Button icon="search" onClick={() => goToTab({ name: "discover" })} variant="secondary">
                Browse items nearby
              </Button>
            }
            icon="inbox"
            title="No conversations yet"
          >
            When you send a request, your message to the owner starts a conversation here.
          </EmptyState>
        ) : (
          <>
            <ul className="thread-list">
              {threads.map((conversation) => {
                const owner = getOwner(conversation.ownerId);
                const item = itemById(conversation.itemId);
                const last = conversation.messages[conversation.messages.length - 1];

                return (
                  <li key={`${conversation.ownerId}:${conversation.itemId}`}>
                    <button
                      className="thread-row"
                      onClick={() =>
                        push({
                          name: "thread",
                          ownerId: conversation.ownerId,
                          itemId: conversation.itemId,
                          requestId: conversation.requestId,
                        })
                      }
                      type="button"
                    >
                      <Avatar owner={owner} size={44} />
                      <span className="thread-copy">
                        <span className="thread-top">
                          <strong>{owner.name}</strong>
                          <small>{last ? formatTimestamp(last.at) : ""}</small>
                        </span>
                        <span className="thread-item">{item?.name ?? "Item"}</span>
                        <span className="thread-preview">
                          {last?.from === "me" ? "You: " : ""}
                          {last?.body ?? ""}
                        </span>
                      </span>
                      {conversation.unread > 0 ? (
                        <em className="thread-unread" aria-label={`${conversation.unread} unread`}>
                          {conversation.unread}
                        </em>
                      ) : (
                        <Icon name="arrowRight" size={17} />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </ScreenBody>

      <BottomNav active="discover" />
    </Screen>
  );
}
