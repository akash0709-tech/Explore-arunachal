// Turn API errors ({ success: false, message, errors }) into text for the UI.

/** Main message to show, e.g. in a toast. */
export function getErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  if (!error?.response) {
    return navigator.onLine ? "Cannot reach the server. Please try again." : "You are offline.";
  }
  return error.response.data?.message || fallback;
}

/**
 * Field errors as { fieldName: message }, for forms.
 * The API prefixes fields with where they came from ("body.email"), so we strip that.
 */
export function getFieldErrors(error) {
  const list = error?.response?.data?.errors ?? [];
  return Object.fromEntries(
    list.map(({ field, message }) => [field.replace(/^(body|query|params)\./, ""), message])
  );
}
