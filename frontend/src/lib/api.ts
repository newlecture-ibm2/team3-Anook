export async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMessage = 'An error occurred while fetching data.';
    try {
      const errorData = await res.json();
      errorMessage = errorData.message || errorMessage;
    } catch (e) {
      // Ignored
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
