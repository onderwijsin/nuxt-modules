import { useThemeCustomizerStore } from "../stores/theme-customizer";
import { defineNuxtPlugin } from "#imports";

export default defineNuxtPlugin({
  name: "theme-customizer",
  dependsOn: ["pinia-plugin-persistedstate"],
  setup() {
    const themeCustomizer = useThemeCustomizerStore();

    themeCustomizer.applyPersistedTheme();
  }
});
