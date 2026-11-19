// 히스토리 상세의 내려받기 버튼. 형식(EXPORT_FORMATS)마다 버튼을 두고, 내보내기 API(T11)로 받은 파일을 저장한다.
// 실패하면 이유를 버튼 아래에 보인다. 녹음 중인 세션은 서버가 409로 거절하므로 버튼을 막아 둔다.
// 모양은 확정안 F-4·F-7을 따른다(T40). 첫 형식(txt)은 흰 버튼, 그다음은 어두운 버튼이다.
// 받는 중인 버튼은 색을 둔 채 '받는 중…'을 보이고, 나머지와 녹음 중일 때는 흐리게 막는다.
import { EXPORT_FORMATS, type ExportFormat, type Session } from '@app/shared';
import { useState } from 'react';
import { Link } from 'react-router';
import { type DownloadedFile, toApiError } from '../api/client';
import { exportSession } from '../api/endpoints';
import { DownloadIcon } from './icons';

// 임시 주소를 풀기 전에 기다리는 시간. 바로 풀면 브라우저가 파일을 읽기 전에 주소가 사라질 수 있다.
const REVOKE_DELAY_MS = 30_000;

// 받은 파일을 임시 링크로 브라우저에 저장시킨다.
function saveFile({ filename, blob }: DownloadedFile) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}

// 버튼 색. 막힌 버튼은 형식과 상관없이 흐리다.
function buttonColor(index: number, blocked: boolean): string {
  if (blocked) return 'bg-off-bg text-off-text';
  return index === 0 ? 'bg-text text-bg hover:bg-white' : 'bg-surface2 text-soft hover:bg-line2';
}

export function DownloadButtons({ session }: { session: Session }) {
  // 받는 중인 형식. 받는 동안에는 두 버튼을 모두 막는다.
  const [downloading, setDownloading] = useState<ExportFormat | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const recording = session.status === 'recording';

  async function handleDownload(format: ExportFormat) {
    setNotice(null);
    setDownloading(format);
    try {
      saveFile(await exportSession(session.id, format));
    } catch (error) {
      setNotice(`내려받지 못했습니다: ${toApiError(error).message}`);
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="flex max-w-sm flex-col gap-2">
      <div className="flex flex-wrap gap-2.5">
        {EXPORT_FORMATS.map((format, index) => (
          <button
            key={format}
            type="button"
            disabled={recording || downloading !== null}
            onClick={() => void handleDownload(format)}
            className={`flex items-center gap-2 rounded-[10px] px-[17px] py-2.5 text-sm font-bold ${buttonColor(
              index,
              recording || (downloading !== null && downloading !== format),
            )}`}
          >
            {downloading === format ? (
              '받는 중…'
            ) : (
              <>
                <DownloadIcon className="size-4" />
                {format} 내려받기
              </>
            )}
          </button>
        ))}
      </div>
      {recording && (
        <p className="text-[13px] leading-normal text-warn-text">
          녹음 중이라 아직 내려받을 수 없습니다. 녹음이 끝난 뒤 새로고침해 주세요.{' '}
          <Link to="/" className="underline underline-offset-4">
            녹음 화면으로
          </Link>
        </p>
      )}
      {notice && (
        <p role="alert" className="text-[13px] text-rec-text">
          {notice}
        </p>
      )}
    </div>
  );
}
