import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

export interface ExportData {
  title: string;
  subtitle?: string;
  statistics: {
    [key: string]: number | string;
  };
  tableHeaders: string[];
  tableData: (string | number)[][];
  chartElements?: HTMLElement[];
}

export const exportToPDF = async (data: ExportData) => {
  try {
    const pdf = new jsPDF({orientation: data.tableHeaders.length > 6 ? 'landscape' : 'portrait'});
    pdf.setFontSize(18); pdf.text(String(data.title), 14, 18);
    if(data.subtitle){pdf.setFontSize(11);pdf.text(String(data.subtitle),14,26)}
    pdf.setFontSize(9);pdf.text(`Generated: ${new Date().toLocaleString()}`,14,34);
    let y=42; for(const [key,value] of Object.entries(data.statistics)){pdf.text(`${String(key)}: ${String(value)}`,14,y);y+=6}
    autoTable(pdf,{head:[data.tableHeaders.map(String)],body:data.tableData.map(row=>row.map(cell=>String(cell))),startY:y+2,theme:'grid',styles:{fontSize:8},headStyles:{fillColor:[5,150,105]}});
    if(data.chartElements?.length){for(const element of data.chartElements){const canvas=await html2canvas(element,{backgroundColor:'#ffffff'});pdf.addPage();pdf.addImage(canvas.toDataURL('image/png'),'PNG',14,20,180,(canvas.height*180)/canvas.width)}}
    const filename=`${data.title.replace(/[^a-z0-9]+/gi,'_').replace(/^_|_$/g,'').toLowerCase()||'imscca_report'}.pdf`;pdf.save(filename);
    return true;
  } catch (error) {
    console.error('PDF export error:', error);
    throw error;
  }
};

// Enhanced version that would use jsPDF (once packages are installed)
export const exportToPDFAdvanced = async (data: ExportData) => {
  // Uncomment when packages are installed:
  /*
  try {
    const pdf = new jsPDF();
    
    // Add title
    pdf.setFontSize(20);
    pdf.text(data.title, 20, 30);
    
    if (data.subtitle) {
      pdf.setFontSize(14);
      pdf.text(data.subtitle, 20, 45);
    }
    
    // Add generated date
    pdf.setFontSize(10);
    pdf.text(`Generated on: ${new Date().toLocaleString()}`, 20, 55);
    
    let yPosition = 70;
    
    // Add statistics
    pdf.setFontSize(16);
    pdf.text('Summary Statistics', 20, yPosition);
    yPosition += 15;
    
    pdf.setFontSize(12);
    Object.entries(data.statistics).forEach(([key, value]) => {
      pdf.text(`${key}: ${value}`, 20, yPosition);
      yPosition += 10;
    });
    
    yPosition += 10;
    
    // Add table
    autoTable(pdf, {
      head: [data.tableHeaders],
      body: data.tableData,
      startY: yPosition,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [5, 150, 105] },
    });
    
    // Capture charts if provided
    if (data.chartElements && data.chartElements.length > 0) {
      for (const chartElement of data.chartElements) {
        const canvas = await html2canvas(chartElement);
        const imgData = canvas.toDataURL('image/png');
        
        pdf.addPage();
        pdf.setFontSize(14);
        pdf.text('Charts and Visualizations', 20, 30);
        
        const imgWidth = 170;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 20, 45, imgWidth, imgHeight);
      }
    }
    
    // Save the PDF
    pdf.save(`${data.title.replace(/\s+/g, '_').toLowerCase()}_report.pdf`);
    
    return true;
  } catch (error) {
    console.error('Advanced PDF export error:', error);
    throw error;
  }
  */
  
  // Fallback to basic version
  return exportToPDF(data);
};
