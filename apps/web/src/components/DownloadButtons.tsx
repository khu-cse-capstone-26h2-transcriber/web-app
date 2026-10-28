// 히스토리 상세의 내려받기 버튼. 형식(EXPORT_FORMATS)마다 버튼을 두고, 내보내기 API(T11)로 받은 파일을 저장한다.
// 실패하면 이유를 버튼 아래에 보인다. 녹음 중인 세션은 서버가 409로 거절하므로 버튼을 막아 둔다.
import { EXPORT_FORMATS, type ExportFormat, type Session } from '@app/shared';
import { useState } from 'react';
import { Link } from 'react-router';
import { type DownloadedFile, toApiError } from '../api/client';
import { exportSession } from '../api/endpoints';

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
    <>
      <p style={{ display: 'flex', gap: 8 }}>
        {EXPORT_FORMATS.map((format) => (
          <button
            key={format}
            type="button"
            disabled={recording || downloading !== null}
            onClick={() => void handleDownload(format)}
          >
            {downloading === format ? '받는 중…' : `${format} 내려받기`}
          </button>
        ))}
      </p>
      {recording && (
        <p>
          녹음 중이라 아직 내려받을 수 없습니다. 녹음이 끝난 뒤 새로고침해 주세요.{' '}
          <Link to="/">녹음 화면으로</Link>
        </p>
      )}
      {notice && <p role="alert">{notice}</p>}
    </>
  );
}
