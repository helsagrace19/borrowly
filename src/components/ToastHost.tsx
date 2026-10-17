import { useToast } from "../state/toast";
import { Icon } from "./Icon";

/** Renders queued toasts in a polite live region. */
export function ToastHost() {
  const { toasts, dismissToast } = useToast();

  return (
    <div aria-live="polite" className="toast-host">
      {toasts.map((toast) => (
        <div className={`toast ${toast.tone}`} key={toast.id}>
          <Icon
            name={toast.tone === "success" ? "checkCircle" : toast.tone === "warning" ? "alert" : "info"}
            size={17}
          />
          <span className="toast-copy">
            <strong>{toast.message}</strong>
            {toast.detail ? <small>{toast.detail}</small> : null}
          </span>
          <button aria-label="Dismiss" className="toast-close" onClick={() => dismissToast(toast.id)} type="button">
            <Icon name="close" size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}
