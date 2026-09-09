---
"@ckb-ccc/connector": patch
"@ckb-ccc/connector-react": major
---

refactor(connector): emit owned wallet and signer connections, remove deprecated compatibility APIs, require setClient callers to transfer Client ownership, and release connections from the React Provider.

See the [Connector 2.0 migration guide](https://docs.ckbccc.com/en/docs/migration/connector-v2)
for the required `setClient`, connection event, Client ownership, and removed
property changes.
