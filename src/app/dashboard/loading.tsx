export default function DashboardLoading() {
  return (
    <div className="h-full overflow-hidden bg-slate-50">
      <main className="mx-auto w-full max-w-3xl space-y-5 px-4 py-6 animate-pulse">
        <div className="h-[100px] rounded-xl border border-slate-200 bg-white p-5">
          <div className="h-5 w-28 rounded bg-slate-100" />
          <div className="mt-3 h-2 w-full rounded-full bg-slate-100" />
          <div className="mt-2 h-3 w-44 rounded bg-slate-100" />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex gap-5 border-b border-slate-100 pb-3">
            <div className="h-4 w-20 rounded bg-slate-100" />
            <div className="h-4 w-24 rounded bg-slate-100" />
            <div className="h-4 w-24 rounded bg-slate-100" />
            <div className="h-4 w-20 rounded bg-slate-100" />
            <div className="h-4 w-20 rounded bg-slate-100" />
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="h-3 w-14 rounded bg-slate-100" />
            <div className="flex gap-2">
              <div className="h-7 w-28 rounded-md bg-slate-100" />
              <div className="h-7 w-36 rounded-md bg-slate-100" />
            </div>
          </div>
          <div className="mt-3 space-y-3">
            <div className="h-28 rounded-xl border border-slate-100 bg-slate-50" />
            <div className="h-28 rounded-xl border border-slate-100 bg-slate-50" />
            <div className="h-28 rounded-xl border border-slate-100 bg-slate-50" />
          </div>
        </div>
      </main>
    </div>
  );
}
