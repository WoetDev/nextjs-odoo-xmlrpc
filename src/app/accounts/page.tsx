import { OdooClient } from "@/lib/odoo";

interface Account {
  id: number;
  code: string;
  name: string;
  account_type: string;
  reconcile: boolean;
  deprecated: boolean;
  company_id: [number, string];
}

async function getAccounts() {
  const baseUrl = process.env.ODOO_HOST;
  if (!baseUrl) {
    throw new Error("ODOO_HOST environment variable is not set");
  }

  const client = new OdooClient({
    baseUrl,
    db: process.env.ODOO_DB || "",
    username: process.env.ODOO_USER || "",
    password: process.env.ODOO_PASSWORD || "",
  });

  try {
    await client.connect();

    const accounts = await client.searchRead<Account>(
      "account.account",
      [["deprecated", "=", false]], // Only get active accounts
      ["code", "name", "account_type", "reconcile", "deprecated", "company_id"],
      {
        order: "code asc", // Sort by account code
      }
    );

    return accounts;
  } catch (error) {
    console.error("Failed to fetch accounts:", error);
    throw error;
  }
}

export default async function AccountsPage() {
  try {
    const accounts = await getAccounts();

    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold mb-6">Chart of Accounts</h1>
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-300">
            <thead>
              <tr>
                <th className="px-4 py-2 border-b text-left">Code</th>
                <th className="px-4 py-2 border-b text-left">Name</th>
                <th className="px-4 py-2 border-b text-left">Type</th>
                <th className="px-4 py-2 border-b text-left">Company</th>
                <th className="px-4 py-2 border-b text-center">Reconcilable</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id} className="hover:bg-gray-800">
                  <td className="px-4 py-2 border-b font-mono">
                    {account.code}
                  </td>
                  <td className="px-4 py-2 border-b">{account.name}</td>
                  <td className="px-4 py-2 border-b">{account.account_type}</td>
                  <td className="px-4 py-2 border-b">
                    {account.company_id[1]}
                  </td>
                  <td className="px-4 py-2 border-b text-center">
                    {account.reconcile ? "✓" : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    );
  } catch {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold mb-6">Chart of Accounts</h1>
        <div className="text-red-600">
          Failed to load accounts. Please check your Odoo connection settings.
        </div>
      </main>
    );
  }
}
