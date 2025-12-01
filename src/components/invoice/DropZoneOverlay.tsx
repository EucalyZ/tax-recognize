import { Upload } from 'lucide-react';

interface DropZoneOverlayProps {
  isDragOver: boolean;
}

export function DropZoneOverlay({ isDragOver }: DropZoneOverlayProps) {
  if (!isDragOver) return null;

  return (
    <div className="fixed inset-0 z-40 bg-blue-500/10 backdrop-blur-sm flex items-center justify-center pointer-events-none">
      <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center border-2 border-dashed border-blue-500">
        <Upload className="h-16 w-16 text-blue-500 mb-4" />
        <p className="text-xl font-medium text-gray-800">释放文件开始识别</p>
        <p className="text-sm text-gray-500 mt-1">支持 JPG、PNG、BMP、PDF 格式</p>
      </div>
    </div>
  );
}
