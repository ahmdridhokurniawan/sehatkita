"use client";

import { useId } from "react";
import Image from "next/image";

type BrandLogoProps = {
  size?: number;
  className?: string;
};

const LOCKUP_SIZES = {
  sm: { cityW: 35, cityH: 46, mark: 44 },
  md: { cityW: 38, cityH: 50, mark: 48 },
  lg: { cityW: 48, cityH: 63, mark: 58 },
} as const;

type BrandLockupProps = {
  variant?: keyof typeof LOCKUP_SIZES;
};

/**
 * Pasangan logo resmi Kota Banjarbaru + emblem SehatKita.
 */
export function BrandLockup({ variant = "md" }: BrandLockupProps) {
  const { cityW, cityH, mark } = LOCKUP_SIZES[variant];
  return (
    <span className="brand-logos">
      <Image
        src="/logo-banjarbaru-transparan.png"
        alt="Logo Kota Banjarbaru"
        width={cityW}
        height={cityH}
        className="brand-city"
        unoptimized
      />
      <span className="brand-mark">
        <BrandLogo size={mark} />
      </span>
    </span>
  );
}

/**
 * Logo emblem SehatKita × Kota Banjarbaru.
 * Menggabungkan Perisai Talabang, bintang Pancasila, pilar merah-krem (20 April),
 * atap Museum Lambung Mangkurat, roda industri, serta pita Gawi Sabarataan
 * dengan simbol hati dan gelombang detak jantung SehatKita.
 */
