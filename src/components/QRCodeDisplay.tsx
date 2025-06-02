import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'react-toastify';

interface QRCodeDisplayProps {
  qrCodeData: string;
  size?: number;
  downloadFileName?: string;
  className?: string;
  showDownloadButton?: boolean;
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  qrCodeData,
  size = 200,
  downloadFileName = 'QR_Code',
  className = '',
  showDownloadButton = true
}) => {
  const qrRef = useRef<HTMLDivElement>(null);

  const downloadQRCode = () => {
    if (!qrCodeData || !qrRef.current) {
      toast.error('No QR code available to download');
      return;
    }

    try {
      // Get the QR code SVG from the ref
      const svg = qrRef.current.querySelector('svg');
      if (!svg) {
        toast.error('QR code not ready for download');
        return;
      }

      // Convert SVG to canvas for download
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      // Set canvas size
      canvas.width = 300;
      canvas.height = 300;
      
      // Get SVG data
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      img.onload = () => {
        // Fill canvas with white background
        ctx!.fillStyle = 'white';
        ctx!.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw the SVG image
        ctx!.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Create download link
        const link = document.createElement('a');
        link.download = `${downloadFileName}.png`;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        URL.revokeObjectURL(url);
        toast.success('QR code downloaded successfully!');
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        toast.error('Failed to download QR code');
      };
      
      img.src = url;
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download QR code');
    }
  };

  return (
    <div className={`qr-code-display ${className}`}>
      <div className="bg-white rounded-lg p-4 inline-block" ref={qrRef}>
        <QRCodeSVG
          value={qrCodeData}
          size={size}
          level="M"
          marginSize={1}
          bgColor="#ffffff"
          fgColor="#000000"
        />
      </div>
      {showDownloadButton && (
        <div className="mt-3 text-center">
          <button
            onClick={downloadQRCode}
            className="inline-flex items-center justify-center px-8 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors duration-200"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download QR Code
          </button>
        </div>
      )}
    </div>
  );
};

export default QRCodeDisplay; 