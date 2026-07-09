import React, { useState, useRef, useEffect } from 'react';
import { useVault } from '../context/VaultContext';
import type { DocumentItem } from '../context/VaultContext';
import { FileText, UploadCloud, Download, Eye, Trash2, RefreshCw, EyeOff, FileCheck } from 'lucide-react';

export const DocumentVault: React.FC = () => {
  const { vaultData, syncVault, encryptBinary, decryptBinary } = useVault();
  const [selectedItem, setSelectedItem] = useState<DocumentItem | null>(null);
  
  // File states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  
  // Preview states
  const [decryptedPreview, setDecryptedPreview] = useState<{ url: string; content: string | null } | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const documents = vaultData?.documents || [];

  // Revoke object URLs on unmount/selection change to prevent memory leaks
  useEffect(() => {
    return () => {
      if (decryptedPreview) {
        URL.revokeObjectURL(decryptedPreview.url);
      }
    };
  }, [decryptedPreview]);

  // Handle drag/drop events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  // Perform Client-side Zero-Knowledge Encryption and save to Vault
  const handleFileUpload = async (file: File) => {
    // limit files to 5MB for storage performance inside JSON syncs
    if (file.size > 5 * 1024 * 1024) {
      alert("Please upload files under 5MB to keep sync operations performant.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      // 1. Read file as ArrayBuffer
      const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
      });
      setUploadProgress(40);

      // 2. Encrypt file client-side using VaultContext's encryptBinary
      const encrypted = await encryptBinary(arrayBuffer);
      setUploadProgress(70);

      // 3. Create Document item
      const newDoc: DocumentItem = {
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        encryptedBlob: encrypted.ciphertext,
        iv: encrypted.iv,
        uploadedAt: new Date().toISOString()
      };
      setUploadProgress(90);

      // 4. Sync Vault
      const updatedDocs = [...documents, newDoc];
      await syncVault({ documents: updatedDocs });
      setUploadProgress(100);
      
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);

    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to encrypt and save document.");
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Decrypt document in-memory for preview or download
  const handleDecryptDoc = async (item: DocumentItem): Promise<ArrayBuffer | null> => {
    setIsDecrypting(true);
    try {
      const buffer = await decryptBinary({
        iv: item.iv,
        ciphertext: item.encryptedBlob
      });
      setIsDecrypting(false);
      return buffer;
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to decrypt document. Vault might be locked.");
      setIsDecrypting(false);
      return null;
    }
  };

  // Secure preview function: Decrypts document in-memory and shows preview
  const handlePreview = async (item: DocumentItem) => {
    if (decryptedPreview) {
      URL.revokeObjectURL(decryptedPreview.url);
      setDecryptedPreview(null);
    }

    const buffer = await handleDecryptDoc(item);
    if (!buffer) return;

    const blob = new Blob([buffer], { type: item.type });
    const url = URL.createObjectURL(blob);

    let contentText: string | null = null;
    // If it's a text file or JSON, extract the text to preview
    if (item.type.startsWith('text/') || item.type === 'application/json') {
      const decoder = new TextDecoder();
      contentText = decoder.decode(buffer);
    }

    setDecryptedPreview({ url, content: contentText });
  };

  // Decrypts in-memory and downloads
  const handleDownload = async (item: DocumentItem) => {
    const buffer = await handleDecryptDoc(item);
    if (!buffer) return;

    const blob = new Blob([buffer], { type: item.type });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = item.name;
    document.body.appendChild(link);
    link.click();
    
    // cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this encrypted document?")) return;
    
    const updatedDocs = documents.filter(d => d.id !== id);
    try {
      await syncVault({ documents: updatedDocs });
      if (selectedItem?.id === id) {
        setSelectedItem(null);
        setDecryptedPreview(null);
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete document.");
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="slide-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', height: 'calc(100vh - 120px)' }}>
      
      {/* Left Pane: Drag-Drop Upload & File List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', paddingRight: '10px' }}>
        <h2 className="cyber-h1" style={{ margin: 0 }}>Secure Files</h2>

        {/* Drag/Drop Box */}
        <div 
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="glass-panel"
          style={{
            border: dragActive ? '2px dashed var(--primary)' : '1px dashed var(--border-glass)',
            padding: '30px',
            textAlign: 'center',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            background: dragActive ? 'rgba(0, 229, 255, 0.05)' : 'rgba(0,0,0,0.1)'
          }}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            style={{ display: 'none' }} 
          />
          
          {isUploading ? (
            <>
              <RefreshCw className="pulse-glow" size={32} color="var(--primary)" style={{ animation: 'spin 2s linear infinite' }} />
              <div>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', display: 'block', fontWeight: 'bold' }}>Encrypting File Locally...</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{uploadProgress}% Completed</span>
              </div>
            </>
          ) : (
            <>
              <UploadCloud size={36} color="var(--text-secondary)" />
              <div>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', display: 'block', fontWeight: 'bold' }}>Drag & Drop file here</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>or click to browse from device (max 5MB)</span>
              </div>
            </>
          )}
        </div>

        {/* Documents list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {documents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', border: '1px dashed var(--border-glass)', borderRadius: '12px' }}>
              No encrypted documents.
            </div>
          ) : (
            documents.map(doc => (
              <div 
                key={doc.id}
                className={`glass-panel ${selectedItem?.id === doc.id ? 'glass-panel-active' : ''}`}
                onClick={() => { setSelectedItem(doc); setDecryptedPreview(null); }}
                style={{ padding: '16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ background: 'rgba(255, 0, 127, 0.1)', padding: '10px', borderRadius: '8px' }}>
                    <FileText size={18} color="var(--accent)" />
                  </div>
                  <div>
                    <h4 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '0.9rem', wordBreak: 'break-all' }}>{doc.name}</h4>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{formatSize(doc.size)}</span>
                  </div>
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {new Date(doc.uploadedAt).toLocaleDateString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Pane: Document Decryption & Secure Preview */}
      <div style={{ overflowY: 'auto', paddingRight: '10px' }}>
        
        {selectedItem && (
          <div className="glass-panel slide-in" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <h3 className="cyber-h1" style={{ margin: 0, fontSize: '1.2rem', wordBreak: 'break-all' }}>{selectedItem.name}</h3>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', display: 'block', marginTop: '4px' }}>
                  Type: {selectedItem.type} | Size: {formatSize(selectedItem.size)}
                </span>
              </div>
              <button className="cyber-btn cyber-btn-danger" style={{ padding: '8px 12px' }} onClick={() => handleDelete(selectedItem.id)}>
                <Trash2 size={14} />
              </button>
            </div>

            {/* In-Memory Decryption buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                className="cyber-btn" 
                style={{ flex: 1 }} 
                onClick={() => handlePreview(selectedItem)}
                disabled={isDecrypting}
              >
                {isDecrypting ? (
                  <RefreshCw className="pulse-glow" size={16} style={{ animation: 'spin 2s linear infinite' }} />
                ) : (
                  <Eye size={16} />
                )}
                {isDecrypting ? 'Decrypting...' : 'Secure Preview'}
              </button>
              
              <button 
                className="cyber-btn cyber-btn-secondary" 
                style={{ flex: 1 }} 
                onClick={() => handleDownload(selectedItem)}
                disabled={isDecrypting}
              >
                <Download size={16} /> Download
              </button>
            </div>

            {/* Preview Box */}
            {decryptedPreview && (
              <div style={{ border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '16px', background: 'rgba(0,0,0,0.3)', minHeight: '180px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileCheck size={14} /> Decrypted in browser memory
                  </span>
                  <button 
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                    onClick={() => {
                      if (decryptedPreview) URL.revokeObjectURL(decryptedPreview.url);
                      setDecryptedPreview(null);
                    }}
                  >
                    <EyeOff size={14} /> Close
                  </button>
                </div>
                
                {/* Content Renderers */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, overflow: 'auto', maxHeight: '350px' }}>
                  {selectedItem.type.startsWith('image/') ? (
                    <img 
                      src={decryptedPreview.url} 
                      alt="Decrypted Preview" 
                      style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '4px', objectFit: 'contain', border: '1px solid rgba(255,255,255,0.05)' }} 
                    />
                  ) : decryptedPreview.content ? (
                    <pre style={{ 
                      width: '100%', 
                      maxHeight: '300px', 
                      fontSize: '0.8rem', 
                      fontFamily: 'monospace', 
                      color: 'var(--text-secondary)', 
                      whiteSpace: 'pre-wrap',
                      background: '#000',
                      padding: '12px',
                      borderRadius: '4px',
                      overflow: 'auto',
                      textAlign: 'left'
                    }}>
                      {decryptedPreview.content}
                    </pre>
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <FileText size={24} style={{ opacity: 0.3 }} />
                      <span>Preview not supported for this file type ({selectedItem.type}). Please download it to view.</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!decryptedPreview && (
              <div style={{ padding: '24px', border: '1px dashed var(--border-glass)', borderRadius: '8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Click **Secure Preview** to decrypt and read this file locally in browser memory.
              </div>
            )}
          </div>
        )}

        {/* Empty Pane helper */}
        {!selectedItem && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border-glass)', borderRadius: '16px', color: 'var(--text-muted)', padding: '40px' }}>
            <FileText size={48} style={{ opacity: 0.15, marginBottom: '16px' }} />
            <span>Select an encrypted file from the list to preview content locally in-memory.</span>
          </div>
        )}

      </div>

    </div>
  );
};
