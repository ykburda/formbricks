import { TJsConfig, TJsConfigUpdateInput } from "@formbricks/types/js";
import { JS_LOCAL_STORAGE_KEY } from "./constants";
import { Result, err, ok, wrapThrows } from "./errors";

export class Config {
  private static instance: Config | undefined;
  private config: TJsConfig | null = null;

  private constructor() {
    const savedConfig = this.loadFromLocalStorage();

    if (savedConfig.ok) {
      this.config = savedConfig.value;
    }
  }

  static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  public update(newConfig: TJsConfigUpdateInput): void {
    if (newConfig) {
      this.config = {
        ...this.config,
        ...newConfig,
        status: {
          value: newConfig.status?.value || "success",
          expiresAt: newConfig.status?.expiresAt || null,
        },
      };

      this.saveToStorage();
    }
  }

  public get(): TJsConfig {
    if (!this.config) {
      throw new Error("config is null, maybe the init function was not called?");
    }
    return this.config;
  }

  public loadFromLocalStorage(): Result<TJsConfig, Error> {
    if (typeof window !== "undefined") {
      const savedConfig = localStorage.getItem(JS_LOCAL_STORAGE_KEY);
      if (savedConfig) {
        // TODO: validate config
        // This is a hack to get around the fact that we don't have a proper
        // way to validate the config yet.
        const parsedConfig = JSON.parse(savedConfig) as TJsConfig;

        // check if the config has expired
        if (
          parsedConfig.environmentState?.expiresAt &&
          new Date(parsedConfig.environmentState.expiresAt) <= new Date()
        ) {
          return err(new Error("Config in local storage has expired"));
        }

        return ok(parsedConfig);
      }
    }

    return err(new Error("No or invalid config in local storage"));
  }

  private async saveToStorage(): Promise<Result<Promise<void>, Error>> {
    return wrapThrows(async () => {
      await localStorage.setItem(JS_LOCAL_STORAGE_KEY, JSON.stringify(this.config));
    })();
  }

  // reset the config

  public async resetConfig(): Promise<Result<Promise<void>, Error>> {
    this.config = null;

    return wrapThrows(async () => {
      localStorage.removeItem(JS_LOCAL_STORAGE_KEY);
    })();
  }
}