import jsPDF from "jspdf";
import type { AssistenciaTecnicaProfile, Cliente, OrdemServico } from "../types";
import type { NotaServicoResumoOs } from "../modules/os/service";

/**
 * Gera a Ordem de Servico no formato do formulario impresso da assistencia:
 * cabecalho com logo/contatos + faixa azul, blocos de cliente/aparelho/acessorios,
 * testes de funcionamento, termos e rodape. Campos que o sistema conhece sao
 * preenchidos sobre a linha; os demais ficam em branco para preenchimento a mao.
 */

type RGB = readonly [number, number, number];

const COMPANY = {
  nome: import.meta.env.VITE_COMPANY_NAME ?? "OrdemFlow Tech",
  cnpj: import.meta.env.VITE_COMPANY_CNPJ ?? "",
  telefone: import.meta.env.VITE_COMPANY_PHONE ?? ""
};

const NAVY: RGB = [22, 53, 104];
const NAVY_SOFT: RGB = [42, 88, 155];
const BLUE: RGB = [31, 94, 214];
const BLUE_TITLE: RGB = [22, 78, 190];
const INK: RGB = [25, 34, 49];
const BODY: RGB = [55, 65, 81];
const MUTED: RGB = [110, 125, 145];
const RULE: RGB = [178, 192, 209];
const BOXLINE: RGB = [209, 218, 230];
const SOFT: RGB = [244, 247, 251];
const DARK: RGB = [24, 28, 36];
const WHITE: RGB = [255, 255, 255];

// ---------------------------------------------------------------- utilitarios

const fill = (doc: jsPDF, c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
const stroke = (doc: jsPDF, c: RGB) => doc.setDrawColor(c[0], c[1], c[2]);
const ink = (doc: jsPDF, c: RGB) => doc.setTextColor(c[0], c[1], c[2]);

function font(doc: jsPDF, style: "normal" | "bold" | "italic", size: number) {
  doc.setFont("helvetica", style);
  doc.setFontSize(size);
}

/** Corta o texto com reticencias quando ele nao cabe na largura disponivel. */
function fitText(doc: jsPDF, text: string, maxWidth: number) {
  if (!text) return "";
  if (doc.getTextWidth(text) <= maxWidth) return text;

  let out = text;
  while (out.length > 1 && doc.getTextWidth(`${out}...`) > maxWidth) {
    out = out.slice(0, -1);
  }
  return `${out}...`;
}

/** Maior corpo de fonte (em pt) em que o texto ainda cabe na largura. */
function fitFontSize(doc: jsPDF, text: string, maxWidth: number, max: number, min: number) {
  let size = max;
  doc.setFontSize(size);
  while (size > min) {
    doc.setFontSize(size);
    if (doc.getTextWidth(text) <= maxWidth) break;
    size -= 0.5;
  }
  doc.setFontSize(size);
  return size;
}

function formatarData(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("pt-BR");
}

function formatarMoeda(valor?: number | null) {
  if (valor === null || valor === undefined) return "";
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function resolveCompany(company?: Partial<AssistenciaTecnicaProfile>) {
  return {
    nome: company?.assistencia_nome?.trim() || COMPANY.nome,
    cnpj: company?.assistencia_cnpj?.trim() || COMPANY.cnpj,
    telefone: company?.assistencia_telefone?.trim() || COMPANY.telefone,
    endereco: company?.assistencia_endereco?.trim() || "",
    instagram: company?.assistencia_instagram?.trim() || "",
    logoUrl: company?.assistencia_logo_url?.trim() || ""
  };
}

async function carregarLogo(url: string): Promise<{ dataUrl: string; width: number; height: number } | null> {
  if (!url) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) return null;

    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = reject;
      img.src = dataUrl;
    });

    return { dataUrl, ...dimensions };
  } catch {
    return null;
  }
}

// -------------------------------------------------------------------- icones
// Desenhados com primitivas para manter o PDF vetorial (nitido na impressao).

function glyphUser(doc: jsPDF, cx: number, cy: number, s: number, c: RGB) {
  fill(doc, c);
  doc.circle(cx, cy - 0.22 * s, 0.2 * s, "F");
  doc.roundedRect(cx - 0.32 * s, cy + 0.04 * s, 0.64 * s, 0.3 * s, 0.14 * s, 0.14 * s, "F");
}

function glyphDevice(doc: jsPDF, cx: number, cy: number, s: number, c: RGB, bg: RGB) {
  fill(doc, c);
  doc.roundedRect(cx - 0.2 * s, cy - 0.42 * s, 0.4 * s, 0.84 * s, 0.07 * s, 0.07 * s, "F");
  fill(doc, bg);
  doc.rect(cx - 0.08 * s, cy - 0.34 * s, 0.16 * s, 0.035 * s, "F");
  doc.circle(cx, cy + 0.3 * s, 0.05 * s, "F");
}

function glyphBag(doc: jsPDF, cx: number, cy: number, s: number, c: RGB) {
  fill(doc, c);
  stroke(doc, c);
  doc.setLineWidth(0.1 * s);
  doc.lines([[0, -0.18 * s], [0.3 * s, 0], [0, 0.18 * s]], cx - 0.15 * s, cy - 0.16 * s, [1, 1], "S", false);
  doc.roundedRect(cx - 0.34 * s, cy - 0.16 * s, 0.68 * s, 0.5 * s, 0.07 * s, 0.07 * s, "F");
}

function glyphGear(doc: jsPDF, cx: number, cy: number, s: number, c: RGB, bg: RGB) {
  fill(doc, c);
  doc.circle(cx, cy, 0.33 * s, "F");
  for (let i = 0; i < 8; i += 1) {
    const angle = (Math.PI / 4) * i;
    doc.circle(cx + Math.cos(angle) * 0.38 * s, cy + Math.sin(angle) * 0.38 * s, 0.09 * s, "F");
  }
  fill(doc, bg);
  doc.circle(cx, cy, 0.13 * s, "F");
}

