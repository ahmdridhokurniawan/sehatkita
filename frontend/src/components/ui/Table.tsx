import type { ReactNode } from "react";

export type Kolom = {
  /** Judul kolom */
  header: ReactNode;
  /** Lebar/kelas tambahan, mis. "num" atau "act" */
  className?: string;
};

type Props = {
  columns: Kolom[];
  children: ReactNode;
  /** Kelas tambahan untuk <table>, mis. "compact" */
  className?: string;
};

/** Tabel — mengikuti .tbl pada design system prototype. */
export default function Table({ columns, children, className = "" }: Props) {
  return (
    <div className="table-wrap">
      <table className={`tbl ${className}`}>
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={i} className={c.className}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
