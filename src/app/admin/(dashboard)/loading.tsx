export default function AdminLoading() {
  return (
    <div className="admin-content">
      <div className="admin-panel">
        <div className="admin-empty" role="status" aria-live="polite">
          <h3>Loading…</h3>
          <p>Fetching your data.</p>
        </div>
      </div>
    </div>
  );
}
