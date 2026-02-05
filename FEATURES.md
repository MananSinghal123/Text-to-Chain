# TTC-IP Features (working doc)

Base feature set to refine and improve. Three pillars to stress: **ENS as the human face**, **SMS as full control**, **local balance tokenization as the primitive**.

---

## Current base (OK as starting point)

1. **Wallet from a text** – Send JOIN via SMS. No app store, no seed phrases.
2. **One address, all chains** – One Ethereum keypair. Same address on Ethereum, Polygon, Base, Arbitrum, Optimism, Avalanche. Rust backend, account abstraction.
3. **Key management** – Private keys encrypted at rest (AES-256). HSM for production. Key rotation, multi-sig for large amounts.
4. **Address book** – Save frequent recipients. Phone number → address mapping. Nicknames.
5. **Balance tracking** – Real-time, multi-token, multi-chain. Historical snapshots.

---

## 1. ENS: human face for numbers, wallets, interactions

**Idea:** Use ENS (or ENS-like naming) so that addresses, wallets, and actions have a “yes face” — a human-readable name instead of raw numbers and hex.

- **Wallets** – User (or system) gets a readable name (e.g. `alice.ttc.eth` or `alice.ttc-ip`) instead of only 0x…
- **Recipients** – Send to “maria” or “shop.ville” instead of pasting addresses.
- **Interactions** – Commands and targets can refer to names: “swap on alice”, “bridge to maria”, “pay shop.ville”.

**To improve:**

- [ ] Define naming scheme (ENS subdomain, TTC-IP native, or hybrid).
- [ ] How does a user “claim” or get a name (SMS flow, voucher, first tx).
- [ ] Copy: “No more 0x… — names for every wallet and every action.”

---

## 2. Full SMS control: swap, bridge, transfer

**Idea:** The user can do **everything** via SMS: not only join and receive, but **swap**, **bridge**, and **transfer** via SMS commands.

- **Transfer** – Send X to `maria` or to a number/ENS.
- **Swap** – e.g. “SWAP 10 USDC to ETH” or “SWAP 50% to ETH” via SMS; backend executes on-chain.
- **Bridge** – e.g. “BRIDGE 20 USDC to Base” or “BRIDGE to polygon”; backend handles bridge flow.

**To improve:**

- [ ] Canonical command set (keywords, args, examples) and error replies.
- [ ] Security: confirmations, limits, optional PIN or code for high-value.
- [ ] Copy: “One thread. Swap, bridge, transfer — all by text.”

---

## 3. Tokenizing local balance: phone credit → digital token

**Idea:** We create a **primitive**: any local balance (e.g. phone credit, airtime, or nominal local currency value) is tokenized into a digital asset. So there is **no “this currency doesn’t work”** — we give every balance a tokenized form that can pool with ETH (or similar) and discover price.

- **Primitive** – “Phone credit (or local nominal value) tied to a digital token” that represents that value.
- **Pool** – Tokenized local value is pooled with ETH (or a reference asset); liquidity and **market discovery** set the rate.
- **Outcome** – Every user can onboard from what they have (top-up, airtime, local balance) into a tradeable, bridgeable token; no currency is left out.

**To improve:**

- [ ] Name the primitive (e.g. “local credit token”, “airtime-backed token”, “nominal token”).
- [ ] Exact mechanism: who mints, how it’s backed (reserve, pool, oracle).
- [ ] Copy: “Your local balance becomes a token. Pools with ETH. Market finds the price.”

---

## Suggested feature list (for site/cards later)

1. **Wallet from a text** – JOIN via SMS. No app, no seeds. *(keep)*  
2. **One address, all chains** – Same keypair, same address everywhere. *(keep)*  
3. **ENS: names, not numbers** – Human-readable names for wallets and interactions. *(new / expand)*  
4. **SMS does it all** – Swap, bridge, transfer via SMS commands. *(new)*  
5. **Local balance → token** – Tokenize phone credit / local nominal value; pool with ETH; market discovery. *(new)*  
6. **Key management** – Encrypted at rest, HSM, rotation, multi-sig. *(keep)*  
7. **Address book & balance** – Recipients, nicknames, real-time multi-chain balances. *(keep)*  

---

## Next steps

- [ ] Lock naming for the “local balance token” primitive.
- [ ] Draft SMS command spec (verbs, args, examples).
- [ ] Decide ENS integration (subdomain vs custom naming).
- [ ] Update landing copy and step cards from this doc.
