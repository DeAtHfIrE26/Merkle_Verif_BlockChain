export default function Loading() {
  return (
    <div className="mx-auto max-w-content px-4 py-12 sm:px-6">
      <div className="skeleton h-4 w-32" />
      <div className="skeleton mt-4 h-9 w-2/3 max-w-md" />
      <div className="skeleton mt-3 h-4 w-full max-w-xl" />
      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        <div className="skeleton h-64 rounded-2xl" />
        <div className="skeleton h-64 rounded-2xl" />
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
