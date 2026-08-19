import { inviteCodeSchema } from '@connect-gsa/shared';

const CHAVE = 'connectgsa:convite';

/**
 * O convite, guardado até o cadastro terminar.
 *
 * O login social manda a pessoa para o Google e a traz de volta numa navegação
 * nova. Sem guardar, o código que estava na barra de endereço se perde no
 * caminho, e quem clicou num convite acaba numa tela de "acesso restrito" sem
 * entender por quê.
 *
 * O servidor já guarda o mesmo código como bilhete assinado em cookie httpOnly —
 * esta cópia serve para a INTERFACE saber que existe um convite em andamento e
 * poder mostrá-lo de novo. Guardar aqui não expõe nada: é o mesmo código que a
 * pessoa tem na barra de endereço e no aplicativo de mensagens onde o recebeu.
 *
 * Tudo dentro de `try`: `localStorage` lança em navegação privada de alguns
 * navegadores e quando o armazenamento está cheio. Perder o convite guardado é
 * um contratempo; derrubar a tela de entrada por causa disso não é aceitável.
 */
export function guardarConvite(code: string): void {
  const parsed = inviteCodeSchema.safeParse(code);
  if (!parsed.success) return;

  try {
    window.localStorage.setItem(CHAVE, parsed.data);
  } catch {
    // Sem armazenamento, o fluxo ainda funciona pelo cookie do servidor.
  }
}

export function lerConvite(): string | null {
  try {
    const guardado = window.localStorage.getItem(CHAVE);
    if (!guardado) return null;

    // Validado na LEITURA também: o que está no armazenamento é escrita livre
    // para qualquer script que já tenha rodado nesta origem, e um valor
    // inventado não pode virar requisição.
    const parsed = inviteCodeSchema.safeParse(guardado);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function esquecerConvite(): void {
  try {
    window.localStorage.removeItem(CHAVE);
  } catch {
    // Nada a fazer: o convite é de uso único e expira sozinho.
  }
}
