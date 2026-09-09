import { ccc } from "@ckb-ccc/core";
import { multiaddr } from "@multiformats/multiaddr";
import * as lp from "it-length-prefixed";
import { describe, expect, it } from "vitest";
import {
  decodePairingEndpoint,
  encodePairingEndpoint,
  PairingEndpointRoleError,
} from "./pairingEndpoint.js";

const addresses = [
  multiaddr(
    "/dns4/relay.ckbccc.com/tcp/443/wss/p2p/12D3KooWQwLwBK3EaCaJQNL9KBUvPi9Vh3gZqPfLQVi7aZpHkF3S/p2p-circuit/webrtc/p2p/12D3KooWJZQ7ypYJ6LHVYbNcKZX7HxV5pnPHJHvJ7zH2Bf6WmDKm",
  ),
  multiaddr(
    "/dns4/relay.ckbccc.com/tcp/443/wss/p2p/12D3KooWQwLwBK3EaCaJQNL9KBUvPi9Vh3gZqPfLQVi7aZpHkF3S/p2p-circuit/p2p/12D3KooWJZQ7ypYJ6LHVYbNcKZX7HxV5pnPHJHvJ7zH2Bf6WmDKm",
  ),
];

async function compress(bytes: Uint8Array) {
  const stream = new CompressionStream("deflate");
  const output = new Response(stream.readable).arrayBuffer();
  const writer = stream.writable.getWriter();
  await writer.write(Uint8Array.from(bytes));
  await writer.close();
  return new Uint8Array(await output);
}

function endpointFromCompressedAddresses(bytes: Uint8Array) {
  const url = new URL("https://app.ckbccc.com/#signer");
  url.searchParams.set("addresses", ccc.bytesTo(bytes, "base64url"));
  url.searchParams.set("secret", "pairing-secret");
  return url.toString();
}

describe("pairing endpoint", () => {
  it("deflate-compresses addresses into one URL parameter", async () => {
    const endpoint = await encodePairingEndpoint(
      "https://app.ckbccc.com/#signer",
      addresses,
      "pairing-secret",
      "provider",
    );
    const url = new URL(endpoint);

    expect(url.searchParams.get("role")).toBe("provider");
    expect(url.searchParams.get("addresses")).toMatch(/^[\w-]+$/);
    expect(url.searchParams.has("addr")).toBe(false);
    await expect(
      decodePairingEndpoint(endpoint, "provider"),
    ).resolves.toMatchObject({
      addresses,
      secret: "pairing-secret",
    });
  });

  it("rejects an unexpected or missing endpoint role", async () => {
    const endpoint = await encodePairingEndpoint(
      "https://app.ckbccc.com/#signer",
      addresses,
      "pairing-secret",
      "provider",
    );

    await expect(
      decodePairingEndpoint(endpoint, "connector"),
    ).rejects.toBeInstanceOf(PairingEndpointRoleError);

    const url = new URL(endpoint);
    url.searchParams.delete("role");
    await expect(
      decodePairingEndpoint(url.toString(), "provider"),
    ).rejects.toMatchObject({
      actualRole: undefined,
      expectedRole: "provider",
    });
  });

  it("rejects legacy repeated addr parameters", async () => {
    const url = new URL("https://app.ckbccc.com/#signer");
    addresses.forEach((address) =>
      url.searchParams.append("addr", address.toString()),
    );
    url.searchParams.set("secret", "pairing-secret");

    await expect(decodePairingEndpoint(url.toString())).rejects.toThrow(
      "Pairing endpoint is incomplete",
    );
  });

  it("rejects invalid compressed addresses", async () => {
    await expect(
      decodePairingEndpoint(
        "https://app.ckbccc.com/?addresses=invalid&secret=pairing-secret#signer",
      ),
    ).rejects.toThrow("Pairing endpoint contains invalid compressed addresses");
  });

  it("stops decompression after the output limit", async () => {
    const compressed = await compress(new Uint8Array(16 * 1024 + 1));

    await expect(
      decodePairingEndpoint(endpointFromCompressedAddresses(compressed)),
    ).rejects.toMatchObject({
      cause: { message: "Decompressed address data is too large" },
    });
  });

  it("limits the number of addresses", async () => {
    const tooManyAddresses = Array.from({ length: 17 }, () => addresses[0]);
    await expect(
      encodePairingEndpoint(
        "https://app.ckbccc.com/#signer",
        tooManyAddresses,
        "pairing-secret",
      ),
    ).rejects.toThrow("Pairing endpoint supports at most 16 addresses");

    const encoded = ccc.bytesConcat(
      ...lp.encode(tooManyAddresses.map((address) => address.bytes)),
    );
    const compressed = await compress(encoded);
    await expect(
      decodePairingEndpoint(endpointFromCompressedAddresses(compressed)),
    ).rejects.toMatchObject({ cause: { message: "Too many addresses" } });
  });
});
