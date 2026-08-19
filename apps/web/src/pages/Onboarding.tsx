import {
  LINK_FIELDS,
  PROFILE_LIMITS,
  fieldsToLinks,
  linksToFields,
  type LinkFieldKey,
  type MyProfile,
  updateProfileSchema,
} from '@connect-gsa/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { AppShell } from '../components/AppShell.tsx';
import { Autocomplete } from '../components/Autocomplete.tsx';
import { InstitutionPicker } from '../components/InstitutionPicker.tsx';
import { SkillPicker } from '../components/SkillPicker.tsx';
import { ThemeToggle } from '../components/ThemeToggle.tsx';
import { Wordmark } from '../components/Logo.tsx';
import { Button, Card, Field, Shell } from '../components/ui.tsx';
import { ApiError, api } from '../lib/api.js';
import { useMyProfile } from '../lib/session.js';

interface City {
  id: string;
  name: string;
  state: string;
}
import type { Institution } from '@connect-gsa/shared';

/**
 * O formulário do perfil — de entrada e de edição (US-003).
 *
 * A cidade é escolhida numa lista fechada, nunca digitada nem lida do GPS: é
 * assim que a rede aprende onde a pessoa está sem nunca saber onde ela está
 * (P-001). O aparelho não é consultado em momento algum.
 *
 * A moldura muda conforme QUEM chega aqui, e a diferença não é estética:
 *
 * - **Perfil já completo** (veio de "Editar perfil") → moldura do aplicativo,
 *   com navegação e cabeçalho, porque toda outra seção está de fato disponível.
 * - **Primeira vez** (perfil incompleto) → sem navegação, de propósito. O
 *   `ProtectedRoute` devolve a pessoa para cá se ela tentar qualquer outro
 *   destino, e uma navegação que só recusa é pior que navegação nenhuma.
 */
