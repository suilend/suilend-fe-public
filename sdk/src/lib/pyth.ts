export const PRIMARY_PYTH_ENDPOINT = "https://hermes.pyth.network";

/**
 * Tests if a Pyth connection endpoint is working by checking the /api/live endpoint
 * @param endpoint The Pyth connection endpoint URL to test, e.g. https://hermes.pyth.network
 * @returns true if the connection is working, false otherwise
 */
export const testPythConnection = async (
  endpoint: string,
): Promise<boolean> => {
  try {
    const res = await fetch(`${endpoint}/live`, {
      signal: AbortSignal.timeout(5 * 1000), // 5 second timeout
    });

    return res.ok;
  } catch (err) {
    console.warn(
      `[testPythConnection] Pyth connection test failed for ${endpoint}:`,
      err,
    );
    return false;
  }
};

/**
 * Gets a working Pyth connection endpoint, trying primary first, then fallback if provided
 * @param fallbackPythEndpoint Optional fallback endpoint
 * @returns The endpoint URL that is working, or the primary endpoint if fallback fails
 */
export const getWorkingPythEndpoint = async (
  fallbackPythEndpoint?: string,
): Promise<string> => {
  // Test primary endpoint first
  const primaryWorking = await testPythConnection(PRIMARY_PYTH_ENDPOINT);
  if (primaryWorking) {
    console.log(
      `[getWorkingPythEndpoint] Using primary Pyth endpoint: ${PRIMARY_PYTH_ENDPOINT}`,
    );
    return PRIMARY_PYTH_ENDPOINT;
  }

  // If primary fails and fallback is provided, use fallback
  if (!!fallbackPythEndpoint) {
    console.warn(
      `[getWorkingPythEndpoint] Primary Pyth endpoint failed, using fallback: ${fallbackPythEndpoint}`,
    );
    return fallbackPythEndpoint;
  } else {
    console.error(
      `[getWorkingPythEndpoint] Primary Pyth endpoint failed, no fallback provided, using primary anyway`,
    );
    return PRIMARY_PYTH_ENDPOINT;
  }
};
