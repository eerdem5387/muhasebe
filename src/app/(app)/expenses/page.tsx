import { redirect } from "next/navigation";

/** Gider girişi aylık gelir-gider ekranından yapılır. */
export default function ExpensesPage() {
  redirect("/monthly");
}
