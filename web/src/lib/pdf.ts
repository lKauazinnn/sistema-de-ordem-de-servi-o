import jsPDF from "jspdf";
import type { AssistenciaTecnicaProfile, Cliente, OrdemServico } from "../types";
import type { NotaServicoResumoOs } from "../modules/os/service";

const COMPANY = {
  nome: import.meta.env.VITE_COMPANY_NAME ?? "OrdemFlow Tech",
  cnpj: import.meta.env.VITE_COMPANY_CNPJ ?? "--",
  telefone: import.meta.env.VITE_COMPANY_PHONE ?? "--"
};

const BRAND = { r: 13, g: 91, b: 214 };
const INK = { r: 15, g: 23, b: 42 };
const MUTED = { r: 100, g: 116, b: 139 };
const LINE = { r: 226, g: 232, b: 240 };
const PANEL = { r: 248, g: 250, b: 252 };

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

function formatarStatus(status: string) {
  return status.replace(/_/g, " ");
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function carregarLogo(url: string): Promise<{ dataUrl: string; width: number; height: number } | null> {
  if (!url) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      return null;
    }

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

function addSectionTitle(doc: jsPDF, title: string, y: number) {
  doc.setFillColor(PANEL.r, PANEL.g, PANEL.b);
  doc.roundedRect(14, y - 5, 182, 8, 1.5, 1.5, "F");
  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(14, y - 5, 2.5, 8, "F");
  doc.setTextColor(INK.r, INK.g, INK.b);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text(title.toUpperCase(), 21, y);
}

function addField(doc: jsPDF, label: string, value: string, x: number, y: number, labelWidth = 28) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text(label, x, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(INK.r, INK.g, INK.b);
  doc.text(value || "--", x + labelWidth, y);
}

export async function gerarPdfOS(
  os: OrdemServico,
  cliente?: Cliente | null,
  nota?: NotaServicoResumoOs | null,
  company?: Partial<AssistenciaTecnicaProfile>
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const companyData = resolveCompany(company);
  const logo = await carregarLogo(companyData.logoUrl);

  const pageWidth = doc.internal.pageSize.getWidth();
  const generatedAt = new Date();
  const prazo = new Date(os.prazo_estimado);

  // Header
  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(0, 0, pageWidth, 32, "F");

  let headerTextX = 14;
  if (logo) {
    const maxH = 16;
    const ratio = logo.width / logo.height;
    const h = maxH;
    const w = h * ratio;
    try {
      doc.addImage(logo.dataUrl, "PNG", 14, 8, w, h);
      headerTextX = 14 + w + 6;
    } catch {
      headerTextX = 14;
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.text(companyData.nome, headerTextX, 14);

  const contatoPartes = [
    companyData.cnpj !== "--" ? `CNPJ ${companyData.cnpj}` : null,
    companyData.telefone !== "--" ? companyData.telefone : null,
    companyData.endereco || null,
    companyData.instagram || null
  ].filter(Boolean);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(224, 236, 255);
  doc.text(contatoPartes.join("  |  "), headerTextX, 20);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text("ORDEM DE SERVICO", pageWidth - 14, 13, { align: "right" });
  doc.setFontSize(11);
  doc.text(`Nº ${String(os.numero_sequencial).padStart(5, "0")}`, pageWidth - 14, 20, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Emissao: ${generatedAt.toLocaleDateString("pt-BR")} ${generatedAt.toLocaleTimeString("pt-BR")}`, pageWidth - 14, 26, { align: "right" });

  // Body card
  doc.setDrawColor(LINE.r, LINE.g, LINE.b);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(10, 38, 190, 220, 3, 3, "FD");

  let y = 50;

  addSectionTitle(doc, "Dados do Cliente", y);
  y += 8;
  addField(doc, "Nome:", cliente?.nome_razao_social ?? "--", 16, y, 22);
  addField(doc, "CPF/CNPJ:", cliente?.cpf_cnpj ?? "--", 110, y, 24);
  y += 6;
  addField(doc, "Telefone:", cliente?.telefone ?? "--", 16, y, 22);
  addField(doc, "E-mail:", cliente?.email ?? "--", 110, y, 24);
  y += 6;
  addField(doc, "Endereco:", cliente?.endereco ?? "--", 16, y, 22);

  y += 12;
  addSectionTitle(doc, "Dados do Equipamento", y);
  y += 8;
  addField(doc, "Equipamento:", `${os.tipo_equipamento} ${os.marca} ${os.modelo}`, 16, y, 28);
  y += 6;
  addField(doc, "Serial/IMEI:", os.serial_imei || "--", 16, y, 28);
  addField(doc, "Prioridade:", os.prioridade, 110, y, 24);
  y += 6;
  addField(doc, "Status:", formatarStatus(os.status), 16, y, 28);
  addField(doc, "Previsao:", prazo.toLocaleDateString("pt-BR"), 110, y, 24);

  y += 12;
  addSectionTitle(doc, "Problema Relatado", y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(INK.r, INK.g, INK.b);
  const problemaLines = doc.splitTextToSize(os.problema_relatado || "--", 172);
  doc.text(problemaLines, 16, y);
  y += Math.max(14, problemaLines.length * 5 + 4);

  if (os.observacoes_internas) {
    addSectionTitle(doc, "Observacoes Internas", y);
    y += 8;
    doc.setTextColor(INK.r, INK.g, INK.b);
    const obsLines = doc.splitTextToSize(os.observacoes_internas, 172);
    doc.text(obsLines, 16, y);
    y += Math.max(14, obsLines.length * 5 + 4);
  }

  addSectionTitle(doc, "Resumo Financeiro", y);
  y += 9;
  doc.setDrawColor(LINE.r, LINE.g, LINE.b);
  doc.setFillColor(PANEL.r, PANEL.g, PANEL.b);

  if (nota) {
    doc.rect(16, y - 5, 168, 30, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.text("Subtotal", 18, y + 1);
    doc.text("Descontos", 18, y + 8);
    doc.text("Forma de pagamento", 100, y + 1);
    doc.text("Garantia", 100, y + 8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(INK.r, INK.g, INK.b);
    doc.text(formatarMoeda(nota.subtotal), 55, y + 1);
    doc.text(formatarMoeda(nota.descontos), 55, y + 8);
    doc.text(nota.forma_pagamento || "--", 148, y + 1);
    doc.text(nota.garantia || "--", 148, y + 8);
    doc.setDrawColor(LINE.r, LINE.g, LINE.b);
    doc.line(18, y + 12, 182, y + 12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(INK.r, INK.g, INK.b);
    doc.text("Total", 18, y + 19);
    doc.setTextColor(BRAND.r, BRAND.g, BRAND.b);
    doc.text(formatarMoeda(nota.total), 182, y + 19, { align: "right" });
    y += 34;
  } else {
    doc.rect(16, y - 5, 168, 16, "FD");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9.5);
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.text("Orcamento ainda nao gerado para esta OS. Valores a definir apos diagnostico.", 18, y + 4);
    y += 20;
  }

  y += 4;
  doc.setDrawColor(LINE.r, LINE.g, LINE.b);
  doc.setFillColor(PANEL.r, PANEL.g, PANEL.b);
  doc.rect(16, y - 4, 168, 20, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  const termos = doc.splitTextToSize(
    "Ao assinar, o cliente autoriza a abertura do equipamento para diagnostico e reparo, ciente de que aparelhos com danos previos podem sofrer avarias adicionais durante o processo. " +
      "A garantia cobre exclusivamente o servico executado e perde validade em caso de queda, oxidacao, mau uso ou violacao por terceiros.",
    172
  );
  doc.text(termos, 18, y + 2);

  y += 26;
  doc.setDrawColor(148, 163, 184);
  doc.line(16, y, 86, y);
  doc.line(114, y, 184, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text("Assinatura do Cliente", 51, y + 5, { align: "center" });
  doc.text("Responsavel Tecnico", 149, y + 5, { align: "center" });

  // Footer
  doc.setDrawColor(LINE.r, LINE.g, LINE.b);
  doc.line(10, 262, 200, 262);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Documento gerado eletronicamente por ${companyData.nome}.`, 14, 268);
  doc.text("Validade deste documento condicionada ao registro da OS no sistema.", 14, 273);
  doc.text(`Codigo OS: ${os.id}`, 14, 278);

  doc.save(`os-${os.numero_sequencial}.pdf`);
}
