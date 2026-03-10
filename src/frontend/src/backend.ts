import type { Identity } from "@icp-sdk/core/agent";

// Stub backend — this app is fully client-side with no Motoko canister.
export type backendInterface = Record<string, never>;
export type CreateActorOptions = {
  agentOptions?: { identity?: Identity | Promise<Identity> };
};

export class ExternalBlob {
  static fromURL(_url: string): ExternalBlob {
    return new ExternalBlob();
  }
  async getBytes(): Promise<Uint8Array> {
    return new Uint8Array();
  }
  onProgress?: (p: number) => void;
}

export function createActor(
  _canisterId: string,
  _upload: (f: ExternalBlob) => Promise<Uint8Array>,
  _download: (b: Uint8Array) => Promise<ExternalBlob>,
  _options?: CreateActorOptions,
): backendInterface {
  return {};
}
