import React, { useState } from "react";
import { BookOpen, Upload, FileText, CheckCircle, Clock, Trash } from "lucide-react";

interface Document {
  id: number;
  filename: string;
  status: "ready" | "processing" | "error";
  chunks: number;
  date: string;
}

export default function KnowledgeBase() {
  const [docs, setDocs] = useState<Document[]>([
    { id: 1, filename: "Product_FAQ_v2.pdf", status: "ready", chunks: 24, date: "2026-06-28 14:02" },
    { id: 2, filename: "Pricing_Tiers_2026.docx", status: "ready", chunks: 8, date: "2026-06-29 09:30" }
  ]);
  const [uploading, setUploading] = useState(false);

  const handleUploadSimulate = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setUploading(true);
    
    // Simulate upload, embedding generation, and DB indexing phases
    setTimeout(() => {
      const newDoc: Document = {
        id: Date.now(),
        filename: file.name,
        status: "ready",
        chunks: Math.floor(Math.random() * 15) + 3,
        date: new Date().toISOString().replace("T", " ").substring(0, 16)
      };
      setDocs((prev) => [newDoc, ...prev]);
      setUploading(false);
    }, 2000);
  };

  const handleDelete = (id: number) => {
    setDocs((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto space-y-8 bg-[#0b0f19]">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">Knowledge RAG Store</h2>
        <p className="text-gray-400 text-sm mt-1">Upload documents to serve as contextual vector reference search for active AI agents</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Upload card panel */}
        <div className="lg:col-span-1 glass-panel border border-[#1f2937] p-6 rounded-2xl h-fit space-y-6">
          <h3 className="text-md font-bold text-gray-200 flex items-center gap-2 border-b border-[#1f2937] pb-3">
            <Upload size={16} className="text-indigo-400" />
            Upload Document Asset
          </h3>
          
          <label className="border-2 border-dashed border-gray-800 hover:border-indigo-500/50 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-300">
            <Upload size={28} className="text-gray-500 hover:text-indigo-400" />
            <span className="text-sm font-semibold text-gray-300">Select files (PDF, DOCX, TXT)</span>
            <span className="text-xs text-gray-500">Max size 20MB per file</span>
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              className="hidden"
              onChange={handleUploadSimulate}
              disabled={uploading}
            />
          </label>

          {uploading && (
            <div className="flex items-center gap-3 justify-center text-xs font-semibold text-indigo-400">
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-500 border-t-transparent" />
              Ingesting, Chunking, and Embedding Vector Indices...
            </div>
          )}
        </div>

        {/* Documents list panel */}
        <div className="lg:col-span-2 glass-panel border border-[#1f2937] p-6 rounded-2xl flex flex-col min-h-[400px]">
          <h3 className="text-md font-bold text-gray-200 flex items-center gap-2 border-b border-[#1f2937] pb-3 mb-4">
            <BookOpen size={16} className="text-indigo-400" />
            Active Vector Indexes
          </h3>

          <div className="flex-grow space-y-3 overflow-y-auto">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 bg-[#151f32]/40 border border-gray-800 hover:border-gray-700 rounded-xl transition duration-200"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-lg">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-gray-200">{doc.filename}</h4>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                      <span>{doc.chunks} chunks</span>
                      <span>Uploaded {doc.date}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                    <CheckCircle size={12} />
                    Ready
                  </span>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="text-gray-500 hover:text-rose-400 transition"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              </div>
            ))}

            {docs.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-gray-500">
                <p className="text-sm">No files uploaded. Use the panel on the left to upload.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
