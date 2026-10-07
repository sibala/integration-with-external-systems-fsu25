/**
 * Extra: retries on temporary errors
 *
 * fetchJson below already works: a GET with a timeout that gives you JSON back. Today it gives up
 * at the first error. But some errors are temporary: the supplier is overloaded or restarting, and
 * the same call may work a second later. Make fetchJson try again on these status codes:
 *   408 Request Timeout · 429 Too Many Requests · 500 Internal Server Error
 *   502 Bad Gateway · 503 Service Unavailable · 504 Gateway Timeout
 *
 * Step 1: Constants (at the top of the file, under this comment)
 *     const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);  // a Set has a fast has() check
 *     const MAX_ATTEMPTS = 3;
 *
 * Step 2: A loop around the call (inside fetchJson)
 * - Wrap everything from fetch to return in a loop that counts the attempts:
 *     for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) { … }
 * - In practice the loop never runs out by itself: every attempt ends with return (success),
 *   throw (give up) or a new attempt, and the last attempt always returns or throws (step 3)
 *
 * Step 3: Inside the loop, right after fetch, decide what happens
 * - Success: return the JSON. That also ends the loop
 *     if (response.ok) { return response.json(); }
 * - Not worth retrying, or out of attempts: throw, like today
 *     if (!RETRYABLE.has(response.status) || attempt === MAX_ATTEMPTS) { throw … }
 * - Otherwise: log, wait one second, and let the loop make the next attempt
 *     console.warn(`Status ${response.status}, attempt ${attempt} of ${MAX_ATTEMPTS}. Trying again in 1 second.`);
 *     await new Promise((resolve) => setTimeout(resolve, 1000));
 *
 * Step 4: Test it
 * - Set SUPPLIER_API_URL=https://leverantor-api.vercel.app/chaos/v1 in .env and restart the server
 * - Reload the page a few times. The server's terminal should show attempts that fail with 503,
 *   and then succeed
 * - Change SUPPLIER_API_KEY to something wrong: 401 should fail AT ONCE, without any retries
 * - Switch back to /v1 and the right key when you're done
 *
 * NOTE! Don't retry 400, 401, 403 or 404. A wrong key or a missing product doesn't get better by trying again.
 * NOTE! If our own timeout fires or the network is down, fetch THROWS instead of returning a response,
 *       so those errors are not retried. That would need a try/catch inside the loop.
 */

type FetchJsonOptions = {
  headers?: Record<string, string>;
  timeoutMs?: number;
};

export async function fetchJson(
  url: string,
  { headers = {}, timeoutMs = 5000 }: FetchJsonOptions = {},
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(timeoutMs), // Timeout when response is to slow
    });
  } catch (err) {
    // fetch throws when we get no response at all. Say what happened, in plain words.
    if (err instanceof Error && err.name === 'TimeoutError') {
      throw new Error(`No response from ${url} within ${timeoutMs} ms (timeout)`);
    }
    throw new Error(`Could not reach ${url} (network error)`, { cause: err });
  }

  if (!response.ok) {
    throw new Error(`${url} responded with status ${response.status} ${response.statusText}`);
  }
  return response.json();
}
