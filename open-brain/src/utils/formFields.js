export function normalizeRequiredField(value) {
  return String(value ?? "").trim();
}

export function isRequiredFieldPresent(value) {
  return Boolean(normalizeRequiredField(value));
}

export function areRequiredFieldsPresent(values) {
  return values.every(isRequiredFieldPresent);
}
