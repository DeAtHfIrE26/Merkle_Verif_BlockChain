'use client';

import { useCallback, useState } from 'react';
import {
  addressForPrivateKey,
  createBurnerKey,
  hashMessageContent,
  parseSignature,
  recoverSigner,
  signDigest,
  truncateHex,
  verifySignature,
  type Hex,
  type SignatureMode,
  type VerificationResult,
} from '@merkle-verify/core';
import { Badge } from './Badge';
import { Button } from './Button';
import { Hex as HexValue } from './Hex';
import { PageHeader, Panel } from './Section';
import { TextAreaField, TextField } from './Field';
import { VerdictPanel } from './VerdictPanel';
import { cn } from '@/lib/cn';

const DEFAULT_MESSAGE = 'I authorise this transfer of 250 USDC.';

interface ModeOutcome {
  mode: SignatureMode;
  recovered: string | null;
  matches: boolean;
}

/**
 * Rendered client-only (see SignatureWorkbenchLoader) so the burner key can be
 * created in a lazy state initialiser. Generating it in an effect would mean a
 * cascading re-render on mount; generating it during SSR would mean the server
 * and the browser disagree about the key.
 */
export function SignatureWorkbenchRoot() {
  const [instance, setInstance] = useState(0);
  return <SignatureWorkbench key={instance} onRegenerate={() => setInstance((i) => i + 1)} />;
}

