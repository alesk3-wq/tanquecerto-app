export default function ErrorMessage({ message, onRetry, className = '' }) {
  if (!message) return null;
  return (
    <div className={`bg-rep-bad/10 border border-rep-bad/30 rounded-xl px-3.5 py-2.5 flex items-center gap-2 flex-wrap ${className}`}>
      <span className="text-sm text-rep-bad">
        <span aria-hidden="true">⚠️</span> {message}
      </span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="ml-auto text-xs font-semibold text-accent hover:underline"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}
