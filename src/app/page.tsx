// app/page.tsx
import { OdooClient, OdooField } from "@/lib/odoo";
import Link from "next/link";

function FieldList({ fields }: { fields: Record<string, OdooField> }) {
  const fieldEntries = Object.entries(fields).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  return (
    <div className="pl-4 text-sm">
      <table className="w-full">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2">Field</th>
            <th className="py-2">Label</th>
            <th className="py-2">Type</th>
            <th className="py-2">Required</th>
            <th className="py-2">Readonly</th>
            <th className="py-2">Help</th>
          </tr>
        </thead>
        <tbody>
          {fieldEntries.map(([fieldName, field]) => (
            <tr key={fieldName} className="border-b hover:bg-gray-700">
              <td className="py-2 font-mono">{fieldName}</td>
              <td className="py-2">{field.string}</td>
              <td className="py-2">
                {field.type}
                {field.relation && (
                  <span className="text-blue-600 ml-1">→ {field.relation}</span>
                )}
              </td>
              <td className="py-2">{field.required ? "✓" : ""}</td>
              <td className="py-2">{field.readonly ? "✓" : ""}</td>
              <td className="py-2 text-gray-100">{field.help}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function getOdooModels() {
  const client = new OdooClient({
    baseUrl: process.env.ODOO_HOST!,
    db: process.env.ODOO_DB!,
    username: process.env.ODOO_USER!,
    password: process.env.ODOO_PASSWORD!,
  });

  try {
    await client.connect();
    return await client.getModels();
  } catch (error) {
    console.error("Odoo API error:", error);
    throw error;
  }
}

export default async function Home() {
  const models = await getOdooModels();

  return (
    <main className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-4">Odoo Models</h1>
        <div className="mb-4 text-sm text-gray-500">
          Found {models.length} models
        </div>
        <nav>
          <ul className="flex gap-4">
            <li>
              <Link
                href="/accounts"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                View Chart of Accounts
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      <div className="space-y-8">
        {models.map((model) => (
          <div key={model.id} className="border rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">{model.name}</h2>
                <code className="text-sm text-gray-400">{model.model}</code>
              </div>
              {model.fields && (
                <div className="text-sm text-gray-400">
                  {Object.keys(model.fields).length} fields
                </div>
              )}
            </div>
            {model.fields && <FieldList fields={model.fields} />}
          </div>
        ))}
      </div>
    </main>
  );
}
