import jsPDF from "jspdf";
import type { OrdemServico } from "../types";

const COMPANY = {
  nome: import.meta.env.VITE_COMPANY_NAME ?? "OrdemFlow Tech",
  cnpj: import.meta.env.VITE_COMPANY_CNPJ ?? "--",
  telefone: import.meta.env.VITE_COMPANY_PHONE ?? "--"
};

function formatarStatus(status: string) {
  return status.replace(/_/g, " ");
}

function addSectionTitle(doc: jsPDF, title: string, y: number) {
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(14, y - 5, 182, 8, 2, 2, "F");
  doc.setTextColor(226, 232, 240);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(title, 18, y);
  doc.setTextColor(15, 23, 42);
}

export function gerarPdfOS(os: OrdemServico) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const generatedAt = new Date();
  const prazo = new Date(os.prazo_estimado);

  // Header stripe
  doc.setFillColor(7, 10, 18);
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setFillColor(6, 182, 212);
  doc.rect(0, 26, pageWidth, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setTextColor(240, 249, 255);
  doc.setFontSize(16);
  doc.text("NOTA DE SERVICO", 14, 12);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`${COMPANY.nome}  |  CNPJ ${COMPANY.cnpj}  |  ${COMPANY.telefone}`, 14, 18);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`OS #${os.numero_sequencial}`, 160, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Emissao: ${generatedAt.toLocaleDateString("pt-BR")} ${generatedAt.toLocaleTimeString("pt-BR")}`, 141, 18);

  // Body card
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(10, 32, 190, 225, 3, 3, "FD");

  let y = 44;
  addSectionTitle(doc, "Dados da Ordem de Servico", y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Equipamento:", 16, y);
  doc.setFont("helvetica", "normal");
  doc.text(`${os.tipo_equipamento} ${os.marca} ${os.modelo}`, 44, y);
  y += 7;

  doc.setFont("helvetica", "bold");
  doc.text("Serial/IMEI:", 16, y);
  doc.setFont("helvetica", "normal");
  doc.text(os.serial_imei || "--", 44, y);
  y += 7;

  doc.setFont("helvetica", "bold");
  doc.text("Status:", 16, y);
  doc.setFont("helvetica", "normal");
  doc.text(formatarStatus(os.status), 44, y);

  doc.setFont("helvetica", "bold");
  doc.text("Prioridade:", 108, y);
  doc.setFont("helvetica", "normal");
  doc.text(os.prioridade, 132, y);
  y += 7;

  doc.setFont("helvetica", "bold");
  doc.text("Prazo estimado:", 16, y);
  doc.setFont("helvetica", "normal");
  doc.text(prazo.toLocaleDateString("pt-BR"), 44, y);

  y += 10;
  addSectionTitle(doc, "Problema Relatado", y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const problemaLines = doc.splitTextToSize(os.problema_relatado || "--", 172);
  doc.text(problemaLines, 16, y);
  y += Math.max(16, problemaLines.length * 5 + 3);

  addSectionTitle(doc, "Observacoes Internas", y);
  y += 8;
  const obsLines = doc.splitTextToSize(os.observacoes_internas || "Sem observacoes internas.", 172);
  doc.text(obsLines, 16, y);
  y += Math.max(20, obsLines.length * 5 + 8);

  addSectionTitle(doc, "Resumo Financeiro", y);
  y += 8;
  doc.setDrawColor(226, 232, 240);
  doc.rect(16, y - 4, 168, 24);
  doc.setFont("helvetica", "bold");
  doc.text("Servico", 18, y + 2);
  doc.text("Valor", 166, y + 2, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text("Diagnostico e manutencao tecnica", 18, y + 10);
  doc.text("R$ 0,00", 166, y + 10, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.text("Total", 18, y + 18);
  doc.text("R$ 0,00", 166, y + 18, { align: "right" });

  y += 34;
  doc.setDrawColor(148, 163, 184);
  doc.line(16, y, 86, y);
  doc.line(114, y, 184, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Assinatura do Cliente", 36, y + 5, { align: "center" });
  doc.text("Responsavel Tecnico", 149, y + 5, { align: "center" });

  // Footer
  doc.setFillColor(248, 250, 252);
  doc.rect(10, 260, 190, 20, "F");
  doc.setTextColor(71, 85, 105);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Documento gerado eletronicamente pelo OrdemFlow Tech.", 14, 267);
  doc.text("Validade deste documento condicionada ao registro da OS no sistema.", 14, 272);
  doc.text(`Codigo OS: ${os.id}`, 14, 277);

  doc.save(`os-${os.numero_sequencial}.pdf`);
}
