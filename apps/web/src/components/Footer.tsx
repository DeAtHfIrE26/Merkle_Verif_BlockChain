export function Footer() {
  return (
    <footer className="mt-20 border-t border-ink-700/70">
      <div className="mx-auto flex max-w-content flex-col gap-4 px-4 py-8 text-xs text-ink-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          Built by{' '}
          <a
            href="https://github.com/DeAtHfIrE26"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink-300 underline-offset-4 hover:text-ink-100 hover:underline"
          >
            Kashyap Patel
          </a>
          . Everything runs in your browser — no accounts, no keys, no tracking.
        </p>
        <nav aria-label="Footer" className="flex items-center gap-4">
          <a
            href="https://github.com/DeAtHfIrE26/Merkle_Verif_BlockChain"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-ink-200"
          >
            Source
          </a>
          <a
            href="https://www.linkedin.com/in/kashyap-patel2673/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-ink-200"
          >
            LinkedIn
          </a>
        </nav>
      </div>
    </footer>
  );
}