function glyphCamera(doc: jsPDF, cx: number, cy: number, s: number, c: RGB, bg: RGB) {
  fill(doc, c);
  doc.rect(cx - 0.16 * s, cy - 0.38 * s, 0.32 * s, 0.14 * s, "F");
  doc.roundedRect(cx - 0.44 * s, cy - 0.28 * s, 0.88 * s, 0.58 * s, 0.08 * s, 0.08 * s, "F");
  fill(doc, bg);
  doc.circle(cx, cy + 0.01 * s, 0.17 * s, "F");
}

function glyphShield(doc: jsPDF, cx: number, cy: number, s: number, c: RGB) {
  fill(doc, c);
  doc.lines(
    [[0.32 * s, 0.13 * s], [0, 0.32 * s], [-0.32 * s, 0.35 * s], [-0.32 * s, -0.35 * s], [0, -0.32 * s]],
    cx,
    cy - 0.45 * s,
    [1, 1],
    "F",
    true
  );
}

function glyphCart(doc: jsPDF, cx: number, cy: number, s: number, c: RGB) {
  fill(doc, c);
  stroke(doc, c);
  doc.setLineWidth(0.09 * s);
  doc.lines([[0.13 * s, 0], [0.07 * s, 0.3 * s]], cx - 0.42 * s, cy - 0.3 * s, [1, 1], "S", false);
  doc.rect(cx - 0.22 * s, cy - 0.14 * s, 0.58 * s, 0.22 * s, "F");
  doc.circle(cx - 0.1 * s, cy + 0.26 * s, 0.08 * s, "F");
  doc.circle(cx + 0.24 * s, cy + 0.26 * s, 0.08 * s, "F");
}

function glyphSearch(doc: jsPDF, cx: number, cy: number, s: number, c: RGB) {
  stroke(doc, c);
  doc.setLineWidth(0.11 * s);
  doc.circle(cx - 0.06 * s, cy - 0.1 * s, 0.25 * s, "S");
  doc.line(cx + 0.13 * s, cy + 0.09 * s, cx + 0.33 * s, cy + 0.33 * s);
}

function glyphMoney(doc: jsPDF, cx: number, cy: number, s: number, c: RGB) {
  stroke(doc, c);
  doc.setLineWidth(0.09 * s);
  doc.circle(cx, cy, 0.36 * s, "S");
  ink(doc, c);
  font(doc, "bold", s * 1.65);
  doc.text("$", cx, cy + 0.21 * s, { align: "center" });
}

function glyphMedal(doc: jsPDF, cx: number, cy: number, s: number, c: RGB) {
  fill(doc, c);
  doc.triangle(cx - 0.26 * s, cy + 0.44 * s, cx - 0.04 * s, cy + 0.44 * s, cx - 0.15 * s, cy + 0.02 * s, "F");
  doc.triangle(cx + 0.04 * s, cy + 0.44 * s, cx + 0.26 * s, cy + 0.44 * s, cx + 0.15 * s, cy + 0.02 * s, "F");
  doc.circle(cx, cy - 0.11 * s, 0.28 * s, "F");
}

function glyphCalendar(doc: jsPDF, cx: number, cy: number, s: number, c: RGB, bg: RGB) {
  fill(doc, c);
  doc.rect(cx - 0.22 * s, cy - 0.44 * s, 0.08 * s, 0.14 * s, "F");
  doc.rect(cx + 0.14 * s, cy - 0.44 * s, 0.08 * s, 0.14 * s, "F");
  doc.roundedRect(cx - 0.38 * s, cy - 0.34 * s, 0.76 * s, 0.68 * s, 0.06 * s, 0.06 * s, "F");
  fill(doc, bg);
  doc.rect(cx - 0.3 * s, cy - 0.13 * s, 0.6 * s, 0.04 * s, "F");
  for (let row = 0; row < 2; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      doc.rect(cx - 0.24 * s + col * 0.18 * s, cy - 0.02 * s + row * 0.15 * s, 0.1 * s, 0.08 * s, "F");
    }
  }
}

function glyphExclam(doc: jsPDF, cx: number, cy: number, s: number, c: RGB) {
  fill(doc, c);
  doc.roundedRect(cx - 0.055 * s, cy - 0.28 * s, 0.11 * s, 0.34 * s, 0.05 * s, 0.05 * s, "F");
  doc.circle(cx, cy + 0.21 * s, 0.075 * s, "F");
}

function glyphCalculator(doc: jsPDF, cx: number, cy: number, s: number, c: RGB, bg: RGB) {
  fill(doc, c);
  doc.roundedRect(cx - 0.3 * s, cy - 0.42 * s, 0.6 * s, 0.84 * s, 0.07 * s, 0.07 * s, "F");
  fill(doc, bg);
  doc.rect(cx - 0.2 * s, cy - 0.32 * s, 0.4 * s, 0.16 * s, "F");
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      doc.rect(cx - 0.2 * s + col * 0.15 * s, cy - 0.06 * s + row * 0.14 * s, 0.09 * s, 0.09 * s, "F");
    }
  }
}

function glyphTools(doc: jsPDF, cx: number, cy: number, s: number, c: RGB) {
  stroke(doc, c);
  fill(doc, c);
  doc.setLineWidth(0.13 * s);
  doc.line(cx - 0.28 * s, cy + 0.3 * s, cx + 0.22 * s, cy - 0.2 * s);
  doc.line(cx - 0.22 * s, cy - 0.2 * s, cx + 0.28 * s, cy + 0.3 * s);
  doc.circle(cx + 0.28 * s, cy - 0.3 * s, 0.12 * s, "F");
  doc.circle(cx - 0.28 * s, cy - 0.3 * s, 0.12 * s, "F");
}

