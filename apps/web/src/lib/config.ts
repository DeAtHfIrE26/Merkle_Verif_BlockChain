/**
 * Optional on-chain configuration.
 *
 * The app is fully functional with none of this set — every verification runs
 * in the browser. These values only enable the extra "verify on-chain" path.
 */
const rawAddress = process.env.NEXT_PUBLIC_MERKLE_VERIFIER_ADDRESS?.trim();
const rawChainId = process.env.NEXT_PUBLIC_CHAIN_ID?.trim();

const isAddress = (v: string | undefined): v is string => !!v && /^0x[0-9a-fA-F]{40}$/.test(v);

export const merkleVerifierAddress = isAddress(rawAddress) ? rawAddress : null;
export const chainId = rawChainId && /^\d+$/.test(rawChainId) ? Number(rawChainId) : null;
export const onChainEnabled = merkleVerifierAddress !== null && chainId !== null;
