// 정의하지 않은 주소로 들어왔을 때의 화면. 히스토리 화면과 같은 여백과 제목 크기를 쓴다(T40).
import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <section className="flex-1 px-5 py-6 md:px-12 md:py-9">
      <h1 className="text-[26px] font-bold tracking-[-0.6px] md:text-[30px]">페이지를 찾을 수 없습니다</h1>
      <p className="mt-3">
        <Link to="/" className="text-sm text-muted underline underline-offset-4 hover:text-text3">
          녹음 화면으로
        </Link>
      </p>
    </section>
  );
}
