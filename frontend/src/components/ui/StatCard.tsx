import type { ReactNode } from "react";
import Icon from "./Icon";

type Props = {
  label: string;
  value: ReactNode;
  unit?: string;
  icon?: string;
  tone?: string;
  foot?: ReactNode;
  footTone?: string;
};

/** Kartu statistik (KPI) — mengikuti .stat pada prototype. */
export default function StatCard({ label, value, unit, icon, tone, foot, footTone }: Props) {
  return (
    <div className="stat">
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        {icon ? (
          <span className={`stat-ico ${tone || ""}`}>
            <Icon name={icon} size={19} />
          </span>
        ) : null}
      </div>
      <div className="stat-value">
        {value}
        {unit ? <small>{unit}</small> : null}
      </div>
      {foot ? <div className={`stat-foot ${footTone || "muted"}`}>{foot}</div> : null}
    </div>
  );
}
