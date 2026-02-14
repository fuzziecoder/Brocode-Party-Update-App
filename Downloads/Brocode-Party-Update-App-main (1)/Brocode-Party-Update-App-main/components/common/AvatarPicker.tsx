import React, { useState, useRef, useEffect } from 'react';
import { DEFAULT_AVATARS } from '../../services/mockApi';
import { UploadCloud, CheckCircle2 } from 'lucide-react';

interface AvatarPickerProps {
  label: string;
  initialValue?: string;
  onChange: (url: string) => void;
}

const AvatarPicker: React.FC<AvatarPickerProps> = ({ label, initialValue, onChange }) => {
  const [selectedAvatar, setSelectedAvatar] = useState(initialValue || DEFAULT_AVATARS[0]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      // Ensure parent is notified of initial value
      if(initialValue) {
        onChange(initialValue);
      } else {
        onChange(DEFAULT_AVATARS[0]);
      }
  }, [initialValue]); // Only run once on mount

  const handleSelect = (url: string) => {
    setSelectedAvatar(url);
    onChange(url);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        handleSelect(result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-400 mb-2">{label}</label>
      <div className="grid grid-cols-4 gap-3">
        {DEFAULT_AVATARS.map((avatarUrl) => (
          <button
            key={avatarUrl}
            type="button"
            onClick={() => handleSelect(avatarUrl)}
            className="relative aspect-square rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1C1C1C] focus:ring-white transition-transform transform hover:scale-105"
          >
            <img src={avatarUrl} alt="Default Avatar" className="w-full h-full rounded-full" />
            {selectedAvatar === avatarUrl && (
              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
            )}
          </button>
        ))}
        <button
            type="button"
            onClick={handleUploadClick}
            className={`relative aspect-square rounded-full bg-zinc-800 border-2 border-dashed border-zinc-600 flex flex-col items-center justify-center text-zinc-400 hover:bg-zinc-700 hover:border-zinc-500 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1C1C1C] focus:ring-white ${
                !DEFAULT_AVATARS.includes(selectedAvatar) ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1C1C1C]' : ''
            }`}
        >
             {!DEFAULT_AVATARS.includes(selectedAvatar) ? (
                 <>
                    <img src={selectedAvatar} alt="Uploaded Avatar" className="w-full h-full rounded-full object-cover" />
                     <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <CheckCircle2 className="w-6 h-6 text-white" />
                    </div>
                 </>
             ) : (
                <>
                    <UploadCloud size={24} />
                    <span className="text-xs mt-1 text-center">Upload</span>
                </>
             )}
        </button>
        <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
        />
      </div>
    </div>
  );
};

export default AvatarPicker;
