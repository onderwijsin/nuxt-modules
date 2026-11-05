<script setup lang="ts">
import type { LoopsRendererConfig, LoopsRendererTheme } from "@onderwijsin/nuxt-loops-renderer";
import type { EmailExample } from "~~/shared/email-example";

withDefaults(
  defineProps<{
    example: EmailExample;
    theme?: LoopsRendererTheme;
    config?: LoopsRendererConfig;
  }>(),
  { theme: "light" }
);
</script>

<template>
  <article class="email-preview" :data-theme="theme" :aria-label="example.subject">
    <header class="email-envelope">
      <p class="email-subject">{{ example.subject }}</p>
      <dl class="email-addresses">
        <div>
          <dt>From</dt>
          <dd>{{ example.sender }}</dd>
        </div>
        <div>
          <dt>To</dt>
          <dd>{{ example.recipient }}</dd>
        </div>
      </dl>
      <p class="email-preheader">{{ example.preheader }}</p>
    </header>
    <div class="email-canvas">
      <div class="email-paper">
        <LoopsRenderer :data="example.ast" :variables="example.variables" :config="config" />
      </div>
    </div>
  </article>
</template>

<style scoped>
.email-preview {
  --mail-paper: #ffffff;
  --mail-heading: #0f172a;
  --mail-text: #334155;
  --mail-muted: #64748b;
  --mail-link: #2563eb;
  --mail-tint: #eff6ff;
  --mail-panel: #f8fafc;
  --mail-border: #cbd5e1;
  --mail-accent: #2563eb;
  --mail-on-accent: #ffffff;
  --mail-canvas: #eef2f6;

  overflow: hidden;
  border: 1px solid var(--mail-border);
  border-radius: 16px;
  background: var(--mail-paper);
  color: var(--mail-text);
  color-scheme: light;
}

.email-preview[data-theme="dark"] {
  --mail-paper: #111827;
  --mail-heading: #f1f5f9;
  --mail-text: #cbd5e1;
  --mail-muted: #94a3b8;
  --mail-link: #93c5fd;
  --mail-tint: #172d4b;
  --mail-panel: #1e293b;
  --mail-border: #334155;
  --mail-accent: #93c5fd;
  --mail-on-accent: #0f172a;
  --mail-canvas: #0b1120;

  color-scheme: dark;
}

.email-envelope {
  padding: 22px 28px;
  border-bottom: 1px solid var(--mail-border);
}

.email-subject {
  margin: 0 0 12px;
  color: var(--mail-heading);
  font-size: 16px;
  font-weight: 600;
  line-height: 1.5;
}

.email-addresses {
  font-size: 12px;
  line-height: 1.75;
}

.email-addresses > div {
  display: flex;
  gap: 12px;
}

.email-addresses dt {
  min-width: 32px;
  color: var(--mail-muted);
}

.email-addresses dd {
  overflow-wrap: anywhere;
}

.email-preheader {
  margin-top: 10px;
  color: var(--mail-muted);
  font-size: 12px;
}

.email-canvas {
  padding: clamp(12px, 3vw, 28px);
  background: var(--mail-canvas);
}

.email-paper {
  max-width: 640px;
  margin-inline: auto;
  padding: clamp(20px, 4vw, 36px);
  background: var(--mail-paper);
  border-radius: 8px;
}

.email-paper :deep(.campaign-renderer) {
  --tw-prose-body: var(--mail-text);
  --tw-prose-headings: var(--mail-heading);
  --tw-prose-links: var(--mail-link);
  --tw-prose-bold: var(--mail-heading);
  --tw-prose-quotes: var(--mail-heading);
  --tw-prose-quote-borders: var(--mail-border);
  --tw-prose-code: var(--mail-text);
  --tw-prose-pre-code: var(--mail-text);
  --tw-prose-pre-bg: var(--mail-panel);
  --tw-prose-counters: var(--mail-muted);
  --tw-prose-bullets: var(--mail-muted);
  --tw-prose-hr: var(--mail-border);
  --tw-prose-invert-body: var(--mail-text);
  --tw-prose-invert-headings: var(--mail-heading);
  --tw-prose-invert-links: var(--mail-link);
  --tw-prose-invert-bold: var(--mail-heading);
  --tw-prose-invert-quotes: var(--mail-heading);
  --tw-prose-invert-quote-borders: var(--mail-border);
  --tw-prose-invert-code: var(--mail-text);
  --tw-prose-invert-pre-code: var(--mail-text);
  --tw-prose-invert-pre-bg: var(--mail-panel);
  --tw-prose-invert-counters: var(--mail-muted);
  --tw-prose-invert-bullets: var(--mail-muted);
  --tw-prose-invert-hr: var(--mail-border);

  max-width: none;
  font-size: 16px;
  line-height: 1.7;
}

.email-paper :deep(img) {
  width: 100%;
  height: auto;
}

.email-paper :deep(pre) {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
