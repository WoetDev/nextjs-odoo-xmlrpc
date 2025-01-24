import xmlrpc from "xmlrpc";

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

type ClientOptions = {
  host: string;
  port: number;
  path: string;
};

type XmlRpcCallback<T> = (error: unknown, value: T) => void;

export class OdooClient {
  private host: string;
  private secure: boolean;
  private port: number;
  private db: string;
  private username: string;
  private password: string;
  private uid: number = 0;

  constructor(config: OdooConfig) {
    const url = new URL(config.baseUrl);

    this.host = url.hostname;
    this.secure = url.protocol === "https:";
    this.port =
      config.port || (url.port ? parseInt(url.port) : this.secure ? 443 : 80);
    this.db = config.db;
    this.username = config.username;
    this.password = config.password;
  }

  private createClientOptions(path: string): ClientOptions {
    return {
      host: this.host,
      port: this.port,
      path,
    };
  }

  private createClient(path: string) {
    const options = this.createClientOptions(path);
    return this.secure
      ? xmlrpc.createSecureClient(options)
      : xmlrpc.createClient(options);
  }

  private executeKw<T>(
    model: string,
    method: string,
    params: unknown[]
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const client = this.createClient("/xmlrpc/2/object");
      const args = [this.db, this.uid, this.password, model, method, ...params];

      const callback: XmlRpcCallback<T> = (error, value) => {
        if (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
          return;
        }
        resolve(value);
      };

      client.methodCall("execute_kw", args, callback);
    });
  }

  async connect(): Promise<number> {
    return new Promise((resolve, reject) => {
      const client = this.createClient("/xmlrpc/2/common");
      const params = [this.db, this.username, this.password, {}];

      const callback: XmlRpcCallback<number> = (error, value) => {
        if (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
          return;
        }
        if (!value) {
          reject(new Error("Authentication failed: Invalid credentials"));
          return;
        }
        this.uid = value;
        resolve(value);
      };

      client.methodCall("authenticate", params, callback);
    });
  }

  async searchRead<T>(
    model: string,
    domain: unknown[] = [],
    fields: string[] = [],
    opts: { offset?: number; limit?: number; order?: string } = {}
  ): Promise<T[]> {
    const params = [
      domain,
      {
        fields,
        offset: opts.offset || 0,
        limit: opts.limit || 0,
        order: opts.order || "",
      },
    ];
    return this.executeKw<T[]>(model, "search_read", params);
  }

  async getFields(model: string): Promise<Record<string, OdooField>> {
    const params = [
      [],
      {
        attributes: [
          "string",
          "help",
          "type",
          "required",
          "readonly",
          "relation",
        ],
      },
    ];
    return this.executeKw(model, "fields_get", params);
  }

  async getModels(): Promise<OdooModel[]> {
    // First get all models
    const models = await this.searchRead<OdooModel>(
      "ir.model",
      [], // Empty domain to get all models
      ["id", "model", "name"],
      { order: "model asc" }
    );

    // Then fetch fields for each model
    const modelsWithFields = await Promise.all(
      models.map(async (model) => {
        try {
          const fields = await this.getFields(model.model);
          return {
            ...model,
            fields,
          };
        } catch {
          // If we can't access the model's fields, skip it
          return null;
        }
      })
    );

    // Filter out null values (models we couldn't access)
    return modelsWithFields.filter(
      (model): model is NonNullable<typeof model> => model !== null
    );
  }
}
