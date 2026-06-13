import { CircleUserRoundIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { FileWithPreview } from "@/hooks/use-file-upload";
import { useFileUpload } from "@/hooks/use-file-upload";

export default function AvatarUpload(props: {
  onChange: (file: File) => void;
  onRemove: () => void;
  initialFile?: string;
  isPending?: boolean;
}) {
  const isPending = props.isPending ?? false;
  const [
    { files, isDragging },
    {
      removeFile,
      openFileDialog,
      getInputProps,
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
    },
  ] = useFileUpload({
    accept: "image/*",

    initialFiles: props.initialFile
      ? [
          {
            name: "avatar.png",
            url: props.initialFile,
            id: crypto.randomUUID(),
            type: "image/png",
            size: 100,
          },
        ]
      : [],
    onFilesAdded(addedFiles: FileWithPreview[]) {
      const firstFile = addedFiles[0];
      if (firstFile.file instanceof File) {
        props.onChange(firstFile.file);
      }
    },
  });

  const previewUrl = files[0]?.preview || null;
  const removeCurrentFile = () => {
    const fileId = files[0]?.id;
    if (!fileId) return;
    removeFile(fileId);
    props.onRemove();
  };

  return (
    <div className="flex flex-row items-center gap-2">
      <div className="relative inline-flex">
        {/* Drop area */}
        <button
          aria-label={previewUrl ? "Change image" : "Upload image"}
          className="border-input hover:bg-accent/50 focus-visible:border-ring focus-visible:ring-ring/50 data-[dragging=true]:bg-accent/50 relative flex size-16 items-center justify-center overflow-hidden rounded-full border border-dashed transition-colors outline-none focus-visible:ring-[3px] has-disabled:pointer-events-none has-disabled:opacity-50 has-[img]:border-none"
          data-dragging={isDragging || undefined}
          disabled={isPending}
          onClick={openFileDialog}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          type="button"
        >
          {previewUrl ? (
            <img
              alt={files[0]?.file?.name || "Uploaded image"}
              className="size-full object-cover"
              height={64}
              src={previewUrl}
              style={{ objectFit: "cover" }}
              width={64}
            />
          ) : (
            <div aria-hidden="true">
              <CircleUserRoundIcon className="size-4 opacity-60" />
            </div>
          )}
        </button>
        {previewUrl && (
          <Button
            aria-label="Remove image"
            className="border-background focus-visible:border-background absolute -top-1 -right-1 size-6 rounded-full border-2 shadow-none"
            disabled={isPending}
            onClick={removeCurrentFile}
            size="icon"
          >
            <XIcon className="size-3.5" />
          </Button>
        )}
        <input
          {...getInputProps()}
          aria-label="Upload image file"
          className="sr-only"
          tabIndex={-1}
        />
      </div>
      <Button
        aria-label="Upload image"
        disabled={isPending}
        onClick={openFileDialog}
        size="sm"
        type="button"
        variant="outline"
      >
        Upload
      </Button>
    </div>
  );
}
