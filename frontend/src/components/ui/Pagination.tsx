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
};

/** Paginasi — mengikuti .pagination prototype; toleran dua bentuk meta. */
export default function Pagination({ meta, onPage }: Props) {
  if (!meta || meta.last_page <= 1) return null;
  const cur = meta.page || meta.current_page || 1;
  const last = meta.last_page;
  const per = meta.per_page;

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
    <div className="pagination">
      <span className="tiny">
        Menampilkan {dari}–{sampai} dari {angka(meta.total)} data
      </span>
      <div className="pages">
        {pages.map((p, i) => {
          const isPrev = p === "‹";
          const isNext = p === "›";
          const pageNum = typeof p === "number" ? p : isPrev ? cur - 1 : cur + 1;
          const disabled = (isPrev && cur <= 1) || (isNext && cur >= last);
          return (
            <button
              key={i}
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
