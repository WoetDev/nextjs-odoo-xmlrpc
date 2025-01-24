import OdooAwait from "odoo-await";

export interface OdooConfig {
  baseUrl: string;
  port?: number;
  db: string;
  username: string;
  password: string;
}

export interface OdooField {
  type: string;
  string: string;
  required: boolean;
  readonly: boolean;
  relation?: string;
  help?: string;
}

export interface OdooModel {
  id: number;
  model: string;
  name: string;
  fields?: Record<string, OdooField>;
}

export class OdooClient {
  private client: OdooAwait;

  constructor(config: OdooConfig) {
    this.client = new OdooAwait(config);
  }

  async connect(): Promise<number> {
    return this.client.connect();
  }

  async searchRead<T>(
    model: string,
    domain: unknown[] = [],
    fields: string[] = [],
    opts: { offset?: number; limit?: number; order?: string } = {}
  ): Promise<T[]> {
    return this.client.searchRead(model, domain, fields, opts);
  }

  async getFields(model: string): Promise<Record<string, OdooField>> {
    return this.client.getFields(model, [
      "string",
      "help",
      "type",
      "required",
      "readonly",
      "relation",
    ]);
  }

  async getModels(): Promise<OdooModel[]> {
    // Get all models in batches
    let allModels: OdooModel[] = [];
    let offset = 0;
    const batchSize = 100;

    // Only get models we're likely to have access to
    const domain = [
      ["transient", "=", false], // Only get non-transient models
      ["model", "not like", "base_%"], // Exclude base models
      ["model", "not like", "ir.%"], // Exclude internal models
      ["model", "not like", "bus.%"], // Exclude bus models
      ["model", "not like", "mail.%"], // Exclude mail models
      ["model", "not like", "res.%"], // Exclude system models
      ["model", "not like", "report.%"], // Exclude report models
      ["state", "=", "base"], // Only get base models (not custom)
    ];

    while (true) {
      const batch = await this.searchRead<OdooModel>(
        "ir.model",
        domain,
        ["id", "model", "name"],
        {
          offset,
          limit: batchSize,
          order: "model asc",
        }
      );

      if (batch.length === 0) {
        break;
      }

      allModels = [...allModels, ...batch];
      offset += batchSize;

      console.log(`Fetched ${allModels.length} models so far...`);
    }

    console.log(
      `Found total of ${allModels.length} models, fetching fields...`
    );

    // Then fetch fields for each model in batches
    const batchedModels = [];
    for (let i = 0; i < allModels.length; i += 5) {
      // Reduced batch size to 5
      const batch = allModels.slice(i, i + 5);
      const batchResults = await Promise.all(
        batch.map(async (model) => {
          try {
            const fields = await this.getFields(model.model);
            console.log(`✓ Fetched fields for ${model.model}`);
            return {
              ...model,
              fields,
            };
          } catch (error) {
            // Only log errors that aren't related to access rights
            if (error instanceof Error && !error.message.includes("Access")) {
              console.warn(
                `❌ Could not fetch fields for model ${model.model}:`,
                error
              );
            }
            return model;
          }
        })
      );
      batchedModels.push(...batchResults);
    }

    // Filter out models without fields (ones we couldn't access)
    return batchedModels.filter((model) => model.fields);
  }
}
