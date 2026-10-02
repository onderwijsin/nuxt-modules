import { defineEventHandler } from "h3";
import componentMeta from "#nuxt-component-meta/nitro";

export default defineEventHandler(() => Object.keys(componentMeta));