function glyphCheck(doc: jsPDF, cx: number, cy: number, s: number, c: RGB) {
  stroke(doc, c);
  doc.setLineWidth(0.1 * s);
  doc.circle(cx, cy, 0.42 * s, "S");
  doc.setLineWidth(0.13 * s);
  doc.lines([[0.11 * s, 0.13 * s], [0.22 * s, -0.27 * s]], cx - 0.16 * s, cy + 0.02 * s, [1, 1], "S", false);
}

function glyphShieldOutline(doc: jsPDF, cx: number, cy: number, s: number, c: RGB) {
  stroke(doc, c);
  doc.setLineWidth(0.1 * s);
  doc.circle(cx, cy, 0.42 * s, "S");
  glyphShield(doc, cx, cy, s * 0.52, c);
}

function glyphHeadset(doc: jsPDF, cx: number, cy: number, s: number, c: RGB) {
  stroke(doc, c);
  fill(doc, c);
  doc.setLineWidth(0.09 * s);
  doc.circle(cx, cy, 0.42 * s, "S");
  doc.lines([[0, -0.16 * s], [0.34 * s, 0], [0, 0.16 * s]], cx - 0.17 * s, cy - 0.1 * s, [1, 1], "S", false);
  doc.roundedRect(cx - 0.24 * s, cy - 0.08 * s, 0.14 * s, 0.26 * s, 0.06 * s, 0.06 * s, "F");
  doc.roundedRect(cx + 0.1 * s, cy - 0.08 * s, 0.14 * s, 0.26 * s, 0.06 * s, 0.06 * s, "F");
}

function glyphWhatsapp(doc: jsPDF, cx: number, cy: number, s: number, circle: RGB, mark: RGB) {
  fill(doc, circle);
  doc.circle(cx, cy, 0.5 * s, "F");
  stroke(doc, mark);
  fill(doc, mark);
  doc.setLineWidth(0.08 * s);
  doc.circle(cx + 0.02 * s, cy - 0.04 * s, 0.25 * s, "S");
  doc.triangle(cx - 0.3 * s, cy + 0.32 * s, cx - 0.04 * s, cy + 0.18 * s, cx - 0.18 * s, cy + 0.04 * s, "F");
  doc.circle(cx + 0.02 * s, cy - 0.04 * s, 0.09 * s, "F");
}

function glyphInstagram(doc: jsPDF, cx: number, cy: number, s: number, c: RGB) {
  stroke(doc, c);
  fill(doc, c);
  doc.setLineWidth(0.09 * s);
  doc.roundedRect(cx - 0.42 * s, cy - 0.42 * s, 0.84 * s, 0.84 * s, 0.24 * s, 0.24 * s, "S");
  doc.circle(cx, cy, 0.21 * s, "S");
  doc.circle(cx + 0.24 * s, cy - 0.24 * s, 0.06 * s, "F");
}

function glyphPin(doc: jsPDF, cx: number, cy: number, s: number, c: RGB, bg: RGB) {
  fill(doc, c);
  doc.circle(cx, cy - 0.12 * s, 0.32 * s, "F");
  doc.triangle(cx - 0.21 * s, cy + 0.06 * s, cx + 0.21 * s, cy + 0.06 * s, cx, cy + 0.46 * s, "F");
  fill(doc, bg);
  doc.circle(cx, cy - 0.12 * s, 0.12 * s, "F");
}

// ------------------------------------------------------------ blocos do form

/** Moldura arredondada clara usada por todos os blocos. */
function sectionBox(doc: jsPDF, x: number, y: number, w: number, h: number) {
  stroke(doc, BOXLINE);
  doc.setLineWidth(0.4);
  doc.roundedRect(x, y, w, h, 2, 2, "S");
}

type TabIcon = (doc: jsPDF, cx: number, cy: number, s: number) => void;

/** Etiqueta azul encaixada sobre a borda superior do bloco. */
function sectionTab(doc: jsPDF, x: number, y: number, title: string, icon: TabIcon) {
  font(doc, "bold", 8);
  const textWidth = doc.getTextWidth(title);
  const w = textWidth + 13.5;
  const h = 6.6;

  fill(doc, BLUE);
  doc.roundedRect(x, y - h / 2, w, h, 1.6, 1.6, "F");
  icon(doc, x + 4.6, y, 4.6);
  ink(doc, WHITE);
  doc.text(title, x + 8.8, y + 1.5);
  return w;
}

/** Complemento em cinza logo depois da etiqueta azul (ex.: "(entrada)"). */
function tabHint(doc: jsPDF, x: number, y: number, texto: string) {
  font(doc, "normal", 7.4);
  ink(doc, MUTED);
  doc.text(texto, x + 2.5, y + 1.4);
}

/** Cabecalho simples (faixa cinza) para blocos sem etiqueta. */
function plainHeader(doc: jsPDF, x: number, y: number, w: number, title: string) {
  fill(doc, SOFT);
  doc.roundedRect(x + 0.4, y + 0.4, w - 0.8, 7.2, 1.6, 1.6, "F");
  fill(doc, SOFT);
  doc.rect(x + 0.4, y + 4, w - 0.8, 3.6, "F");
  ink(doc, INK);
  font(doc, "bold", 8);
  doc.text(title, x + 4, y + 5.4);
}

