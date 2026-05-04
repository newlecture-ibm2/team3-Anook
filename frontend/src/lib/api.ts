export async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMessage = 'An error occurred while fetching data.';
    try {
      const errorData = await res.json();
      errorMessage = errorData.message || errorMessage;

      // 중복 로그인(다른 기기 접속) 감지 시
      if (res.status === 401 && errorData.code === 'DUPLICATE_LOGIN') {
        if (typeof window !== 'undefined') {
          // 세션 만료 및 중복 로그인 알림을 위해 리다이렉트
          window.location.href = '/login?error=DUPLICATE_LOGIN';
          // 리다이렉트 중이므로 더 이상의 로직 진행(setState 등)을 막기 위해 예외 발생
          throw new Error('DUPLICATE_LOGIN_REDIRECT');
        }
      }
    } catch (e) {
      if (e instanceof Error && e.message === 'DUPLICATE_LOGIN_REDIRECT') {
        throw e;
      }
      // JSON 파싱 실패 등은 무시하고 기본 에러 메시지 사용
    }
    throw new Error(errorMessage);
  }

  // 204 No Content
  if (res.status === 204) {
    return {} as T;
  }

  return res.json();
}
