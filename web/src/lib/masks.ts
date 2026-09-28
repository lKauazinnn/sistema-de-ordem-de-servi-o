export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function applyPattern(digits: string, pattern: string): string {
  let out = "";
  let digitIndex = 0;

  for (let i = 0; i < pattern.length && digitIndex < digits.length; i++) {
    if (pattern[i] === "9") {
      out += digits[digitIndex];
      digitIndex++;
    } else {
      out += pattern[i];
    }
  }

  return out;
}

const CPF_PATTERN = "999.999.999-99";
const CNPJ_PATTERN = "99.999.999/9999-99";
const CEP_PATTERN = "99.999-99";
const CELULAR_PATTERN = "(99)9 9999-9999";

export function maskCpf(value: string): string {
  return applyPattern(onlyDigits(value).slice(0, 11), CPF_PATTERN);
}

export function maskCnpj(value: string): string {
  return applyPattern(onlyDigits(value).slice(0, 14), CNPJ_PATTERN);
}

export function maskCpfCnpj(value: string): string {
  const digits = onlyDigits(value);
  return digits.length > 11 ? maskCnpj(digits) : maskCpf(digits);
}

export function maskCep(value: string): string {
  return applyPattern(onlyDigits(value).slice(0, 7), CEP_PATTERN);
}

export function maskCelular(value: string): string {
  return applyPattern(onlyDigits(value).slice(0, 11), CELULAR_PATTERN);
}
