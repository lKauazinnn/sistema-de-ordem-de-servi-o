type ValidateInput = {
  value: string;
  tipoEquipamento?: string;
};

export type ValidateResult = {
  valid: boolean;
  type: "imei" | "serial";
  normalized: string;
  message: string;
};

function normalizeRaw(value: string) {
  return value.trim();
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function isDigitsOnly(value: string) {
  return /^\d+$/.test(value);
}

export function isValidImeiDigits(imei: string) {
  if (!/^\d{15}$/.test(imei)) return false;

  let sum = 0;
  for (let i = 0; i < imei.length; i += 1) {
    let digit = Number(imei[i]);
    if (Number.isNaN(digit)) return false;

    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
  }

  return sum % 10 === 0;
}

export function validateSerialOrImei(input: ValidateInput): ValidateResult {
  const normalized = normalizeRaw(input.value);
  const digits = onlyDigits(normalized);
  const lowerTipo = (input.tipoEquipamento ?? "").toLowerCase();
  const isCelular = lowerTipo === "celular";

  if (!normalized) {
    return {
      valid: false,
      type: "serial",
      normalized,
      message: "Informe o Serial/IMEI."
    };
  }

  if (isDigitsOnly(normalized) && normalized.length === 15) {
    const valid = isValidImeiDigits(normalized);
    return {
      valid,
      type: "imei",
      normalized,
      message: valid ? "IMEI válido." : "IMEI inválido. Verifique os 15 dígitos informados."
    };
  }

  if (isCelular) {
    if (digits.length === 15 && isValidImeiDigits(digits)) {
      return {
        valid: true,
        type: "imei",
        normalized: digits,
        message: "IMEI válido."
      };
    }

    return {
      valid: false,
      type: "imei",
      normalized,
      message: "Para celular, informe um IMEI válido de 15 dígitos."
    };
  }

  return {
    valid: normalized.length >= 3,
    type: "serial",
    normalized,
    message: normalized.length >= 3
      ? "Serial válido."
      : "Serial deve ter pelo menos 3 caracteres."
  };
}
