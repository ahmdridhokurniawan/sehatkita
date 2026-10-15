import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  /** Cara baru: raised = ada bayangan, flat = tanpa */
  raised?: boolean;
  padLg?: boolean;
  /** Cara lama: judul & subjudul di dalam kartu */
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
};

/** Kartu dasar — mengikuti .card pada design system prototype. */
export default function Card({ children, className = "", raised, padLg, title, subtitle, actions }: Props) {
  const cls = ["card", raised ? "card-raised" : "", padLg ? "card-pad-lg" : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <section className={cls}>
      {title || subtitle || actions ? (
        <div className="card-head">
          <div>
            {title ? <div className="card-title">{title}</div> : null}
            {subtitle ? <div className="card-sub">{subtitle}</div> : null}
          </div>
          {actions ? <div className="row gap-8">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** Kepala kartu (dipakai bila perlu kontrol posisi) */
export function CardHead({
  title,
  sub,
  actions,
}: {
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="card-head">
      <div>
        <div className="card-title">{title}</div>
        {sub ? <div className="card-sub">{sub}</div> : null}
      </div>
      {actions ? <div className="row gap-8">{actions}</div> : null}
    </div>
  );
}
