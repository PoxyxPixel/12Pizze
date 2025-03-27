// App.js
import React, { useState, useEffect, useRef } from 'react';
import './App.css';

// Using PDF.js from CDN
const pdfjsLib = window['pdfjs-dist'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.12.313/pdf.worker.min.js';

function App() {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [scale, setScale] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);

  // Replace with your public S3 PDF URL
  const PUBLIC_PDF_URL = 'https://12pizzemenu.s3.eu-central-1.amazonaws.com/Index.html';

  useEffect(() => {
    const loadPdf = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Load the PDF document directly from S3
        const loadingTask = pdfjsLib.getDocument(PUBLIC_PDF_URL);
        const pdf = await loadingTask.promise;
        
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError('Failed to load PDF document. Please check the URL.');
        setIsLoading(false);
      }
    };

    loadPdf();

    return () => {
      if (pdfDoc) {
        pdfDoc.destroy();
      }
    };
  }, []);

  useEffect(() => {
    if (!pdfDoc || !containerRef.current) return;

    const renderPage = async (pageNum) => {
      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // For high DPI displays
        const outputScale = window.devicePixelRatio || 1;
        canvas.style.width = Math.floor(viewport.width) + 'px';
        canvas.style.height = Math.floor(viewport.height) + 'px';
        
        const transform = outputScale !== 1 
          ? [outputScale, 0, 0, outputScale, 0, 0] 
          : null;
        
        await page.render({
          canvasContext: context,
          viewport: viewport,
          transform: transform
        }).promise;
        
        return canvas;
      } catch (err) {
        console.error('Error rendering page:', err);
        return null;
      }
    };

    const renderAllPages = async () => {
      containerRef.current.innerHTML = '';
      
      for (let i = 1; i <= totalPages; i++) {
        const pageContainer = document.createElement('div');
        pageContainer.className = 'pdf-page-container';
        pageContainer.style.margin = '0 auto 20px';
        pageContainer.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
        pageContainer.style.backgroundColor = 'white';
        pageContainer.style.maxWidth = '100%';
        pageContainer.style.overflow = 'hidden';
        
        const pageLabel = document.createElement('div');
        pageLabel.textContent = `Page ${i}`;
        pageLabel.style.padding = '5px 10px';
        pageLabel.style.backgroundColor = '#f0f0f0';
        pageLabel.style.textAlign = 'center';
        pageLabel.style.fontWeight = 'bold';
        
        const canvas = await renderPage(i);
        if (canvas) {
          pageContainer.appendChild(pageLabel);
          pageContainer.appendChild(canvas);
          containerRef.current.appendChild(pageContainer);
        }
      }
      
      // Scroll to current page
      if (currentPage > 0) {
        const pageElement = document.getElementById(`page-${currentPage}`);
        if (pageElement) {
          pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    };

    renderAllPages();
  }, [pdfDoc, scale, currentPage, totalPages]);

  const zoomIn = () => setScale(prev => Math.min(prev + 0.25, 3));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.25));
  const zoomActual = () => setScale(1);
  
  const goToPage = (pageNum) => {
    const validPage = Math.max(1, Math.min(pageNum, totalPages));
    setCurrentPage(validPage);
  };

  if (isLoading) return (
    <div className="loading-screen">
      <div className="spinner"></div>
      <p>Loading PDF document...</p>
    </div>
  );

  if (error) return (
    <div className="error-screen">
      <h2>Error</h2>
      <p>{error}</p>
      <p>Please check the PDF URL and try again.</p>
    </div>
  );

  return (
    <div className="app">
      <div className="toolbar">
        <div className="zoom-controls">
          <button onClick={zoomOut} aria-label="Zoom out">
            <span>-</span>
          </button>
          <button onClick={zoomActual} aria-label="Reset zoom">
            <span>{Math.round(scale * 100)}%</span>
          </button>
          <button onClick={zoomIn} aria-label="Zoom in">
            <span>+</span>
          </button>
        </div>
        
        <div className="page-controls">
          <button 
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            aria-label="Previous page"
          >
            <span>◀</span>
          </button>
          
          <span className="page-info">
            Page <input 
              type="number" 
              value={currentPage} 
              min="1" 
              max={totalPages}
              onChange={(e) => goToPage(parseInt(e.target.value))}
            /> of {totalPages}
          </span>
          
          <button 
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            aria-label="Next page"
          >
            <span>▶</span>
          </button>
        </div>
      </div>
      
      <div ref={containerRef} className="pdf-container"></div>
    </div>
  );
}

export default App;