/** Campo com rotulo em negrito e linha de preenchimento; valor impresso sobre a linha. */
function ruledField(doc: jsPDF, label: string, value: string, x: number, y: number, endX: number) {
  font(doc, "bold", 7.6);
  ink(doc, INK);
  doc.text(label, x, y);
  const labelWidth = doc.getTextWidth(label);
  const lineStart = x + labelWidth + 1.6;

  stroke(doc, RULE);
  doc.setLineWidth(0.25);
  doc.line(lineStart, y + 1, endX, y + 1);

  if (value) {
    font(doc, "normal", 7.6);
    ink(doc, BODY);
    doc.text(fitText(doc, value, endX - lineStart - 2), lineStart + 1.2, y);
  }
}

/** Linha em branco para preenchimento a mao. */
function blankLine(doc: jsPDF, x: number, y: number, endX: number) {
  stroke(doc, RULE);
  doc.setLineWidth(0.25);
  doc.line(x, y, endX, y);
}

function checkbox(doc: jsPDF, x: number, y: number, label: string) {
  const size = 2.7;
  stroke(doc, MUTED);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y - size + 0.5, size, size, 0.4, 0.4, "S");
  font(doc, "normal", 7);
  ink(doc, BODY);
  doc.text(label, x + size + 1.8, y);
}

// ----------------------------------------------------------------- documento

const PAGE_W = 210;
const PAGE_H = 297;
const FRAME = 2.2;
const L = 7;
const R = 203;
const W = R - L;
const GUTTER = 4;
const COL_W = (W - GUTTER) / 2;
const COL_R_X = L + COL_W + GUTTER;

const TERMS_TOP = 149;
const TERMS_BOTTOM = 247;

type Termo = { titulo: string; corpo: string; icon: TabIcon };

function montarTermos(empresa: string, garantiaDias: string): { coluna1: Termo[]; coluna2: Termo[]; final: Termo } {
  const coluna1: Termo[] = [
    {
      titulo: "1. TERMO DE RESPONSABILIDADE",
      icon: (doc, cx, cy, s) => glyphShield(doc, cx, cy, s, WHITE),
      corpo:
        `Autorizo a ${empresa} a realizar a abertura do aparelho para diagnóstico e/ou reparo. Estou ciente de que aparelhos que já apresentem danos, oxidação, quedas, amassados, cola de alta resistência, reparos anteriores ou peças paralelas poderão sofrer danos adicionais durante a desmontagem, sem que isso caracterize responsabilidade da assistência técnica.\n` +
        "Autorizo também os testes necessários para diagnóstico e reparo."
    },
    {
      titulo: "3. ANÁLISE TÉCNICA ESPECIALIZADA",
      icon: (doc, cx, cy, s) => glyphSearch(doc, cx, cy, s, WHITE),
      corpo:
        "Nos casos em que o diagnóstico exigir envio do aparelho ou da placa para laboratório especializado, assistência terceirizada ou fornecedor, o cliente autoriza esse procedimento.\n" +
        "Caso haja desistência após essa análise, além da taxa de verificação prevista para orçamento não autorizado, o cliente será responsável pelo reembolso das despesas efetivamente realizadas mediante comprovação."
    },
    {
      titulo: "5. GARANTIA",
      icon: (doc, cx, cy, s) => glyphMedal(doc, cx, cy, s, WHITE),
      corpo:
        `Os serviços executados possuem garantia de ${garantiaDias} dias.\n` +
        "A garantia cobre apenas o serviço realizado.\n" +
        "A garantia perde a validade em caso de:\n" +
        "• Queda   • Oxidação   • Mau uso   • Contato com líquidos\n" +
        "• Violação do aparelho   • Reparo realizado por terceiros\n" +
        "• Danos físicos posteriores\n" +
        "Peças quebradas por mau uso não possuem garantia."
    }
  ];

  const coluna2: Termo[] = [
    {
      titulo: "2. ORÇAMENTO E DESISTÊNCIA",
      icon: (doc, cx, cy, s) => glyphCart(doc, cx, cy, s, WHITE),
      corpo:
        `Após a aprovação do orçamento, a ${empresa} poderá adquirir peças junto aos fornecedores para execução do serviço.\n` +
        "Caso o cliente desista após a compra das peças ou após a contratação de serviços necessários ao reparo, serão descontados do valor pago todos os custos já realizados, incluindo:\n" +
        "• Peças adquiridas   • Fretes   • Motoboy   • Uber   • Taxas de fornecedores\n" +
        "• Serviços terceirizados   • Custos operacionais.\n" +
        "Será devolvido apenas eventual saldo remanescente."
    },
    {
      titulo: "4. TAXA DE VERIFICAÇÃO",
      icon: (doc, cx, cy, s) => glyphMoney(doc, cx, cy, s, WHITE),
      corpo:
        "Em caso de orçamento não aprovado, será cobrada taxa de verificação de R$ 30,00.\n" +
        "Caso o diagnóstico exija laboratório especializado ou serviços terceirizados, poderão ser cobrados os custos adicionais efetivamente realizados."
    },
    {
      titulo: "6. APARELHO NÃO RETIRADO",
      icon: (doc, cx, cy, s) => glyphCalendar(doc, cx, cy, s, WHITE, BLUE),
      corpo:
        "Após a conclusão do serviço, o cliente será comunicado.\n" +
        "Caso o aparelho permaneça por mais de 90 dias sem retirada e sem justificativa, após tentativas de contato, poderão ser adotadas as medidas legais cabíveis para ressarcimento das despesas de armazenamento e serviço."
    }
  ];

  const final: Termo = {
    titulo: "7. OUTRAS CONDIÇÕES",
    icon: (doc, cx, cy, s) => glyphExclam(doc, cx, cy, s, WHITE),
    corpo:
      `• A ${empresa} não se responsabiliza por películas, capinhas, vidros temperados ou acessórios instalados no aparelho, podendo ser necessária sua remoção durante o reparo, sem garantia de reaproveitamento.\n` +
      "• Não nos responsabilizamos por dados, senhas ou informações do cliente. Recomendamos backup.\n" +
      "• Declaro que todas as informações prestadas são verdadeiras e que li e concordo com todas as condições desta Ordem de Serviço."
  };

  return { coluna1, coluna2, final };
}

