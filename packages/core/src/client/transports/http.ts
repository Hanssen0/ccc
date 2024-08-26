import { JsonRpcPayload, Transport } from "./transport.js";

export class TransportHttp implements Transport {
  constructor(
    private readonly url: string,
    private readonly timeout = 30000,
  ) {}

  async request(payload: JsonRpcPayload) {
    const aborter = new AbortController();
    const abortTimer = setTimeout(() => aborter.abort(), this.timeout);

    const raw = await (
      await fetch(this.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: aborter.signal,
      })
    ).json();
    clearTimeout(abortTimer);
    return raw;
  }
}