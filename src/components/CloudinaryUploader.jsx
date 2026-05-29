/**
 * CloudinaryUploader
 * ------------------
 * A reusable drag-and-drop image uploader that:
 *  1. Lets the user pick/drag an image file
 *  2. Uploads it directly from the browser to Cloudinary (unsigned upload)
 *  3. Returns the secure URL to the parent via onUpload(url)
 *
 * Props:
 *  - onUpload(url: string)  — called when upload succeeds
 *  - currentUrl?: string    — existing image URL to preview
 *  - label?: string         — field label shown above the uploader
 *  - hint?: string          — small hint text shown below
 *  - className?: string
 */

import React, { useRef, useState } from 'react';
import { Upload, Image as ImageIcon, X, Loader, CheckCircle } from 'lucide-react';

const CLOUD_NAME   = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

const CloudinaryUploader = ({
  onUpload,
  currentUrl = '',
  label = 'Upload Image',
  hint = 'PNG, JPG, SVG or WEBP (max 5 MB)',
  className = '',
}) => {
  const inputRef            = useRef(null);
  const [preview, setPreview] = useState(currentUrl);
  const [status, setStatus]   = useState('idle');    // idle | uploading | done | error
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // ── Core upload function ───────────────────────────────────────────────
  const uploadFile = async (file) => {
    if (!file) return;

    // Validation
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file.');
      setStatus('error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('File is too large. Maximum size is 5 MB.');
      setStatus('error');
      return;
    }

    // Local preview immediately
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setStatus('uploading');
    setProgress(0);
    setErrorMsg('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', 'ecp_portal');

    try {
      // Use XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          const secureUrl = data.secure_url;
          setPreview(secureUrl);
          setStatus('done');
          setProgress(100);
          onUpload(secureUrl);
          // Revoke the blob URL to free memory
          URL.revokeObjectURL(objectUrl);
        } else {
          const err = JSON.parse(xhr.responseText);
          setErrorMsg(err?.error?.message || 'Upload failed.');
          setStatus('error');
        }
      };

      xhr.onerror = () => {
        setErrorMsg('Network error. Please check your connection.');
        setStatus('error');
      };

      xhr.send(formData);
    } catch (err) {
      setErrorMsg(err.message || 'Upload failed.');
      setStatus('error');
    }
  };

  // ── Drag & Drop handlers ────────────────────────────────────────────────
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) uploadFile(file);
  };

  const clearImage = (e) => {
    e.stopPropagation();
    setPreview('');
    setStatus('idle');
    setProgress(0);
    setErrorMsg('');
    onUpload('');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Label */}
      {label && (
        <label className="block text-[10px] font-black uppercase tracking-widest mb-2 text-emerald-300">
          {label}
        </label>
      )}

      {/* Drop Zone */}
      <div
        onClick={() => status !== 'uploading' && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`
          relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer overflow-hidden
          ${isDragging ? 'border-yellow-400 bg-yellow-500/10' : 'border-emerald-500/30 bg-emerald-950/50 hover:border-emerald-400/60 hover:bg-emerald-900/40'}
          ${status === 'uploading' ? 'pointer-events-none' : ''}
        `}
        style={{ minHeight: '120px' }}
      >
        {/* Preview Image */}
        {preview ? (
          <div className="flex items-center justify-center p-4 gap-4">
            <div className="relative">
              <img
                src={preview}
                alt="preview"
                className="h-20 w-20 object-contain rounded-xl bg-white/5 border border-white/10 p-1 shadow-lg"
              />
              {status !== 'uploading' && (
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 flex items-center justify-center shadow-lg hover:bg-red-400 transition-colors"
                >
                  <X className="h-3 w-3 text-white" />
                </button>
              )}
            </div>
            <div className="flex-1 min-w-0">
              {status === 'uploading' && (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <Loader className="h-4 w-4 text-yellow-400 animate-spin" />
                    <span className="text-xs font-bold text-yellow-400">Uploading to Cloudinary...</span>
                  </div>
                  <div className="w-full h-1.5 bg-emerald-950 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-emerald-400/60 mt-1 inline-block">{progress}%</span>
                </>
              )}
              {status === 'done' && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-400">Uploaded successfully!</span>
                </div>
              )}
              {status === 'idle' && (
                <span className="text-xs text-emerald-300/60">Click to replace</span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center gap-3">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center border transition-colors ${isDragging ? 'bg-yellow-500/20 border-yellow-400/40' : 'bg-emerald-900/50 border-emerald-500/20'}`}>
              {isDragging
                ? <Upload className="h-6 w-6 text-yellow-400" />
                : <ImageIcon className="h-6 w-6 text-emerald-400" />
              }
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                {isDragging ? 'Drop to upload' : 'Click to browse or drag & drop'}
              </p>
              <p className="text-[11px] text-emerald-400/60 mt-0.5">{hint}</p>
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {status === 'error' && errorMsg && (
        <p className="text-xs text-red-400 font-semibold mt-2 flex items-center gap-1.5">
          <X className="h-3.5 w-3.5" /> {errorMsg}
        </p>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
};

export default CloudinaryUploader;
