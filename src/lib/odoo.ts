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

    while (true) {
      const batch = await this.searchRead<OdooModel>(
        "ir.model",
        [
          ["transient", "=", false], // Only get non-transient models
          ["model", "not like", "base_%"], // Exclude base models
          ["model", "not like", "ir.%"], // Exclude internal models
          ["state", "=", "base"], // Only get base models (not custom)
        ],
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
    for (let i = 0; i < allModels.length; i += 10) {
      const batch = allModels.slice(i, i + 10);
      const batchResults = await Promise.all(
        batch.map(async (model) => {
          try {
            const fields = await this.getFields(model.model);

            return {
              ...model,
              fields,
            };
          } catch (error) {
            console.warn(
              `❌ Could not fetch fields for model ${model.model}:`,
              error
            );
            return model;
          }
        })
      );
      batchedModels.push(...batchResults);
    }

    return batchedModels;
  }
}
