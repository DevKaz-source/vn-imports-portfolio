"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import { Upload, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import type { ProductImage } from "@/domain/types";
export function ImageManager({
  images,
  onChange,
  multiple = true,
}: {
  images: ProductImage[];
  onChange: (images: ProductImage[]) => void;
  multiple?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragged, setDragged] = useState<number | null>(null);
  async function upload(files: FileList | File[]) {
    setError("");
    setBusy(true);
    const uploaded: ProductImage[] = [];
    try {
      for (const file of Array.from(files).slice(
        0,
        multiple ? 12 - images.length : 1,
      )) {
        if (file.size > 8 * 1024 * 1024)
          throw new Error("Cada imagem deve ter até 8 MB.");
        const form = new FormData();
        form.set("file", file);
        const response = await fetch("/api/admin/upload", {
          method: "POST",
          body: form,
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Falha no envio da imagem.");
        uploaded.push(data);
      }
      onChange(multiple ? [...images, ...uploaded] : uploaded);
    } catch (e) {
      if (uploaded.length)
        onChange(multiple ? [...images, ...uploaded] : uploaded);
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }
  function move(from: number, to: number) {
    if (to < 0 || to >= images.length) return;
    const next = [...images];
    next.splice(to, 0, next.splice(from, 1)[0]);
    onChange(next);
  }
  return (
    <div className="image-manager">
      <div
        className="upload-drop"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files.length) void upload(e.dataTransfer.files);
        }}
      >
        <Upload size={23} />
        <p>Arraste suas fotos aqui</p>
        <span>JPG, PNG, WebP ou AVIF · até 8 MB por imagem</span>
        <button
          className="button button-outline"
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          {busy ? "ENVIANDO…" : "SELECIONAR FOTOS"}
        </button>
        <input
          className="sr-only"
          ref={input}
          type="file"
          multiple={multiple}
          accept="image/jpeg,image/png,image/webp,image/avif"
          aria-label="Enviar imagens"
          onChange={(e) => {
            if (e.target.files) void upload(e.target.files);
          }}
        />
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="image-editor-grid">
        {images.map((im, i) => (
          <div
            key={im.id}
            draggable
            onDragStart={() => setDragged(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (dragged !== null) move(dragged, i);
              setDragged(null);
            }}
          >
            <Image src={im.url} alt={im.alt} width={150} height={150} />
            <p className="small">
              {i === 0 ? "CAPA PRINCIPAL" : `FOTO ${i + 1}`}
            </p>
            <input
              aria-label={`Descrição da foto ${i + 1}`}
              placeholder="Descrição ALT da imagem"
              value={im.alt}
              onChange={(e) =>
                onChange(
                  images.map((x, j) =>
                    j === i ? { ...x, alt: e.target.value } : x,
                  ),
                )
              }
            />
            <div className="image-actions">
              <button
                type="button"
                className="icon-button"
                aria-label="Mover foto para esquerda"
                disabled={i === 0}
                onClick={() => move(i, i - 1)}
              >
                <ChevronLeft size={17} />
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label="Mover foto para direita"
                disabled={i === images.length - 1}
                onClick={() => move(i, i + 1)}
              >
                <ChevronRight size={17} />
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label="Excluir foto"
                onClick={() => onChange(images.filter((_, j) => j !== i))}
              >
                <Trash2 size={17} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
