import xmlrpc from "xmlrpc";

export interface OdooConfig {
  baseUrl: string;
  port?: number;
  db: string;
  username: string;
  password: string;
}

export interface OdooModel {
  id: number;
  model: string;
  name: string;
}

interface SearchReadOptions {
  fields?: string[];
  offset?: number;
  limit?: number;
  order?: string;
}

type DomainOperator =
  | "="
  | "!="
  | ">"
  | ">="
  | "<"
  | "<="
  | "like"
  | "ilike"
  | "in"
  | "not in"
  | "child_of"
  | "parent_of";
type DomainValue = string | number | boolean | null | Array<string | number>;
type Domain = Array<[string, DomainOperator, DomainValue]>;

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

  private createClient(path: string): xmlrpc.Client {
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
    domain: Domain = [],
    fields: string[] = [],
    options: SearchReadOptions = {}
  ): Promise<T[]> {
    const params = [
      [domain],
      {
        fields,
        ...options,
      },
    ];
    return this.executeKw<T[]>(model, "search_read", params);
  }

  async getModels(): Promise<OdooModel[]> {
    const models = await this.searchRead<OdooModel>(
      "ir.model",
      [],
      ["id", "model", "name"],
      { order: "model asc" }
    );

    return models.map((model: OdooModel) => ({
      id: model.id,
      model: model.model,
      name: model.name,
    }));
  }
}
