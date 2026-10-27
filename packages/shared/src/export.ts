// 히스토리 내보내기 형식. 서버의 내보내기 API(T11)와 웹의 다운로드 버튼(T16)이 함께 쓴다.
export const EXPORT_FORMATS = ['txt', 'md'] as const;

export type ExportFormat = (typeof EXPORT_FORMATS)[number];
