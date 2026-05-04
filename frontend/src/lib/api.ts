export async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMessage = 'An error occurred while fetching data.';
    try {
      const errorData = await res.json();
      errorMessage = errorData.message || errorMessage;

      // 401 에러(세션 만료 등) 처리
      if (res.status === 401) {
        if (typeof window !== 'undefined') {
          // 컴포넌트의 alert()가 JS 스레드를 블로킹하므로,
          // 사용자가 확인 버튼을 누른 뒤에 리다이렉트 되도록 setTimeout 활용
          setTimeout(() => {
            if (errorData.code === 'DUPLICATE_LOGIN') {
              window.location.href = '/login?error=DUPLICATE_LOGIN';
            } else {
              window.location.href = '/login';
            }
          }, 10);
        }
      }
    } catch (e) {
      // JSON 파싱 실패 등은 무시하고 기본 에러 메시지 사용
    }
    throw new Error(errorMessage);
  }

  // 204 No Content
  if (res.status === 204) {
    return {} as T;
  }

  const text = await res.text();
  if (!text) {
    return {} as T;
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    return {} as T;
  }
}
