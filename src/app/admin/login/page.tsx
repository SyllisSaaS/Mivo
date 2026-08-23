import Link from "next/link";
import { LoginForm } from "./LoginForm";
import { redirectIfSignedIn } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  await redirectIfSignedIn();

  const params = await searchParams;
  const next =
    params.next && params.next.startsWith("/admin") ? params.next : undefined;

  return (
    <div className="admin-login">
      <div className="admin-login__card">
        <span className="admin-login__brand">MIVO</span>
        <h1>Sign in</h1>
        <p>This area is private and restricted to the site owner.</p>

        <LoginForm next={next} />

        <p className="admin-login__footer">
          There is no sign-up — access is limited to one pre-authorised
          account. <Link href="/">Return to the Mivo site</Link>
        </p>
      </div>
    </div>
  );
}
