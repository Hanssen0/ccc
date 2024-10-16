import { ccc } from "@ckb-ccc/core";
import { JsonRpcTransformers } from "@ckb-ccc/core/advanced";
import { createSpore, meltSpore } from "..";

describe("meltSpore [testnet]", () => {
  expect(process.env.PRIVATE_KEY).toBeDefined();

  it("should melt a Spore cell by sporeId", async () => {
    const client = new ccc.ClientPublicTestnet();
    const signer = new ccc.SignerCkbPrivateKey(
      client,
      process.env.PRIVATE_KEY!,
    );

    // Build melt transaction
    let { tx: meltTx } = await meltSpore({
      signer,
      // Change this if you have a different sporeId
      id: "0x4abfcdb57a9634b00efb03b92737ac107f5617eb36bb623c9db163fb54052ea4",
    });

    // Provide create transaction
    let { tx } = await createSpore({
      signer,
      tx: meltTx,
      data: {
        contentType: "text/plain",
        content: ccc.bytesFrom("hello, spore", "utf8"),
      },
    });

    // Complete transaction
    await tx.completeFeeBy(signer, 1000);
    tx = await signer.signTransaction(tx);
    console.log(JSON.stringify(JsonRpcTransformers.transactionFrom(tx)));

    // Send transaction
    let txHash = await signer.sendTransaction(tx);
    console.log(txHash);
  }, 60000);
});
