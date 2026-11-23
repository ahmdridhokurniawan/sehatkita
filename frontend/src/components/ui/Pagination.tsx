"use client";

import { angka } from "@/lib/format";

export type Meta = {
  page?: number;
  current_page?: number;
  per_page: number;
  total: number;
  last_page: number;
};

type Props = {
  meta: Meta;
  onPage: (page: number) => void;
  perPage?: number;
  onPerPage?: (perPage: number) => void;
  perPageOptions?: number[];
};

const DEFAULT_OPTIONS = [5, 10, 15, 25, 50];

/** Paginasi — selalu tampil bila ada data; mendukung ubah jumlah data per halaman. */
export default function Pagination({
  meta,
  onPage,
  perPage,
  onPerPage,
  perPageOptions = DEFAULT_OPTIONS,
}: Props) {
  if (!meta || meta.total <= 0) return null;
  const cur = meta.page || meta.current_page || 1;
  const last = Math.max(1, meta.last_page || 1);
  const per = perPage ?? meta.per_page ?? 10;
  const opsi = Array.from(new Set([...perPageOptions, per])).sort((a, b) => a - b);

  const pages: (number | "‹" | "›")[] = [];
  pages.push("‹");
  let start = Math.max(1, cur - 2);
  const end = Math.min(last, start + 4);
  start = Math.max(1, end - 4);
  for (let p = start; p <= end; p++) pages.push(p);
  pages.push("›");

  const dari = (cur - 1) * per + 1;
  const sampai = Math.min(cur * per, meta.total);

  return (
    <div className="pagination" style={{ flexWrap: "wrap", gap: 10 }}>
      <div className="row" style={{ alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span className="tiny">
          Menampilkan {dari}–{sampai} dari {angka(meta.total)} data
        </span>
        {onPerPage ? (
          <label className="row tiny" style={{ alignItems: "center", gap: 6 }}>
            <span>Per halaman:</span>
            <select
              className="select"
              aria-label="Jumlah data per halaman"
              value={per}
              onChange={(e) => onPerPage(Number(e.target.value))}
              style={{ width: "auto", minWidth: 68, padding: "4px 8px", height: 32, fontSize: "0.82rem" }}
            >
              {opsi.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <span className="tiny">({per} / halaman)</span>
        )}
      </div>
      <div className="pages">
        {pages.map((p, i) => {
          const isPrev = p === "‹";
          const isNext = p === "›";
          const pageNum = typeof p === "number" ? p : isPrev ? cur - 1 : cur + 1;
          const disabled = (isPrev && cur <= 1) || (isNext && cur >= last);
          return (
            <button
              key={i}
              type="button"
              className={p === cur ? "active" : ""}
              disabled={disabled}
              onClick={() => !disabled && onPage(pageNum)}
            >
              {p}
            </button>
          );
        })}
      </div>
    </div>
  );
}
