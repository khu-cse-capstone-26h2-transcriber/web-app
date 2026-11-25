// GET /health의 성공 응답. DB가 꺼져 있으면 서버는 503 DB_UNAVAILABLE로 답한다.
export interface Health {
  status: 'ok';
  // 기기에 물리 녹음 버튼이 있는지(서버 .env의 DEVICE_BUTTON, T43).
  // false면 웹 버튼이 녹음의 주 제어이고, true면 기기 버튼이 주 제어이고 웹 버튼은 보조다.
  deviceButton: boolean;
}
