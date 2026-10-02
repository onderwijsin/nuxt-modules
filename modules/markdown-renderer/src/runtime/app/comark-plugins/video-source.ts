import {
  defineComarkPlugin,
  type ElementNode,
  type ElementNodeAttributes,
  type Node
} from "comark";
import { visit } from "comark/utils";
import { useAppConfig } from "#app";
import { hasProtocol, joinURL } from "ufo";
import { isString, isArray } from "@onderwijsin/nuxt-module-utils/shared";

type VideoNode = ElementNode &
  [
    "video",
    ElementNodeAttributes & {
      src: string;
    }
  ];

/**
 * Checks whether a Comark node is a video element with a string source.
 *
 * @param node - The Comark AST node.
 * @returns Whether the node is a video element with a string `src`.
 */
function isVideoNode(node: Node): node is VideoNode {
  return isArray(node) && node[0] === "video" && isString(node[1]?.src);
}

/**
 * Prepends the configured video base URL to relative video sources.
 *
 * Absolute URLs are left unchanged.
 *
 * @returns A Comark plugin that transforms video source URLs.
 */
export const videoSourcePlugin = defineComarkPlugin(() => {
  const videoBaseUrl = useAppConfig().markdownRenderer.videoBaseUrl;

  if (!videoBaseUrl) {
    throw new Error("videoBaseUrl is not defined in the app config.");
  }

  return {
    name: "video-source",

    post(state) {
      visit(state.tree, isVideoNode, (node) => {
        // visit() doesn't carry the matcher narrowing into this callback.
        if (!isVideoNode(node)) {
          return;
        }

        const src = node[1].src;

        if (hasProtocol(src) || src.startsWith("//")) {
          return;
        }

        node[1].src = joinURL(videoBaseUrl, src);
      });
    }
  };
});
