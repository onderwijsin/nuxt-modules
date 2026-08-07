import type { ButtonProps } from "@nuxt/ui";

/** Supported Tailwind theme shade levels. */
export type ThemeShade = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950;

/** A font family option displayed by the theme customizer. */
export type ThemeFontOption = {
  label: string;
  value: string;
};

/** Runtime app configuration consumed by the theme customizer. */
export type ThemeAppConfig = {
  ui: {
    colors: object;
  };
};

/** A button action displayed by the theme customizer confirmation dialog. */
export type ConfirmationAction = ButtonProps & {
  mode: "confirm" | "cancel";
};

/** Options accepted by the theme customizer confirmation dialog. */
export type ConfirmDialogProps = {
  title: string;
  description?: string;
  color?: ButtonProps["color"];
  actions?: ConfirmationAction[];
};

/** Options accepted by the reusable name form modal. */
export type FormModalProps = {
  title: string;
  label: string;
  initialValue: string;
  placeholder?: string;
  submitLabel?: string;
  validate?: (value: string) => string | undefined;
};
