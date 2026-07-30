import { WebContainer } from "@webcontainer/api";

let webcontainerInstance: WebContainer | undefined;
let bootPromise: Promise<WebContainer> | undefined;

/** Boots WebContainer once per page. Must match COEP header in next.config.ts. */
export async function bootWebContainer(): Promise<WebContainer> {
  if (webcontainerInstance) {
    return webcontainerInstance;
  }
  if (!bootPromise) {
    bootPromise = WebContainer.boot({ coep: "credentialless" }).then(
      (instance) => {
        webcontainerInstance = instance;
        return instance;
      },
    );
  }
  return bootPromise;
}

export function getWebContainerInstance(): WebContainer | undefined {
  return webcontainerInstance;
}
