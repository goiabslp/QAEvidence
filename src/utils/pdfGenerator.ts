import React from 'react';
import { EvidenceItem, TicketInfo, ArchivedTicket, User } from '@/types';

declare const html2pdf: any;

interface PdfGenerationArgs {
    isArchived?: boolean;
    reportRef: React.RefObject<HTMLDivElement>;
    currentUser: User | null;
    printingTicket: ArchivedTicket | null;
    formTicketInfoRef: React.MutableRefObject<TicketInfo | null>;
    evidences: EvidenceItem[];
    users: User[];
    setShowPdfModal: (show: boolean) => void;
    setIsGeneratingPdf: (generating: boolean) => void;
    setPrintingTicket: (ticket: ArchivedTicket | null) => void;
    persistCurrentTicket: () => void;
}

export const executePdfGeneration = ({
    isArchived = false,
    reportRef,
    currentUser,
    printingTicket,
    formTicketInfoRef,
    evidences,
    users,
    setShowPdfModal,
    setIsGeneratingPdf,
    setPrintingTicket,
    persistCurrentTicket
}: PdfGenerationArgs) => {
    if (!reportRef.current || !currentUser) return;

    if (!isArchived) setShowPdfModal(false);
    setIsGeneratingPdf(true);

    const targetTicketInfo = isArchived && printingTicket ? printingTicket.ticketInfo : (formTicketInfoRef.current || evidences[0]?.ticketInfo);
    if (!targetTicketInfo) {
        setIsGeneratingPdf(false);
        setPrintingTicket(null);
        return;
    }

    const ticketTitle = targetTicketInfo.ticketTitle;
    const safeFilename = ticketTitle.replace(/[/\\?%*:|"<>]/g, '-');
    const authorName = isArchived && printingTicket
        ? users.find(u => u.acronym === printingTicket.createdBy)?.name || printingTicket.createdBy
        : currentUser.name;

    // Strict Margins for Header (35mm) and Footer (25mm)
    // Left/Right margin 10mm
    const opt = {
        margin: [35, 10, 25, 10],
        filename: `${safeFilename}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf().set(opt).from(reportRef.current).toPdf().get('pdf').then((pdf: any) => {
        const totalPages = pdf.internal.getNumberOfPages();
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        for (let i = 1; i <= totalPages; i++) {
            pdf.setPage(i);

            // --- HEADER (Top 0mm to 35mm) ---

            // Background for Header (White - implied)
            // pdf.setFillColor(255, 255, 255);
            // pdf.rect(0, 0, pageWidth, 35, 'F');

            // Logo Box (Left)
            pdf.setFillColor(15, 23, 42); // slate-900
            pdf.rect(10, 10, 12, 12, 'F'); // x=10mm, y=10mm
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "bold");
            pdf.text("QA", 11.5, 17.5);

            // Main Title
            pdf.setTextColor(15, 23, 42); // slate-900
            pdf.setFontSize(14);
            pdf.setFont("helvetica", "bold");
            pdf.text("RELATÓRIO DE EVIDÊNCIAS", 26, 16);

            // Subtitle
            pdf.setFontSize(9);
            pdf.setTextColor(100, 116, 139); // slate-500
            pdf.setFont("helvetica", "normal");
            pdf.text("CONTROLE DE QUALIDADE NARNIA", 26, 21);

            // Ticket ID (Right)
            if (targetTicketInfo.ticketId) {
                pdf.setFontSize(16);
                pdf.setTextColor(15, 23, 42);
                pdf.setFont("helvetica", "bold");
                pdf.text(targetTicketInfo.ticketId, pageWidth - 10, 18, { align: 'right' });
            }

            // Horizontal Line Separator (at y=30mm)
            pdf.setDrawColor(15, 23, 42);
            pdf.setLineWidth(0.5);
            pdf.line(10, 30, pageWidth - 10, 30);


            // --- FOOTER (Bottom 25mm) ---

            // Footer Line Separator (at pageHeight - 15mm)
            const footerLineY = pageHeight - 15;
            pdf.setDrawColor(203, 213, 225); // slate-300
            pdf.setLineWidth(0.3);
            pdf.line(10, footerLineY, pageWidth - 10, footerLineY);

            // Left: Metadata
            pdf.setFontSize(8);
            pdf.setTextColor(100, 116, 139); // slate-500
            pdf.setFont("helvetica", "normal");
            pdf.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} por ${authorName}`, 10, pageHeight - 8);

            // Right: Page Number
            pdf.text(`Página ${i} de ${totalPages}`, pageWidth - 10, pageHeight - 8, { align: 'right' });
        }
    }).save().then(() => {
        if (!isArchived) persistCurrentTicket();
        setIsGeneratingPdf(false);
        setPrintingTicket(null);
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    });
};
