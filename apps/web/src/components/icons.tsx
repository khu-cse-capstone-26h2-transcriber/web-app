// 확정 디자인(2026-11-19)의 아이콘과 브랜드 표시(T38). 확정안 HTML의 SVG를 그대로 옮겼다.
// 아이콘은 글자색(currentColor)을 따르고, 크기는 className(size-4 등)으로 정한다. 꾸밈용이라 화면 읽기 도구에는 숨긴다.
import type { ReactNode } from 'react';

interface IconProps {
  className?: string;
  // 선 굵기. 확정안은 대부분 2이고, 내려받기·확인은 2.2, 대기 화면의 큰 마이크는 1.6이다.
  strokeWidth?: number;
}

function StrokeIcon({ className, strokeWidth = 2, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      className={`block flex-none ${className ?? ''}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function MicIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </StrokeIcon>
  );
}

export function HistoryIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </StrokeIcon>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </StrokeIcon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </StrokeIcon>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="m9 6 6 6-6 6" />
    </StrokeIcon>
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </StrokeIcon>
  );
}

export function DownloadIcon({ strokeWidth = 2.2, ...props }: IconProps) {
  return (
    <StrokeIcon strokeWidth={strokeWidth} {...props}>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </StrokeIcon>
  );
}

export function WarningIcon(props: IconProps) {
  return (
    <StrokeIcon {...props}>
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    </StrokeIcon>
  );
}

export function CheckIcon({ strokeWidth = 2.2, ...props }: IconProps) {
  return (
    <StrokeIcon strokeWidth={strokeWidth} {...props}>
      <path d="M20 6 9 17l-5-5" />
    </StrokeIcon>
  );
}

// 녹음 종료 버튼의 네모. 선이 아니라 채운 도형이다.
export function StopIcon({ className }: Pick<IconProps, 'className'>) {
  return (
    <svg className={`block flex-none ${className ?? ''}`} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="5" width="14" height="14" rx="3" fill="currentColor" />
    </svg>
  );
}

// 브랜드 표시. 빨간 네모 안에 높이가 다른 막대 셋. small은 좁은 화면 위쪽 막대에 쓴다.
export function BrandMark({ small = false }: { small?: boolean }) {
  const heights = small ? [6, 11, 8] : [7, 13, 9];
  return (
    <span
      className={`flex flex-none items-center justify-center gap-0.5 bg-rec ${
        small ? 'size-[22px] rounded-md' : 'size-[26px] rounded-[7px]'
      }`}
      aria-hidden="true"
    >
      {heights.map((height, index) => (
        <i key={index} className="block w-[3px] rounded-sm bg-white" style={{ height }} />
      ))}
    </span>
  );
}