function alturaTermo(doc: jsPDF, termo: Termo, larguraTexto: number, size: number, lh: number) {
  font(doc, "normal", size);
  const linhas = doc.splitTextToSize(termo.corpo, larguraTexto) as string[];
  return { linhas, altura: 10.2 + (linhas.length - 1) * lh + 2.6 };
}

function desenharTermo(doc: jsPDF, termo: Termo, linhas: string[], x: number, y: number, w: number, h: number, size: number, lh: number) {
  sectionBox(doc, x, y, w, h);
  fill(doc, BLUE);
  doc.circle(x + 5.8, y + 5.4, 3.6, "F");
  termo.icon(doc, x + 5.8, y + 5.4, 4.1);

  ink(doc, BLUE_TITLE);
  font(doc, "bold", 7.2);
  doc.text(termo.titulo, x + 11.2, y + 6.5);

  ink(doc, BODY);
  font(doc, "normal", size);
  linhas.forEach((linha, index) => {
    doc.text(linha, x + 11.2, y + 10.2 + index * lh);
  });
}

export async function gerarPdfOS(
  os: OrdemServico,
  cliente?: Cliente | null,
  nota?: NotaServicoResumoOs | null,
  company?: Partial<AssistenciaTecnicaProfile>
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const empresa = resolveCompany(company);
  const logo = await carregarLogo(empresa.logoUrl);

  // ---------------------------------------------------------- moldura da pagina
  fill(doc, DARK);
  doc.rect(0, 0, PAGE_W, PAGE_H, "F");
  fill(doc, WHITE);
  doc.roundedRect(FRAME, FRAME, PAGE_W - FRAME * 2, PAGE_H - FRAME * 2, 2.4, 2.4, "F");

  // ------------------------------------------------------------------ cabecalho
  const headerBottom = 36.2;
  const navyTopX = 132;
  const navyBottomX = 114;

  fill(doc, NAVY_SOFT);
  doc.lines(
    [[7.5, 0], [navyBottomX - navyTopX, headerBottom - FRAME], [-7.5, 0]],
    navyTopX - 12.5,
    FRAME,
    [1, 1],
    "F",
    true
  );

  fill(doc, NAVY);
  doc.lines(
    [[PAGE_W - FRAME - navyTopX, 0], [0, headerBottom - FRAME], [navyBottomX - (PAGE_W - FRAME), 0]],
    navyTopX,
    FRAME,
    [1, 1],
    "F",
    true
  );

  // logo (ou nome da empresa)
  let logoDesenhada = false;
  if (logo) {
    const maxW = 48;
    const maxH = 21;
    const ratio = logo.width / logo.height;
    let h = maxH;
    let w = h * ratio;
    if (w > maxW) {
      w = maxW;
      h = w / ratio;
    }
    try {
      doc.addImage(logo.dataUrl, "PNG", 8, 7 + (maxH - h) / 2, w, h);
      logoDesenhada = true;
    } catch {
      logoDesenhada = false;
    }
  }

  if (!logoDesenhada) {
    // Primeiro tenta caber em uma linha so; se nao der, quebra em duas.
    let nomeSize = fitFontSize(doc, empresa.nome, 53, 22, 12);
    font(doc, "bold", nomeSize);
    let nomeLinhas: string[] = [empresa.nome];

    if (doc.getTextWidth(empresa.nome) > 53) {
      for (nomeSize = 13; nomeSize >= 8; nomeSize -= 1) {
        font(doc, "bold", nomeSize);
        nomeLinhas = doc.splitTextToSize(empresa.nome, 53) as string[];
        if (nomeLinhas.length <= 2) break;
      }
    }

    font(doc, "bold", nomeSize);
    nomeLinhas = nomeLinhas.slice(0, 2).map((linha) => fitText(doc, linha, 53));

    const nomeLh = nomeSize * 0.3528 * 1.15;
    const primeiraLinhaY = 18 - ((nomeLinhas.length - 1) * nomeLh) / 2;
    ink(doc, NAVY);
    nomeLinhas.forEach((linha, index) => {
      doc.text(linha, 8, primeiraLinhaY + index * nomeLh);
    });

    ink(doc, MUTED);
    font(doc, "normal", 6);
    doc.text("ASSISTÊNCIA TÉCNICA E ACESSÓRIOS", 8, primeiraLinhaY + (nomeLinhas.length - 1) * nomeLh + 4.6);
  }

  const contatos: Array<{ icon: TabIcon; linhas: string[] }> = [];
  if (empresa.telefone) {
    contatos.push({
      icon: (d, cx, cy, s) => glyphWhatsapp(d, cx, cy, s, BLUE, WHITE),
      linhas: [empresa.telefone]
    });
  }
  if (empresa.instagram) {
    contatos.push({
      icon: (d, cx, cy, s) => glyphInstagram(d, cx, cy, s, BLUE),
      linhas: [empresa.instagram.startsWith("@") ? empresa.instagram : `@${empresa.instagram}`]
    });
  }
  if (empresa.endereco) {
    font(doc, "normal", 7.5);
    let enderecoLinhas = doc.splitTextToSize(empresa.endereco, 30) as string[];
    if (enderecoLinhas.length > 2) {
      enderecoLinhas = [enderecoLinhas[0], fitText(doc, enderecoLinhas.slice(1).join(" "), 30)];
    }
    contatos.push({
      icon: (d, cx, cy, s) => glyphPin(d, cx, cy, s, BLUE, WHITE),
      linhas: enderecoLinhas
    });
  }
  if (empresa.cnpj) {
    contatos.push({
      icon: (d, cx, cy, s) => glyphBag(d, cx, cy, s, BLUE),
      linhas: [`CNPJ ${empresa.cnpj}`]
    });
  }

  if (contatos.length > 0) {
    stroke(doc, BOXLINE);
    doc.setLineWidth(0.4);
    doc.line(63, 9, 63, 31);
  }

  let contatoY = contatos.length >= 3 ? 13 : 17;
  contatos.slice(0, 3).forEach((contato) => {
    contato.icon(doc, 67.5, contatoY - 1.1, 4.8);
    ink(doc, INK);
    font(doc, "normal", 7.5);
    contato.linhas.forEach((linha, index) => {
      doc.text(fitText(doc, linha, 31), 73, contatoY + index * 3.6);
    });
    contatoY += contato.linhas.length > 1 ? 9.4 : 7.6;
  });

  // titulo na faixa azul
  ink(doc, WHITE);
  font(doc, "bold", 17);
  fitFontSize(doc, "ORDEM DE SERVIÇO", 64, 17, 10);
  doc.text("ORDEM DE SERVIÇO", 202, 13.6, { align: "right" });

  const numero = `Nº ${String(os.numero_sequencial).padStart(5, "0")}`;
  stroke(doc, WHITE);
  doc.setLineWidth(0.7);
  fill(doc, NAVY);
  doc.roundedRect(143, 16.6, 59, 10, 1.8, 1.8, "FD");
  font(doc, "bold", 14);
  ink(doc, WHITE);
  doc.text(numero, 172.5, 23.9, { align: "center" });

  font(doc, "bold", 7.6);
  ink(doc, WHITE);
  const labelEntrada = "Data de Entrada:";
  const labelEntradaW = doc.getTextWidth(labelEntrada);
  doc.text(labelEntrada, 202 - 46 - labelEntradaW, 32.4);
  const dataEntrada = formatarData(os.created_at);
  stroke(doc, WHITE);
  doc.setLineWidth(0.4);
  doc.line(202 - 44, 33.4, 202 - 32, 33.4);
  doc.line(202 - 29, 33.4, 202 - 17, 33.4);
  doc.line(202 - 14, 33.4, 202, 33.4);
  font(doc, "normal", 7.4);
  doc.text("/", 202 - 30.5, 32.4, { align: "center" });
  doc.text("/", 202 - 15.5, 32.4, { align: "center" });
  if (dataEntrada) {
    const [dd, mm, yyyy] = dataEntrada.split("/");
    doc.text(dd, 202 - 38, 32.4, { align: "center" });
    doc.text(mm, 202 - 23, 32.4, { align: "center" });
    doc.text(yyyy, 202 - 7, 32.4, { align: "center" });
  }

  // ------------------------------------------------------------ dados do cliente
  const clienteY = 41;
  sectionBox(doc, L, clienteY, W, 20);
  sectionTab(doc, L + 4, clienteY, "DADOS DO CLIENTE", (d, cx, cy, s) => glyphUser(d, cx, cy, s, WHITE));

  ruledField(doc, "Nome:", cliente?.nome_razao_social ?? "", L + 5, clienteY + 8.2, 110);
  ruledField(doc, "CPF:", cliente?.cpf_cnpj ?? "", 115, clienteY + 8.2, 158);
  ruledField(doc, "RG:", "", 162, clienteY + 8.2, R - 5);
  ruledField(doc, "Telefone / WhatsApp:", cliente?.telefone ?? "", L + 5, clienteY + 13.6, 110);
  ruledField(doc, "E-mail:", cliente?.email ?? "", 115, clienteY + 13.6, R - 5);
  const enderecoCliente = [cliente?.endereco, cliente?.cep].filter(Boolean).join(" - ");
  ruledField(doc, "Endereço:", enderecoCliente, L + 5, clienteY + 18, R - 5);

  // --------------------------------------------- dados do aparelho / acessorios
  const aparelhoY = 65;
  const aparelhoH = 24;
  sectionBox(doc, L, aparelhoY, COL_W, aparelhoH);
  const abaAparelho = sectionTab(doc, L + 4, aparelhoY, "DADOS DO APARELHO", (d, cx, cy, s) =>
    glyphDevice(d, cx, cy, s, WHITE, BLUE)
  );
  if (os.tipo_equipamento) {
    tabHint(doc, L + 4 + abaAparelho, aparelhoY, `(${os.tipo_equipamento})`);
  }

  ruledField(doc, "Marca:", os.marca ?? "", L + 5, aparelhoY + 9.5, 48);
  ruledField(doc, "Modelo:", os.modelo ?? "", 52, aparelhoY + 9.5, L + COL_W - 5);
  ruledField(doc, "IMEI / Nº Série:", os.serial_imei ?? "", L + 5, aparelhoY + 15.7, L + COL_W - 5);
  ruledField(doc, "Cor:", "", L + 5, aparelhoY + 21.9, 45);
  ruledField(doc, "Senha / Padrão:", "", 49, aparelhoY + 21.9, L + COL_W - 5);

  sectionBox(doc, COL_R_X, aparelhoY, COL_W, aparelhoH);
  sectionTab(doc, COL_R_X + 4, aparelhoY, "ACESSÓRIOS ENTREGUES", (d, cx, cy, s) => glyphBag(d, cx, cy, s, WHITE));

  const acessorios = [
    ["Chip", "Cartão de memória", "Capa"],
    ["Carregador", "Fone de ouvido", "Película"],
    ["Caixa", "Caneta", "Outros:"]
  ];
  const acessorioColX = [COL_R_X + 5, COL_R_X + 36, COL_R_X + 67];
  acessorios.forEach((linha, rowIndex) => {
    linha.forEach((label, colIndex) => {
      checkbox(doc, acessorioColX[colIndex], aparelhoY + 10 + rowIndex * 6, label);
    });
  });
  blankLine(doc, COL_R_X + 82, aparelhoY + 22.2, COL_R_X + COL_W - 5);

  // ------------------------------------------------ estado estetico / defeito
  const estadoY = 93;
  const estadoH = 15;
  sectionBox(doc, L, estadoY, COL_W, estadoH);
  plainHeader(doc, L, estadoY, COL_W, "ESTADO ESTÉTICO DO APARELHO (entrada)");
  blankLine(doc, L + 5, estadoY + 10.8, L + COL_W - 5);
  blankLine(doc, L + 5, estadoY + 13.6, L + COL_W - 5);

  sectionBox(doc, COL_R_X, estadoY, COL_W, estadoH);
  plainHeader(doc, COL_R_X, estadoY, COL_W, "DEFEITO RELATADO PELO CLIENTE");
  blankLine(doc, COL_R_X + 5, estadoY + 10.8, COL_R_X + COL_W - 5);
  blankLine(doc, COL_R_X + 5, estadoY + 13.6, COL_R_X + COL_W - 5);

  if (os.problema_relatado) {
    ink(doc, BODY);
    let defeitoSize = 7;
    let defeitoLinhas: string[] = [];
    for (; defeitoSize >= 5.4; defeitoSize -= 0.4) {
      font(doc, "normal", defeitoSize);
      defeitoLinhas = doc.splitTextToSize(os.problema_relatado, COL_W - 11) as string[];
      if (defeitoLinhas.length <= 2) break;
    }
    if (defeitoLinhas.length > 2) {
      defeitoLinhas = [defeitoLinhas[0], fitText(doc, defeitoLinhas.slice(1).join(" "), COL_W - 11)];
    }
    defeitoLinhas.forEach((linha, index) => {
      doc.text(linha, COL_R_X + 5.5, estadoY + 10.2 + index * 2.8);
    });
  }

  // ------------------------------------------------------ testes de funcionamento
  const testesY = 112;
  const testesH = 30;
  sectionBox(doc, L, testesY, W, testesH);
  const abaTestes = sectionTab(doc, L + 4, testesY, "TESTES DE FUNCIONAMENTO", (d, cx, cy, s) =>
    glyphGear(d, cx, cy, s, WHITE, BLUE)
  );
  tabHint(doc, L + 4 + abaTestes, testesY, "(entrada)");

  const testes = [
    ["Liga", "Tela", "Touch", "Face ID / Biometria", "Câmeras", "Flash"],
    ["Wi-Fi", "Bluetooth", "Alto-falante", "Microfone", "Vibração", "Sensor de prox."],
    ["Botões", "Carregamento", "Chip / Sinal", "GPS", "Outros:"]
  ];
  const testeColW = (W - 10) / 6;
  testes.forEach((linha, rowIndex) => {
    linha.forEach((label, colIndex) => {
      checkbox(doc, L + 5 + colIndex * testeColW, testesY + 10.4 + rowIndex * 6.2, label);
    });
  });
  blankLine(doc, L + 5 + 4 * testeColW + 12, testesY + 22.8, L + 5 + 6 * testeColW - 2);

  font(doc, "bold", 7.4);
  ink(doc, INK);
  doc.text("Observações:", L + 5, testesY + 27.2);
  blankLine(doc, L + 5 + doc.getTextWidth("Observações:") + 2, testesY + 28, R - 5);

  // ------------------------------------------------------------------- fotos
  glyphCamera(doc, L + 6, 145.6, 5, BLUE, WHITE);
  font(doc, "normal", 7.6);
  ink(doc, BODY);
  doc.text("Fotos do aparelho registradas no recebimento.", L + 11, 146.6);

  // ------------------------------------------------------------------- termos
  const garantiaDias = nota?.garantia?.trim() ? nota.garantia.replace(/\s*dias?\s*$/i, "") : "________";
  const { coluna1, coluna2, final } = montarTermos(empresa.nome, garantiaDias);
  const larguraTexto = COL_W - 16;
  const larguraTextoFinal = W - 16;

  let termSize = 6.2;
  let termLh = 2.5;
  let layout: {
    col1: Array<{ termo: Termo; linhas: string[]; altura: number }>;
    col2: Array<{ termo: Termo; linhas: string[]; altura: number }>;
    ultimo: { linhas: string[]; altura: number };
  } | null = null;

  for (let size = 6.2; size >= 4.4; size -= 0.2) {
    const lh = size * 0.3528 * 1.22;
    const col1 = coluna1.map((termo) => ({ termo, ...alturaTermo(doc, termo, larguraTexto, size, lh) }));
    const col2 = coluna2.map((termo) => ({ termo, ...alturaTermo(doc, termo, larguraTexto, size, lh) }));
    const ultimo = alturaTermo(doc, final, larguraTextoFinal, size, lh);

    const alturaCol1 = col1.reduce((total, item) => total + item.altura, 0) + (col1.length - 1) * 3;
    const alturaCol2 = col2.reduce((total, item) => total + item.altura, 0) + (col2.length - 1) * 3;
    const total = Math.max(alturaCol1, alturaCol2) + 3 + ultimo.altura;

    if (total <= TERMS_BOTTOM - TERMS_TOP) {
      termSize = size;
      termLh = lh;
      layout = { col1, col2, ultimo };
      break;
    }

    termSize = size;
    termLh = lh;
    layout = { col1, col2, ultimo };
  }

  let y1 = TERMS_TOP;
  layout?.col1.forEach((item) => {
    desenharTermo(doc, item.termo, item.linhas, L, y1, COL_W, item.altura, termSize, termLh);
    y1 += item.altura + 3;
  });

  let y2 = TERMS_TOP;
  layout?.col2.forEach((item) => {
    desenharTermo(doc, item.termo, item.linhas, COL_R_X, y2, COL_W, item.altura, termSize, termLh);
    y2 += item.altura + 3;
  });

  const finalY = Math.max(y1, y2);
  if (layout) {
    desenharTermo(doc, final, layout.ultimo.linhas, L, finalY, W, layout.ultimo.altura, termSize, termLh);
  }

  // --------------------------------------------------------- valores e prazos
  const valoresY = 250;
  const valoresH = 15;
  sectionBox(doc, L, valoresY, W, valoresH);
  const celulaW = W / 4;
  for (let i = 1; i < 4; i += 1) {
    stroke(doc, BOXLINE);
    doc.setLineWidth(0.4);
    doc.line(L + celulaW * i, valoresY + 2.5, L + celulaW * i, valoresY + valoresH - 2.5);
  }

  const celulas = [
    { titulo: "VALOR DO ORÇAMENTO", valor: nota ? `R$ ${formatarMoeda(nota.subtotal)}` : "R$", icon: "calc" as const },
    { titulo: "VALOR DO SERVIÇO", valor: nota ? `R$ ${formatarMoeda(nota.total)}` : "R$", icon: null },
    { titulo: "PREVISÃO DE ENTREGA", valor: formatarData(os.prazo_estimado), icon: "cal" as const },
    { titulo: "DATA DE ENTRADA", valor: formatarData(os.created_at), icon: null }
  ];

  celulas.forEach((celula, index) => {
    const x = L + celulaW * index;
    let textX = x + 5;
    if (celula.icon === "calc") {
      glyphCalculator(doc, x + 6, valoresY + 7.5, 6.5, BLUE, WHITE);
      textX = x + 11;
    } else if (celula.icon === "cal") {
      glyphCalendar(doc, x + 6, valoresY + 7.5, 6.5, BLUE, WHITE);
      textX = x + 11;
    }

    font(doc, "bold", 7);
    ink(doc, INK);
    doc.text(celula.titulo, textX, valoresY + 5.8);

    font(doc, "normal", 7.6);
    ink(doc, BODY);
    doc.text(celula.valor || "", textX, valoresY + 11.4);
    blankLine(doc, textX + doc.getTextWidth(celula.valor || "") + 1.6, valoresY + 12.2, x + celulaW - 4);
  });

  // -------------------------------------------------------------- assinaturas
  const assinaturaY = 270;
  glyphUser(doc, L + 6, assinaturaY + 2, 7, INK);
  blankLine(doc, L + 12, assinaturaY + 5.6, L + 68);
  font(doc, "bold", 7.4);
  ink(doc, INK);
  doc.text("ASSINATURA DO CLIENTE", L + 40, assinaturaY + 9.4, { align: "center" });

  glyphTools(doc, L + 78, assinaturaY + 2, 7, INK);
  blankLine(doc, L + 84, assinaturaY + 5.6, L + 132);
  doc.text("ASSINATURA DO TÉCNICO", L + 108, assinaturaY + 9.4, { align: "center" });

  sectionBox(doc, 145, assinaturaY - 4, R - 145, 15);
  font(doc, "bold", 7.2);
  ink(doc, BLUE_TITLE);
  doc.text("PROTOCOLO DE RETIRADA", (145 + R) / 2, assinaturaY, { align: "center" });
  font(doc, "normal", 6.8);
  ink(doc, BODY);
  doc.text("Data:", 148, assinaturaY + 5);
  blankLine(doc, 155, assinaturaY + 5.6, 172);
  doc.text("Hora:", 175, assinaturaY + 5);
  blankLine(doc, 182, assinaturaY + 5.6, R - 3);
  doc.text("Assinatura:", 148, assinaturaY + 9.6);
  blankLine(doc, 163, assinaturaY + 10.2, R - 3);

  // ------------------------------------------------------------------- rodape
  const rodapeY = 283;
  fill(doc, DARK);
  doc.rect(FRAME, rodapeY, PAGE_W - FRAME * 2, PAGE_H - FRAME - rodapeY, "F");
  fill(doc, NAVY);
  doc.lines(
    [[PAGE_W - FRAME - 132, 0], [0, PAGE_H - FRAME - rodapeY], [-(PAGE_W - FRAME - 124), 0]],
    132,
    rodapeY,
    [1, 1],
    "F",
    true
  );

  const selos: Array<{ icon: TabIcon; linha1: string; linha2: string }> = [
    { icon: (d, cx, cy, s) => glyphShieldOutline(d, cx, cy, s, WHITE), linha1: "Qualidade", linha2: "que conecta." },
    { icon: (d, cx, cy, s) => glyphCheck(d, cx, cy, s, WHITE), linha1: "Confiança", linha2: "que você sente." },
    { icon: (d, cx, cy, s) => glyphHeadset(d, cx, cy, s, WHITE), linha1: "Tecnologia", linha2: "que resolve." }
  ];

  selos.forEach((selo, index) => {
    const x = 10 + index * 42;
    selo.icon(doc, x + 3.5, rodapeY + 5.6, 6.4);
    ink(doc, WHITE);
    font(doc, "bold", 6.6);
    doc.text(selo.linha1, x + 9, rodapeY + 4.6);
    font(doc, "normal", 6.6);
    doc.text(selo.linha2, x + 9, rodapeY + 8);
  });

  ink(doc, WHITE);
  font(doc, "bold", 11);
  fitFontSize(doc, empresa.nome.toUpperCase(), 58, 11, 6);
  doc.text(empresa.nome.toUpperCase(), 200, rodapeY + 7.2, { align: "right" });

  doc.save(`os-${String(os.numero_sequencial).padStart(5, "0")}.pdf`);
}
