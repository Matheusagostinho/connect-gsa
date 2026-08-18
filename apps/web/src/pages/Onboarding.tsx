import { PROFILE_LIMITS, type MyProfile, updateProfileSchema } from '@connect-gsa/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router';
import { Autocomplete } from '../components/Autocomplete.tsx';
import { Button, Card, Field } from '../components/ui.tsx';
import { api } from '../lib/api.js';
import { useMyProfile } from '../lib/session.js';

interface City {
  id: string;
  name: string;
  state: string;
}
interface Institution {
  id: string;
  name: string;
  acronym: string | null;
}

/**
 * Onboarding do perfil (US-003).
 *
 * A cidade é escolhida numa lista fechada, nunca digitada nem lida do GPS: é
 * assim que a rede aprende onde a pessoa está sem nunca saber onde ela está
 * (P-001). O aparelho não é consultado em momento algum.
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
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = useMutation({
    mutationFn: (payload: unknown) => api.patch<MyProfile>('/me', payload),
    onSuccess: async (updated) => {
      queryClient.setQueryData(['me'], updated);
      await navigate('/perfil');
    },
  });

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
      skills: [],
      links: [],
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

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
      <Card>
        <h1 className="text-2xl font-extrabold">Complete seu perfil</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          É assim que os outros embaixadores vão te encontrar.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
          <Field
            id="nome"
            label="Nome"
            value={name}
            maxLength={PROFILE_LIMITS.nameMax}
            onChange={(event) => setName(event.target.value)}
            {...(errors['name'] ? { error: errors['name'] } : {})}
          />

          <Autocomplete<Institution>
            id="instituicao"
            label="Instituição de ensino"
            endpoint="/institutions"
            value={institution}
            onSelect={setInstitution}
            render={(item) => (item.acronym ? `${item.acronym} — ${item.name}` : item.name)}
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

          <Field
            id="bio"
            label="Bio"
            hint={`Até ${PROFILE_LIMITS.bioMax} caracteres.`}
            value={bio}
            maxLength={PROFILE_LIMITS.bioMax}
            onChange={(event) => setBio(event.target.value)}
            {...(errors['bio'] ? { error: errors['bio'] } : {})}
          />

          <p className="text-xs text-muted-foreground">
            Guardamos apenas a sua cidade — nunca a localização do seu aparelho. Você começa fora
            do mapa e decide depois se quer aparecer.
          </p>

          {save.error instanceof Error ? (
            <p role="alert" className="text-sm font-medium text-destructive">
              {save.error.message}
            </p>
          ) : null}

          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? 'Salvando…' : 'Salvar e continuar'}
          </Button>
        </form>
      </Card>
    </main>
  );
}