export default function BrandLogo({ size = 38, className }: BrandLogoProps) {
  const uid = useId().replace(/:/g, "");
  const idGold = `${uid}-gold`;
  const idField = `${uid}-field`;
  const idRoof = `${uid}-roof`;
  const idHeart = `${uid}-heart`;
  const idRibbon = `${uid}-ribbon`;
  const idClip = `${uid}-clip`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={idGold} x1="12" y1="3" x2="52" y2="59" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="48%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
        <linearGradient id={idField} x1="32" y1="6" x2="32" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7D8D39" />
          <stop offset="52%" stopColor="#485B1E" />
          <stop offset="100%" stopColor="#202B0C" />
        </linearGradient>
        <linearGradient id={idRoof} x1="32" y1="15" x2="32" y2="25" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF6B35" />
          <stop offset="100%" stopColor="#C94117" />
        </linearGradient>
        <linearGradient id={idHeart} x1="32" y1="24" x2="32" y2="47" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#EAF3DC" />
        </linearGradient>
        <linearGradient id={idRibbon} x1="15" y1="48" x2="49" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4D7C0F" />
          <stop offset="50%" stopColor="#84CC16" />
          <stop offset="100%" stopColor="#3F6212" />
        </linearGradient>
        <clipPath id={idClip}>
          <path d="M32 6.8 L51.4 13.1 V29.6 C51.4 42.3 42.7 51.1 32 55.7 C21.3 51.1 12.6 42.3 12.6 29.6 V13.1 Z" />
        </clipPath>
      </defs>

      {/* Perisai Talabang Emas Kota Banjarbaru */}
      <path
        d="M32 3.5 L54.8 11 V29.8 C54.8 44.5 44.5 54.5 32 59.8 C19.5 54.5 9.2 44.5 9.2 29.8 V11 Z"
        fill={`url(#${idGold})`}
        stroke="#232D10"
        strokeOpacity="0.48"
        strokeWidth="1.2"
      />

      {/* Bidang Dalam Zaitun SehatKita */}
      <path
        d="M32 6.8 L51.4 13.1 V29.6 C51.4 42.3 42.7 51.1 32 55.7 C21.3 51.1 12.6 42.3 12.6 29.6 V13.1 Z"
        fill={`url(#${idField})`}
      />

      <g clipPath={`url(#${idClip})`}>
        {/* Aksen Berlian Sasirangan */}
        <path d="M32 8 L51 27 L32 46 L13 27 Z" fill="#FEF08A" fillOpacity="0.08" />
        <path d="M12.5 19.5 L32 7.2 L51.5 19.5" stroke="#FEF08A" strokeOpacity="0.2" strokeWidth="0.9" />

        {/* Roda Industri Banjarbaru */}
        <circle
          cx="32"
          cy="24"
          r="7.8"
          stroke="#E5ECCF"
          strokeOpacity="0.22"
          strokeWidth="2.6"
          strokeDasharray="2.5 1.9"
        />

        {/* Pilar Gapura Kota 4 Dimensi Kiri & Kanan */}
        <g>
          <rect x="13.8" y="18.2" width="3.5" height="3.1" rx="0.7" fill="#FF5A22" />
          <rect x="13.8" y="22.3" width="3.5" height="3.1" rx="0.7" fill="#FEF3C7" />
          <rect x="13.8" y="26.4" width="3.5" height="3.1" rx="0.7" fill="#FF5A22" />
          <rect x="13.8" y="30.5" width="3.5" height="3.1" rx="0.7" fill="#FEF3C7" />
          <rect x="13.8" y="34.6" width="3.5" height="3.1" rx="0.7" fill="#FF5A22" />

          <rect x="46.7" y="18.2" width="3.5" height="3.1" rx="0.7" fill="#FF5A22" />
          <rect x="46.7" y="22.3" width="3.5" height="3.1" rx="0.7" fill="#FEF3C7" />
          <rect x="46.7" y="26.4" width="3.5" height="3.1" rx="0.7" fill="#FF5A22" />
          <rect x="46.7" y="30.5" width="3.5" height="3.1" rx="0.7" fill="#FEF3C7" />
          <rect x="46.7" y="34.6" width="3.5" height="3.1" rx="0.7" fill="#FF5A22" />
        </g>

        {/* Atap Khas Museum Lambung Mangkurat Banjarbaru */}
        <path
          d="M18.8 25.5 Q24.5 23.2 32 16 Q39.5 23.2 45.2 25.5 L42.5 27 H21.5 Z"
          fill={`url(#${idRoof})`}
          stroke="#FFFBEB"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path
          d="M24.2 25.6 Q28.2 22.8 32 19.2 Q35.8 22.8 39.8 25.6"
          stroke="#FFFBEB"
          strokeOpacity="0.75"
          strokeWidth="0.95"
          strokeLinecap="round"
        />
      </g>

      {/* Bintang Emas Lima Sudut Banjarbaru */}
      <path
        d="M32 6.8 L33.4 9.75 L36.65 10.2 L34.3 12.45 L34.88 15.65 L32 14.12 L29.12 15.65 L29.7 12.45 L27.35 10.2 L30.6 9.75 Z"
        fill="#FEF08A"
        stroke="#78350F"
        strokeWidth="0.65"
        strokeLinejoin="round"
      />

      {/* Hati Kesehatan SehatKita */}
      <path
        d="M32 45.6 C32 45.6 20 38.4 20 30.8 C20 26.9 23 24.2 26.5 24.2 C28.9 24.2 31 25.5 32 27.5 C33 25.5 35.1 24.2 37.5 24.2 C41 24.2 44 26.9 44 30.8 C44 38.4 32 45.6 32 45.6 Z"
        fill={`url(#${idHeart})`}
        stroke="#233012"
        strokeOpacity="0.38"
        strokeWidth="1"
      />

      {/* Gelombang Detak Jantung ECG */}
      <path
        d="M22.2 33 H26.4 L28.4 28.9 L31.1 38 L34.2 28 L36.3 33 H41.8"
        stroke="#485B1E"
        strokeWidth="2.15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="34.2" cy="28" r="1.5" fill="#FF5A22" />

      {/* Pita Hijau Melengkung ("Gawi Sabarataan") */}
      <path
        d="M15.2 47.4 Q32 53.6 48.8 47.4 L46.4 52.8 Q32 58.6 17.6 52.8 Z"
        fill={`url(#${idRibbon})`}
        stroke="#232D10"
        strokeOpacity="0.42"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M15.6 47.7 Q32 53.7 48.4 47.7 L46.2 52.6 Q32 58.2 17.8 52.6 Z"
        stroke="#FEF08A"
        strokeWidth="0.95"
        strokeLinejoin="round"
      />
      <path d="M32 51 L33.6 52.5 L32 54 L30.4 52.5 Z" fill="#FEF08A" />
      <circle cx="24.5" cy="51.4" r="1" fill="#FEF08A" fillOpacity="0.92" />
      <circle cx="39.5" cy="51.4" r="1" fill="#FEF08A" fillOpacity="0.92" />
    </svg>
  );
}