function SignatureWorkbench({ onRegenerate }: { onRegenerate: () => void }) {
  const [privateKey] = useState<Hex>(() => createBurnerKey());

  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [signature, setSignature] = useState('');
  const [signingMode, setSigningMode] = useState<SignatureMode>('eip191');
  const [checkMode, setCheckMode] = useState<SignatureMode>('eip191');
  const [expectedSigner, setExpectedSigner] = useState<string>(() =>
    addressForPrivateKey(privateKey),
  );
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [comparison, setComparison] = useState<ModeOutcome[] | null>(null);
  const [busy, setBusy] = useState(false);

  const address = addressForPrivateKey(privateKey);
  const digest = hashMessageContent(message);

  // Remounting via `key` is how a fresh burner key is produced, since the key
  // lives in a lazy initialiser rather than being reassignable state.
  const regenerate = onRegenerate;

  const sign = useCallback(async () => {
    setBusy(true);
    try {
      const sig = await signDigest(privateKey, digest, signingMode);
      setSignature(sig);
      setResult(null);
      setComparison(null);
    } finally {
      setBusy(false);
    }
  }, [privateKey, digest, signingMode]);

  const verify = useCallback(async () => {
    if (!signature) return;
    setBusy(true);
    try {
      const outcome = await verifySignature(expectedSigner, digest, signature, checkMode);
      setResult(outcome);

      // Recover under both modes so the difference is visible rather than
      // something the reader has to take on trust.
      const modes: SignatureMode[] = ['eip191', 'raw'];
      const outcomes = await Promise.all(
        modes.map(async (mode) => {
          const recovered = await recoverSigner(digest, signature, mode);
          return {
            mode,
            recovered,
            matches:
              recovered !== null &&
              expectedSigner !== '' &&
              recovered.toLowerCase() === expectedSigner.toLowerCase(),
          };
        }),
      );
      setComparison(outcomes);
    } finally {
      setBusy(false);
    }
  }, [signature, expectedSigner, digest, checkMode]);

  const parts = signature ? parseSignature(signature) : null;

  return (
    <div className="mx-auto max-w-content px-4 py-10 sm:px-6">
      <PageHeader
        eyebrow="ECDSA recovery"
        title="Signature Verifier"
        description="Ethereum signatures do not carry the signer's address — you recover it from the signature itself. The catch is what exactly was signed: wallets add a prefix, raw signing does not. Get that wrong and every verification fails."
        aside={
          <Button variant="secondary" size="sm" onClick={regenerate}>
            New burner key
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-5">
          <Panel
            title="Signer"
            description="A throwaway key, generated in this browser and never sent anywhere."
          >
            <dl className="space-y-3">
                <div>
                  <dt className="mb-1 text-2xs uppercase tracking-wider text-ink-500">Address</dt>
                  <dd>
                    <HexValue value={address} label="Signer address" className="text-brand-text" />
                  </dd>
                </div>
                <div>
                  <dt className="mb-1 text-2xs uppercase tracking-wider text-ink-500">
                    Private key
                  </dt>
                  <dd className="flex items-center gap-2">
                    <span className="font-mono text-2xs text-ink-500">
                      {truncateHex(privateKey, 10, 6)}
                    </span>
                    <Badge tone="warn">Demo only — holds nothing</Badge>
                  </dd>
                </div>
            </dl>
          </Panel>

          <Panel title="Message" description="Hashed with keccak256 before signing.">
            <div className="space-y-4">
              <TextAreaField
                label="Message"
                rows={3}
                value={message}
                spellCheck={false}
                onChange={(e) => {
                  setMessage(e.target.value);
                  setResult(null);
                  setComparison(null);
                }}
                placeholder="Anything you like"
              />
              <div>
                <p className="mb-1 text-2xs uppercase tracking-wider text-ink-500">Digest</p>
                <HexValue value={digest} label="Message digest" />
              </div>

              <ModeToggle
                label="Sign as"
                value={signingMode}
                onChange={(m) => {
                  setSigningMode(m);
                  setSignature('');
                  setResult(null);
                  setComparison(null);
                }}
              />

              <Button onClick={sign} disabled={busy} className="w-full">
                {busy ? 'Working…' : 'Sign message'}
              </Button>
            </div>
          </Panel>
        </div>

        <div className="min-w-0 space-y-5">
          <Panel
            title="Signature"
            description="Paste one from elsewhere, or sign with the burner key."
          >
            <div className="space-y-4">
              <TextAreaField
                label="Signature (65 bytes)"
                rows={3}
                spellCheck={false}
                value={signature}
                onChange={(e) => {
                  setSignature(e.target.value);
                  setResult(null);
                  setComparison(null);
                }}
                placeholder="0x… r (32 bytes) ‖ s (32 bytes) ‖ v (1 byte)"
                error={
                  signature && parts && !parts.correctLength
                    ? 'A signature must be exactly 65 bytes.'
                    : null
                }
              />

              {parts?.correctLength ? <SignatureParts parts={parts} /> : null}

              <TextField
                label="Expected signer"
                value={expectedSigner}
                spellCheck={false}
                onChange={(e) => {
                  setExpectedSigner(e.target.value);
                  setResult(null);
                }}
                placeholder="0x…"
                hint="Defaults to the burner key's address."
              />

              <ModeToggle
                label="Verify as"
                value={checkMode}
                onChange={(m) => {
                  setCheckMode(m);
                  setResult(null);
                }}
              />

              <Button onClick={verify} disabled={!signature || busy} className="w-full">
                {busy ? 'Verifying…' : 'Verify signature'}
              </Button>
            </div>
          </Panel>

          {result ? (
            <VerdictPanel
              verdict={result.valid ? 'valid' : 'invalid'}
              title={
                result.valid
                  ? 'Valid — recovered the expected signer'
                  : 'Invalid — this does not verify'
              }
              detail={result.reason}
            >
              {result.recovered ? (
                <dl className="space-y-1.5 text-2xs">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <dt className="w-24 shrink-0 text-ink-500">Recovered</dt>
                    <dd className="font-mono text-ink-300">{result.recovered}</dd>
                  </div>
                </dl>
              ) : null}
            </VerdictPanel>
          ) : null}

          {comparison ? <ModeComparison outcomes={comparison} signingMode={signingMode} /> : null}
        </div>
      </div>
    </div>
  );
}

function ModeToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: SignatureMode;
  onChange: (mode: SignatureMode) => void;
}) {
  const options: Array<{ value: SignatureMode; label: string; hint: string }> = [
    { value: 'eip191', label: 'EIP-191', hint: 'What wallets do' },
    { value: 'raw', label: 'Raw digest', hint: 'No prefix' },
  ];

  return (
    <fieldset>
      <legend className="mb-1.5 text-xs font-medium text-ink-300">{label}</legend>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              'flex cursor-pointer flex-col rounded-lg border px-3 py-2 transition-colors',
              value === option.value
                ? 'border-brand-border bg-brand-muted'
                : 'border-ink-700 bg-ink-900 hover:border-ink-600',
            )}
          >
            <span className="flex items-center gap-2">
              <input
                type="radio"
                name={label}
                value={option.value}
                checked={value === option.value}
                onChange={() => onChange(option.value)}
                className="h-3 w-3 accent-brand"
              />
              <span
                className={cn(
                  'text-xs font-medium',
                  value === option.value ? 'text-brand-text' : 'text-ink-200',
                )}
              >
                {option.label}
              </span>
            </span>
            <span className="mt-0.5 pl-5 text-2xs text-ink-500">{option.hint}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function SignatureParts({ parts }: { parts: ReturnType<typeof parseSignature> }) {
  const checks = [
    { label: '65 bytes', ok: parts.correctLength },
    { label: `v = ${parts.v}`, ok: parts.validV },
    { label: 'low-s (EIP-2)', ok: parts.lowS },
  ];

  return (
    <div className="rounded-lg border border-ink-700 bg-ink-900 p-3">
      <p className="mb-2 text-2xs uppercase tracking-wider text-ink-500">Components</p>
      <dl className="space-y-1">
        <Component label="r" value={parts.r} />
        <Component label="s" value={parts.s} />
      </dl>
      <ul className="mt-3 flex flex-wrap gap-2 border-t border-ink-700 pt-3">
        {checks.map((check) => (
          <li key={check.label}>
            <Badge tone={check.ok ? 'valid' : 'invalid'}>
              <span aria-hidden="true">{check.ok ? '✓' : '✕'}</span>
              {check.label}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Component({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="w-3 shrink-0 font-mono text-2xs text-ink-500">{label}</dt>
      <dd className="min-w-0 flex-1">
        <span className="block truncate font-mono text-2xs text-ink-300">{value}</span>
      </dd>
    </div>
  );
}

function ModeComparison({
  outcomes,
  signingMode,
}: {
  outcomes: ModeOutcome[];
  signingMode: SignatureMode;
}) {
  return (
    <Panel
      title="Why the mode matters"
      description="The same signature, recovered both ways. Only the mode it was signed under returns the real signer."
    >
      <ul className="space-y-2">
        {outcomes.map((outcome) => (
          <li
            key={outcome.mode}
            className={cn(
              'rounded-lg border p-3',
              outcome.matches
                ? 'border-valid-border bg-valid-muted'
                : 'border-ink-700 bg-ink-900',
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <span className="text-xs font-medium text-ink-100">
                  {outcome.mode === 'eip191' ? 'EIP-191 prefixed' : 'Raw digest'}
                </span>
                {outcome.mode === signingMode ? <Badge tone="brand">signed this way</Badge> : null}
              </span>
              <Badge tone={outcome.matches ? 'valid' : 'invalid'}>
                {outcome.matches ? 'matches signer' : 'different address'}
              </Badge>
            </div>
            <p className="mt-2 break-all font-mono text-2xs text-ink-400">
              {outcome.recovered ?? 'no address recovered'}
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-4 border-t border-ink-700 pt-3 text-2xs leading-relaxed text-ink-500">
        Recovery always returns <em>some</em> address. Verifying against the wrong mode does not
        error — it silently yields a stranger. That is what made the original version of this
        project&rsquo;s contract fail every real signature.
      </p>
    </Panel>
  );
}
