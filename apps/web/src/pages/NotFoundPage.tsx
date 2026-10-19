// 정의하지 않은 주소로 들어왔을 때의 화면.
import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <section>
      <h1>페이지를 찾을 수 없습니다</h1>
      <p>
        <Link to="/">녹음 화면으로</Link>
      </p>
    </section>
  );
}
