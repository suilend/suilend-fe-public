export const PRIMARY_PYTH_ENDPOINT = "https://hermes.pyth.network";

/**
 * Tests if the primary Pyth connection endpoint is working by checking the /live endpoint
 * @returns true if the connection is working, false otherwise
 */
export const testPrimaryPythConnection = async (): Promise<boolean> => {
  try {
    const res = await fetch(`${PRIMARY_PYTH_ENDPOINT}/live`, {
      signal: AbortSignal.timeout(5 * 1000), // 5 second timeout
    });

    return res.ok;
  } catch (err) {
    console.warn(
      `[testPrimaryPythConnection] Pyth connection test failed for ${PRIMARY_PYTH_ENDPOINT}:`,
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
  const primaryWorking = await testPrimaryPythConnection();
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
