import { confirmSubscription, renewSubscription } from "@/app/subscriptions/actions";

/**
 * A <form> whose action is a server function — no onClick, no fetch, and it
 * still works with JavaScript disabled. `bind` passes the id across.
 * فرم مستقیم به تابع سرور وصل است؛ نه onClick لازم است نه fetch.
 */
export function RowActions({ id, status }: { id: number; status: string }) {
  return (
    <div className="flex justify-end gap-2">
      {status === "pending" && (
        <form action={confirmSubscription.bind(null, id)}>
          <button className="rounded-full border border-emerald-500/40 px-3 py-1 text-xs text-emerald-400 hover:bg-emerald-500/10">
            Confirm
          </button>
        </form>
      )}
      <form action={renewSubscription.bind(null, id)}>
        <button className="rounded-full border border-white/15 px-3 py-1 text-xs text-neutral-300 hover:bg-white/5">
          Renew
        </button>
      </form>
    </div>
  );
}
