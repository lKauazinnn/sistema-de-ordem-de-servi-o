type ViaCepResponse = {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
};

export async function buscarCep(cep: string) {
  const sanitized = cep.replace(/\D/g, "");
  if (sanitized.length !== 8) {
    throw new Error("CEP invalido");
  }

  const response = await fetch(`https://viacep.com.br/ws/${sanitized}/json/`);
  const data = (await response.json()) as ViaCepResponse;

  if (data.erro) {
    throw new Error("CEP nao encontrado");
  }

  return `${data.logradouro}, ${data.bairro}, ${data.localidade}-${data.uf}`;
}
