import { Address } from "../address";
import { BytesLike } from "../bytes";
import { Transaction, TransactionLike } from "../ckb";
import { Client } from "../client";
import { Hex } from "../hex";

export abstract class Signer {
  constructor(public readonly client: Client) {}

  abstract connect(): Promise<void>;

  abstract getInternalAddress(): Promise<string>;

  abstract getAddressObjs(): Promise<Address[]>;
  async getRecommendedAddressObj(_preference?: unknown): Promise<Address> {
    return (await this.getAddressObjs())[0];
  }

  async getRecommendedAddress(preference?: unknown): Promise<string> {
    return (await this.getRecommendedAddressObj(preference)).toString();
  }
  async getAddresses(): Promise<string[]> {
    return this.getAddressObjs().then((addresses) =>
      addresses.map((address) => address.toString()),
    );
  }

  signMessage(_: string | BytesLike): Promise<string> {
    throw Error("Signer.signMessage not implemented");
  }

  async sendTransaction(tx: TransactionLike): Promise<Hex> {
    return this.client.sendTransaction(await this.signTransaction(tx));
  }

  async signTransaction(tx: TransactionLike): Promise<Transaction> {
    return this.signOnlyTransaction(tx);
  }

  signOnlyTransaction(_: TransactionLike): Promise<Transaction> {
    throw Error("Signer.signOnlyTransaction not implemented");
  }
}

export enum SignerType {
  EVM = "EVM",
  BTC = "BTC",
}

export class SignerInfo {
  constructor(
    public type: SignerType,
    public signer: Signer,
  ) {}
}

export type Wallet = {
  name: string;
  icon: string;
  signers: SignerInfo[];
};