export function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile } = useMyProfile();

  const [name, setName] = useState(profile?.name ?? '');
  const [course, setCourse] = useState(profile?.course ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [city, setCity] = useState<City | null>(null);
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [skillSlugs, setSkillSlugs] = useState<string[]>([]);
  const [username, setUsername] = useState(profile?.slug ?? '');
  const [links, setLinks] = useState<Record<LinkFieldKey, string>>(() =>
    linksToFields(profile?.links ?? []),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Semeia o formulário quando o perfil chega.
   *
   * Os `useState` acima leem `profile` no PRIMEIRO render, e nesse instante a
   * consulta quase sempre ainda não respondeu — os campos nasciam vazios. Pior:
   * instituição, cidade e habilidades nunca eram semeadas de forma alguma, e
   * salvar a partir de "Editar perfil" era recusado com "Escolha sua
   * instituição" num perfil que já tinha uma. Editar simplesmente não funcionava.
   *
   * A referência guarda de quem os campos já foram semeados: sem ela, qualquer
   * refetch do perfil (trocar de aba do navegador basta) apagaria o que a pessoa
   * estivesse digitando.
   */
  const semeadoDe = useRef<string | null>(null);

  useEffect(() => {
    if (!profile || semeadoDe.current === profile.id) return;
    semeadoDe.current = profile.id;

    setName(profile.name);
    setCourse(profile.course);
    setBio(profile.bio);
    setUsername(profile.slug);
    setLinks(linksToFields(profile.links));
    setSkillSlugs(profile.skills.map((skill) => skill.slug));
    setCity(profile.city);
    // `pending` só existe em instituição PROPOSTA, esperando moderação. Uma que
    // já está no perfil, por definição, foi aceita.
    setInstitution(profile.institution ? { ...profile.institution, pending: false } : null);
  }, [profile]);

  const save = useMutation({
    mutationFn: (payload: unknown) => api.patch<MyProfile>('/me', payload),
    onSuccess: async (updated) => {
      queryClient.setQueryData(['me'], updated);
      await navigate('/perfil');
    },
    // "Já está em uso" pertence ao campo do nome de usuário, não a um aviso
    // solto no rodapé do formulário: quem lê um erro genérico depois de
    // preencher dez campos não sabe qual deles corrigir.
    onError: (erro) => {
      if (erro instanceof ApiError && erro.code === 'INVALID_USERNAME') {
        setErrors({ slug: erro.message });
      }
    },
  });

  const editando = profile?.profileComplete === true;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    // A MESMA validação que a API roda, vinda de @connect-gsa/shared. O usuário
    // recebe o erro sem ida ao servidor, e as duas pontas não podem divergir
    // porque não existem duas regras.
    const parsed = updateProfileSchema.safeParse({
      name,
      course,
      bio,
      cityId: city?.id ?? '',
      institutionId: institution?.id ?? '',
      skillSlugs,
      links: fieldsToLinks(links),
      // Só vai junto quando MUDOU. Mandar o valor atual a cada salvamento faria
      // toda edição de bio contar como tentativa de troca, e o intervalo mínimo
      // se esgotaria sem a pessoa ter trocado nada.
      ...(username && username !== profile?.slug ? { slug: username } : {}),
    });

    if (!parsed.success) {
      const found: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === 'string' && !found[field]) found[field] = issue.message;
      }
      setErrors(found);
      return;
    }

    setErrors({});
    save.mutate(parsed.data);
  }

  const formulario = (
    <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
          <Field
            id="nome"
            label="Nome"
            value={name}
            maxLength={PROFILE_LIMITS.nameMax}
            onChange={(event) => setName(event.target.value)}
            {...(errors['name'] ? { error: errors['name'] } : {})}
          />

          <InstitutionPicker
            value={institution}
            onSelect={setInstitution}
            {...(errors['institutionId'] ? { error: 'Escolha sua instituição.' } : {})}
          />

          <Field
            id="curso"
            label="Curso"
            value={course}
            maxLength={PROFILE_LIMITS.courseMax}
            onChange={(event) => setCourse(event.target.value)}
            {...(errors['course'] ? { error: errors['course'] } : {})}
          />

          <Autocomplete<City>
            id="cidade"
            label="Cidade"
            endpoint="/cities"
            value={city}
            onSelect={setCity}
            render={(item) => `${item.name}/${item.state}`}
            {...(errors['cityId'] ? { error: 'Escolha sua cidade.' } : {})}
          />

          <SkillPicker
            selected={skillSlugs}
            onChange={setSkillSlugs}
            {...(errors['skillSlugs'] ? { error: errors['skillSlugs'] } : {})}
          />

          {/*
            Nome de usuário e links só no MODO EDIÇÃO. Quem está entrando agora
            já tem seis campos obrigatórios pela frente; pedir mais cinco links e
            uma escolha de endereço antes de a pessoa ver a rede é o caminho mais
            curto para ela desistir no formulário.
          */}
          {editando ? (
            <Field
              id="username"
              label="Nome de usuário"
              hint={`O endereço do seu perfil: /perfil/${username || 'seu-nome'}. O anterior continua funcionando.`}
              value={username}
              maxLength={PROFILE_LIMITS.slugMax}
              onChange={(event) =>
                setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
              }
              {...(errors['slug'] ? { error: errors['slug'] } : {})}
            />
          ) : null}

          <Field
            id="bio"
            label="Bio"
            hint={`Até ${PROFILE_LIMITS.bioMax} caracteres.`}
            value={bio}
            maxLength={PROFILE_LIMITS.bioMax}
            onChange={(event) => setBio(event.target.value)}
            {...(errors['bio'] ? { error: errors['bio'] } : {})}
          />

          {editando ? (
            <fieldset className="flex flex-col gap-4">
              <legend className="mb-2 text-sm font-medium text-ink">Seus links</legend>
              {LINK_FIELDS.map((campo) => (
                <Field
                  key={campo.key}
                  id={`link-${campo.key}`}
                  label={campo.label}
                  type="url"
                  inputMode="url"
                  placeholder={campo.placeholder}
                  value={links[campo.key]}
                  maxLength={PROFILE_LIMITS.linkUrlMax}
                  onChange={(event) =>
                    setLinks((atuais) => ({ ...atuais, [campo.key]: event.target.value }))
                  }
                />
              ))}
              <p className="text-xs text-ink-muted">
                Deixe em branco o que não usa. Todo link precisa começar com https://
              </p>
            </fieldset>
          ) : null}

          {/*
            O aviso é a contrapartida de o mapa vir ligado (P-011, invertido em
            2026-08-19). Nascer visível só é aceitável se a pessoa souber disso
            ao preencher — descobrir por acidente depois é o que não pode
            acontecer.
          */}
          <p className="rounded-field bg-surface-subtle p-4 text-xs text-ink-muted">
            Guardamos apenas a sua cidade — nunca a localização do seu aparelho. Você vai aparecer
            no mapa da rede pela sua cidade, e pode sair quando quiser em Configurações.
          </p>

          {save.error instanceof Error ? (
            <p role="alert" className="text-sm font-medium text-danger">
              {save.error.message}
            </p>
          ) : null}

          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? 'Salvando…' : editando ? 'Salvar' : 'Salvar e continuar'}
          </Button>
        </form>
      </Card>
  );

  if (editando && profile) {
    return (
      <AppShell profile={profile} title="Editar perfil">
        {formulario}
      </AppShell>
    );
  }

  return (
    <Shell>
      <header className="mb-12 flex items-center justify-between">
        <Wordmark />
        <ThemeToggle />
      </header>

      <h1 className="display mb-3 text-4xl sm:text-5xl">Complete seu perfil</h1>
      <p className="mb-10 text-lg text-ink-muted">
        É assim que os outros embaixadores vão te encontrar.
      </p>

      {formulario}
    </Shell>
  );
}
