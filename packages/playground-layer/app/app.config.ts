import type { ButtonProps } from "@nuxt/ui";

export default defineAppConfig({
  repo: "https://github.com/onderwijsin/nuxt-modules",
  publisher: "Stichting Onderwijs in",
  publisherUrl: "https://onderwijsin.nl",
  header: {
    colorMode: true,
    github: true,
    actions: []
  },
  ui: {
    colors: {
      neutral: "zinc"
    }
  }
});

declare module "@nuxt/schema" {
  interface AppConfig {
    packageName?: string;
    repo: string;
    publisher: string;
    publisherUrl: string;
    header?: {
      colorMode?: boolean;
      github?: boolean;
      actions?: Array<ButtonProps>;
    };
  }
}
