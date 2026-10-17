import { useEffect, useMemo, useRef, useState } from "react";

import { Screen, TopBar } from "../components/AppShell";
import { Avatar } from "../components/Avatar";
import { IconButton } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Icon } from "../components/Icon";
import { getOwner } from "../data/catalogue";
import { formatTimestamp } from "../lib/dates";
import { useNavigation } from "../state/navigation";
import { useBorrowly } from "../state/store";

export function ThreadScreen({
  ownerId,
  itemId,
  requestId,
}: {
  ownerId: string;
  itemId: string;
  requestId: string | null;
}) {
  const { back, push } = useNavigation();
  const { conversationFor, sendMessage, markThreadRead, itemById } = useBorrowly();
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const owner = getOwner(ownerId);
  const item = itemById(itemId);
  const conversation = conversationFor(ownerId, itemId);
  const firstName = owner.name.split(" ")[0];

  const messages = useMemo(() => conversation?.messages ?? [], [conversation]);

  useEffect(() => {
    markThreadRead(ownerId, itemId);
  }, [ownerId, itemId, messages.length, markThreadRead]);

  useEffect(() => {
    const node = listRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages.length]);

  const send = () => {
    const body = draft.trim();
    if (!body) return;
    sendMessage(ownerId, itemId, requestId, body);
    setDraft("");
  };

  return (
    <Screen>
      <TopBar
        onBack={back}
        title={firstName}
        action={
          item ? (
            <IconButton
              label={`Open ${item.name}`}
              name="box"
              onClick={() => push({ name: "item", itemId: item.id })}
              size={18}
            />
          ) : undefined
        }
      />

      <div className="thread-context">
        <Avatar owner={owner} size={36} />
        <div className="thread-context-copy">
          <strong>{item?.name ?? "Item"}</strong>
          <small>
            {owner.floor} · {owner.distance}
            {item?.handoffPlace ? ` · ${item.handoffPlace}` : ""}
          </small>
        </div>
      </div>

      <div className="message-list" ref={listRef}>
        {messages.length === 0 ? (
          <EmptyState icon="message" title={`Say hello to ${firstName}`}>
            Ask about the handover time, or anything you want to check before collecting.
          </EmptyState>
        ) : null}

        {messages.map((message) => (
          <div className={`bubble-row ${message.from === "me" ? "mine" : "theirs"}`} key={message.id}>
            <div className="bubble">
              <p>{message.body}</p>
              <span className="bubble-meta">{formatTimestamp(message.at)}</span>
            </div>
          </div>
        ))}

        {requestId ? (
          <button
            className="thread-link"
            onClick={() => push({ name: "return-status", requestId })}
            type="button"
          >
            <Icon name="book" size={16} />
            <span>Open the borrowing for this item</span>
            <Icon name="arrowRight" size={16} />
          </button>
        ) : null}
      </div>

      <div className="composer">
        <div className="composer-row">
          <label className="visually-hidden" htmlFor="thread-message">
            Message {firstName}
          </label>
          <textarea
            id="thread-message"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
            placeholder={`Message ${firstName}…`}
            rows={1}
            value={draft}
          />
          <IconButton disabled={!draft.trim()} label="Send message" name="send" onClick={send} size={19} />
        </div>
      </div>
    </Screen>
  );
}
