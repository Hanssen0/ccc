import { ccc } from "@ckb-ccc/core";
import { UnpackResult } from "@ckb-lumos/codec";
import { assembleTransferClusterAction } from "../advanced.js";
import { assertCluster } from "../cluster/index.js";
import { Action, SporeData } from "../codec/index.js";
import { searchOneCellByLock } from "../helper/index.js";

export async function prepareCluster(
  signer: ccc.Signer,
  tx: ccc.Transaction,
  data: SporeData,
  clusterMode?: "lockProxy" | "clusterCell" | "skip",
  scriptInfoHash?: ccc.HexLike,
): Promise<UnpackResult<typeof Action> | undefined> {
  // skip if the spore is not belong to a cluster
  if (!data.clusterId || clusterMode === "skip") {
    return;
  }

  if (!clusterMode) {
    throw Error("clusterMode is undefined but the spore has a cluster");
  }

  const { cell: cluster, scriptInfo } = await assertCluster(
    signer.client,
    data.clusterId,
  );

  // If this cluster has been processed, nothing will happen to the tx
  switch (clusterMode) {
    case "lockProxy": {
      const lock = cluster.cellOutput.lock;

      if (!(await tx.findInputIndexByLock(lock, signer.client))) {
        const proxy = await searchOneCellByLock(signer);
        if (!proxy) {
          throw new Error("Cluster lock proxy cell not found");
        }
        tx.inputs.push(
          ccc.CellInput.from({
            previousOutput: proxy.outPoint,
            ...proxy,
          }),
        );
      }
      if (tx.outputs.every((output) => output.lock !== lock)) {
        tx.addOutput({
          lock,
        });
      }
      tx.addCellDeps({
        outPoint: cluster.outPoint,
        depType: "code",
      });
      return;
    }
    case "clusterCell": {
      if (tx.inputs.some((i) => i.previousOutput.eq(cluster.outPoint))) {
        return;
      }

      tx.inputs.push(
        ccc.CellInput.from({
          previousOutput: cluster.outPoint,
          ...cluster,
        }),
      );
      tx.addOutput(cluster.cellOutput, cluster.outputData);
      await tx.addCellDepInfos(signer.client, scriptInfo.cellDeps);
      // note: add cluster as cellDep, which will be used in Spore contract
      tx.addCellDeps({
        outPoint: cluster.outPoint,
        depType: "code",
      });

      if (scriptInfo.cobuild) {
        return assembleTransferClusterAction(
          cluster.cellOutput,
          cluster.cellOutput,
          scriptInfoHash,
        );
      }
      return;
    }
  }
}
