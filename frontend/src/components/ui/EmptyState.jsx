export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
      {Icon && <Icon className="h-10 w-10 text-slate-400" strokeWidth={1.5} />}
      <div>
        <p className="text-sm font-medium text-slate-900">{title}</p>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}
