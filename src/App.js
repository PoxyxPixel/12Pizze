import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

function App() {
  const [scale, setScale] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef(null);
  
  // Your S3 PDF URL
  const PDF_URL = "https://12pizzemenu.s3.eu-central-1.amazonaws.com/12pMenu.pdf";

  // Moved inside the component and wrapped in useCallback
  const renderAllPages = useCallback(async (pdfDoc) => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';
    
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      const pageDiv = document.createElement('div');
      pageDiv.className = 'pdf-page';
      pageDiv.appendChild(canvas);
      containerRef.current.appendChild(pageDiv);
    }
  }, [scale]);

  useEffect(() => {
    const loadPdf = async () => {
      try {
        const pdf = await pdfjsLib.getDocument(PDF_URL).promise;
        setTotalPages(pdf.numPages);
        await renderAllPages(pdf);
        setIsLoading(false);
      } catch (err) {
        console.error("PDF load error:", err);
        setIsLoading(false);
      }
    };

    loadPdf();
  }, [renderAllPages]); // Added renderAllPages to dependencies

  const zoomIn = () => setScale(s => Math.min(s + 0.25, 3));
  const zoomOut = () => setScale(s => Math.max(s - 0.25, 0.5));
  const nextPage = () => setCurrentPage(p => Math.min(p + 1, totalPages));
  const prevPage = () => setCurrentPage(p => Math.max(p - 1, 1));

  if (isLoading) return <div className="loading">Loading menu...</div>;

  return (
    <div className="App">
      <div className="toolbar">
        <button onClick={zoomOut}>Zoom Out (-)</button>
        <button onClick={zoomIn}>Zoom In (+)</button>
        <span>Page: {currentPage}/{totalPages}</span>
        <button onClick={prevPage} disabled={currentPage <= 1}>Previous</button>
        <button onClick={nextPage} disabled={currentPage >= totalPages}>Next</button>
      </div>
      <div ref={containerRef} className="pdf-container"></div>
    </div>
  );
}

export default App;