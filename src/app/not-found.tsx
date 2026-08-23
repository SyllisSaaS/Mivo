import Link from "next/link";

export const metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "24px",
        textAlign: "center",
      }}
    >
      <div>
        <p className="eyebrow">Error 404</p>
        <h1
          style={{
            fontSize: "clamp(2rem, 6vw, 3.5rem)",
            fontWeight: 700,
            letterSpacing: "-0.03em",
          }}
        >
          Page not found
        </h1>
        <p
          style={{
            marginTop: "1rem",
            color: "var(--muted-light)",
            maxWidth: "28rem",
          }}
        >
          That page does not exist. It may have moved, or the link may be
          incorrect.
        </p>
        <p style={{ marginTop: "2rem" }}>
          <Link href="/" className="button button-primary">
            Back to the Mivo site
          </Link>
        </p>
      </div>
    </main>
  );
}
