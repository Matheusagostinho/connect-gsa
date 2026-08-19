import type { MyProfile } from '@connect-gsa/shared';
import { useQueryClient } from '@tanstack/react-query';
import { Camera } from 'lucide-react';
import { useRef, useState } from 'react';
import { uploadAvatar } from '../lib/feed.js';
import { Avatar } from './Avatar.tsx';

/**
 * Troca da foto de perfil.
 *
 * O aviso sobre metadados não é jurídico, é honestidade: a pessoa está enviando
 * uma foto que provavelmente saiu do celular dela, e merece saber que a
 * localização gravada nela é descartada antes de qualquer coisa ser guardada.
 */
export function AvatarUpload({
  profile,
  size = 72,
  ring = false,
}: {
  profile: MyProfile;
  size?: number;
  /** Anel em degradê da marca — quando o avatar é o assunto da tela. */
  ring?: boolean;
}) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  async function enviar(file: File) {
    setErro(null);
    setEnviando(true);
    try {
      queryClient.setQueryData(['me'], await uploadAvatar(file));
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível enviar a foto.');
    } finally {
      setEnviando(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative w-fit">
        <Avatar name={profile.name} imageUrl={profile.imageUrl} size={size} ring={ring} />

        <input
          ref={input}
          type="file"
          accept="image/*"
          id="foto-de-perfil"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void enviar(file);
          }}
        />
        <label
          htmlFor="foto-de-perfil"
          title="Trocar foto de perfil"
          className="absolute -right-1 -bottom-1 flex size-9 cursor-pointer items-center justify-center rounded-pill border border-border bg-surface-raised text-ink-muted transition-colors duration-200 hover:text-ink"
        >
          <Camera className="size-4" aria-hidden="true" />
          <span className="sr-only">Trocar foto de perfil</span>
        </label>
      </div>

      {enviando ? (
        <p className="text-xs text-ink-muted" role="status">
          Enviando…
        </p>
      ) : null}

      {erro ? (
        <p role="alert" className="text-xs font-medium text-danger">
          {erro}
        </p>
      ) : null}
    </div>
  );
}
