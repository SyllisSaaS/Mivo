"use client";

/**
 * Submit button that requires an explicit confirmation before a destructive
 * Server Action runs. The action itself still re-checks authorisation — this
 * only guards against accidental clicks.
 */
export function ConfirmSubmit({
  children,
  message,
  className = "admin-button admin-button--danger admin-button--small",
}: {
  children: React.ReactNode;
  message: string;
  className?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
    >
      {children}
    </button>
  );
}
