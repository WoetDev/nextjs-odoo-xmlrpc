// app/page.tsx
import { OdooClient } from "@/lib/odoo";

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
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Odoo Models</h1>
      <div className="mb-4 text-sm text-gray-500">
        Found {models.length} models
      </div>
      <ul className="space-y-2">
        {models.map((model) => (
          <li key={model.id} className="hover:bg-gray-100 p-2 rounded">
            <strong>{model.name}</strong>
            <span className="text-gray-500 ml-2">({model.model})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
