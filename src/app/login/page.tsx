import { redirect } from "next/navigation";

/** Short URL for the private admin sign-in page. */
export default function LoginShortcutPage() {
  redirect("/admin/login");
}
